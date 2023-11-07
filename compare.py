#!/usr/bin/python3

import json
import argparse
from tabulate import tabulate
import statistics
import math
from scipy import stats

def confidence_interval(data, confidence=0.95):
    n = len(data)
    mean = statistics.mean(data)
    stderr = statistics.stdev(data) / math.sqrt(n) if n > 1 else 0
    interval = stderr * stats.t.ppf((1 + confidence) / 2., n-1) if n > 1 else 0
    return mean - interval, mean + interval

def calculate_totals(data):
    totals = {}
    for suite, tests in data.items():
        suite_total = sum(test["mean"] for test in tests.values())
        totals[suite] = suite_total
    all_suites_total = sum(totals.values())
    return totals, all_suites_total

def main():
    parser = argparse.ArgumentParser(description="Compare JavaScript benchmark results.")
    parser.add_argument("-o", "--old", required=True, help="Old JSON results file.")
    parser.add_argument("-n", "--new", required=True, help="New JSON results file.")
    args = parser.parse_args()

    with open(args.old, "r") as f:
        old_data = json.load(f)
    with open(args.new, "r") as f:
        new_data = json.load(f)

    old_totals, old_all_suites_total = calculate_totals(old_data)
    new_totals, new_all_suites_total = calculate_totals(new_data)

    table_data = []
    for suite in old_data.keys():
        if suite not in new_data:
            continue
        for test in old_data[suite].keys():
            if test not in new_data[suite]:
                continue
            old_mean = old_data[suite][test]["mean"]
            new_mean = new_data[suite][test]["mean"]
            old_min = min(old_data[suite][test]["runs"])
            new_min = min(new_data[suite][test]["runs"])
            old_max = max(old_data[suite][test]["runs"])
            new_max = max(new_data[suite][test]["runs"])
            speedup = old_mean / new_mean
            formatted_speedup = f"{speedup:.3f}"
            table_data.append([suite, test, formatted_speedup, f"{old_mean:.3f} ± {old_min:.3f} … {old_max:.3f}", f"{new_mean:.3f} ± {new_min:.3f} … {new_max:.3f}"])

    # Add total times comparison to the table data
    for suite in old_totals.keys():
        if suite in new_totals:
            speedup = old_totals[suite] / new_totals[suite]
            table_data.append([suite, "Total", f"{speedup:.3f}", f"{old_totals[suite]:.3f}", f"{new_totals[suite]:.3f}"])

    # Compare all suites total
    all_suites_speedup = old_all_suites_total / new_all_suites_total
    table_data.append(["All Suites", "Total", f"{all_suites_speedup:.3f}", f"{old_all_suites_total:.3f}", f"{new_all_suites_total:.3f}"])

    print(tabulate(table_data, headers=["Suite", "Test", "Speedup", "Old (Mean ± Range)", "New (Mean ± Range)"]))

if __name__ == "__main__":
    main()
