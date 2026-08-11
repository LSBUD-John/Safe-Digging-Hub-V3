import fs from 'node:fs/promises';
import path from 'node:path';
import { text, splitList, words, slug, uniq, includesAny } from './schema-utils.mjs';

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, process.env.MATRIX_DIR || 'matrix-data');
const OUTPUT = path.join(ROOT, process.env.RUNTIME_DIR || 'runtime');
const REQUIRED = ['personas','intents','methods','jurisdictions','risks','mitigations','library','legislation','services','external-resources','onecall-mapping','recommendation-rules'];
const OPTIONAL = ['land-rights-and-consents','incident-reporting','questions','journey-state-schema'];

async function readJson(name, required=true) {
  const file = path.join(SOURCE, `${name}.json`);
  try { return JSON.parse(await fs.readFile(file,'utf8')); }
  catch (error) {
    if (!required && error.code === 'ENOENT') return [];
    throw new Error(`Cannot load ${file}: ${error.message}`);
  }
}
function normaliseId(row, fallbackPrefix, index) {
  return text(row,'ID','Id','id') || `${fallbackPrefix}${String(index+1).padStart(3,'0')}`;
}
function generic(rows, prefix, labelKeys) {
  return rows.map((row,index)=>({
    id: normaliseId(row,prefix,index),
    label: text(row,...labelKeys),
    source: row
  }));
}
function matchIds(textValue, records, fields=['label']) {
  const source = String(textValue || '').toLowerCase();
  if (!source) return [];
  return records.filter(record => {
    const candidates = fields.flatMap(field => field === 'source' ? Object.values(record.source || {}) : [record[field]]);
    return candidates.some(candidate => {
      const c = String(candidate || '').toLowerCase();
      return c && (source.includes(c) || c.includes(source) || words(c).some(w => source.includes(w)));
    });
  }).map(record=>record.id);
}
function enrichIntent(row,index, data) {
  const id = normaliseId(row,'I',index);
  const label = text(row,'Intent','Intent / activity','intent','Activity');
  const phrases = uniq([label,...splitList(text(row,'Match phrases','Match Phrases','matchPhrases','Keywords'))]);
  const personaText = text(row,'Personas','Likely personas','Likely Personas');
  const context = text(row,'Context','Project context','Project Context');
  const effect = text(row,'Ground / physical effect','Ground disturbance','Ground / Physical Effect');
  const searchText = [label,phrases.join(' '),personaText,context,effect].join(' ');
  const personaIds = matchIds(personaText,data.personas,['label','source']);
  const methodIds = data.methods.filter(m=>includesAny(searchText,words(m.label))).map(m=>m.id);
  const riskIds = data.risks.filter(r=>includesAny(searchText,[...words(r.label),...words(text(r.source,'Triggers'))])).map(r=>r.id);
  const libraryIds = data.library.filter(l=>includesAny(searchText,[...words(l.label),...words(text(l.source,'Topic'))])).map(l=>l.id);
  const serviceIds = data.services.filter(s=>includesAny(searchText,[...words(s.label),...words(text(s.source,'Description / provider','Description'))])).map(s=>s.id);
  return {id,label,slug:slug(label),matchPhrases:phrases,personaIds,methodIds,riskIds,libraryIds,serviceIds,context,physicalEffect:effect,sourceRowId:id};
}
function createIntentIndex(intents) {
  const phraseMap={};
  for (const intent of intents) for (const phrase of intent.matchPhrases) {
    const key=phrase.toLowerCase().trim(); if (!key) continue;
    phraseMap[key] ||= []; phraseMap[key].push(intent.id);
  }
  return {version:1,generatedAt:new Date().toISOString(),intents,phraseMap};
}
function createQuestions(raw) {
  if (Array.isArray(raw) && raw.length) return raw;
  return [
    {id:'Q_PURPOSE',prompt:'What do you need the information for?',type:'single-choice',priority:100,appliesTo:{allIntents:true},options:[
      {id:'information',label:'Information gathering or early planning',sets:{purpose:'information',enquiryType:'Information Only'}},
      {id:'planned-28',label:'Works starting within the next 28 days',sets:{purpose:'planned-near',enquiryType:'Planned Works'}},
      {id:'planned-future',label:'Works starting more than 28 days away',sets:{purpose:'planned-future',enquiryType:'Information Only',repeatSearchAdvisory:true}},
      {id:'emergency',label:'Emergency works',sets:{purpose:'emergency',enquiryType:'Emergency'}},
      {id:'unsure',label:'Not sure',sets:{purpose:'unsure'}}]},
    {id:'Q_ROLE',prompt:'Which best describes your role?',type:'single-choice',priority:80,deriveOptionsFrom:'personas',maximumOptions:6},
    {id:'Q_JURISDICTION',prompt:'Where will the work take place?',type:'single-choice',priority:90,deriveOptionsFrom:'jurisdictions'},
    {id:'Q_PENETRATION',prompt:'Will the ground be broken, drilled or penetrated?',type:'yes-no-unsure',priority:75},
    {id:'Q_LOADING',prompt:'Will heavy plant, cranes, outriggers, spoil or stored materials load the ground?',type:'yes-no-unsure',priority:70},
    {id:'Q_OVERHEAD',prompt:'Are overhead lines near the work or access route?',type:'yes-no-unsure',priority:70},
    {id:'Q_WATER',prompt:'Is the work close to open water, drainage or a risk of flooding?',type:'yes-no-unsure',priority:65},
    {id:'Q_SURVEY_GROUND',prompt:'What ground and surface conditions are expected?',type:'multi-choice',priority:60,showWhen:{intentIds:['I009']},options:[
      {id:'wet-clay',label:'Wet or clay-rich ground'},{id:'saline',label:'Saline or highly conductive ground'},{id:'saturated',label:'Saturated or waterlogged ground'},{id:'dry-sandy',label:'Dry, sandy ground'},{id:'rocky',label:'Rocky or obstructed ground'},{id:'reinforced',label:'Reinforced or heavily made surface'},{id:'unknown',label:'Not known'}]}
  ];
}
function defaultStateSchema(raw) {
  if (raw && !Array.isArray(raw) && Object.keys(raw).length) return raw;
  return {version:1,fields:{intentId:null,candidateIntentIds:[],personaIds:[],purpose:null,enquiryType:null,jurisdictionId:null,methodIds:[],riskIds:[],mitigationIds:[],libraryIds:[],legislationIds:[],externalResourceIds:[],serviceIds:[],answers:{},siteRequired:false,site:null,utilitySearchSelected:false,oneCallSelection:null,selectionMethod:null}};
}
function recommendationIndex(data,intents) {
  return {version:1,generatedAt:new Date().toISOString(),byIntent:Object.fromEntries(intents.map(i=>[i.id,{personaIds:i.personaIds,methodIds:i.methodIds,riskIds:i.riskIds,libraryIds:i.libraryIds,serviceIds:i.serviceIds}])),records:{
    personas:Object.fromEntries(data.personas.map(x=>[x.id,x])),methods:Object.fromEntries(data.methods.map(x=>[x.id,x])),risks:Object.fromEntries(data.risks.map(x=>[x.id,x])),mitigations:Object.fromEntries(data.mitigations.map(x=>[x.id,x])),library:Object.fromEntries(data.library.map(x=>[x.id,x])),legislation:Object.fromEntries(data.legislation.map(x=>[x.id,x])),services:Object.fromEntries(data.services.map(x=>[x.id,x])),externalResources:Object.fromEntries(data.externalResources.map(x=>[x.id,x]))}};
}
async function main(){
  await fs.mkdir(OUTPUT,{recursive:true});
  const raw={}; for (const name of REQUIRED) raw[name]=await readJson(name,true); for (const name of OPTIONAL) raw[name]=await readJson(name,false);
  const data={
    personas:generic(raw.personas,'P',['Persona','persona','Label']),
    methods:generic(raw.methods,'M',['Method','method','Label']),
    jurisdictions:generic(raw.jurisdictions,'J',['Nation','Jurisdiction','nation']),
    risks:generic(raw.risks,'R',['Risk','risk','Label']),
    mitigations:generic(raw.mitigations,'MT',['Mitigation','mitigation','Label']),
    library:generic(raw.library,'L',['Title','title','Label']),
    legislation:generic(raw.legislation,'LG',['Title','title','Label']),
    services:generic(raw.services,'S',['Service','service','Label']),
    externalResources:generic(raw['external-resources'],'ER',['Resource','resource','Label']),
    oneCall:generic(raw['onecall-mapping'],'OC',['Purpose / intent','Purpose','Intent']),
    rules:generic(raw['recommendation-rules'],'RR',['Rule','rule','Label']),
    landRights:generic(raw['land-rights-and-consents'] || [],'LR',['Matter','matter','Label']),
    incidentReporting:generic(raw['incident-reporting'] || [],'IR',['Event','event','Label'])
  };
  const intents=raw.intents.map((row,index)=>enrichIntent(row,index,data));
  const files={
    'intent-index.json':createIntentIndex(intents),
    'question-rules.json':{version:1,generatedAt:new Date().toISOString(),questions:createQuestions(raw.questions)},
    'recommendation-index.json':recommendationIndex(data,intents),
    'jurisdiction-index.json':{version:1,generatedAt:new Date().toISOString(),jurisdictions:data.jurisdictions},
    'onecall-index.json':{version:1,generatedAt:new Date().toISOString(),records:data.oneCall},
    'journey-state-schema.json':defaultStateSchema(raw['journey-state-schema']),
    'manifest.json':{version:1,generatedAt:new Date().toISOString(),sourceDirectory:path.relative(ROOT,SOURCE),counts:{intents:intents.length,personas:data.personas.length,methods:data.methods.length,jurisdictions:data.jurisdictions.length,risks:data.risks.length,mitigations:data.mitigations.length,library:data.library.length,legislation:data.legislation.length,services:data.services.length,externalResources:data.externalResources.length}}
  };
  for (const [name,value] of Object.entries(files)) await fs.writeFile(path.join(OUTPUT,name),JSON.stringify(value,null,2)+'\n');
  console.log(`Runtime generated in ${OUTPUT}`); console.log(files['manifest.json'].counts);
}
main().catch(error=>{console.error(error.message);process.exit(1)});
