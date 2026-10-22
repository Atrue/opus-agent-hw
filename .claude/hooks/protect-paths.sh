#!/usr/bin/env bash
# PreToolUse-хук Claude Code: блокирует запись/правку защищённых файлов.
# stdin — JSON события хука; exit 2 = заблокировать вызов, stderr покажется агенту.
set -eu

file=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty')

case "$file" in
  *.env|*.env.*)
    echo "Отказано: '$file' — защищённый файл (.env), запись запрещена политикой проекта." >&2
    exit 2
    ;;
esac

exit 0
