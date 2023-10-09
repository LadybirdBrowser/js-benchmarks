#!/usr/bin/python3

import argparse
import json
import os
import subprocess
import statistics
from tabulate import tabulate

def run_benchmark(executable, suite, test_file, iterations, index, total):
    times = []
    for i in range(iterations):
        print(f"[{index}/{total}] Iteration {i+1}/{iterations} for {suite}/{test_file}...", end="\r")
        result = subprocess.run([f"time -p {executable} {suite}/{test_file}"], shell=True, stderr=subprocess.PIPE, stdout=subprocess.DEVNULL, text=True)
        time_output = result.stderr.split("\n")
        real_time_line = [line for line in time_output if "real" in line][0]
        time_taken = float(real_time_line.split(" ")[-1])
        times.append(time_taken)
    mean = statistics.mean(times)
    stdev = statistics.stdev(times) if len(times) > 1 else 0
    min_time = min(times)
    max_time = max(times)
    print(f"[{index}/{total}] {suite}/{test_file} completed.")
    return mean, stdev, min_time, max_time, times

def main():
    parser = argparse.ArgumentParser(description="Run JavaScript benchmarks.")
    parser.add_argument("--executable", "-e", default="js", help="Path to the JavaScript executable.")
    parser.add_argument("--iterations", "-i", type=int, default=3, help="Number of iterations for each test.")
    parser.add_argument("--suites", "-s", default="all", help="Comma-separated list of suites to run.")
    parser.add_argument("--warmup", "-w", action="store_true", help="Perform a warm-up run of SunSpider.")
    parser.add_argument("--output", "-o", default="results.json", help="JSON output file name.")
    args = parser.parse_args()

    if args.suites == "all":
        suites = ["SunSpider", "Kraken", "Octane"]
    else:
        suites = args.suites.split(",")

    if args.warmup:
        print("Performing warm-up run of SunSpider...")
        for test_file in sorted(os.listdir("SunSpider")):
            if not test_file.endswith(".js"):
                continue
            run_benchmark(args.executable, "SunSpider", test_file, 1, 0, 0)

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
