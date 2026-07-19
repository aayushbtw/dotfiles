#!/usr/bin/env bash

DOTFILES="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"

# ~/.config
# Zsh
mkdir -p ~/.config/zsh
ln -sf "$DOTFILES/config/zsh/.zshenv" ~/.zshenv
ln -sf "$DOTFILES/config/zsh/.zprofile" ~/.config/zsh/.zprofile
ln -sf "$DOTFILES/config/zsh/.zshrc" ~/.config/zsh/.zshrc
ln -sf "$DOTFILES/config/zsh/utils.zsh" ~/.config/zsh/utils.zsh
ln -sf "$DOTFILES/config/zsh/aliases.zsh" ~/.config/zsh/aliases.zsh
ln -sf "$DOTFILES/config/zsh/apps.zsh" ~/.config/zsh/apps.zsh

# Starship
ln -sf "$DOTFILES/config/starship.toml" ~/.config/starship.toml

# Ghostty
[ -d ~/.config/ghostty ] && [ ! -L ~/.config/ghostty ] && rm -r ~/.config/ghostty
ln -sfn "$DOTFILES/config/ghostty" ~/.config/ghostty

# Git
mkdir -p ~/.config/git
ln -sf "$DOTFILES/config/git/ignore" ~/.config/git/ignore

# Zed
mkdir -p ~/.config/zed
ln -sf "$DOTFILES/config/zed/settings.json" ~/.config/zed/settings.json
ln -sf "$DOTFILES/config/zed/keymap.json" ~/.config/zed/keymap.json


# ~/.claude
# Claude Code
mkdir -p ~/.claude
ln -sf "$DOTFILES/claude/settings.json" ~/.claude/settings.json
ln -sf "$DOTFILES/claude/CLAUDE.md" ~/.claude/CLAUDE.md


# ~/Library/Application Support/Code/User
# VS Code
VSCODE_DIR="$HOME/Library/Application Support/Code/User"
mkdir -p "$VSCODE_DIR"
ln -sf "$DOTFILES/vscode/settings.json" "$VSCODE_DIR/settings.json"
ln -sf "$DOTFILES/vscode/keybindings.json" "$VSCODE_DIR/keybindings.json"
