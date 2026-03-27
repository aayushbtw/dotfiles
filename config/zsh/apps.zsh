export HOMEBREW_NO_ENV_HINTS=1

# fnm
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
