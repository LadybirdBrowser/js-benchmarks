#!/usr/bin/env python3

import argparse
import enum
import gzip
import hashlib
import json
import os
import re
import shlex
import statistics
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

import brotli
from tabulate import tabulate

FLOAT_RE = re.compile(r"([0-9]*\.[0-9]+|[0-9]+)")

class ScoreMetric(enum.Enum):
    time = "time"
    output = "reported_score"
    max_rss = "max_rss"

WAYBACK_PREFIX = "https://web.archive.org/web/2id_/"

def sha256(data):
    return hashlib.sha256(data).hexdigest()

def download(url):
    for attempt in [url, WAYBACK_PREFIX + url]:
        try:
            req = urllib.request.Request(attempt, headers={
                "Accept-Encoding": "identity",
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
            })
            with urllib.request.urlopen(req) as resp:
                data = resp.read()
                encoding = resp.headers.get("content-encoding", "")
                if encoding == "br":
                    data = brotli.decompress(data)
                elif encoding == "gzip" or data[:2] == b"\x1f\x8b":
                    data = gzip.decompress(data)
                return data
        except (urllib.error.URLError, urllib.error.HTTPError) as e:
            print(f"{attempt}: {e}")
            continue
    raise RuntimeError(f"Failed to download {url}")

def read_downloaded_content(filepath, polyfill):
    return filepath.read_bytes().removeprefix(polyfill)

def build_downloaded_content(urls, download_cache, filename):
    chunks = []
    for i, url in enumerate(urls):
        if url not in download_cache:
            label = filename if len(urls) == 1 else f"{filename} ({i+1}/{len(urls)})"
            print(f"Downloading {label}...")
            download_cache[url] = download(url)
        chunks.append(download_cache[url])
    return b"\n".join(chunks)

def ensure_downloaded_file(filepath, entry, polyfill, download_cache):
    urls = entry["urls"]
    expected_sha256 = entry["sha256"]
    if filepath.exists():
        actual_sha256 = sha256(read_downloaded_content(filepath, polyfill))
        if actual_sha256 == expected_sha256:
            return
        print(f"{filepath}: SHA-256 mismatch on disk, expected {expected_sha256}, got {actual_sha256}")

    content = build_downloaded_content(urls, download_cache, filepath.name)
    actual_sha256 = sha256(content)
    if actual_sha256 != expected_sha256:
        raise RuntimeError(f"SHA-256 mismatch for {filepath.name}: expected {expected_sha256}, got {actual_sha256}")

    desired_file_content = polyfill + content
    if filepath.exists() and filepath.read_bytes() == desired_file_content:
        return
    filepath.write_bytes(desired_file_content)

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

        with tempfile.TemporaryFile(mode="w+t") as stderr_file:
            stdout_file = None
            stdout_target = subprocess.DEVNULL
            if score_metric == ScoreMetric.output:
                stdout_file = tempfile.TemporaryFile(mode="w+t")
                stdout_target = stdout_file

            try:
                start_time = time.perf_counter_ns()
                proc = subprocess.Popen([executable, *executable_arguments, test_file], stderr=stderr_file, stdout=stdout_target, text=True)

                _, status, rusage = os.wait4(proc.pid, 0)
                end_time = time.perf_counter_ns()
                proc.returncode = os.waitstatus_to_exitcode(status)

                stderr_file.seek(0)
                stderr_output = stderr_file.read()

                if proc.returncode != 0:
                    stdout_output = None
                    if stdout_file is not None:
                        stdout_file.seek(0)
                        stdout_output = stdout_file.read()
                    raise subprocess.CalledProcessError(proc.returncode, proc.args, output=stdout_output, stderr=stderr_output)

                if score_metric == ScoreMetric.output:
                    stdout_file.seek(0)
                    output = stdout_file.read().split("\n")
                    value = None
                    for line in output:
                        if match := FLOAT_RE.search(line):
                            value = float(match[1])
                    assert value is not None, "Expected a float in the benchmark output"
                    measures[ScoreMetric.output].append(value)
            finally:
                if stdout_file is not None:
                    stdout_file.close()

        max_rss = rusage.ru_maxrss
        if sys.platform.startswith("linux"):
            max_rss *= 1024
        measures[ScoreMetric.max_rss].append(max_rss)

        time_taken = float((end_time - start_time) / 1000000000)
        measures[ScoreMetric.time].append(time_taken)

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
        "LongSpider": {"suffix": ".js"},
        "Kraken": {"suffix": ".js"},
        "Octane": {"suffix": ".js", "metric": ScoreMetric.output},
        "GarBench": {"suffix": ".js"},
        "JetStream": {"suffix": ".js"},
        "JetStream3": {"suffix": ".js"},
        "JetStreamExtra": {"suffix": ".js"},
        "ARES-6": {"suffix": ".js"},
        "RegExp": {"suffix": ".js"},
        "MicroBench": {"suffix": ".js"},
        "AsyncBench": {"suffix": ".js"},
        "WasmMicroBench": {"suffix": ".wasm", "arguments": ["-e", "run_microbench"]},
        "WasmCoremark": {"suffix": ".wasm", "arguments": ["-e", "run", "--export-js", "env.clock_ms:i64=BigInt(+new Date)"], "metric": ScoreMetric.output},
        "WasmRustBench": {"suffix": ".wasm", "arguments": ["-e", "_start", "-w"]},
        "Websites/parse": {"suffix": ".js", "arguments": ["--parse-only"], "downloads": "Websites/sources.json"},
        "Websites/run": {"suffix": ".js", "polyfill": "Websites/polyfill.js", "downloads": "Websites/sources.json"},
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
            if suite_arg in available_suites:
                suites[suite_arg] = available_suites[suite_arg]
            else:
                matched = {k: v for k, v in available_suites.items() if k.startswith(suite_arg + "/")}
                assert matched, f"Invalid suite argument: {suite_arg}"
                suites.update(matched)

    # Download and assemble files for suites that need them
    download_cache = {}
    file_arguments = {}
    sources = {}
    for suite, config in suites.items():
        downloads_path = config.get("downloads")
        if not downloads_path:
            continue
        if downloads_path not in sources:
            sources[downloads_path] = json.loads(Path(downloads_path).read_text())
        downloads = sources[downloads_path]
        suite_dir = Path(suite)
        suite_dir.mkdir(parents=True, exist_ok=True)
        polyfill = (Path(config["polyfill"]).read_bytes() + b"\n") if "polyfill" in config else b""
        for filename, entry in downloads.items():
            assert isinstance(entry, dict), f"Download entry for {filename} must be an object"
            if "arguments" in entry:
                file_arguments[str(suite_dir / filename)] = entry["arguments"]
            ensure_downloaded_file(suite_dir / filename, entry, polyfill, download_cache)

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
                extra_args = file_arguments.get(str(test_file), [])
                stats = run_benchmark(executable, executable_arguments + extra_args, test_file, score_metric, args.iterations, current_test, total_tests)
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
            mem_mean = stats[0][ScoreMetric.max_rss]
            mem_col = f"{mem_mean / 1e6:.1f} MB" if mem_mean else "—"
            table_data.append([suite, test_file.name, f"{mean:.3f} ± {stdev:.3f}", f"{min_val:.3f} … {max_val:.3f}", mem_col])

    print(tabulate(table_data, headers=["Suite", "Test", "Mean ± σ", "Range (min … max)", "Max RSS (mean)"]))

    with open(args.output, "w") as f:
        json.dump(results, f, indent=4)

if __name__ == "__main__":
    main()
