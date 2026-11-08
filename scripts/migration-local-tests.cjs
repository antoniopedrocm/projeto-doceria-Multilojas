const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
assert.equal(path.basename(root), 'projeto-doceria-multiloja');
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
const evidence = path.join(root, 'docs/evidence/dev-to-prod-20261108');
const logs = path.join(root, '_preservados/dev-to-prod-20261108-662de0c2/test-logs');
fs.mkdirSync(logs, {recursive:true});
let files = [
  ...fs.readdirSync(path.join(root,'functions')).filter(f => f.endsWith('.test.js')).map(f=>'functions/'+f),
  ...fs.readdirSync(path.join(root,'crm/tests')).filter(f => /\.test\.(cjs|mjs)$/.test(f)).map(f=>'crm/tests/'+f),
];
const previous=process.argv.includes('--retry') ? JSON.parse(fs.readFileSync(path.join(evidence,'local-tests.json'),'utf8')).results : [];
if(previous.length)files=files.filter(file=>!previous.some(r=>r.file===file) || previous.some(r=>r.file===file && r.exitCode!==0));
const results=[...previous];
(async () => {
  for(const file of files) {
    // Discard synthetic state only, on loopback emulators. No real project data.
    for(const url of (file.startsWith('functions/') ? ['http://127.0.0.1:8080/emulator/v1/projects/demo-doceria-checkout/databases/(default)/documents','http://127.0.0.1:9099/emulator/v1/projects/demo-doceria-checkout/accounts'] : [])) {
      const response=await fetch(url,{method:'DELETE'}); assert.ok(response.ok);
    }
    const log=path.join(logs,file.replaceAll('/','-')+'.log'),fd=fs.openSync(log,'w');
    const exitCode=await new Promise(resolve=>{
      const child=cp.spawn(process.execPath,['--require',path.join(__dirname,'migration-test-network-guard.cjs'),'--test','--test-concurrency=1',path.basename(file)],{
        cwd:path.join(root,path.dirname(file)),windowsHide:true,stdio:['ignore',fd,fd],timeout:180000,
        env:{...process.env,NODE_OPTIONS:'--max-old-space-size=768',GCLOUD_PROJECT:'demo-doceria-checkout',GCP_PROJECT:'demo-doceria-checkout',FIREBASE_CONFIG:JSON.stringify({projectId:'demo-doceria-checkout'}),GOOGLE_APPLICATION_CREDENTIALS:'',FUNCTIONS_EMULATOR:'true'},
      });child.on('error',()=>resolve(-1));child.on('exit',resolve);
    });fs.closeSync(fd);
    const content=fs.readFileSync(log,'utf8'),number=k=>Number(content.match(new RegExp('^# '+k+' (\\d+)','m'))?.[1] || 0);
    const result={file,exitCode,tests:number('tests'),passed:number('pass'),failed:number('fail'),skipped:number('skipped'),log:path.relative(root,log)};
    const old=results.findIndex(r=>r.file===file);
    if(old>=0)results[old]=result;else results.push(result);
    console.log(JSON.stringify(result));
    fs.writeFileSync(path.join(evidence,'local-tests.json'),JSON.stringify({localOnly:true,externalNetworkBlocked:true,results},null,2)+'\n');
  }
  if(results.some(r=>r.exitCode!==0))process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
