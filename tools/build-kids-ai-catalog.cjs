'use strict';
// The editorial LIBRARY remains the only Kids admission authority. This
// deterministic server bundle is checked for parity by the regression suite.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'kids/kids.js'),'utf8');
const literal=source.match(/const LIBRARY = (\[[\s\S]*?\n  \]);/);
if(!literal)throw Error('Reviewed Kids LIBRARY was not found; preserve the last server catalogue.');
const rows=vm.runInNewContext(literal[1],Object.create(null),{timeout:1000}).map(({title,year,type,ages,cats})=>({title,year,type,ages,cats}));
if(rows.length!==64||new Set(rows.map(r=>r.title)).size!==rows.length)throw Error('Review the Kids catalogue admission contract before regeneration.');
const output='// Generated from the reviewed LIBRARY in kids/kids.js. Do not admit titles here.\nexport const KIDS_REVIEWED_CATALOG = '+JSON.stringify(rows,null,2)+';\n';
const target=path.join(root,'supabase/functions/gemini-proxy/kids-reviewed-catalog.mjs');
if(process.argv.includes('--check')){
 if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==output)throw Error('Kids server catalogue is stale. Run node tools/build-kids-ai-catalog.cjs after reviewing the LIBRARY change.');
}else fs.writeFileSync(target,output);
console.log('Reviewed Kids server catalogue: '+rows.length+' exact identities.');
