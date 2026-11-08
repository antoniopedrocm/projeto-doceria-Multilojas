const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=fs.realpathSync(path.join(__dirname,'..'));
assert.equal(root.toLowerCase(),'c:\\users\\antonio.pedro\\projeto\\projeto-doceria-multiloja');
const project='ana-guimaraes';
assert.equal(JSON.parse(fs.readFileSync(path.join(root,'.firebaserc'),'utf8')).projects.default,project);
assert.equal(JSON.parse(fs.readFileSync(path.join(root,'firebase.json'),'utf8')).hosting.target,'prod');
for(const name of ['.env','.env.local','.env.production','.env.production.local']) {
  const file=path.join(root,'crm',name);
  if(!fs.existsSync(file))continue;
  const text=fs.readFileSync(file,'utf8');
  assert.ok(!text.includes('crmdoceria-9959e'),name+' contains a DEV environment reference');
  const id=text.match(/^REACT_APP_FIREBASE_PROJECT_ID\s*=\s*["']?([^\r\n"']+)/m)?.[1]?.trim();
  if(id)assert.equal(id,project,name+' project mismatch');
}
console.log(JSON.stringify({workspace:root,project,localBuildOnly:true,deployExecuted:false}));
