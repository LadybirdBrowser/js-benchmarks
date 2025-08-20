#!/usr/bin/env python3

import json
import argparse
from tabulate import tabulate
import statistics
import math
from scipy import stats

METRIC_PERF_CORRELATION = {
    "time": "inverse",
    "reported_score": "direct",
}

def confidence_interval(data, confidence=0.95):
    n = len(data)
    mean = statistics.mean(data)
    stderr = statistics.stdev(data) / math.sqrt(n) if n > 1 else 0
    interval = stderr * stats.t.ppf((1 + confidence) / 2., n-1) if n > 1 else 0
    return mean - interval, mean + interval

def calculate_totals(data, test_metrics):
    totals = {}
    time_totals = {}
    for suite, tests in data.items():
        suite_total = sum(tests[test][test_metrics[suite][test]]["mean"] for test in tests.keys())
        suite_total_for_time = sum(tests[test]["time"]["mean"] for test in tests.keys())
        totals[suite] = suite_total
        time_totals[suite] = suite_total_for_time
    all_suites_total = sum(time_totals.values())
    return totals, all_suites_total

def infer_test_metrics(old_data, new_data):
    metrics = {}
    all_suites = set(old_data.keys()).union(set(new_data.keys()))
    for suite in all_suites:
        all_tests = set(old_data.get(suite, {}).keys()).union(set(new_data.get(suite, {}).keys()))
        suite_metrics = {}
        for test in all_tests:
            all_test_metrics = set(old_data.get(suite, {}).get(test, {}).keys()).union(set(new_data.get(suite, {}).get(test, {}).keys()))
            chosen_metric = "time"
            if len(all_test_metrics) == 2:
                chosen_metric = next(x for x in all_test_metrics if x != "time")
            suite_metrics[test] = chosen_metric
        metrics[suite] = suite_metrics

    # Migrate old data to new format
    for data in (old_data, new_data):
        first = data[next(iter(data))]
        if "time" not in first[next(iter(first))]:
            for suite in data:
                for test in data[suite]:
                    results = data[suite][test]
                    data[suite][test] = { "time": results }

    return old_data, new_data, metrics

def main():
    parser = argparse.ArgumentParser(description="Compare JavaScript benchmark results.")
    parser.add_argument("-o", "--old", required=True, help="Old JSON results file.")
    parser.add_argument("-n", "--new", required=True, help="New JSON results file.")
    args = parser.parse_args()

    with open(args.old, "r") as f:
        old_data = json.load(f)
    with open(args.new, "r") as f:
        new_data = json.load(f)

    old_data, new_data, test_metrics = infer_test_metrics(old_data, new_data)

    old_totals, old_all_suites_total = calculate_totals(old_data, test_metrics)
    new_totals, new_all_suites_total = calculate_totals(new_data, test_metrics)

    table_data = []
    for suite in old_data.keys():
        if suite not in new_data:
            continue
        for test in old_data[suite].keys():
            if test not in new_data[suite]:
                continue
            test_metric = test_metrics[suite][test]
            old_mean = old_data[suite][test][test_metric]["mean"]
            new_mean = new_data[suite][test][test_metric]["mean"]
            old_min = min(old_data[suite][test][test_metric]["runs"])
            new_min = min(new_data[suite][test][test_metric]["runs"])
            old_max = max(old_data[suite][test][test_metric]["runs"])
            new_max = max(new_data[suite][test][test_metric]["runs"])

            speedup = new_mean / old_mean
            if METRIC_PERF_CORRELATION[test_metric] == "inverse":
                speedup = 1. / speedup

            formatted_speedup = f"{speedup:.3f}"
            table_data.append([suite, test, formatted_speedup, f"{old_mean:.3f} ± {old_min:.3f} … {old_max:.3f}", f"{new_mean:.3f} ± {new_min:.3f} … {new_max:.3f}"])

    # Add total times comparison to the table data
    for suite in old_totals.keys():
        if suite in new_totals:
            speedup = new_totals[suite] / old_totals[suite]
            suite_metrics = set(test_metrics[suite].values())
            assert len(suite_metrics) == 1, f"Multiple metrics for suite {suite}: {suite_metrics}"
            if METRIC_PERF_CORRELATION[suite_metrics.pop()] == "inverse":
                speedup = 1. / speedup

            table_data.append([suite, "Total", f"{speedup:.3f}", f"{old_totals[suite]:.3f}", f"{new_totals[suite]:.3f}"])

    # Compare all suites total
    all_suites_speedup = old_all_suites_total / new_all_suites_total
    table_data.append(["All Suites", "Total", f"{all_suites_speedup:.3f}", f"{old_all_suites_total:.3f}", f"{new_all_suites_total:.3f}"])

    print(tabulate(table_data, headers=["Suite", "Test", "Speedup", "Old (Mean ± Range)", "New (Mean ± Range)"]))

if __name__ == "__main__":
    main()
