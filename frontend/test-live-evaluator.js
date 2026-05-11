import { LiveEvaluator } from './src/lib/liveEvaluator.js';

const evaluator = new LiveEvaluator();

async function runTest(code) {
    console.log(`Testing code: ${code.replace(/\n/g, '\\n')}`);
    return new Promise((resolve) => {
        evaluator.evaluate(code, (results) => {
            console.log('Results:', JSON.stringify(results));
            resolve();
        });
    });
}

async function main() {
    // We need to wait for the debounce delay (300ms) for each evaluate call
    // The LiveEvaluator uses setTimeout with 300ms.
    await runTest('console.log(1+1)');
    await runTest('const hola = "saludo"\nhola');
    await runTest('console.log(');
}

main();
