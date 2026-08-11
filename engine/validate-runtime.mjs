import fs from 'node:fs/promises';
const files=['manifest.json','intent-index.json','question-rules.json','recommendation-index.json','jurisdiction-index.json','onecall-index.json','journey-state-schema.json'];
for (const file of files){const data=JSON.parse(await fs.readFile(new URL(`../runtime/${file}`,import.meta.url),'utf8'));if(!data.version)throw new Error(`${file} has no version`)}
const intents=JSON.parse(await fs.readFile(new URL('../runtime/intent-index.json',import.meta.url),'utf8'));
if(!intents.intents?.length)throw new Error('No runtime intents generated');
console.log(`Validated ${intents.intents.length} runtime intents across ${files.length} files.`);
