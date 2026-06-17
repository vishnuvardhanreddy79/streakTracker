const fs = require('fs');
const readline = require('readline');

const logPath = 'C:/Users/vishnuvardhan/.gemini/antigravity-ide/brain/b85fbb9c-2936-4ea1-96d9-f62a76d0bddc/.system_generated/logs/transcript.jsonl';

const rl = readline.createInterface({
  input: fs.createReadStream(logPath),
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  try {
    const step = JSON.parse(line);
    if (step.step_index >= 1540 && step.step_index <= 1560) {
      console.log(`=== STEP ${step.step_index} (${step.source} - ${step.type}) ===`);
      if (step.content) {
        console.log(`Content: ${step.content.substring(0, 500)}`);
      }
      if (step.tool_calls) {
        console.log(`Tool Calls: ${JSON.stringify(step.tool_calls, null, 2)}`);
      }
      if (step.tool_output) {
        console.log(`Tool Output: ${JSON.stringify(step.tool_output).substring(0, 300)}`);
      }
      console.log('-'.repeat(80));
    }
  } catch (err) {
    // Ignore
  }
});
