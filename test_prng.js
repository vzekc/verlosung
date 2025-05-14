import { SeededRandom } from './prng.js';

async function testPrng(seed) {
    console.log(`JavaScript test with seed: ${seed}`);
    const rng = new SeededRandom(seed);
    // Wait for the seed to be initialized
    await rng.seedReady;

    // Create 10 buckets for values in [0,1)
    const numBuckets = 10;
    const buckets = new Array(numBuckets).fill(0);
    const numSamples = 1_000_000;
    const expectedPerBucket = numSamples / numBuckets;

    console.log(`Generating ${numSamples.toLocaleString()} random numbers...`);
    
    // Generate random numbers and count them in buckets
    for (let i = 0; i < numSamples; i++) {
        const value = rng.next();
        const bucketIndex = Math.floor(value * numBuckets);
        buckets[bucketIndex]++;
    }

    // Analyze the distribution
    console.log("\nDistribution analysis:");
    console.log("Bucket | Count    | Expected | Difference | % of Expected");
    console.log("-------|----------|----------|------------|--------------");
    
    let maxDeviation = 0;
    let maxDeviationBucket = 0;
    
    buckets.forEach((count, i) => {
        const difference = count - expectedPerBucket;
        const percentOfExpected = (count / expectedPerBucket * 100).toFixed(2);
        const deviation = Math.abs(difference);
        
        if (deviation > maxDeviation) {
            maxDeviation = deviation;
            maxDeviationBucket = i;
        }

        console.log(
            `${i.toString().padStart(5)} | ${count.toString().padStart(8)} | ${expectedPerBucket.toFixed(0).padStart(8)} | ${difference.toFixed(0).padStart(10)} | ${percentOfExpected.padStart(12)}%`
        );
    });

    // Calculate and display statistics
    const maxDeviationPercent = (maxDeviation / expectedPerBucket * 100).toFixed(2);
    console.log(`\nMaximum deviation: ${maxDeviation.toFixed(0)} (${maxDeviationPercent}%) in bucket ${maxDeviationBucket}`);
    
    // Chi-square test for uniformity
    const chiSquare = buckets.reduce((sum, count) => {
        const diff = count - expectedPerBucket;
        return sum + (diff * diff) / expectedPerBucket;
    }, 0);
    
    console.log(`Chi-square statistic: ${chiSquare.toFixed(2)}`);
    // For 9 degrees of freedom (10 buckets - 1), chi-square critical value at 0.05 is 16.92
    console.log("Chi-square critical value (0.05 significance): 16.92");
    console.log(`Distribution is ${chiSquare < 16.92 ? "uniform" : "not uniform"} at 0.05 significance level`);
}

// Get seed from command line or use default
const defaultSeed = "test_seed_123";
const seed = process.argv[2] || defaultSeed;

// Add usage information if no arguments or --help
if (process.argv.length === 2 || process.argv[2] === '--help') {
    console.log('Usage: node test_prng.js [seed]');
    console.log('  seed: Optional seed value for the PRNG (default: "test_seed_123")');
    console.log('  --help: Show this help message');
    if (process.argv.length === 2) {
        console.log('\nRunning with default seed...\n');
    } else {
        process.exit(0);
    }
}

testPrng(seed); 