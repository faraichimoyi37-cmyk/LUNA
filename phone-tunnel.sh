#!/usr/bin/env bash
# Expose the phone's LUNA server publicly with a free Cloudflare tunnel (no account).
# NOTE: the generated URL is random and changes every time this restarts.
cd "$HOME/LUNA"
exec cloudflared tunnel --url http://localhost:3000
