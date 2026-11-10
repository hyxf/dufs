#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

case "${1:-}" in
  dev)
    shift
    exec cargo run -- -p 5001 -A ~/Public
    ;;
  dev2)
    shift
    exec cargo run -- "$@"
    ;;
  build)
    shift
    cargo build --release
    mkdir -p dist
    cp target/release/dufs dist/dufs
    ;;
  *)
    echo "Usage: ./zbuild.sh {dev|build}" >&2
    exit 2
    ;;
esac
