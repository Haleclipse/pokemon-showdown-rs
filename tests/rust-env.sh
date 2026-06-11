#!/bin/bash

# Environment adapter for running Rust commands.
#
# The original development setup runs all Rust commands inside a Docker
# container named `pokemon-rust-dev` (workspace at /home/builder/workspace).
# On machines with a local Rust toolchain and no container, commands run
# directly in the repository root instead.
#
# Usage: source this file, then call:
#   rust_exec "<command>"        - run a command in the Rust environment
#   rust_cp_in <src> <dst>       - copy a host file into the Rust environment
#   rust_cp_out <src> <dst>      - copy a file out of the Rust environment
#
# In local mode /tmp is shared, so rust_cp_in/rust_cp_out are no-ops.

RUST_ENV_SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
RUST_ENV_PROJECT_DIR="$( cd "$RUST_ENV_SCRIPT_DIR/.." && pwd )"

if docker exec pokemon-rust-dev true 2>/dev/null; then
    RUST_ENV=docker
else
    RUST_ENV=local
fi

rust_exec() {
    if [ "$RUST_ENV" = docker ]; then
        docker exec pokemon-rust-dev bash -c "cd /home/builder/workspace && $*"
    else
        (cd "$RUST_ENV_PROJECT_DIR" && bash -c "$*")
    fi
}

rust_cp_in() {
    if [ "$RUST_ENV" = docker ]; then
        docker cp "$1" "pokemon-rust-dev:$2"
    fi
}

rust_cp_out() {
    if [ "$RUST_ENV" = docker ]; then
        docker cp "pokemon-rust-dev:$1" "$2"
    fi
}
