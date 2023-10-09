#!/usr/bin/python3

import json
import argparse
from tabulate import tabulate

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
    for suite in old_data.keys():
        if suite not in new_data:
            continue
        for test in old_data[suite].keys():
            if test not in new_data[suite]:
                continue
            old_mean = old_data[suite][test]["mean"]
            new_mean = new_data[suite][test]["mean"]
            speedup = old_mean / new_mean
            old_min = old_data[suite][test]["min"]
            old_max = old_data[suite][test]["max"]
            new_min = new_data[suite][test]["min"]
            new_max = new_data[suite][test]["max"]
            table_data.append([suite, test, f"{speedup:.3f}", f"{old_mean:.3f} ± {old_min:.3f} … {old_max:.3f}", f"{new_mean:.3f} ± {new_min:.3f} … {new_max:.3f}"])

    print(tabulate(table_data, headers=["Suite", "Test", "Speedup", "Old (Mean ± Range)", "New (Mean ± Range)"]))

if __name__ == "__main__":
    main()
