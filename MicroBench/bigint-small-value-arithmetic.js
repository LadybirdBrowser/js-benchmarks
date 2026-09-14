function gcd(a, b) {
    while (b !== 0n) {
        const remainder = a % b;
        a = b;
        b = remainder;
    }
    return a;
}

let checksum = 0n;

for (let i = 1n; i <= 100_000n; i++) {
    // Keep both sides well under 64 bits. Rational number libraries hold every value as a pair of BigInts and reduce
    // it after each operation, so the values they divide and compare are almost always this small.
    const numerator = i * 7919n + 13n;
    const denominator = i * 104729n + 7n;

    const divisor = gcd(numerator, denominator);
    const left_numerator = numerator / divisor;
    const left_denominator = denominator / divisor;

    const right_numerator = left_denominator - left_numerator;
    const right_denominator = left_denominator + 1n;

    const sum_numerator = left_numerator * right_denominator + right_numerator * left_denominator;
    const sum_denominator = left_denominator * right_denominator;
    const sum_divisor = gcd(sum_numerator, sum_denominator);

    if (sum_numerator / sum_divisor < sum_denominator / sum_divisor)
        checksum += sum_numerator % 1000n;
}

if (checksum !== 50205412n)
    throw new Error("Unexpected result");
