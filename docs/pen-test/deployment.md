# The pen-test deployment

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The dedicated stack a pen-test round runs against, never `wizzaroo.adrianeyre.co.uk` ([the brief](../product-requirements-document/pen-testing.md#engagement-shape)). It is the production stack, `docker-compose.yml`, run under its own Compose project with `docker-compose.pen-test.yml` merged on top. So the round probes production's own containers, images, healthchecks and networks, and the override changes only what has to differ. Keep this page private on the same terms as the PRD.

## It never touches production

| What                                       | How it is kept out                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production's secrets                       | None is read. `pnpm pen-test:up` generates its own into `.pen-test-deployment/.env`, and always passes that file to Compose with `--env-file`, so the root `.env` is never read. Docker is started with only the variables the Docker client needs (`PATH`, `HOME`, `DOCKER_*` and the like), so a secret exported in your shell can't reach Compose. No container mounts a path from the host, so `rclone.conf` and `.env` can't be read into one |
| `wizzaroo.adrianeyre.co.uk` and the tunnel | Every network but `edge` is internal, so `app`, `postgres`, `backup` and `cloudflared` have no way out of Docker. `cloudflared` is defined, as in production, but never started: its profile isn't enabled, its token is the placeholder `none-the-pen-test-deployment-runs-no-tunnel`, which only lets Compose read the file (#309), and its `tunnel` and `tunnel-egress` networks are both internal, so it couldn't reach Cloudflare if it were  |
| Resend and the email platform              | Email goes to `email-platform-stand-in`, on the internal `mail` network, which keeps each send and delivers nothing                                                                                                                                                                                                                                                                                                                                |
| The real NAS and the real B2 bucket        | `backup` sends to a scratch volume standing in for the NAS and a local S3-compatible bucket standing in for B2, both on internal networks. It has no rclone config file at all                                                                                                                                                                                                                                                                     |
| Production's data                          | Its own project, `wizzaroo-pen-test`, so its own containers, networks and volumes, including Postgres's `wizzaroo-pen-test_postgres-data`. Teardown removes only what carries that project's label                                                                                                                                                                                                                                                 |

`src/server/pen-test-deployment/pen-test-deployment.test.ts` checks the merged configuration against these when `docker compose` is installed: the only network with a way out, the only published ports, no host mounts, and `SECOND_SCHOOL_GATE_MET`.

## What differs from production

| In production                                                       | In the pen-test deployment                                                                                                                                                              |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SECOND_SCHOOL_GATE_MET` unset                                      | `true`, set in `docker-compose.pen-test.yml` only, so the deployment can hold two Schools                                                                                               |
| `PUBLIC_URL` is `https://wizzaroo.adrianeyre.co.uk`                 | `http://localhost:43310`, the cloudflared stand-in                                                                                                                                      |
| `app` publishes `127.0.0.1:4310`                                    | `app` publishes nothing. It is reached only through the stand-in, so it never collides with `pnpm dev` or production                                                                    |
| `cloudflared` carries the public hostname to `app`                  | `cloudflared-stand-in`, an nginx reverse proxy, published on `127.0.0.1:43310`                                                                                                          |
| The email platform at `EMAIL_BASE_URL`, delivering through Resend   | `email-platform-stand-in`, which takes each send as the email platform's API does and lists them on `127.0.0.1:43380`. Its address and key are written into `.pen-test-deployment/.env` |
| The NAS over SMB and B2, from `rclone.conf`                         | `nas-stand-in`, a scratch volume mounted in `backup`, and `offsite-bucket-stand-in`, `rclone serve s3` on a volume of its own                                                           |
| The `tunnel` and `offsite` networks reach the internet and the LAN  | Both are internal, and so is `mail`. Only `edge`, which holds the cloudflared stand-in and the email platform stand-in, isn't                                                           |
| `mail` and `tunnel-egress` go out on bridges named for the firewall | Both are internal, with no bridge name of their own, so the deployment can stand beside production on one machine                                                                       |
| The nightly backup proves the off-site key can't delete (#317)      | Off, by `BACKUP_OFFSITE_LOCK_CHECK=off-for-a-stand-in`: the bucket stand-in deletes what it holds, as no locked bucket would                                                            |

Everything else, the images, the `migrate` step, the database users, the healthchecks, the nightly backup and the `drill` profile, is production's.

## Before you start

Docker with Compose 2.24 or later (the override uses `!reset` and `!override`, and an inline config), Node 26 and pnpm, and a clone of this repo. Nothing else: no `.env` to write, no credential to fetch, and no email platform to run. Ports `43310` and `43380` must be free. Building `app` installs `@adrianeyre/email-client` from GitHub Packages, so `GITHUB_TOKEN` must hold a token with `read:packages`, as for [the home server](../processes/deploying-to-the-home-server.md#before-the-first-start); the build is given it as a BuildKit secret and no container holds it.

## Standing it up

```bash
pnpm pen-test:up
```

The first time, it builds the `backup` image, makes an age key pair in it, and writes `.pen-test-deployment/.env` (the Postgres owner's and the app's passwords, the backup role's own Postgres password, the stand-in bucket's key and the age public key) and `.pen-test-deployment/age-identity.txt` (the age private key), readable only by you. Git ignores the folder. Then it runs `docker compose up --detach --build --wait` on the pen-test project, which builds `app`, starts Postgres, runs `migrate` (which applies the migrations as the owner and sets up the app's `wizzaroo_app` login), then starts `app`, the stand-ins, `backup-role` and `backup`, and waits for them to be healthy. A `.pen-test-deployment/.env` written before `APP_DATABASE_PASSWORD` or `BACKUP_POSTGRES_PASSWORD` existed is refused by Compose: `pnpm pen-test:down` and stand it up again. It ends:

```text
The pen-test deployment wizzaroo-pen-test is up at http://localhost:43310, and its mail at http://localhost:43380
```

Running it again keeps the secrets and the data, and rebuilds and restarts what changed. A `.env` written before the backup had a role of its own is given the backup role's password.

The database starts empty. Load the synthetic Schools, staff, Families and their play, [the fixtures](./fixtures.md), with:

```bash
pnpm pen-test:seed
```

It generates the fixture seed, which every fixture credential is derived from, into `.pen-test-deployment/fixture-seed.txt`, and loads the fixtures in `app`. Run it again whenever a probe has changed them. Don't make an owner with `seed-owner` as in production: the fixtures have their own Admin.

The commands on this page use this shell function, so they always name the pen-test project and its own `.env`. Run them from the root of the repo, in a shell with no production variables exported:

```bash
pen_test_compose() {
  docker compose --project-name wizzaroo-pen-test \
    --env-file .pen-test-deployment/.env \
    --file docker-compose.yml --file docker-compose.pen-test.yml "$@"
}
```

`pen_test_compose ps` lists the containers and `pen_test_compose logs -f app` follows the server's log.

## Who can reach it

Both ports are published on `127.0.0.1` only, so only the machine running it can reach it. A tester on another machine forwards the ports over SSH, rather than the binding being widened:

```bash
ssh -L 43310:127.0.0.1:43310 -L 43380:127.0.0.1:43380 the-machine-running-it
```

Use `localhost`, not `127.0.0.1`, in a browser: passkeys are bound to `PUBLIC_URL`'s host. A browser treats `http://localhost` as a secure context, so `Secure` cookies and passkeys work without TLS.

## The cloudflared stand-in

`cloudflared-stand-in` reproduces what `app` sees from the tunnel in production, closely enough to probe headers, `trustProxy` and the real client IP (H12). **It is a stand-in, not Cloudflare.** It sits where `cloudflared` sits, on the `tunnel` network, at the fixed address `10.43.11.2` that the app's `TUNNEL_PROXY_ADDRESS` names, as production's names `cloudflared`'s `10.43.10.2` (#332). So every request reaches `app` from the stand-in's own address, just as every production request reaches it from `cloudflared`'s, and the app believes the stand-in's `CF-Connecting-IP` as it believes Cloudflare's. The deployment's `tunnel` network has the subnet `10.43.11.0/24`, beside production's `10.43.10.0/24`, so the two can run on one host. On the way it sets the request headers Cloudflare's edge sets:

| Header              | What arrives at `app`                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| `CF-Connecting-IP`  | The caller's address, replacing any the caller sent                                                    |
| `X-Forwarded-For`   | The caller's address, appended to any `X-Forwarded-For` the caller sent, so a forged one arrives first |
| `X-Forwarded-Proto` | `https`                                                                                                |
| `CF-Visitor`        | `{"scheme":"https"}`                                                                                   |
| `CF-IPCountry`      | `XX`                                                                                                   |
| `CF-Ray`            | A request id                                                                                           |
| `CDN-Loop`          | `cloudflare`                                                                                           |
| `Host`              | As the caller sent it                                                                                  |

Every other header, `X-Real-IP` and `True-Client-IP` included, passes through as the caller sent it, and so do headers with underscores or odd names. Its body and header limits are deliberately generous, so a probe meets the app's limits rather than the stand-in's, and it waits 100 seconds for `app` to answer.

What it doesn't reproduce, so a finding about these is not one about Wizzaroo's code:

- **TLS.** Cloudflare terminates HTTPS; the stand-in serves plain HTTP on loopback. `X-Forwarded-Proto` still says `https`.
- **Cloudflare's own response headers** (`Server: cloudflare`, `CF-RAY`, `cf-cache-status`) and its caching. Its own `Server: nginx` is the stand-in's. Judge only the headers `app` sets.
- **The zone's settings**: HSTS, minimum TLS, URL normalisation, the WAF and Cloudflare's own limits. They live in Cloudflare's dashboard, not in this repo.
- **Distinct callers, from one machine.** Every request from the machine running it arrives from the Docker network's gateway, one address. To be several callers, run each probe from its own container on the `edge` network; each gets its own address, which arrives as `CF-Connecting-IP`:

  ```bash
  docker run --rm --network wizzaroo-pen-test_edge curlimages/curl -si http://cloudflared-stand-in/health
  ```

To reach `app` without the stand-in, run the probe on the `tunnel` network instead, against `http://app:4310`. It arrives from its own container's address, not the stand-in's, so the app records it, and limits it, under that address and ignores any `CF-Connecting-IP` it sends (#332). Always pass `--rm`, so teardown isn't left with a container on one of its networks.

## Mail

Every email `app` sends, Invites, password resets, email address checks and security notices, goes to `email-platform-stand-in`, which stands in for the [email platform](https://github.com/adrianeyre/email-platform). It checks the API key, keeps each send in memory and delivers nothing. <http://localhost:43380> lists every one, newest first, as JSON: its recipients, its template's slug, such as `wizzaroo-reset-your-password`, and its variables, links included. Restarting the stand-in empties the list.

**It is a stand-in, not the email platform.** It renders nothing, so it shows no subject, wording or HTML, never queues, retries or fails a delivery, and checks no variable. A finding about how an email reads, or about the email platform itself, is not one about Wizzaroo's code: the templates live in the email platform, and are probed from its own repo.

## Backups

`backup` is production's container, unchanged: it takes an encrypted `pg_dump` when it starts and every night at 02:00 UTC, and sends it to both stand-ins.

| Stand-in                  | Production's                | Where                                                                                                                           |
| ------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `nas-stand-in`            | The NAS, pruned             | The volume `wizzaroo-pen-test_nas-stand-in`, at `/srv/nas-stand-in/wizzaroo-backups` in `backup`                                |
| `offsite-bucket-stand-in` | The B2 bucket, never pruned | The bucket `wizzaroo-backups-pen-test`, served by `rclone serve s3` from the volume `wizzaroo-pen-test_offsite-bucket-stand-in` |

Take one now, and list both:

```bash
pen_test_compose exec backup backup.sh
pen_test_compose exec backup rclone lsf /srv/nas-stand-in/wizzaroo-backups
pen_test_compose exec backup rclone lsf offsite:wizzaroo-backups-pen-test
```

Stopping a stand-in, `pen_test_compose stop offsite-bucket-stand-in`, is how to see a target being off.

To restore, follow [drilling a restore](../processes/restoring-a-backup.md#drilling-a-restore) with `pen_test_compose` for `docker compose`, and hand `restore.sh` the pen-test key on standard input rather than mounting it:

```bash
pen_test_compose --profile drill up -d --wait restore-drill
pen_test_compose run --rm --no-deps -T --env PGHOST=restore-drill --env PGUSER=wizzaroo backup \
  sh -c 'cat >/tmp/identity.txt && BACKUP_AGE_IDENTITY_FILE=/tmp/identity.txt restore.sh latest' \
  <.pen-test-deployment/age-identity.txt
```

Add `--env BACKUP_RCLONE_REMOTE=offsite:wizzaroo-backups-pen-test` to restore from the bucket stand-in instead of the NAS stand-in.

`backup` also sends every deletion the Admin confirms to both stand-ins, in `wizzaroo-deletions/`, within a minute, and `restore.sh` deletes each one again after restoring. Loading the fixtures again takes their ids out of `confirmed_deletions`, but not off the stand-ins, so a restore after that deletes a reloaded fixture again: tear the deployment down for a clean start.

What the stand-ins don't reproduce: SMB, B2's Object Lock, its lifecycle rule and the server key's missing `deleteFiles`. The bucket stand-in will delete whatever it is asked to. Those are probed by reading [the backup set-up](../processes/deploying-to-the-home-server.md#the-off-site-bucket), not against this deployment.

## Its secrets

`.pen-test-deployment/` holds the only secrets the deployment has, all generated for it and for nothing else: the Postgres password, the backup role's Postgres password, the stand-in bucket's key, the age key pair and the fixture seed. Testers get the URL, the fixture accounts and their credentials (E4), and none of these. Finding one anyway is a finding. Teardown deletes the folder, so every one of them ends with the deployment.

## Tearing it down

```bash
pnpm pen-test:down
```

It removes every container, volume and network labelled with the `wizzaroo-pen-test` project, those of the `drill` profile and of `run` included, checks none is left, and deletes `.pen-test-deployment/`. It ends:

```text
Removed 7 containers, 3 volumes and 5 networks of wizzaroo-pen-test.
No container, volume or network labelled wizzaroo-pen-test is left.
Deleted /path/to/wizzaroo/.pen-test-deployment, with the deployment's secrets and backup key.
```

The counts depend on what ran. It fails, naming what is left, if anything is, such as a network a probe container still holds. Check it yourself with:

```bash
docker volume ls --filter label=com.docker.compose.project=wizzaroo-pen-test
```

which lists nothing. The images it built, `wizzaroo-pen-test-app` and the like, are kept so the next round starts faster; they hold code, not data. Remove them with `docker image rm` if you want the space.

## Things to know

- **On the home server, beside production,** it is a different project with different ports, networks and volumes, so the two never mix. Never run `pen_test_compose` with `--project-name wizzaroo`.
- **On a development machine,** it doesn't use 4310 or 54320, so it runs beside `pnpm dev` and the development database.
- **The data is synthetic only.** Never load a backup of production into it.
