const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logPath = 'C:/Users/vishnuvardhan/.gemini/antigravity-ide/brain/b85fbb9c-2936-4ea1-96d9-f62a76d0bddc/.system_generated/logs/transcript.jsonl';

const rl = readline.createInterface({
  input: fs.createReadStream(logPath),
  crlfDelay: Infinity
});

const results = [];

rl.on('line', (line) => {
  try {
    const step = JSON.parse(line);
    if (step.tool_calls) {
      for (const call of step.tool_calls) {
        const fileArg = call.args?.TargetFile || '';
        if (fileArg.includes('admin/page.tsx') || fileArg.includes('admin\\page.tsx')) {
          results.push({
            step_index: step.step_index,
            created_at: step.created_at,
            name: call.name,
            description: call.args.Description || call.args.Instruction || '',
            hasTargetContent: !!call.args.TargetContent,
            hasReplacementContent: !!call.args.ReplacementContent,
            hasCodeContent: !!call.args.CodeContent,
            hasReplacementChunks: !!call.args.ReplacementChunks
          });
        }
      }
    }
  } catch (err) {
    // Ignore
  }
});

rl.on('close', () => {
  fs.writeFileSync('C:/Users/vishnuvardhan/progressWebsite/scratch/admin_file_history.json', JSON.stringify(results, null, 2));
  console.log(`Finished. Found ${results.length} writes to src/app/admin/page.tsx.`);
});
