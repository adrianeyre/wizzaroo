# Deploying to the home server

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Wizzaroo runs on the home server under Docker Compose, reached at
`wizzaroo.adrianeyre.co.uk` through a Cloudflare Tunnel
([ADR 0002](../architectural-decision-record/0002-self-hosted-behind-a-cloudflare-tunnel.md)).
`docker-compose.yml` at the root of the repo is the whole stack.

| Container       | What it does                                                                                  | Networks                                     |
| --------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `migrate`       | Applies the schema as the tables' owner, sets up the app's own login, then exits              | `database` (internal)                        |
| `app`           | Fastify serving the PWA and the API on port 4310, logged in to Postgres as `wizzaroo_app`     | `database`, `tunnel` (both internal), `mail` |
| `postgres`      | Postgres 18, its data in the `wizzaroo_postgres-data` volume. Publishes no port.              | `database` (internal)                        |
| `backup-role`   | Runs once on each start, as the superuser, to set up the read-only role `backup` logs in as   | `database` (internal)                        |
| `backup`        | Every night, an encrypted `pg_dump` sent to the NAS and off-site; see [Backups](#backups)     | `database`, `offsite`                        |
| `restore-drill` | A throwaway Postgres, in memory, for drilling a restore. Only starts with the `drill` profile | `database` (internal)                        |
| `cloudflared`   | The outbound tunnel that carries `wizzaroo.adrianeyre.co.uk` to `app`                         | `tunnel` (internal), `tunnel-egress`         |

`database` is an internal network, so Postgres can't reach the internet and
nothing outside Docker can reach it. `tunnel` is internal too, and only
`cloudflared` and `app` are on it, so `cloudflared` can reach `app` but never
`postgres`. Each goes out of Docker on a network of its own: `cloudflared` on
`tunnel-egress`, to reach Cloudflare, and `app` on `mail`, to reach the email
platform. A one-shot `voices` service downloads Read it to me's voices, about
510 MB the first time, into the `voice-models` volume on a network of its own,
`voices-egress`, and exits; `app` mounts the volume read-only (ADR 0062). Their
bridges are named `wizzaroo-tunnel`, `wizzaroo-mail` and `wizzaroo-voices`, so
[the firewall](#keeping-the-tunnel-and-the-app-off-the-lan) can keep them off
the LAN. `app` also publishes port 4310 on `127.0.0.1`, so you can check it
from the server itself; the LAN can't reach it.

Every container runs on a read-only filesystem, with a tmpfs where it must
write, drops every Linux capability and can't gain privileges through a setuid
binary. `postgres` and `restore-drill` add back only what their entrypoint needs
to own the data directory and become the `postgres` user. Every image is named
by its digest, so a build runs exactly what the repo names; see
[moving to newer images](#moving-to-newer-images).

`migrate` is the only container that holds the owner's password. `app` logs in
as `wizzaroo_app`, which isn't a superuser, can't skip row-level security and
owns no table, and it refuses to start on a login that is or can become any of
those ([ADR 0027](../architectural-decision-record/0027-row-level-security-through-a-reach-role.md)).

`backup` is on `database` to reach Postgres, and on `offsite`, a network of its
own, to reach the NAS on the LAN and the off-site bucket. Because it is the one
container holding a database password that can also reach out, it doesn't hold
the superuser's: it logs in as `wizzaroo_backup`, with `BACKUP_POSTGRES_PASSWORD`,
a role that can read every table past row-level security and can't write,
change roles or run programs. `backup-role` sets that role up, then exits,
before `backup` starts. `restore-drill` is a
throwaway Postgres for [drilling a restore](./restoring-a-backup.md#drilling-a-restore),
started only by hand with the `drill` profile.

## Before the first start

You need Docker with Compose on the server, and a clone of this repo.

Make the tunnel with `cloudflared` on any computer, not in the Cloudflare
dashboard. A tunnel made this way takes its routes from
`cloudflared/config.yml`, which `docker-compose.yml` gives `cloudflared` as its
`tunnel-routes` config. It sends `wizzaroo.adrianeyre.co.uk` to
`http://app:4310` and answers 404 for anything else. A tunnel made in the
dashboard takes them from the dashboard instead, and can't be changed back
([pen test I4, #316](../pen-test/findings/I4.md)):

```bash
cloudflared tunnel login
cloudflared tunnel create wizzaroo
cloudflared tunnel route dns wizzaroo wizzaroo.adrianeyre.co.uk
cloudflared tunnel token wizzaroo
```

The last line prints the tunnel's token. Don't add public hostnames to it in
the dashboard, and don't put Cloudflare Access in front of it. If the server
already runs a tunnel made in the dashboard, make this one, move the DNS
record to it with `cloudflared tunnel route dns --overwrite-dns wizzaroo
wizzaroo.adrianeyre.co.uk`, put its token in `.env`, and delete the old tunnel
once the site answers through the new one. A route is then a change to
`docker-compose.yml`, which someone reviews.

Wizzaroo sends email through the self-hosted
[email platform](https://github.com/adrianeyre/email-platform), which renders
each email from its built-in Wizzaroo templates and hands it to an SMTP
provider, since a home internet address is on mail blocklists
([ADR 0069](../architectural-decision-record/0069-emails-are-sent-through-the-email-platform.md)).
The email platform is deployed from its own repo, and its provider, such as
Resend with the domain `wizzaroo.adrianeyre.co.uk` verified, is set on its
**Delivery** page. In the email platform:

1. Add the built-in templates, with `pnpm cli templates:add-built-ins` on its
   server, or from the **Start from a built-in email** gallery. Wizzaroo sends
   each by its slug, such as `wizzaroo-reset-your-password`, so keep the slugs.
2. Create an API key for Wizzaroo, under **API keys** or with
   `pnpm cli apikey:create "Wizzaroo"`. It starts `ek_` and is shown once.

The app's build installs `@adrianeyre/email-client` from GitHub Packages, so
the server needs a GitHub personal access token (classic) with only the
`read:packages` scope, as `GITHUB_TOKEN` in the environment of whoever runs
`docker compose`. The build is given it as a BuildKit secret, `github_token`,
so it never lands in an image layer or the build's history: `docker compose
build` passes it from `GITHUB_TOKEN`, and a build by hand passes it with
`docker build --secret id=github_token,env=GITHUB_TOKEN .`. It isn't in `.env`
and the running app never has it.

Then create `.env` beside `docker-compose.yml` with these lines:

```bash
POSTGRES_PASSWORD=
APP_DATABASE_PASSWORD=
BACKUP_POSTGRES_PASSWORD=
CLOUDFLARE_TUNNEL_TOKEN=
COMPOSE_PROFILES=tunnel
EMAIL_BASE_URL=
EMAIL_API_KEY=
TOTP_SECRET_KEY=
BACKUP_AGE_RECIPIENT=
BACKUP_RCLONE_REMOTE=
BACKUP_RCLONE_OFFSITE_REMOTE=
BACKUP_RCLONE_CONFIG_FILE=
```

| Variable                       | Value                                                                                                                                                 |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POSTGRES_PASSWORD`            | The output of `openssl rand -hex 32`: the owner's, which only `migrate` and `backup-role` are given                                                   |
| `APP_DATABASE_PASSWORD`        | Another `openssl rand -hex 32`: the app's own login. Hex, because it goes inside the app's database URL                                               |
| `BACKUP_POSTGRES_PASSWORD`     | Another `openssl rand -hex 32`, never the same as `POSTGRES_PASSWORD`: the backup's own role's password                                               |
| `CLOUDFLARE_TUNNEL_TOKEN`      | The tunnel's token. Compose refuses to start without it, whether or not the `tunnel` profile is on                                                    |
| `COMPOSE_PROFILES`             | `tunnel`, which starts `cloudflared`. Leave it out to run without the tunnel, as on a laptop                                                          |
| `EMAIL_BASE_URL`               | Where the app reaches the email platform, such as `https://email.example.com`: an `http` or `https` URL. Use `https` unless it is on the same machine |
| `EMAIL_API_KEY`                | The API key the email platform made for Wizzaroo, starting `ek_`                                                                                      |
| `TOTP_SECRET_KEY`              | Another `openssl rand -hex 32`: seals each adult's TOTP secret. Back it up apart from the database; see [The TOTP secret key](#the-totp-secret-key)   |
| `BACKUP_AGE_RECIPIENT`         | The age public key backups are encrypted to; see [Backups](#backups)                                                                                  |
| `BACKUP_RCLONE_REMOTE`         | The NAS, where backups go and are pruned, as an rclone remote and path, such as `nas:wizzaroo-backups`                                                |
| `BACKUP_RCLONE_OFFSITE_REMOTE` | The off-site bucket, where backups also go and are never pruned, such as `offsite:wizzaroo-backups-k3x9`                                              |
| `BACKUP_RCLONE_CONFIG_FILE`    | The path on the server of the rclone config that defines both remotes                                                                                 |

Compose reads the first four, and the backup lines, itself. It builds
`migrate`'s `DATABASE_OWNER_URL` from `POSTGRES_PASSWORD`, and the `DATABASE_URL`
`migrate` and `app` share from `APP_DATABASE_PASSWORD`; `migrate` gives the
`wizzaroo_app` login that password every time it runs, so changing it is a
change to `.env` and a restart. They aren't in `.env.example`, which lists only
what the app reads in development. It passes `EMAIL_BASE_URL` and
`EMAIL_API_KEY` to the app, which waits up to 10 seconds for the email platform
to accept each email, and sets `PUBLIC_URL` to
`https://wizzaroo.adrianeyre.co.uk` so the links in emails point there.
Don't start `.env` from `.env.example`: the app refuses its `EMAIL_API_KEY` and
`TOTP_SECRET_KEY`, each by name.

Compose refuses `POSTGRES_PASSWORD`, `APP_DATABASE_PASSWORD`,
`BACKUP_POSTGRES_PASSWORD`, `EMAIL_API_KEY` or `CLOUDFLARE_TUNNEL_TOKEN` of one
character, or of nothing but spaces, by name, before any container starts. It
does so through the `check-…` services in `docker-compose.yml`, which are never
started: Compose checks a container name's shape, and each one's container name
is its secret. The app refuses an `EMAIL_API_KEY`, or a database password,
under 8 characters too. The `openssl rand -hex 32` values above pass both.
Switching mail provider is a change in the email platform, not here. Leave
`SECOND_SCHOOL_GATE_MET` out: the Admin can't add a second School until it
is `true`, which only the owner sets, once every item of the compliance gate
is in place. `.env` is ignored by git;
never commit it.

`TUNNEL_PROXY_ADDRESS` isn't in `.env` either: `docker-compose.yml` sets it to
`10.43.10.2`, the fixed address it gives `cloudflared` on the `tunnel` network,
whose subnet it fixes at `10.43.10.0/24`. Docker hands out addresses on it only
from `10.43.10.128/25`, so `app`, which starts first, can't take
`cloudflared`'s address before it does. The app believes `CF-Connecting-IP`
from that socket alone, so a request that reaches port 4310 another way, from
the server's own loopback or another container, is recorded and rate limited
under the address it came from, whatever header it sends (#332). The subnet is
outside Docker's default address pools, so no network Docker numbers itself can
take it; if something else on the server already uses it, change the subnet,
its `ip_range`, `cloudflared`'s `ipv4_address` and the app's
`TUNNEL_PROXY_ADDRESS` together, keeping the address outside the range.
The pen-test deployment uses `10.43.11.0/24` so the two can run side by side.

### The TOTP secret key

`TOTP_SECRET_KEY` seals each adult's TOTP secret in the database
([ADR 0051](../architectural-decision-record/0051-totp-secrets-are-sealed-with-a-key-the-database-never-holds.md)).
Compose passes it to the app alone, and the app refuses to start without it or
with anything but 64 hexadecimal characters. It is the one secret the nightly
backups don't hold, on purpose: a copy of the database, or of a backup, then
makes no codes. So **back it up separately from the database backups**, in the
password manager beside the age private key. A restore without it loses every
adult's TOTP: each signs in with a recovery code, or asks the owner to delete
their row in `totp_secrets` (there is no route for it), and sets
two-factor authentication up again. The app counts any secret it can't open
when it starts, as `auth.totp-secrets.unreadable-with-this-key` in its log.

The first start after the key is added seals every secret still held as issued,
and stretches every recovery code hash kept as one SHA-256, before it listens
(`auth.stored-second-factors.protected` in the log, with how many). Don't
change the key afterwards: the secrets sealed under the old one stop opening.

## Starting and updating

```bash
docker compose up -d --build
```

Run it with `GITHUB_TOKEN` set, as [before the first start](#before-the-first-start) says, or
the build can't install `@adrianeyre/email-client`. That one command builds the `app` image, starts Postgres, waits for it to be
healthy, runs `migrate` (which applies the schema to an empty database and exits), starts
`app` once it has finished, waits for that to be healthy, then starts the
tunnel. If `migrate` fails, `app` doesn't start. Every container restarts on its own after a
reboot, as long as Docker itself starts at boot.

To update, pull and run the same command again:

```bash
git pull
docker compose up -d --build
```

### Moving to newer images

Every image in `docker-compose.yml`, `Dockerfile` and `backup/Dockerfile` is
named as `tag@sha256:digest`, so a tag moved by its publisher changes nothing
here ([pen test I4, #313](../pen-test/findings/I4.md)). To take a newer one,
resolve its tag, put the digest in its place in a pull request, and deploy it
once merged:

```bash
docker buildx imagetools inspect node:26-slim --format '{{json .Manifest.Digest}}'
```

The app's build checks pnpm's tarball against `PNPM_SHA512`, which is
`npm view pnpm@<version> dist.integrity` as hexadecimal. The backup's build
installs `age` and `rclone` at exact versions. Alpine keeps only a release's
newest build of a package, so when it replaces one the build fails, rather than
installing something nobody chose: run
`docker run --rm <the postgres image> sh -c 'apk update && apk policy age rclone'`
and pin what it offers.

### Keeping the tunnel and the app off the LAN

Compose can't stop a container reaching the LAN, so the home server's firewall
does ([pen test I4, #316](../pen-test/findings/I4.md)). `cloudflared` needs
only Cloudflare, `app` only the email platform and `voices` only Bryce Beattie's
bucket and Hugging Face (ADR 0074), so traffic from their bridges
to a private address, or to the server itself, is dropped. DNS to the router
stays open, since Docker's resolver forwards from the container. With the
router at `192.168.1.1`:

```bash
for bridge in wizzaroo-tunnel wizzaroo-mail wizzaroo-voices; do
  for range in 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16; do
    sudo iptables -I DOCKER-USER -i "$bridge" -d "$range" -j DROP
  done
  sudo iptables -I DOCKER-USER -i "$bridge" -d 192.168.1.1 -p udp --dport 53 -j ACCEPT
  sudo iptables -I DOCKER-USER -i "$bridge" -d 192.168.1.1 -p tcp --dport 53 -j ACCEPT
  sudo iptables -I INPUT -i "$bridge" -j DROP
done
sudo netfilter-persistent save
```

These rules assume the email platform is reached over the internet. If it runs
on the home server itself, or elsewhere on the LAN, `app` can't reach it past
them: let `app` through to that one address and port, inserted after the drops
so it comes first, such as
`sudo iptables -I DOCKER-USER -i wizzaroo-mail -d 192.168.1.60 -p tcp --dport 443 -j ACCEPT`.

The bridges exist once the stack has started. Check it after any change to the
server's firewall or Docker: each of these must time out, and the site must
still answer and send email:

```bash
docker run --rm --network wizzaroo_tunnel-egress busybox nc -z -w 3 192.168.1.50 445
docker run --rm --network wizzaroo_mail busybox nc -z -w 3 192.168.1.50 445
docker run --rm --network wizzaroo_mail busybox nc -z -w 3 192.168.1.1 80
docker run --rm --network wizzaroo_voices-egress busybox nc -z -w 3 192.168.1.50 445
```

## Creating the owner's account

Once, after the first start, create your own account and your Family:

```bash
docker compose exec app node dist/src/server/index.js seed-owner
```

This is `pnpm seed:owner` run inside the `app` container, which has the built
server but not pnpm. It asks for your email address, a password of at least
12 characters (twice, without showing it) and your Family's name, and gives
your account both the Admin and Parent roles. Running it again changes
nothing and says so. Then sign in at
`https://wizzaroo.adrianeyre.co.uk/parent/`.

## Checking it

```bash
docker compose ps
curl http://127.0.0.1:4310/health
```

`app`, `postgres` and `backup` should all say `healthy`, and `/health` should answer
`{"status":"ok"}`. `docker compose logs -f app` follows the server's log, and
`docker compose logs cloudflared` shows whether the tunnel connected. Every
container's log rotates at 10 MB and keeps three files, so `docker compose logs`
reaches back at most 30 MB; what the server's log holds is in
[keeping data safe](../guide/security-and-backups.md#the-servers-log).

## Backups

`backup` takes a `pg_dump` of the database when it starts and then every night
at `BACKUP_HOUR_UTC` o'clock (2 unless set), encrypts it with
[age](https://age-encryption.org) to `BACKUP_AGE_RECIPIENT`, and copies it with
[rclone](https://rclone.org) to two targets
([ADR 0030](../architectural-decision-record/0030-backups-go-to-the-nas-and-a-locked-b2-bucket.md)):

- **The NAS**, `BACKUP_RCLONE_REMOTE`: a WD My Cloud EX4 on the LAN. `backup`
  keeps the newest `BACKUP_KEEP_NIGHTS` backups there (30 unless set) and
  deletes the rest.
- **The off-site bucket**, `BACKUP_RCLONE_OFFSITE_REMOTE`: Backblaze B2 in EU
  Central. `backup` never deletes anything there. Its key can't, and Object
  Lock keeps every backup for 90 days, after which a lifecycle rule removes it.

Each copy is tried on its own, so the NAS being off never stops the off-site
copy, nor the other way round.

Between backups, `backup` checks every minute for a Family, Child or adult the
Admin has just deleted, and sends each one's id to both targets as a file of
its own in `wizzaroo-deletions/`, so a restore of an older backup can delete
it again ([restoring a backup](./restoring-a-backup.md)). Each backup sends
them too. A file is sent once and never overwritten or pruned, and the
bucket's lifecycle rule covers these files as well, since they also start
`wizzaroo-`.
[Restoring a backup](./restoring-a-backup.md) is the other half.

Set it up once, before the first start with these lines.

### The key pair

Make it on another computer, never the server:
`age-keygen -o wizzaroo-backup-identity.txt`. It prints the public key
(`age1…`): that is `BACKUP_AGE_RECIPIENT`. Keep the file, the private key, off
the server, in a password manager. The server can only encrypt, so someone who
takes the server, the NAS or the bucket can't read the backups.

### The NAS

The EX4 runs My Cloud OS 3, which Western Digital stopped updating in April 2022. It is fine as a target only because it never holds anything readable.
Give it as little as possible:

1. **Reserve its address.** On the router, give the EX4 a DHCP reservation for
   `192.168.1.50`.
2. **Keep it off the internet.** No port forwarding to it, and cloud access
   off. Check the router hasn't opened anything to it through UPnP.
3. **Make a share and a user for backups only.** In the EX4's dashboard, create
   a share `wizzaroo-backups` and a user `wizzaroo-backup` with a long random
   password, with read/write on that share and no access to any other.
4. **Check its SMB version.** Under Settings → Network → Windows Services, the
   EX4 must offer SMB2 or later, because rclone's `smb` backend doesn't speak
   SMB1. If it only offers SMB1, use an `ftp` remote for the same user instead:
   with explicit FTPS (`explicit_tls = true`) if FTP's TLS option is there, plain
   FTP otherwise. Plain FTP shows that one user's password to the LAN, and
   nothing else.
5. **Keep it awake at the backup hour.** No disk-sleep or power schedule may
   switch it off at `BACKUP_HOUR_UTC`, or that night's NAS copy fails.

### The off-site bucket

1. **Make a Backblaze account in the EU Central region.** The region is chosen
   when the account is made and can't change, and it keeps the Children's data
   in the EU.
2. **Create a private bucket with Object Lock on**, named
   `wizzaroo-backups-` and a few random characters, since bucket names are
   global. Set its default retention to **compliance mode, 90 days**. In
   compliance mode no one, the owner included, can delete a backup before its
   90 days are up.
3. **Add a lifecycle rule** to the bucket for files starting `wizzaroo-`: hide
   them 90 days after upload and delete them 1 day after hiding. Object Lock
   refuses the deletion until each backup's 90 days have passed.
4. **Create the server's application key**, limited to that bucket, with only
   `listBuckets`, `listFiles` and `writeFiles`. Without `deleteFiles`, it can't
   delete anything. It can still hide a file, but the hidden version stays
   locked, and can be restored from, for 90 days.
5. **Create a second, read-only key** for restores, limited to that bucket,
   with `listBuckets`, `listFiles` and `readFiles`. Keep it in the password
   manager, never on the server.

### The rclone config

Run `rclone config` on any computer to make an `rclone.conf` with both
remotes. `rclone config` obscures the NAS password as it saves it. Obscured
isn't encrypted, so the file itself must stay private:

```ini
[nas]
type = smb
host = 192.168.1.50
user = wizzaroo-backup
pass = …

[offsite]
type = b2
account = …
key = …
hard_delete = true
```

`account` and `key` are the server's application key: its ID and the key
itself. `hard_delete = true` makes any delete a real one, which that key is
refused, rather than a hide.

Copy it to the server beside `docker-compose.yml`, and let only the
container's `postgres` user (uid 70) read it:
`sudo chown 70 rclone.conf && sudo chmod 600 rclone.conf`. Git ignores it.
Then set, in `.env`:

```bash
BACKUP_RCLONE_CONFIG_FILE=./rclone.conf
BACKUP_RCLONE_REMOTE=nas:wizzaroo-backups
BACKUP_RCLONE_OFFSITE_REMOTE=offsite:wizzaroo-backups-k3x9
```

Check both from the server before the first start. The NAS should take a
file and let it be deleted:

```bash
docker compose run --rm --no-deps backup sh -c \
  'rclone touch "$BACKUP_RCLONE_REMOTE/wizzaroo-probe" && rclone deletefile "$BACKUP_RCLONE_REMOTE/wizzaroo-probe"'
```

The bucket should take a file and refuse to delete it. The probe stays locked
for 90 days, and the lifecycle rule then removes it. The nightly backup runs
the same check itself, every night; see [checking it](#checking-it-1):

```bash
docker compose run --rm --no-deps backup sh -c \
  'rclone touch "$BACKUP_RCLONE_OFFSITE_REMOTE/wizzaroo-probe" && ! rclone deletefile "$BACKUP_RCLONE_OFFSITE_REMOTE/wizzaroo-probe" && echo "delete refused, as it should be"'
```

### Checking it

**A failed backup is loud.** When either copy fails, `backup.sh` logs
`backup.upload.failed remote=…`, naming the target, and exits with an error.
So does a night whose off-site key could delete what it sent: each night
`backup.sh` sends a probe to `wizzaroo-lock-probes/` in the bucket, deletes it
for good and checks it is still there. It logs
`backup.offsite.delete-refused`, as it should, or
`backup.offsite.delete-allowed`, and fails the night: the key has
`deleteFiles`, or the bucket has no Object Lock in compliance mode, and a
server that is taken could delete every off-site backup
([pen test I4, #317](../pen-test/findings/I4.md)). Nothing in
`docker-compose.yml` turns the check off.
`backup.nightly.failed` then says the container is now unhealthy:
`docker compose ps` shows `backup` as `unhealthy` until a backup reaches both,
and also once a day passes without one. A deletion that doesn't reach both
logs `backup.deletions.upload.failed remote=…` and `backup.deletions.failed`,
and the container is unhealthy until a later try sends it. Check it after every deploy:

```bash
docker compose ps backup
docker compose logs backup
```

Each backup is named for when it was taken, in UTC, as
`wizzaroo-2026-11-16T020000Z.dump.age`. Restarting the container takes one
more, which counts towards the ones kept on the NAS.

## Things to know

- **Changing `POSTGRES_PASSWORD` after the first start doesn't change the
  database's password.** Postgres sets it only when the volume is new, so `app`
  can no longer connect. Put the old one back, or change it inside Postgres
  with `ALTER USER wizzaroo PASSWORD '…'` before changing `.env`.
- **Changing `BACKUP_POSTGRES_PASSWORD` takes effect on the next
  `docker compose up -d`.** `backup-role` sets the role's password on every
  start, from `.env`, and refuses to start, so `backup` doesn't either, when it
  is empty or the same as `POSTGRES_PASSWORD`.
- **`docker compose down` keeps the data. `docker compose down -v` deletes it**,
  leaving only the off-site backups to [restore](./restoring-a-backup.md) from.
- **On a development machine**, port 4310 is the same one `pnpm dev` uses, so
  stop one before starting the other. The stack's project is `wizzaroo` and the
  development database's is `wizzaroo-dev`, so their volumes never mix.
