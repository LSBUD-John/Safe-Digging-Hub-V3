const FILES={intent:'intent-index.json',questions:'question-rules.json',recommendations:'recommendation-index.json',jurisdictions:'jurisdiction-index.json',state:'journey-state-schema.json',manifest:'manifest.json'};
export async function loadRuntime(base='./runtime/'){
 const entries=await Promise.all(Object.entries(FILES).map(async([key,file])=>{const response=await fetch(base+file,{cache:'no-store'});if(!response.ok)throw new Error(`${file}: HTTP ${response.status}`);return [key,await response.json()]}));
 const runtime=Object.fromEntries(entries); if(!runtime.intent?.intents?.length)throw new Error('Runtime contains no intents'); return runtime;
}
