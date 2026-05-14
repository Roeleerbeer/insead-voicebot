# INSEAD Voicebot

Meta voicebot demo for an INSEAD course final presentation.

Live at <https://insead-voicebot.roelconijn.nl>.

Three pieces:

- `web/` — Next.js frontend (browser mic + LiveKit room + transcript view)
- `agent/` — Python LiveKit Agent worker (Deepgram STT → Claude Haiku 4.5 → ElevenLabs Flash TTS)
- `livekit-server` — self-hosted WebRTC SFU (Windows local dev: native binary in `.livekit/`; Linux/VPS: Docker — `docker-compose.dev.yml` for dev, `compose.prod.yml` for prod)

PRDs live as GitHub issues with the `prd` label.

For production deployment to the Hetzner VPS, see [`deploy/bootstrap.md`](deploy/bootstrap.md).

## Prerequisites

- Node 22+ (24 works)
- pnpm (`iwr https://get.pnpm.io/install.ps1 -useb | iex` on Windows)
- Python 3.12+
- uv (`pip install uv` or see <https://docs.astral.sh/uv/>)
- API keys: [Deepgram](https://deepgram.com), [Anthropic](https://console.anthropic.com), [ElevenLabs](https://elevenlabs.io)
- Either Docker Desktop (Linux/Mac) **or** the bundled `.livekit\livekit-server.exe` (Windows — already in repo via setup script below)

## Setup

```powershell
# 1. Copy env files (defaults already point at local livekit-server)
cp web/.env.local.example web/.env.local
cp agent/.env.example agent/.env
# Fill in DEEPGRAM_API_KEY, ANTHROPIC_API_KEY, ELEVENLABS_API_KEY in agent/.env

# 2. Install deps
pnpm --dir web install
uv sync --project agent

# 3. (Windows only, one-time) Fetch livekit-server binary if not present
$dest = ".livekit"; New-Item -ItemType Directory -Force -Path $dest | Out-Null
Invoke-WebRequest -UseBasicParsing `
  https://github.com/livekit/livekit/releases/latest/download/livekit_1.11.0_windows_amd64.zip `
  -OutFile "$dest\livekit.zip"
Expand-Archive -Force -Path "$dest\livekit.zip" -DestinationPath $dest
Remove-Item "$dest\livekit.zip"
```

## Run

Three terminals:

```powershell
# Terminal 1 — livekit-server
# Windows:
.\.livekit\livekit-server.exe --dev --bind 0.0.0.0
# Linux/Mac (Docker):
docker compose -f docker-compose.dev.yml up

# Terminal 2 — agent worker
cd agent
uv run python main.py dev

# Terminal 3 — web frontend
cd web
pnpm dev
```

Open <http://localhost:3000>, click Start, talk.

Default dev credentials are `devkey` / `secret`; they are baked into livekit-server's `--dev` mode and match the `.env.example` defaults. Never use these in production.

## Transcript streaming

The bot's transcript appears in the browser word-by-word in sync with the spoken audio (rather than dumping all at once or racing ahead of TTS). This is driven by LiveKit Agents' `TranscriptSynchronizer`, which paces text emission against ElevenLabs playback. The agent opts in explicitly via `RoomOptions(text_output=TextOutputOptions(sync_transcription=True))` in `agent/main.py` — that matches the LiveKit default but is set explicitly so the streaming behavior is locked in even if defaults change. On the web side, `web/components/useVoiceSession.ts` listens to `RoomEvent.TranscriptionReceived` and updates each segment in place by `id`, which is what enables the progressive reveal.

## Production deploy

The demo is deployed at <https://insead-voicebot.roelconijn.nl> on a Hetzner VPS behind shared Caddy. Three containers (`insead-voicebot-web`, `insead-voicebot-agent`, `insead-voicebot-livekit`) plus open firewall ports for WebRTC media on 7881/tcp and 7882/udp. Hard cost cap of $20/month enforced in `web/lib/usage.ts` (token endpoint refuses to mint new tokens once tripped) plus a kill switch at `/api/admin?key=…&action=pause`.

Full deploy procedure and gotchas in [`deploy/bootstrap.md`](deploy/bootstrap.md).
