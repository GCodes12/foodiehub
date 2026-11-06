# Shared helper (sourced, not executed): read KEY=VALUE lines from a .env file literally.
# The file is never executed as shell code. Variables already set in the environment win.
# Usage: read_env_keys <file> KEY1 KEY2 ...
read_env_keys() {
  local file=$1; shift
  [ -f "$file" ] || return 0
  local line key value wanted
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|'#'*) continue ;; esac
    key=${line%%=*}; value=${line#*=}
    for wanted in "$@"; do
      if [ "$key" = "$wanted" ] && [ -z "${!key:-}" ]; then printf -v "$key" '%s' "$value"; export "$key"; fi
    done
  done < "$file"
}
