# Deploying insead-voicebot to the VPS

Three containers on the shared Hetzner box behind shared Caddy:
`insead-voicebot-web` (Next.js), `insead-voicebot-agent` (Python LiveKit
worker), and `insead-voicebot-livekit` (self-hosted livekit-server). One
subdomain — `insead-voicebot.roelconijn.nl` — routes both the page and the
LiveKit WSS signaling via Caddy. UDP/TCP media bypasses Caddy on direct
host ports 7881 and 7882.

The first production deploy was 2026-05-14; the one-time setup below has
already been done. The **Update procedure** section is what you run for
subsequent deploys.

## Update procedure (the normal case)

From the local repo root:

```bash
tar -czf - \
  --exclude=node_modules --exclude=.git --exclude=.env --exclude=.env.local \
  --exclude=web/.next --exclude=agent/.venv --exclude=agent/__pycache__ \
  --exclude=data --exclude=.livekit \
  . | \
  ssh root@178.104.235.137 'tar -xzf - -C /opt/insead-voicebot'

ssh root@178.104.235.137 'cd /opt/insead-voicebot && \
  docker compose -f compose.prod.yml --env-file /etc/insead-voicebot/prod.env up -d --build && \
  docker restart insead-voicebot-web'
```

The trailing `docker restart insead-voicebot-web` works around Caddy
caching the upstream container's IP across rebuilds — without it the
first request after a rebuild returns 502 until Caddy retries.

`tar` does not delete on the receiving side. If you remove or rename a
file locally, manually clean it up on the VPS or it will keep being
served from `/opt/insead-voicebot/`.

If only `agent/content/*.md` changed, you can skip the rebuild:

```bash
# Refresh just the markdown the bot reads.
scp agent/content/*.md root@178.104.235.137:/opt/insead-voicebot/agent/content/
ssh root@178.104.235.137 'docker restart insead-voicebot-agent insead-voicebot-web'
```

If you changed the Caddy snippet, see **Updating the Caddy block** below
— do not just append again or you'll get a duplicate site block.

## Architecture

```
insead-voicebot.roelconijn.nl  (Caddy, port 443)
       │
       ├── /rtc, /twirp/*  →  insead-voicebot-livekit (LiveKit WS, internal :7880)
       └── everything else →  insead-voicebot-web    (Next.js,    internal :3000)

UDP/TCP media (NOT through Caddy):
  178.104.235.137:7881/tcp →  insead-voicebot-livekit (RTC TCP fallback)
  178.104.235.137:7882/udp →  insead-voicebot-livekit (RTC UDP media, multiplexed)

insead-voicebot-agent has no exposed ports. It dials internally on
ws://livekit:7880 over the docker-compose network and registers as a
LiveKit Agents worker.
```

## One-time setup (already done — keep for fresh-VPS scenarios)

### 1. DNS

One A record at the registrar pointing to `178.104.235.137`:

- `insead-voicebot.roelconijn.nl`

Wait for it to resolve (`dig insead-voicebot.roelconijn.nl`).

### 2. Firewall — open the LiveKit media ports

LiveKit signaling goes through Caddy on 443, but UDP/TCP media bypass
Caddy entirely.

```bash
ssh root@178.104.235.137 \
  'ufw allow 7881/tcp comment "LiveKit RTC TCP fallback" && \
   ufw allow 7882/udp comment "LiveKit RTC UDP media"'
```

### 3. Secrets

```bash
ssh root@178.104.235.137 'mkdir -p /etc/insead-voicebot && chmod 700 /etc/insead-voicebot'

# Build a local copy of .env.example with real values, then:
scp local-prod.env root@178.104.235.137:/etc/insead-voicebot/prod.env
ssh root@178.104.235.137 'chmod 600 /etc/insead-voicebot/prod.env'
```

`LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` MUST be fresh random strings
— NOT the `devkey`/`secret` placeholders that the dev `--dev` mode
ships with. Generate with `openssl rand -hex 8` and `openssl rand -hex
32` respectively. `ADMIN_SECRET` similarly — `openssl rand -hex 32`.

### 4. Caddy

Append the snippet to the shared Caddyfile and reload:

```bash
scp deploy/Caddyfile.snippet root@178.104.235.137:/tmp/voicebot.caddy
ssh root@178.104.235.137 \
  'echo "" >> /root/infra/Caddyfile && \
   cat /tmp/voicebot.caddy >> /root/infra/Caddyfile && \
   rm /tmp/voicebot.caddy && \
   docker exec infra-caddy-1 caddy reload --config /etc/caddy/Caddyfile'
```

Caddy auto-provisions the Let's Encrypt cert on first request.

### 5. First deploy

Run the **Update procedure** above. On the first run, `docker compose`
builds both images from source — expect ~2 minutes for the web image
(Next.js standalone + better-sqlite3 native build) and ~1 minute for
the agent image.

## Updating the Caddy block

If you change `deploy/Caddyfile.snippet`, do NOT just append again —
that produces a duplicate site block. Use the included helper:

```bash
scp deploy/_replace_caddy_block.py deploy/Caddyfile.snippet root@178.104.235.137:/tmp/
ssh root@178.104.235.137 \
  'python3 /tmp/_replace_caddy_block.py && \
   echo "" >> /root/infra/Caddyfile && \
   cat /tmp/Caddyfile.snippet >> /root/infra/Caddyfile && \
   rm /tmp/_replace_caddy_block.py /tmp/Caddyfile.snippet && \
   docker exec infra-caddy-1 caddy reload --config /etc/caddy/Caddyfile'
```

