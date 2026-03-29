alias c='code .'
alias o='open .'
alias genpass='openssl rand -hex 32'

if has_or_warn eza; then
  alias ls='eza -l --icons'
  alias la='eza -l -a --icons'
  alias ld='eza -l -D --icons'
  alias ll='eza --icons'
fi

if has_or_warn bat; then
  alias cat='bat'
fi
