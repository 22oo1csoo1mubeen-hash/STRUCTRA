const fs = require('fs');
const path = 'C:/Users/mujee/.gemini/antigravity-ide/brain/dca97f20-d9ad-4796-b041-1eed6d1b9174/.system_generated/logs/transcript_full.jsonl';
const text = fs.readFileSync(path, 'utf8');
const regex = /function DuplicateWarningView(?:.*?\\n)*?function EditableField/g;
const matches = text.match(regex);
if (matches) {
  let res = matches[matches.length - 1]; // get the last instance before I broke it
  res = res.replace(/\\n/g, '\n').replace(/\\"/g, '"');
  fs.writeFileSync('C:/STRUCTRA/frontend/duplicate_clean.txt', res);
}