The helper strips the existing `insead-voicebot.roelconijn.nl { ... }`
block before the new one is appended.

## Verify

```bash
# Root page
curl -I https://insead-voicebot.roelconijn.nl/

# Token endpoint (cap-checked; should return JSON with a JWT)
curl -X POST https://insead-voicebot.roelconijn.nl/api/token

# Logs (in separate terminals)
ssh root@178.104.235.137 'docker logs -f --tail 100 insead-voicebot-agent'
ssh root@178.104.235.137 'docker logs -f --tail 100 insead-voicebot-livekit'
ssh root@178.104.235.137 'docker logs -f --tail 100 insead-voicebot-web'

# Cost counters
ssh root@178.104.235.137 \
  'docker exec insead-voicebot-web sqlite3 /data/usage.sqlite \
    "SELECT * FROM usage_counters ORDER BY updated_at DESC LIMIT 20;"'

# Concurrent agents registered (should be ≥1)
ssh root@178.104.235.137 \
  'docker logs --tail 200 insead-voicebot-livekit 2>&1 | grep "worker registered" | tail -5'
```

End-to-end test: open `https://insead-voicebot.roelconijn.nl` in a real
browser, tap the orb, have a short conversation. Then repeat from a
phone on cellular (not your home wifi) to confirm WebRTC media reaches
the box from a different network path.

If the orb connects (the agent reports "registered worker" in the
livekit logs) but no audio flows, the most likely cause is the UDP
firewall rule on 7882 — re-check `ufw status` on the VPS.

## Kill switch

Two layers, soft pause first.

```bash
# Soft pause — token endpoint returns 503 "Demo paused", existing sessions drain
curl "https://insead-voicebot.roelconijn.nl/api/admin?key=${ADMIN_SECRET}&action=pause"

# Resume
curl "https://insead-voicebot.roelconijn.nl/api/admin?key=${ADMIN_SECRET}&action=resume"

# Status
curl "https://insead-voicebot.roelconijn.nl/api/admin?key=${ADMIN_SECRET}&action=status"

# Or directly via SQLite (no admin secret needed)
ssh root@178.104.235.137 \
  'docker exec insead-voicebot-web sqlite3 /data/usage.sqlite \
    "INSERT OR REPLACE INTO flags(key,value) VALUES(\"paused\",\"1\");"'

# Hard stop — kills all three containers
ssh root@178.104.235.137 'cd /opt/insead-voicebot && docker compose -f compose.prod.yml stop'

# Hard start again after a stop
ssh root@178.104.235.137 \
  'cd /opt/insead-voicebot && \
   docker compose -f compose.prod.yml --env-file /etc/insead-voicebot/prod.env up -d'
```

## Lessons from the first deploy (2026-05-14)

A few things tripped me up the first time. All fixed in the repo now;
this is here so future-you (or future-me) does not relearn the same
things.

### pnpm 10/11 blocks native build scripts by default

`pnpm install` refuses to run post-install scripts for native deps like
`better-sqlite3` and `sharp` unless they are allowlisted. The `pnpm`
config keys for the allowlist (`pnpm.onlyBuiltDependencies` in
package.json, `onlyBuiltDependencies:` in pnpm-workspace.yaml) did not
take effect in the container build — pnpm kept printing
`[ERR_PNPM_IGNORED_BUILDS]` and exiting 1.

Fix in `web/Dockerfile`: `pnpm install --frozen-lockfile --ignore-scripts`
followed by `pnpm rebuild better-sqlite3`. Sidesteps the approval flow
entirely.

### Next.js standalone server.js is at /app, not /app/web

With `output: "standalone"` and the build context at the repo root
(`/app/web` is the source), Next.js puts the entry at
`/app/web/.next/standalone/server.js`. When we `COPY .next/standalone
/app` it lands at `/app/server.js`, NOT `/app/web/server.js`. The
runtime stage must therefore use `WORKDIR /app` and `CMD ["node",
"server.js"]`, and copy `.next/static` to `./.next/static` (relative to
/app) and `public` to `./public`.

### page.tsx path to agent/content/ has to be configurable

`web/lib/content.ts` reads agent markdown files. In dev that path is
`../agent/content/` relative to the web/ working directory. In the
standalone container the working directory is `/app` and the markdown
is at `/app/agent/content/`. Solution: respect an `AGENT_CONTENT_DIR`
env var, default to the dev path. The Dockerfile sets
`AGENT_CONTENT_DIR=/app/agent/content`.

### Caddy auto-orders `respond` after `reverse_proxy`

The original Caddy snippet used `respond /healthz 200` at the top of
the site block. Caddy's directive auto-ordering placed the bare
`respond` AFTER the catch-all `reverse_proxy`, which therefore caught
the `/healthz` request first and proxied it to Next.js (404). Wrapping
`/healthz` in a `handle` block beats this most of the time, but in
this configuration Caddy still routes `/healthz` to the Next.js
container. Filed a follow-up issue — monitoring nice-to-have, not a
blocker. The root URL serves 200 and uptime monitors can hit that.

### LiveKit external IP detection works automatically

`rtc.use_external_ip: true` in `deploy/livekit.yaml` plus the firewall
ports open meant LiveKit found 178.104.235.137 via STUN on first boot
and used that for ICE candidate advertisement. No extra config needed.
The container log line `found external IP via STUN ... externalIP:
178.104.235.137` confirms it.
