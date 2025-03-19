#!/usr/bin/env python3

import argparse
import json
import os
import subprocess
import statistics
from tabulate import tabulate

def run_benchmark(executable, suite, test_file, iterations, index, total, suppress_output=False):
    times = []
    for i in range(iterations):
        if not suppress_output:
            print(f"[{index}/{total}] {suite}/{test_file} (Iteration {i+1}/{iterations}, Avg: {statistics.mean(times):.3f}s)" if times else f"[{index}/{total}] {suite}/{test_file} (Iteration {i+1}/{iterations})", end="\r")

        result = subprocess.run([f"time -p {executable} {suite}/{test_file}"], shell=True, stderr=subprocess.PIPE, stdout=subprocess.DEVNULL, text=True)
        result.check_returncode()

        time_output = result.stderr.split("\n")
        real_time_line = [line for line in time_output if "real" in line][0]
        time_taken = float(real_time_line.split(" ")[-1])
        times.append(time_taken)

    mean = statistics.mean(times)
    stdev = statistics.stdev(times) if len(times) > 1 else 0
    min_time = min(times)
    max_time = max(times)
    if not suppress_output:
        print(f"[{index}/{total}] {suite}/{test_file} completed. Mean: {mean:.3f}s ± {stdev:.3f}s, Range: {min_time:.3f}s … {max_time:.3f}s\033[K")

    return mean, stdev, min_time, max_time, times

def main():
    parser = argparse.ArgumentParser(description="Run JavaScript benchmarks.")
    parser.add_argument("--executable", "-e", default="js", help="Path to the JavaScript executable.")
    parser.add_argument("--iterations", "-i", type=int, default=3, help="Number of iterations for each test.")
    parser.add_argument("--suites", "-s", default="all", help="Comma-separated list of suites to run.")
    parser.add_argument("--warmups", "-w", type=int, default=0, help="Number of warm-up runs of SunSpider.")
    parser.add_argument("--output", "-o", default="results.json", help="JSON output file name.")
    args = parser.parse_args()

    if args.suites == "all":
        suites = ["SunSpider", "Kraken", "Octane"]
    else:
        suites = args.suites.split(",")

    if args.warmups > 0:
        print("Performing warm-up runs of SunSpider...")
        for _ in range(args.warmups):
            for test_file in sorted(os.listdir("SunSpider")):
                if not test_file.endswith(".js"):
                    continue
                run_benchmark(args.executable, "SunSpider", test_file, 1, 0, 0, suppress_output=True)

    results = {}
    table_data = []
    total_tests = sum(len(os.listdir(suite)) for suite in suites)
    current_test = 1

    for suite in suites:
        results[suite] = {}
        for test_file in sorted(os.listdir(suite)):
            if not test_file.endswith(".js"):
                continue
            mean, stdev, min_time, max_time, runs = run_benchmark(args.executable, suite, test_file, args.iterations, current_test, total_tests)
            results[suite][test_file] = {
                "mean": mean,
                "stdev": stdev,
                "min": min_time,
                "max": max_time,
                "runs": runs
            }
            table_data.append([suite, test_file, f"{mean:.3f} ± {stdev:.3f}", f"{min_time:.3f} … {max_time:.3f}"])
            current_test += 1

    print(tabulate(table_data, headers=["Suite", "Test", "Mean ± σ", "Range (min … max)"]))

    with open(args.output, "w") as f:
        json.dump(results, f, indent=4)

if __name__ == "__main__":
    main()
