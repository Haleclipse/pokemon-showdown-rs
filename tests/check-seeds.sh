#!/bin/bash
# Compare specific seeds between JS and Rust runners.
# Usage: ./tests/check-seeds.sh <seed> [<seed> ...]
cd "$(dirname "$0")/.."
for s in "$@"; do
  R=$(PS_FORMAT='gen9doublescustomgame@@@!Team Preview' ./target/release/examples/test_unified "$s" "$s" 2>/dev/null)
  J=$(PS_FORMAT='gen9doublescustomgame@@@!Team Preview' node tests/test-unified-parallel.js "$s" "$s" 2>/dev/null)
  if [ "$R" == "$J" ]; then
    echo "PASS $s"
  else
    echo "FAIL $s | JS: $J | RS: $R"
  fi
done
