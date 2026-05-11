import { LiveEvaluator } from './src/lib/liveEvaluator.js';

const evaluator = new LiveEvaluator();

const cases = [
  'console.log(1+1)',
  'const hola = "saludo"\nhola',
  'console.log('
];

async function runTest(code) {
  return new Promise((resolve) => {
    evaluator.evaluate(code, (results) => {
      console.log(`Case: [${code.replace(/\n/g, '\\n')}]`);
      console.log('Result:', JSON.stringify(results));
      resolve();
    });
  });
}

async function run() {
  for (const c of cases) {
    await runTest(c);
  }
}

run();
