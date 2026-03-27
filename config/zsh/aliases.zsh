alias c='code .'
alias o='open .'
alias genpass='openssl rand -hex 32'

if has_or_warn eza; then
  alias ls='eza -l -g --icons'
  alias ll='eza --icons'
fi

if has_or_warn bat; then
  alias cat='bat'
fi
