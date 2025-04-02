#!/usr/bin/env python3

import argparse
import json
import os
import subprocess
import statistics
import sys
from tabulate import tabulate
import concurrent.futures
import platform


def get_physical_cores():
    if sys.platform.startswith("linux"):
        try:
            output = subprocess.check_output(["lscpu", "-p=CPU,Core,Socket"], text=True)
        except Exception as e:
            print("Failed to get CPU information:", e, "; assuming single core.")
            return [0]
        physical = {}
        for line in output.splitlines():
            if line.startswith("#"):
                continue
            parts = line.strip().split(",")
            if len(parts) < 3:
                continue
            cpu_id, core_id, socket_id = parts
            key = (socket_id, core_id)
            cpu_id = int(cpu_id)
            if key not in physical or cpu_id < physical[key]:
                physical[key] = cpu_id
        return list(physical.values())
    elif sys.platform == "darwin":
        try:
            core_count = int(
                subprocess.check_output(
                    ["sysctl", "-n", "hw.physicalcpu"], text=True
                ).strip()
            )
            return list(range(core_count))
        except Exception as e:
            print("Failed to get CPU information:", e, "; assuming single core.")
            return [0]
    else:
        print(
            "Unsupported platform",
            sys.platform,
            "for core detection; using default core 0.",
        )
        return [0]


def run_benchmark(
    executable, suite, test_file, iterations, index, total, core, suppress_output=False
):
    times = []
    for i in range(iterations):
        if not suppress_output:
            msg = f"[{index}/{total}] {suite}/{test_file} (Iteration {i+1}/{iterations}"
            if times:
                msg += f", Avg: {statistics.mean(times):.3f}s)"
            else:
                msg += ")"
            print(msg, end="\r")
            sys.stdout.flush()

        # Bind to specific physical core, if available.
        if sys.platform.startswith("linux"):
            cmd = f"taskset -c {core} time -p {executable} {suite}/{test_file}"
        else:
            cmd = f"time -p {executable} {suite}/{test_file}"

        result = subprocess.run(
            cmd,
            shell=True,
            stderr=subprocess.PIPE,
            stdout=subprocess.DEVNULL,
            text=True,
            executable="/bin/bash",
        )
        try:
            result.check_returncode()
        except subprocess.CalledProcessError as e:
            print(f"Error running benchmark: {e}")
            continue

        time_output = result.stderr.split("\n")
        # Find the line containing "real" time.
        real_time_line = [line for line in time_output if "real" in line]
        if not real_time_line:
            print("Failed to parse time output:", time_output)
            continue
        time_taken = float(real_time_line[0].split()[-1])
        times.append(time_taken)

    mean = statistics.mean(times)
    stdev = statistics.stdev(times) if len(times) > 1 else 0
    min_time = min(times)
    max_time = max(times)
    if not suppress_output:
        print(
            f"[{index}/{total}] {suite}/{test_file} completed. Mean: {mean:.3f}s ± {stdev:.3f}s, Range: {min_time:.3f}s … {max_time:.3f}s\033[K"
        )
        sys.stdout.flush()

    return {
        "mean": mean,
        "stdev": stdev,
        "min": min_time,
        "max": max_time,
        "runs": times,
        "core": core if sys.platform.startswith("linux") else None,
    }


def worker(task):
    return (
        task["suite"],
        task["test_file"],
        run_benchmark(
            task["executable"],
            task["suite"],
            task["test_file"],
            task["iterations"],
            task["index"],
            task["total"],
            task["core"],
            suppress_output=False,
        ),
    )


def main():
    parser = argparse.ArgumentParser(description="Run JavaScript benchmarks.")
    parser.add_argument(
        "--executable", "-e", default="js", help="Path to the JavaScript executable."
    )
    parser.add_argument(
        "--iterations",
        "-i",
        type=int,
        default=3,
        help="Number of iterations for each test.",
    )
    parser.add_argument(
        "--suites", "-s", default="all", help="Comma-separated list of suites to run."
    )
    parser.add_argument(
        "--warmups",
        "-w",
        type=int,
        default=0,
        help="Number of warm-up runs of SunSpider.",
    )
    parser.add_argument(
        "--output", "-o", default="results.json", help="JSON output file name."
    )
    parser.add_argument(
        "--concurrent",
        "-c",
        action="store_true",
        help="Run tests concurrently (only on physical cores).",
    )
    args = parser.parse_args()

    if args.suites == "all":
        suites = ["SunSpider", "Kraken", "Octane", "JetStream", "JetStream3"]
    else:
        suites = args.suites.split(",")

    physical_cores = get_physical_cores() if args.concurrent else [0]
    if not physical_cores:
        physical_cores = [0]
    print(f"Found (or assumed) physical cores: {physical_cores}")

    # Warm-up runs for SunSpider, executed sequentially.
    if args.warmups > 0 and "SunSpider" in suites:
        print("Performing warm-up runs of SunSpider...")
        for _ in range(args.warmups):
            for test_file in sorted(os.listdir("SunSpider")):
                if not test_file.endswith(".js"):
                    continue
                run_benchmark(
                    args.executable,
                    "SunSpider",
                    test_file,
                    1,
                    0,
                    0,
                    core=physical_cores[0],
                    suppress_output=True,
                )

    tasks = []
    total_tests = sum(
        len([f for f in os.listdir(suite) if f.endswith(".js")]) for suite in suites
    )
    current_test = 1
    for suite in suites:
        for test_file in sorted(os.listdir(suite)):
            if not test_file.endswith(".js"):
                continue
            # Assign round-robin if on Linux (otherwise the specific core isn't actually important)
            assigned_core = (
                physical_cores[(current_test - 1) % len(physical_cores)]
                if sys.platform.startswith("linux")
                else 0
            )
            tasks.append(
                {
                    "suite": suite,
                    "test_file": test_file,
                    "executable": args.executable,
                    "iterations": args.iterations,
                    "index": current_test,
                    "total": total_tests,
                    "core": assigned_core,
                }
            )
            current_test += 1

    results = {}
    table_data = []

    with concurrent.futures.ProcessPoolExecutor(
        max_workers=len(physical_cores)
    ) as executor:
        future_to_task = {executor.submit(worker, task): task for task in tasks}
        for future in concurrent.futures.as_completed(future_to_task):
            suite, test_file, bench_result = future.result()
            if suite not in results:
                results[suite] = {}
            results[suite][test_file] = bench_result
            table_data.append(
                [
                    suite,
                    test_file,
                    f"{bench_result['mean']:.3f} ± {bench_result['stdev']:.3f}",
                    f"{bench_result['min']:.3f} … {bench_result['max']:.3f}",
                    (
                        f"Core {bench_result['core']}"
                        if bench_result["core"] is not None
                        else "N/A"
                    ),
                ]
            )

    print(
        "\n"
        + tabulate(
            table_data,
            headers=["Suite", "Test", "Mean ± σ", "Range (min … max)", "Core"],
        )
    )
    with open(args.output, "w") as f:
        json.dump(results, f, indent=4)


if __name__ == "__main__":
    main()
