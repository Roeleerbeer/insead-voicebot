"""LiveKit Agent worker for the INSEAD voicebot demo."""

import asyncio
import logging
import os
import time

from dotenv import load_dotenv
from livekit.agents import AutoSubscribe, JobContext, JobProcess, WorkerOptions, cli
from livekit.agents.voice import Agent, AgentSession
from livekit.agents.voice.events import (
    AgentStateChangedEvent,
    ConversationItemAddedEvent,
    UserInputTranscribedEvent,
    UserStateChangedEvent,
)
from livekit.agents.voice.room_io import RoomOptions, TextOutputOptions
from livekit.plugins import anthropic, deepgram, elevenlabs, silero

from prompt import PROMPT_VERSION, SYSTEM_PROMPT

load_dotenv()
logger = logging.getLogger("voicebot")
logging.basicConfig(level=logging.INFO)

MAX_SESSION_SECONDS = int(os.getenv("MAX_SESSION_MINUTES", "5")) * 60
SILENCE_TIMEOUT_SECONDS = 60
WARN_BEFORE_CAP_SECONDS = 10


def prewarm(proc: JobProcess) -> None:
    proc.userdata["vad"] = silero.VAD.load()


async def entrypoint(ctx: JobContext) -> None:
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    logger.info("agent joined room %s (prompt %s)", ctx.room.name, PROMPT_VERSION)

    session = AgentSession(
        vad=ctx.proc.userdata.get("vad") or silero.VAD.load(),
        stt=deepgram.STT(
            model="nova-3",
            api_key=os.getenv("DEEPGRAM_API_KEY"),
            keyterms=["INSEAD", "LiveKit", "ElevenLabs", "Claude", "Deepgram"],
        ),
        llm=anthropic.LLM(
            model="claude-haiku-4-5-20251001",
            api_key=os.getenv("ANTHROPIC_API_KEY"),
            caching="ephemeral",
            max_tokens=120,
        ),
        tts=elevenlabs.TTS(
            api_key=os.getenv("ELEVENLABS_API_KEY"),
            voice_id=os.getenv("ELEVENLABS_VOICE_ID", "pNInz6obpgDQGcFmaJgB"),
            model="eleven_flash_v2_5",
        ),
    )

    last_activity = time.monotonic()

    def bump_activity() -> None:
        nonlocal last_activity
        last_activity = time.monotonic()

    @session.on("user_input_transcribed")
    def _on_user_transcribed(ev: UserInputTranscribedEvent) -> None:
        if ev.is_final and ev.transcript.strip():
            bump_activity()
            logger.info("user: %s", ev.transcript)

    @session.on("conversation_item_added")
    def _on_item_added(ev: ConversationItemAddedEvent) -> None:
        item = ev.item
        if getattr(item, "role", None) == "assistant":
            text = getattr(item, "text_content", None)
            if text:
                bump_activity()
                logger.info("bot: %s", text)

    @session.on("user_state_changed")
    def _on_user_state(ev: UserStateChangedEvent) -> None:
        if getattr(ev, "new_state", None) == "speaking":
            bump_activity()

    @session.on("agent_state_changed")
    def _on_agent_state(ev: AgentStateChangedEvent) -> None:
        if getattr(ev, "new_state", None) == "speaking":
            bump_activity()

    async def lifecycle_watcher() -> None:
        started = time.monotonic()
        warned = False
        while True:
            await asyncio.sleep(2)
            now = time.monotonic()
            elapsed = now - started

            if elapsed >= MAX_SESSION_SECONDS:
                await session.say("Thanks for chatting!")
                await asyncio.sleep(2)
                ctx.shutdown(reason="session length cap reached")
                return

            if not warned and elapsed >= MAX_SESSION_SECONDS - WARN_BEFORE_CAP_SECONDS:
                warned = True
                await session.say("We're almost out of time — anything else?")
                bump_activity()
                continue

            if now - last_activity >= SILENCE_TIMEOUT_SECONDS:
                await session.say(
                    "I'll be here if you want to chat more — bye for now."
                )
                await asyncio.sleep(2)
                ctx.shutdown(reason="silence timeout")
                return

    # sync_transcription=True paces transcript word emission to TTS audio playback,
    # so the text in the browser appears alongside the spoken words rather than racing ahead.
    await session.start(
        room=ctx.room,
        agent=Agent(instructions=SYSTEM_PROMPT),
        room_options=RoomOptions(text_output=TextOutputOptions(sync_transcription=True)),
    )
    await session.say(
        "Hi — I'm the working demo of Roel's team's INSEAD use-case: a voicebot "
        "for insurance customer contact. Ask me anything about the business case."
    )
    asyncio.create_task(lifecycle_watcher())


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm))
