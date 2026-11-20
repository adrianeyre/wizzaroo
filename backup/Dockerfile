# Named by digest, as in the app's Dockerfile, and each package by its exact version in that image's Alpine release
# (pen test I4, #313). Alpine keeps only a release's newest build of a package, so when one is replaced the build
# fails here rather than installing something no one chose: resolve the image again and pin what it now offers.
FROM postgres:18-alpine@sha256:b6972e1115a4ff8eba5d7f7d19184926d1e16d7d1136ae1e1a7ebf286da0f015
RUN apk add --no-cache age=1.3.2-r1 rclone=1.75.2-r0
COPY backup.sh backup-role.sh restore.sh nightly.sh send-deletions.sh /usr/local/bin/
USER postgres
ENTRYPOINT []
CMD ["nightly.sh"]
