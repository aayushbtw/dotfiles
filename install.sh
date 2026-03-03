#!/usr/bin/env bash

[ -d ~/.config ] || mkdir ~/.config

# Ghostty (whole dir)
ln -s ~/Projects/dotfiles/ghostty ~/.config/ghostty

# Zed (files only — ~/.config/zed has runtime data managed by Zed)
ln -s ~/Projects/dotfiles/zed/settings.json ~/.config/zed/settings.json
ln -s ~/Projects/dotfiles/zed/keymap.json   ~/.config/zed/keymap.json
