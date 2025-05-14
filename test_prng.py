#!/usr/bin/env python3

import random
import sys
from typing import List

def test_prng(seed: str) -> None:
    print(f"Python test with seed: {seed}")
    rng = random.Random(seed)

    # Create 10 buckets for values in [0,1)
    num_buckets = 10
    buckets: List[int] = [0] * num_buckets
    num_samples = 1_000_000
    expected_per_bucket = num_samples / num_buckets

    print(f"Generating {num_samples:,} random numbers...")
    
    # Generate random numbers and count them in buckets
    for _ in range(num_samples):
        value = rng.random()
        bucket_index = int(value * num_buckets)
        buckets[bucket_index] += 1

    # Analyze the distribution
    print("\nDistribution analysis:")
    print("Bucket | Count    | Expected | Difference | % of Expected")
    print("-------|----------|----------|------------|--------------")
    
    max_deviation = 0
    max_deviation_bucket = 0
    
    for i, count in enumerate(buckets):
        difference = count - expected_per_bucket
        percent_of_expected = (count / expected_per_bucket * 100)
        deviation = abs(difference)
        
        if deviation > max_deviation:
            max_deviation = deviation
            max_deviation_bucket = i

        print(
            f"{i:5d} | {count:8d} | {expected_per_bucket:8.0f} | {difference:10.0f} | {percent_of_expected:12.2f}%"
        )

    # Calculate and display statistics
    max_deviation_percent = (max_deviation / expected_per_bucket * 100)
    print(f"\nMaximum deviation: {max_deviation:.0f} ({max_deviation_percent:.2f}%) in bucket {max_deviation_bucket}")
    
    # Chi-square test for uniformity
    chi_square = sum((count - expected_per_bucket) ** 2 / expected_per_bucket for count in buckets)
    
    print(f"Chi-square statistic: {chi_square:.2f}")
    # For 9 degrees of freedom (10 buckets - 1), chi-square critical value at 0.05 is 16.92
    print("Chi-square critical value (0.05 significance): 16.92")
    print(f"Distribution is {'uniform' if chi_square < 16.92 else 'not uniform'} at 0.05 significance level")

def print_usage() -> None:
    print('Usage: python test_prng.py [seed]')
    print('  seed: Optional seed value for the PRNG (default: "test_seed_123")')
    print('  --help: Show this help message')

if __name__ == "__main__":
    default_seed = "test_seed_123"
    
    # Handle command line arguments
    if len(sys.argv) == 1:
        print_usage()
        print('\nRunning with default seed...\n')
        seed = default_seed
    elif sys.argv[1] == '--help':
        print_usage()
        sys.exit(0)
    else:
        seed = sys.argv[1]
    
    test_prng(seed) 