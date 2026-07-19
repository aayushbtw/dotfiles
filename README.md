# dotfiles

- [Zsh](https://www.zsh.org/)
- [Git](https://github.com)
- [Zed](https://zed.dev)
- [Ghostty](https://ghostty.org)
- [Starship](https://starship.rs)
- [Claude Code](https://claude.ai/code)
- [VS Code](https://code.visualstudio.com)

## Font

I use [JetBrains Mono](https://www.jetbrains.com/lp/mono/).

## Structure

Most configs live in `~/.config` (XDG standard). Two exceptions:

- **Claude Code** — reads from `~/.claude`, not XDG-configurable
- **VS Code** — reads from `~/Library/Application Support/Code/User` on macOS, not XDG-configurable

## Install

```sh
./install.sh
```
