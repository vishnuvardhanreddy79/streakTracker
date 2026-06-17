const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logPath = 'C:/Users/vishnuvardhan/.gemini/antigravity-ide/brain/b85fbb9c-2936-4ea1-96d9-f62a76d0bddc/.system_generated/logs/transcript.jsonl';

const rl = readline.createInterface({
  input: fs.createReadStream(logPath),
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  try {
    const step = JSON.parse(line);
    const lineStr = JSON.stringify(step);
    
    // Match any tool calls or content referencing db.ts, or git checkout / git restore
    const hasDbTs = lineStr.includes('db.ts');
    const hasGitCmd = lineStr.includes('git ');
    
    if (hasDbTs || hasGitCmd) {
      let info = '';
      if (step.tool_calls) {
        info = step.tool_calls.map(tc => {
          let callInfo = tc.name;
          if (tc.args && tc.args.CommandLine) {
            callInfo += ` (${tc.args.CommandLine})`;
          } else if (tc.args && tc.args.TargetFile) {
            callInfo += ` [${path.basename(tc.args.TargetFile)}]`;
          }
          if (tc.args && tc.args.Description) {
            callInfo += `: ${tc.args.Description}`;
          }
          return callInfo;
        }).join(', ');
      } else if (step.content) {
        info = step.content.substring(0, 120).replace(/\n/g, ' ');
      }
      
      console.log(`Step ${step.step_index.toString().padEnd(5)} | ${step.created_at} | ${info}`);
    }
  } catch (err) {
    // Ignore
  }
});
