import { LiveEvaluator } from './src/lib/liveEvaluator.js';

const evaluator = new LiveEvaluator();
evaluator.debounceDelay = 0;

const cases = [
  'console.log(1+1)',
  'const hola = "saludo"\nhola',
  'console.log('
];

async function run() {
  for (const code of cases) {
    await new Promise((resolve) => {
      console.log(`Evaluating: ${code.replace('\n', '\\n')}`);
      evaluator.evaluate(code, (results) => {
        console.log('Results:', JSON.stringify(results, null, 2));
        resolve();
      });
    });
  }
}

run();
