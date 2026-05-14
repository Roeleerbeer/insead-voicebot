"""Builds the system prompt from markdown files in agent/content/.

Each content file has a YAML front-matter header (which is stripped from
the prompt body). Files are concatenated in `SECTION_ORDER`. A short hash
of the concatenated body is exposed as `PROMPT_VERSION` so we can log
which prompt a session ran with.
"""

from __future__ import annotations

import hashlib
import re
from pathlib import Path

CONTENT_DIR = Path(__file__).parent / "content"

SECTION_ORDER = (
    "persona.md",
    "course.md",
    "use-case.md",
    "team.md",
    "faq.md",
)

_FRONT_MATTER = re.compile(r"\A---\n.*?\n---\n", re.DOTALL)


def _strip_front_matter(text: str) -> str:
    return _FRONT_MATTER.sub("", text, count=1).lstrip()


def _load() -> tuple[str, str]:
    parts: list[str] = []
    for name in SECTION_ORDER:
        path = CONTENT_DIR / name
        body = _strip_front_matter(path.read_text(encoding="utf-8"))
        parts.append(body.strip())
    joined = "\n\n---\n\n".join(parts)
    version = hashlib.sha256(joined.encode("utf-8")).hexdigest()[:8]
    return joined, version


SYSTEM_PROMPT, PROMPT_VERSION = _load()
