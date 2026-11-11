#!/bin/sh
# orbit installs from a Folder marketplace at this checkout, so a stale main means a stale plugin.
repo="$HOME/Projects/orbit"
[ "$(git -C "$repo" branch --show-current)" = main ] || exit 0
[ -z "$(git -C "$repo" status --porcelain)" ] || exit 0
git -C "$repo" fetch -q origin main && git -C "$repo" merge -q --ff-only origin/main
