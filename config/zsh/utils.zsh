has_or_warn() {
  command -v "$1" >/dev/null || {
    echo "[zsh] $1 not found" >&2
    return 1
  }
}

lookup() {
  domain="$1"
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
