# Deploy: fresh Ubuntu VPS (Hostinger)

Three containers from `compose.yaml`: `app` (Next.js + Payload), `db` (Postgres 16, not exposed), `caddy` (HTTPS for hlyna.com.ua; www and hlyna.com redirect to it). The app lives in `/opt/hlyna`.

## 1. DNS (at the registrar)
A records, all pointing to the VPS IPv4 (add AAAA too if the VPS has IPv6):

| Name | Type | Value |
|---|---|---|
| `hlyna.com.ua` | A | VPS IP |
| `www.hlyna.com.ua` | A | VPS IP |
| `hlyna.com` | A | VPS IP |
| `www.hlyna.com` | A | VPS IP |

Caddy gets certificates only after these resolve to the server. Check: `dig +short hlyna.com.ua`.

## 2. Server basics (as root, once)
```bash
apt update && apt upgrade -y
adduser deploy && usermod -aG sudo deploy        # optional: non-root user with your SSH key

# Firewall: SSH + web only
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 443/udp
ufw enable

# Docker Engine + compose plugin (official repo)
apt install -y ca-certificates curl git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt update && apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
docker compose version
usermod -aG docker deploy                         # if you created the deploy user
```
Small VPS (≤2 GB RAM)? Add swap so `next build` does not run out of memory:
`fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab`

## 3. Code and secrets
```bash
git clone <repo-url> /opt/hlyna && cd /opt/hlyna
cp .env.example .env && chmod 600 .env
nano .env
```
Fill in:
- `POSTGRES_PASSWORD` = `openssl rand -hex 24`
- `PAYLOAD_SECRET`, `CRON_SECRET`, `PREVIEW_SECRET` = `openssl rand -hex 32` each
- `NEXT_PUBLIC_SERVER_URL=https://hlyna.com.ua`
- `DATABASE_URL` can stay as is: compose overrides it with the db container address.

## 4. Start
```bash
docker compose up -d --build
docker compose ps                     # app should become "healthy"
docker compose logs -f caddy          # watch certificates being issued
curl -I https://hlyna.com.ua          # 200
curl -I https://hlyna.com             # 301 -> https://hlyna.com.ua/
```
Then open https://hlyna.com.ua/admin and create the first admin user.

## 5. Backups (nightly, 14 days)
```bash
cp deploy/systemd/hlyna-backup.* /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now hlyna-backup.timer
systemctl start hlyna-backup.service && journalctl -u hlyna-backup -n 5   # test run
ls -lh /var/backups/hlyna
```
Dumps stay on the same disk. Copy them off the server now and then (e.g. `scp` / `rsync` to your Mac).
Restore: `deploy/restore.sh /var/backups/hlyna/db_<stamp>.dump [/var/backups/hlyna/media_<stamp>.tar.gz]`.

## 6. Updating the site
```bash
cd /opt/hlyna && deploy/release.sh    # git pull + build + up -d + health check
```
Same thing by hand: `git pull && docker compose up -d --build`.

## Everyday commands
```bash
docker compose ps
docker compose logs -f app
docker compose restart app
docker compose exec db psql -U hlyna hlyna       # SQL console
```
Never run `docker compose down -v`: `-v` deletes the database volume.
