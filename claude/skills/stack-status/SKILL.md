---
name: stack-status
description: Check whether the user's projects (portfolio, tomekit, constella, type, netigen-v2, octo) are on the shared stack before working in one, and record changes so others don't fall behind. Use at the start of work in any of those repos, when upgrading a dependency or changing lint/format/tooling config in one, or when asked about stack drift, sync, or migrations.
---

Source of truth: this folder, `~/.claude/skills/stack-status/`.

1. Run `node ~/.claude/skills/stack-status/status.ts <repo>` (or no args for all). Exit 1 means drift; `--json` and `--latest` (targets behind npm) are available. Mention any drift for the repo you're in before starting; don't fix it unasked.
2. If the task changes something `stack.json` tracks (a tracked package version, lint/format config, `.vscode`, pnpm, scripts), it is a stack change: update `stack.json` here and add a row to the migration log in `STACK.md`, marking the other repos `todo`. After changing a repo, rerun `status.ts`.
3. Add any non-obvious fix you needed to `STACK.md` "Gotchas".

Files here:
- `stack.json`: targets and rules. Edit here first.
- `STACK.md`: change protocol, reference lint block, migration log, gotchas.
- `status.ts`: the audit script.
- `files/`: canonical files copied verbatim into repos.
- `stylex-authoring.md`, `stylex-installation.md`: StyleX notes; read when working on StyleX setup.

Global tools (`stack.json` `global`) are installed with vp: `vp add -g <pkg>@<target>`, `vp upgrade` for vp itself. Never npm or pnpm `-g`. Never delete in a tracked repo without the user's OK.
