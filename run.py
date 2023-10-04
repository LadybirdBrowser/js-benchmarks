#!/usr/bin/python3

import argparse
import subprocess
import json
import os
import time
import statistics
import sys
from tabulate import tabulate
from scipy import stats
import math

def confidence_interval(data, confidence=0.95):
    n = len(data)
    mean = statistics.mean(data)
    stderr = statistics.stdev(data) / math.sqrt(n)
    interval = stderr * stats.t.ppf((1 + confidence) / 2., n-1)
    return mean - interval, mean + interval

def run_benchmark(executable, suite, test_file, num_iterations):
    times = []
    is_tty = sys.stdout.isatty()
    for i in range(num_iterations):
        if is_tty:
            print(f"\033[KIteration {i+1}/{num_iterations}", end='\r')
        else:
            print(f"Iteration {i+1}/{num_iterations}")

        cmd = [executable, os.path.join(suite, test_file)]
        start_time = time.time()
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        end_time = time.time()
        total_seconds = end_time - start_time
        times.append(total_seconds)

        avg_time = statistics.mean(times[:i+1])
        if is_tty:
            print(f"\033[KIteration {i+1}/{num_iterations}, Average time: {avg_time:.4f}s", end='\r')

    if is_tty:
        print("\033[K", end='')
    mean_time = statistics.mean(times)
    stdev_time = statistics.stdev(times) if len(times) > 1 else 0
    stdev_percent = (stdev_time / mean_time) * 100 if mean_time != 0 else 0
    ci_low, ci_high = confidence_interval(times) if len(times) > 1 else (0, 0)
    return mean_time, stdev_percent, ci_low, ci_high, times

def main():
    parser = argparse.ArgumentParser(description="Run JavaScript benchmarks.")
    parser.add_argument("--suites", default="all", help="Comma-separated list of suites to run. Default is 'all'.")
    parser.add_argument("--warmup", action="store_true", help="Perform a warm-up run of the SunSpider suite.")
    parser.add_argument("--iterations", type=int, default=3, help="Number of iterations per test. Default is 3.")
    parser.add_argument("--output", default="results.json", help="JSON output file name. Default is 'results.json'.")
    parser.add_argument("--test", default=None, help="Specific test to run, e.g., 'Kraken/ai-astar.js'.")
    parser.add_argument("--exec", default="js", help="Executable used for running tests. Default is 'js'.")
    args = parser.parse_args()

    if args.warmup:
        print("Performing warm-up run of SunSpider...")
        for test_file in sorted(os.listdir("SunSpider")):
            if test_file.endswith('.js'):
                run_benchmark(args.exec, "SunSpider", test_file, 1)

    if args.suites == "all":
        suites_to_run = [d for d in os.listdir() if os.path.isdir(d)]
    else:
        suites_to_run = args.suites.split(",")

    results = {}
    for suite in sorted(suites_to_run):
        if args.test and not args.test.startswith(suite):
            continue
        test_files = sorted([f for f in os.listdir(suite) if f.endswith('.js')])
        suite_results = {}
        for test_file in test_files:
            if args.test and args.test != f"{suite}/{test_file}":
                continue
            print(f"Running {suite}/{test_file}...")
            mean_time, stdev_percent, ci_low, ci_high, times = run_benchmark(args.exec, suite, test_file, args.iterations)
            suite_results[test_file] = {
                "mean": mean_time,
                "stdev": stdev_percent,
                "ci_low": ci_low,
                "ci_high": ci_high,
                "runs": times
            }
        results[suite] = suite_results

    with open(args.output, "w") as f:
        json.dump(results, f, indent=4)

    table_data = []
    for suite, suite_results in results.items():
        for test, stats in suite_results.items():
            ci_str = f"{stats['ci_low']:.6f} - {stats['ci_high']:.6f}"
            table_data.append([suite, test, f"{stats['mean']:.6f}", f"{stats['stdev']:.2f}%", ci_str])
        table_data.append(["─" * 10, "─" * 20, "─" * 15, "─" * 15, "─" * 30])
    print(tabulate(table_data, headers=["Suite", "Test", "Mean Time (s)", "Std Dev (%)", "Confidence Interval"]))

if __name__ == "__main__":
    main()
