# syntax=docker/dockerfile:1.7

# Build context is the REPO ROOT (see compose.prod.yml).

FROM python:3.12-slim AS base

# uv for fast, reproducible dependency installs.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# 1. Install deps separately so source changes don't re-resolve packages.
COPY agent/pyproject.toml agent/uv.lock /app/agent/
WORKDIR /app/agent
RUN uv sync --frozen --no-cache

# 2. Bring in the agent source (including content/ markdown).
COPY agent /app/agent

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_CACHE_DIR=/tmp/uv-cache

# `start` is the production LiveKit Agents run mode (no watcher, no auto-reload).
CMD ["uv", "run", "python", "main.py", "start"]
