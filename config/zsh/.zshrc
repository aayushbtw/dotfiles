######### ALIAS ##########
alias c='code .'
alias o='open .'
alias genpass='openssl rand -hex 32'

has_or_warn() {
  command -v "$1" >/dev/null || {
    echo "[zsh] $1 not found" >&2
    return 1
  }
}

if has_or_warn eza; then
  alias ls='eza -l -g --icons'
  alias ll='eza --icons'
fi

if has_or_warn bat; then
  alias cat='bat'
fi

############# APPS ##############
export HOMEBREW_NO_ENV_HINTS=1

# bun
[ -s "$HOME/.bun/_bun" ] && source "$HOME/.bun/_bun"
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# fnm
FNM_PATH="$HOME/Library/Application Support/fnm"
[ -d "$FNM_PATH" ] && export PATH="$FNM_PATH:$PATH"

if has_or_warn fnm; then
  eval "$(fnm env --use-on-cd --shell zsh)"
fi

# pnpm
export PNPM_HOME="$HOME/Library/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac

# zoxide
if has_or_warn zoxide; then
  eval "$(zoxide init zsh)"
fi

# starship
if has_or_warn starship; then
  eval "$(starship init zsh)"
fi