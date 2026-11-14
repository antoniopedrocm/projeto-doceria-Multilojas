const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),yaml=createRequire(path.join(root,'crm/package.json'))('js-yaml');
function validateWorkflow(source){
  const workflow=yaml.load(source);
  assert.deepEqual(workflow.permissions,{contents:'read'},'CI must use read-only repository permissions');
  assert.ok(!/\$\{\{\s*secrets\.|action-hosting-deploy|google-github-actions\/auth|\bid-token\s*:\s*write|\bpull_request_target\b|\bworkflow_run\b/i.test(source),'CI must not acquire production access');
  assert.ok(!/\bfirebase(?:-tools)?[^\r\n]*\b(?:deploy|hosting:clone|hosting:channel:deploy)\b|\bgcloud[^\r\n]*\b(?:deploy|submit|triggers\s+run)\b|\bgh\s+workflow\s+run\b/i.test(source),'CI must not publish');
  const steps=Object.values(workflow.jobs||{}).flatMap(job=>job.steps||[]);
  assert.ok(steps.some(s=>s.run==='npm test --prefix functions'),'Preserve backend tests');
  assert.ok(steps.some(s=>s.run?.startsWith('npm test --prefix crm')),'Preserve frontend tests');
  assert.ok(steps.some(s=>s.run==='node node_modules/react-scripts/bin/react-scripts.js build'&&s['working-directory']==='crm'),'Preserve frontend build');
  return workflow;
}
function main(){
  if(process.env.GITHUB_ACTIONS==='true')assert.equal(process.env.GITHUB_REPOSITORY?.toLowerCase(),'antoniopedrocm/projeto-doceria-multilojas','Wrong CI repository');
  assert.equal(JSON.parse(fs.readFileSync(path.join(root,'.firebaserc'),'utf8')).projects.default,'ana-guimaraes');
  assert.equal(JSON.parse(fs.readFileSync(path.join(root,'firebase.json'),'utf8')).hosting.target,'prod');
  const files=fs.readdirSync(path.join(root,'.github/workflows')).filter(f=>/\.ya?ml$/.test(f));
  assert.deepEqual(files.sort(),['firebase-hosting-merge.yml','firebase-hosting-pull-request.yml']);
  for(const file of files)validateWorkflow(fs.readFileSync(path.join(root,'.github/workflows',file),'utf8'));
  for(const file of ['.env','.env.local','.env.production','.env.production.local']){const full=path.join(root,'crm',file);if(fs.existsSync(full))assert.ok(!fs.readFileSync(full,'utf8').includes('crmdoceria-9959e'),'DEV reference in production build inputs');}
  console.log(JSON.stringify({workspace:root,project:'ana-guimaraes',workflows:files.length,readOnlyPermissions:true,productionCredentialsUsed:false,buildAndTestsPreserved:true,deployExecuted:false}));
}
if(require.main===module)main();
module.exports={validateWorkflow};
