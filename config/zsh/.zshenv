export XDG_CONFIG_HOME="$HOME/.config"
export ZDOTDIR="$XDG_CONFIG_HOME/zsh"
export HOMEBREW_NO_ENV_HINTS=1

# Nested shells and macOS's path_helper re-add entries; this drops the repeats.
typeset -U path fpath

# Vite+ bin (https://viteplus.dev)
. "$HOME/.config/vite-plus/env"
