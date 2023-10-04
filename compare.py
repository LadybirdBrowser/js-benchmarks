#!/usr/bin/python3

import json
import argparse
from tabulate import tabulate
from scipy import stats
import math
import statistics

def confidence_interval(data, confidence=0.95):
    n = len(data)
    mean = statistics.mean(data)
    stderr = statistics.stdev(data) / math.sqrt(n)
    interval = stderr * stats.t.ppf((1 + confidence) / 2., n-1)
    return mean - interval, mean + interval

def main():
    parser = argparse.ArgumentParser(description="Compare JavaScript benchmark results.")
    parser.add_argument("-o", "--old", required=True, help="Old JSON results file.")
    parser.add_argument("-n", "--new", required=True, help="New JSON results file.")
    args = parser.parse_args()

    with open(args.old, "r") as f:
        old_data = json.load(f)
    with open(args.new, "r") as f:
        new_data = json.load(f)

    table_data = []
    suite_totals = {}
    grand_total_old = 0
    grand_total_new = 0

    for suite in old_data.keys():
        if suite not in new_data:
            continue
        suite_total_old = 0
        suite_total_new = 0
        for test in old_data[suite].keys():
            if test not in new_data[suite]:
                continue
            old_mean = old_data[suite][test]["mean"]
            new_mean = new_data[suite][test]["mean"]
            speedup = old_mean / new_mean
            old_stdev = old_data[suite][test]["stdev"]
            new_stdev = new_data[suite][test]["stdev"]
            old_ci_low, old_ci_high = confidence_interval(old_data[suite][test]["runs"])
            new_ci_low, new_ci_high = confidence_interval(new_data[suite][test]["runs"])
            table_data.append([suite, test, f"{speedup:.6f}", f"{old_stdev:.2f}%", f"{new_stdev:.2f}%", f"{old_ci_low:.6f}-{old_ci_high:.6f}", f"{new_ci_low:.6f}-{new_ci_high:.6f}"])
            suite_total_old += old_mean
            suite_total_new += new_mean
        suite_totals[suite] = (suite_total_old, suite_total_new)
        grand_total_old += suite_total_old
        grand_total_new += suite_total_new

    for suite, (total_old, total_new) in suite_totals.items():
        speedup = total_old / total_new if total_new != 0 else 0
        table_data.append([suite, "Total", f"{speedup:.6f}", "", "", "", "", ""])
    
    if len(suite_totals) > 1:
        grand_speedup = grand_total_old / grand_total_new if grand_total_new != 0 else 0
        table_data.append(["All Suites", "Total", f"{grand_speedup:.6f}", "", "", "", "", ""])

    print(tabulate(table_data, headers=["Suite", "Test", "Speedup", "Old Std Dev (%)", "New Std Dev (%)", "Old CI", "New CI"]))

if __name__ == "__main__":
    main()
