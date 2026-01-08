#!/bin/bash
# Run all GC benchmarks and report timings

JS_ENGINE="${1:-js}"

echo "GC Benchmarks (using: $JS_ENGINE)"
echo "================================="

for bench in $(ls -1 *.js | sort); do
    name=$(basename "$bench" .js)
    printf "%-30s" "$name"

    start=$(python3 -c 'import time; print(time.time())')
    $JS_ENGINE "$bench" 2>/dev/null
    end=$(python3 -c 'import time; print(time.time())')

    elapsed=$(python3 -c "print(f'{$end - $start:.3f}s')")
    echo "$elapsed"
done

echo "================================="
