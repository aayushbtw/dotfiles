export HOMEBREW_NO_ENV_HINTS=1

# zoxide
if has_or_warn zoxide; then
  eval "$(zoxide init zsh)"
fi

# starship
if has_or_warn starship; then
  eval "$(starship init zsh)"
fi
