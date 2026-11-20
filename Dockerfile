# Every image is named by its digest, so a build runs exactly what the repo names and a new one is a reviewed commit.
# The tag beside it is only for whoever reads this (pen test I4, #313). To move on, resolve the tag again with
# `docker buildx imagetools inspect node:26-slim` and put its digest here.
FROM node:26-slim@sha256:e6bedef217677b276c591795e169840edd9096dbf13f29df8ef8d1856b8820bc AS build
WORKDIR /app
# pnpm's tarball is checked against the sha512 npm publishes for this version before it is installed (#313).
ARG PNPM_VERSION=12.21.0
ARG PNPM_SHA512=66fd8278ee28935ce951792d34367ff3af5c432a2756445823029533835b8da529bbe0be5130afd56ed0713fb8789e47bad82d93bd5ae2fe54b15562d6276ef0
RUN npm pack "pnpm@$PNPM_VERSION" --pack-destination /tmp \
  && echo "$PNPM_SHA512  /tmp/pnpm-$PNPM_VERSION.tgz" | sha512sum --check --strict \
  && npm install -g "/tmp/pnpm-$PNPM_VERSION.tgz" \
  && rm "/tmp/pnpm-$PNPM_VERSION.tgz"
COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# @adrianeyre/email-client comes from GitHub Packages, which wants a token with read:packages. It is given to this one
# step as a BuildKit secret (`docker compose build` passes GITHUB_TOKEN), and a user-level .npmrc on a tmpfs names it
# only as ${GITHUB_TOKEN}, which pnpm reads from the environment, so neither the token nor that file is in any layer.
RUN --mount=type=secret,id=github_token,env=GITHUB_TOKEN \
  --mount=type=tmpfs,target=/run/npm \
  printf '//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}\n' > /run/npm/.npmrc \
  && NPM_CONFIG_USERCONFIG=/run/npm/.npmrc pnpm install --frozen-lockfile
COPY tsconfig.json tsconfig.build.json vite.config.ts ./
# Only for the build: the footer's version is the highest release tag, read from .git's tag files. The final image
# copies dist, not .git.
COPY .git ./.git
COPY src ./src
RUN pnpm run build && pnpm prune --prod

FROM node:26-slim@sha256:e6bedef217677b276c591795e169840edd9096dbf13f29df8ef8d1856b8820bc
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/server/schema.sql ./src/server/schema.sql
# The request-rate figures live only in this section of the PRD, and the server reads them from it when it starts.
COPY docs/product-requirements-document/pen-testing.md ./docs/product-requirements-document/pen-testing.md
# Read it to me's voices are downloaded into this folder by the voices service, on a volume the app reads (ADR 0062).
RUN mkdir -p /app/voice-models && chown node:node /app/voice-models
USER node
EXPOSE 4310
ENTRYPOINT ["node", "--enable-source-maps"]
CMD ["dist/src/server/index.js"]
