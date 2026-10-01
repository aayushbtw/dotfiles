# Aliases
alias c='code .'
alias o='open .'
alias genpass='openssl rand -hex 32'

if (( $+commands[eza] )); then
  alias ls='eza -l --icons=auto'
  alias la='eza -l -a --icons=auto'
  alias ld='eza -l -D --icons=auto'
  alias ll='eza --icons=auto'
fi

(( $+commands[bat] )) && alias cat='bat'

# Apps
(( $+commands[zoxide] )) && eval "$(zoxide init zsh)"
(( $+commands[starship] )) && eval "$(starship init zsh)"

# Functions
lookup() {
  local domain="$1" data
  data=$(whois "$domain" 2>/dev/null)

  if echo "$data" | grep -qiE "no match|not found|no data found"; then
    echo "STATUS: AVAILABLE"
  else
    echo "STATUS: TAKEN"
    echo "$data" | grep -iE "Creation Date|Created On" | head -n1
    echo "$data" | grep -iE "Updated Date|Last Updated" | head -n1
    echo "$data" | grep -iE "Expiry Date|Expiration Date|Registry Expiry Date" | head -n1
  fi
}

# Kills JS dev servers (Next, Vite/SvelteKit/TanStack, Nuxt, Turbo, Convex) and
# their package-manager wrappers. `killdev -n` lists without killing.
killdev() {
  emulate -L zsh
  local dry=0 pid cmd
  [[ $1 == -n ]] && dry=1
  local pattern='next( dev| start|-server|/dist/server)|(^|/)vite(\.js)?( |$)|nuxi|nuxt( dev|/)|svelte-kit|vinxi|tanstack|turbo( run)? dev|tsx watch|convex dev|(pnpm|npm|yarn|bun)(\.c?js)? (run )?(dev|db|start)( |$)'
  local -a pids

  ps -Ao pid=,command= | while read -r pid cmd; do
    [[ $pid == $$ ]] && continue
    # App bundles ship their own node (Raycast, VS Code); never touch them.
    [[ $cmd == *.app/* || $cmd == *Raycast* ]] && continue
    [[ $cmd =~ $pattern ]] || continue
    pids+=($pid)
    print -r -- "$pid ${cmd[1,140]}"
  done

  (( ${#pids} )) || { echo "no dev servers"; return 0; }
  (( dry )) && return 0

  kill $pids 2>/dev/null
  sleep 2
  local -a left=(${(f)"$(ps -o pid= -p ${(j:,:)pids} 2>/dev/null)"})
  (( ${#left} )) && kill -9 ${=left} 2>/dev/null
  echo "killed ${#pids}"
}
