has_or_warn() {
  command -v "$1" >/dev/null || {
    echo "[zsh] $1 not found" >&2
    return 1
  }
}
