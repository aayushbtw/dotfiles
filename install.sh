#!/usr/bin/env bash

DOTFILES="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"

[ -d ~/.config ] || mkdir ~/.config

# Zsh (.zshenv in home to set ZDOTDIR)
mkdir -p ~/.config/zsh
ln -sf "$DOTFILES/config/zsh/.zshenv" ~/.zshenv
ln -sf "$DOTFILES/config/zsh/.zshrc" ~/.config/zsh/.zshrc
ln -sf "$DOTFILES/config/zsh/utils.zsh" ~/.config/zsh/utils.zsh
ln -sf "$DOTFILES/config/zsh/aliases.zsh" ~/.config/zsh/aliases.zsh
ln -sf "$DOTFILES/config/zsh/apps.zsh" ~/.config/zsh/apps.zsh

# Starship
ln -sf "$DOTFILES/config/starship.toml" ~/.config/starship.toml

# Ghostty
mkdir -p ~/.config/ghostty
ln -sf "$DOTFILES/config/ghostty/config.ghostty" ~/.config/ghostty/config.ghostty

# Zed
mkdir -p ~/.config/zed
ln -sf "$DOTFILES/config/zed/settings.json" ~/.config/zed/settings.json
ln -sf "$DOTFILES/config/zed/keymap.json" ~/.config/zed/keymap.json
