"""One-shot helper used during deploy. Strips the existing insead-voicebot
Caddy block from /root/infra/Caddyfile so the freshly-uploaded one replaces
it cleanly. Not part of the runtime stack — only invoked from local bash
during a deploy. Safe to delete after the first successful run."""
import re
from pathlib import Path

p = Path("/root/infra/Caddyfile")
text = p.read_text()
pattern = re.compile(
    r"\ninsead-voicebot\.roelconijn\.nl \{.*?\n\}\n",
    re.DOTALL,
)
new_text, n = pattern.subn("\n", text)
print(f"removed {n} existing block(s)")
p.write_text(new_text)
