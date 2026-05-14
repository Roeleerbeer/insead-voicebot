# Deploying insead-voicebot to the VPS

Follows the shared-Caddy + Docker Compose pattern used by `situatieschets`
and `werkbank`. Three containers on the existing Hetzner box behind shared
Caddy: `insead-voicebot-livekit`, `insead-voicebot-web`, `insead-voicebot-agent`.

## One-time setup (do this once)

### 1. DNS

Add one A record at the registrar pointing to `178.104.235.137`:

- `insead-voicebot.roelconijn.nl`

Caddy routes `/rtc` and `/twirp/*` to the LiveKit container and everything
else to the Next.js container, so the page and the WebSocket share the same
host (and the same TLS connection via HTTP/2 — saves a handshake on session
start).

Wait for it to resolve before continuing (`dig insead-voicebot.roelconijn.nl`).

### 2. Firewall — open the LiveKit media ports

LiveKit signaling goes through Caddy on 443, but UDP/TCP media bypass Caddy
entirely. On the VPS:

```bash
ufw allow 7881/tcp comment "LiveKit RTC TCP fallback"
ufw allow 7882/udp comment "LiveKit RTC UDP media"
```

(Or `iptables` equivalent if you are not on ufw — same two rules.)

### 3. Secrets

Create the prod env file with the real values from `.env.example`:

```bash
ssh root@178.104.235.137 'mkdir -p /etc/insead-voicebot && chmod 700 /etc/insead-voicebot'

# Edit a local copy of .env.example with real values, then:
scp local-prod.env root@178.104.235.137:/etc/insead-voicebot/prod.env
ssh root@178.104.235.137 'chmod 600 /etc/insead-voicebot/prod.env'
```

Pick non-default `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` (NOT `devkey:secret`),
plus a long random `ADMIN_SECRET`.

### 4. Caddy

Append the snippet and reload:

```bash
scp deploy/Caddyfile.snippet root@178.104.235.137:/tmp/voicebot.caddy
ssh root@178.104.235.137 'cat /tmp/voicebot.caddy >> /root/infra/Caddyfile && \
  docker exec infra-caddy-1 caddy reload --config /etc/caddy/Caddyfile'
```

Caddy auto-provisions Let's Encrypt certs for both subdomains on first request.

## Deploy (and update)

Run from the repo root locally. No wrapper script — same pattern as the other
projects on this VPS.

```bash
tar -czf - \
  --exclude=node_modules --exclude=.git --exclude=.env --exclude=.env.local \
  --exclude=web/.next --exclude=agent/.venv --exclude=agent/__pycache__ \
  --exclude=data --exclude=.livekit \
  . | \
  ssh root@178.104.235.137 'mkdir -p /opt/insead-voicebot && tar -xzf - -C /opt/insead-voicebot'

ssh root@178.104.235.137 'cd /opt/insead-voicebot && \
  docker compose -f compose.prod.yml --env-file /etc/insead-voicebot/prod.env up -d --build && \
  docker restart insead-voicebot-web'
```

The trailing `docker restart insead-voicebot-web` works around Caddy caching
the upstream container's IP across rebuilds. Without it the first request
after a rebuild returns 502 until Caddy retries.

## Verify

```bash
# Health endpoint behind Caddy
curl https://insead-voicebot.roelconijn.nl/healthz   # → 200

# Logs
ssh root@178.104.235.137 'docker logs -f --tail=50 insead-voicebot-agent'
ssh root@178.104.235.137 'docker logs -f --tail=50 insead-voicebot-livekit'

# Cost counters (after the cost-guardrails wiring lands)
ssh root@178.104.235.137 'docker exec insead-voicebot-web \
  sqlite3 /data/usage.sqlite "SELECT * FROM usage_counters;"'
```

Open `https://insead-voicebot.roelconijn.nl` in a browser, tap the orb,
have a conversation. If the orb connects but no audio comes through, the
firewall almost certainly is not letting UDP 7882 reach the host — re-check
step 2.

## Kill switch

Two layers, soft pause first:

```bash
# Soft pause — token endpoint returns 503 "Demo paused", existing sessions drain
ssh root@178.104.235.137 'docker exec insead-voicebot-web \
  sqlite3 /data/usage.sqlite "INSERT OR REPLACE INTO flags(key,value) VALUES(\"paused\",\"1\");"'

# Resume
ssh root@178.104.235.137 'docker exec insead-voicebot-web \
  sqlite3 /data/usage.sqlite "INSERT OR REPLACE INTO flags(key,value) VALUES(\"paused\",\"0\");"'

# Or via the secret URL (anywhere on the internet)
curl "https://insead-voicebot.roelconijn.nl/api/admin?key=<ADMIN_SECRET>&action=pause"
curl "https://insead-voicebot.roelconijn.nl/api/admin?key=<ADMIN_SECRET>&action=resume"

# Hard stop — kills both containers, frees the demo entirely
ssh root@178.104.235.137 'cd /opt/insead-voicebot && \
  docker compose -f compose.prod.yml stop'
```
