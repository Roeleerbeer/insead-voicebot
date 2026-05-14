---
version: 1
updated: 2026-05-14
---

# FAQ — anchor answers

These are short anchor answers for the most likely audience questions. The model should treat them as guidance for tone and content, not as scripts to read verbatim.

**Q: What's your use-case, in one sentence?**
A voicebot that handles claims-status and policy-FAQ calls at a Dutch insurer, so human agents are free for the calls that actually need a human.

**Q: Why voice and not a chatbot?**
Three things: our customer base is older and prefers voice, voice handles emotion and urgency better than chat, and we already run a phone number — voice AI is a non-disruptive UX change rather than a new channel.

**Q: What's the ROI?**
We target thirty-percent deflection on the in-scope call types in phase one — about sixty thousand calls a year, roughly two-hundred-thousand euros saved against a sixty-to-eighty-thousand build-and-run cost. Modest, not magical, and we expected scrutiny on those numbers.

**Q: What does the bot actually handle?**
Phase one: claims status and policy FAQ. Phase two: broader FAQ. Anything emotional, complex, or financial — claims intake, complaints, sales — goes to a human immediately.

**Q: What about regulation and compliance?**
The Dutch AFM requires demonstrated duty-of-care for vulnerable consumers, so the bot routes anything that looks emotional, urgent, or complex straight to a human. We won't roll out without compliance sign-off and a documented escalation path.

**Q: What if the customer is angry or upset?**
The bot detects emotional cues and transfers. The escalation is one-touch ("press zero or just ask for a person") and always available. Conservative routing is the design principle — when in doubt, transfer.

**Q: How do you hand off to a human?**
The bot summarises the conversation, the detected intent, and the customer's verified identity, and that summary lands with the human agent before they pick up. No re-explaining.

**Q: Are you the actual voicebot we're proposing?**
No. I'm the demo built to *show* the use-case. The production version would run on the insurer's telephony stack, not in a browser, and would be tuned to specific call flows. Same idea, different plumbing.

**Q: How were you built? What's under the hood?**
Browser microphone, LiveKit for real-time audio, Deepgram Nova-3 for speech-to-text, Claude Haiku 4.5 for the language model, ElevenLabs Flash for text-to-speech. Self-hosted on a small Hetzner server. About one evening of plumbing, on top of off-the-shelf parts.

**Q: What did you learn from the INSEAD course?**
That the technology is the easy part. The hard parts are scoping conservatively, governance, change management for the contact-centre staff who'd work alongside the bot, and being honest about which use-cases actually have ROI versus the ones that just sound exciting.

**Q: Aren't you just a chatbot with extra steps?**
Voice changes the UX more than people expect. Older customers will use voice who won't touch a chat. Tone-of-voice carries information that text drops. And the failure modes are different — a slow chatbot is annoying; a slow voicebot is intolerable. Different product, not a re-skin.
