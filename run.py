#!/usr/bin/env python3

import argparse
import enum
import json
import os
from pathlib import Path
import re
import shlex
import statistics
import subprocess
import sys
import time
from tabulate import tabulate

FLOAT_RE = re.compile(r"([0-9]*\.[0-9]+|[0-9]+)")

class ScoreMetric(enum.Enum):
    time = "time"
    output = "reported_score"

def get_tests_for_suite(suite, config):
    return sorted(
        f for f in Path(suite).iterdir()
        if f.is_file() and f.suffix == config["suffix"]
    )

def run_benchmark(executable, executable_arguments, test_file, score_metric, iterations, index, total, suppress_output=False):
    unit = "s" if score_metric == ScoreMetric.time else ""
    measures = { k:[] for k in ScoreMetric }

    for i in range(iterations):
        if not suppress_output:
            print(f"[{index}/{total}] {test_file} (Iteration {i+1}/{iterations}, Avg: {statistics.mean(measures[score_metric]):.3f}{unit})" if measures[score_metric] else f"[{index}/{total}] {test_file} (Iteration {i+1}/{iterations})", end="\r")
            sys.stdout.flush()

        start_time = time.perf_counter_ns()
        result = subprocess.run([executable, *executable_arguments, test_file], stderr=subprocess.PIPE, stdout=subprocess.DEVNULL if score_metric == ScoreMetric.time else subprocess.PIPE, text=True)
        end_time = time.perf_counter_ns()
        result.check_returncode()

        time_taken = float((end_time - start_time) / 1000000000)
        measures[ScoreMetric.time].append(time_taken)

        if score_metric == ScoreMetric.output:
            output = result.stdout.split("\n")
            value = None
            for line in output:
                if match := FLOAT_RE.search(line):
                    value = float(match[1])
            assert value is not None, "Expected a float in the benchmark output"
            measures[ScoreMetric.output].append(value)

    means = { key:statistics.mean(values) if len(values) > 0 else None for key, values in measures.items() }
    stdevs = { key:statistics.stdev(values) if len(values) > 1 else 0 for key, values in measures.items() }
    min_values = { key:min(values) if len(values) > 0 else None for key, values in measures.items() }
    max_values = { key:max(values) if len(values) > 0 else None for key, values in measures.items() }
    if not suppress_output:
        print(f"[{index}/{total}] {test_file} completed. Mean: {means[score_metric]:.3f}{unit} ± {stdevs[score_metric]:.3f}{unit}, Range: {min_values[score_metric]:.3f}{unit} … {max_values[score_metric]:.3f}{unit}\033[K")
        sys.stdout.flush()

    return means, stdevs, min_values, max_values, measures

def main():
    available_suites = {
        "SunSpider": {"suffix": ".js"},
        "Kraken": {"suffix": ".js"},
        "Octane": {"suffix": ".js", "metric": ScoreMetric.output},
        "GarBench": {"suffix": ".js"},
        "JetStream": {"suffix": ".js"},
        "JetStream3": {"suffix": ".js"},
        "RegExp": {"suffix": ".js"},
        "MicroBench": {"suffix": ".js"},
        "AsyncBench": {"suffix": ".js"},
        "WasmMicroBench": {"suffix": ".wasm", "arguments": ["-e", "run_microbench"]},
        "WasmCoremark": {"suffix": ".wasm", "arguments": ["-e", "run", "--export-js", "env.clock_ms:i64=BigInt(+new Date)"], "metric": ScoreMetric.output},
        "WasmRustBench": {"suffix": ".wasm", "arguments": ["-e", "_start", "-w"]},
    }
    warmup_suite = "SunSpider"

    parser = argparse.ArgumentParser(description="Run JavaScript benchmarks.")
    parser.add_argument("--executable", "-e", default="js", help="Path to the JavaScript executable.")
    parser.add_argument("--wasm-executable", "-we", default="wasm", help="Path to the WebAssembly executable.")
    parser.add_argument("--iterations", "-i", type=int, default=3, help="Number of iterations for each test.")
    parser.add_argument("--suites", "-s", default="all", help="Comma-separated list of suites to run.")
    parser.add_argument("--warmups", "-w", type=int, default=0, help=f"Number of warm-up runs of {warmup_suite}.")
    parser.add_argument("--continue-on-failure", "-c", action=argparse.BooleanOptionalAction, help="Continue on a test failure instead of exiting.")
    parser.add_argument("--output", "-o", default="results.json", help="JSON output file name.")
    args = parser.parse_args()

    suites = {}
    if args.suites == "all":
        suites = available_suites
    else:
        for suite_arg in args.suites.split(","):
            assert suite_arg in available_suites, f"Invalid suite argument: {suite_arg}"
            suites[suite_arg] = available_suites[suite_arg]

    if args.warmups > 0:
        print(f"Performing warm-up runs of {warmup_suite}...")
        for _ in range(args.warmups):
            for test_file in get_tests_for_suite(warmup_suite, available_suites[warmup_suite]):
                run_benchmark(args.executable, [], test_file, ScoreMetric.time, 1, 0, 0, suppress_output=True)

    results = {}
    table_data = []
    total_tests = sum(len(get_tests_for_suite(suite, suites[suite])) for suite in suites)
    current_test = 0

    for suite, config in suites.items():
        results[suite] = {}

        executable = args.wasm_executable if config["suffix"] == ".wasm" else args.executable
        executable_arguments = config.get("arguments", [])
        score_metric = config.get("metric", ScoreMetric.time)

        for test_file in get_tests_for_suite(suite, config):
            current_test += 1
            try:
                stats = run_benchmark(executable, executable_arguments, test_file, score_metric, args.iterations, current_test, total_tests)
            except subprocess.CalledProcessError as error:
                if args.continue_on_failure:
                    print(f"\nTest execution failure: {error}", file=sys.stderr);
                    continue
                raise

            results[suite][test_file.name] = {
                "category": "Wasm" if config["suffix"] == ".wasm" else "JS",
                **{
                    key.value: {
                        "mean": mean,
                        "stdev": stdev,
                        "min": min_val,
                        "max": max_val,
                        "runs": runs,
                    } for key, (mean, stdev, min_val, max_val, runs) in zip(stats[0].keys(), zip(*(x.values() for x in stats))) if runs
                },
            }
            mean, stdev, min_val, max_val, _ = (stat[score_metric] for stat in stats)
            table_data.append([suite, test_file.name, f"{mean:.3f} ± {stdev:.3f}", f"{min_val:.3f} … {max_val:.3f}"])

    print(tabulate(table_data, headers=["Suite", "Test", "Mean ± σ", "Range (min … max)"]))

    with open(args.output, "w") as f:
        json.dump(results, f, indent=4)

if __name__ == "__main__":
    main()
