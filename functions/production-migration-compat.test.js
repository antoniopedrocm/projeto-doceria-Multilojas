const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {initialAllocation}=require('./admin-order-edit');

test('existing production stock ledger wins over inferred allocation',()=>{
  const order={status:'Pendente',estoqueAplicado:{cake:2},itens:[{produtoId:'cake',quantity:3}]};
  const before=JSON.stringify(order);
  assert.deepEqual(initialAllocation(order),{cake:2});
  assert.equal(JSON.stringify(order),before);
  assert.deepEqual(initialAllocation({...order,estoqueAplicado:{}}),{});
});

test('shared push delivery waits for verified online payment but retains offline handling',async()=>{
  const source=fs.readFileSync(require.resolve('./index'),'utf8');
  const start=source.indexOf('const notifyNewOrderHandler =');
  const end=source.indexOf('exports.notifyNewOrder =',start);
  assert.ok(start>0 && end>start);
  let eligible=0;
  const context=vm.createContext({isNewPendingOrder:()=>{eligible++;return false;},logger:{info(){},warn(){}}});
  vm.runInContext(source.slice(start,end)+';globalThis.deliver=notifyNewOrderHandler;',context);
  const event=order=>({params:{lojaId:'fixture-store',pedidoId:'fixture-order'},data:{data:()=>order}});
  await context.deliver(event({paymentId:'fixture',payment_status:'PENDING',status:'Pendente'}));
  assert.equal(eligible,0);
  await context.deliver(event({paymentId:'fixture',payment_status:'PAID',status:'Pendente'}));
  assert.equal(eligible,1);
  await context.deliver(event({status:'Pendente'}));
  assert.equal(eligible,2);
});

test('production form-discard protection and notification deep link survive the migration',()=>{
  const parser=require('../crm/node_modules/@babel/parser');
  const path=require('node:path');
  const source=fs.readFileSync(path.join(__dirname,'../crm/src/App.js'),'utf8');
  const ast=parser.parse(source,{sourceType:'module',plugins:['jsx']});
  const names=['DIRTY_FORM_SELECTOR','hasUnsavedFormChanges','confirmDiscardUnsavedChanges','requestPageChange','openPendingOrderFromNotification'];
  const declarations=new Map();
  function walk(node){
    if(!node || typeof node!=='object')return;
    if(node.type==='VariableDeclarator' && names.includes(node.id?.name))declarations.set(node.id.name,'const '+source.slice(node.start,node.end)+';');
    for(const value of Object.values(node))Array.isArray(value)?value.forEach(walk):walk(value);
  }
  walk(ast);assert.equal(declarations.size,names.length);
  const pages=[];let discard=false,dirty=true;
  const pending={current:null};
  const context=vm.createContext({useCallback:fn=>fn,document:{querySelector:()=>dirty?{}:null},window:{confirm:()=>discard},
    setCurrentPage:page=>pages.push(page),setShowNotifications:()=>{},pendingOrderOpenRequestRef:pending});
  vm.runInContext(names.map(n=>declarations.get(n)).join('\n')+';globalThis.change=requestPageChange;globalThis.open=openPendingOrderFromNotification;',context);
  assert.equal(context.change('configuracoes'),false);assert.deepEqual(pages,[]);
  context.open({id:'order-fixture',lojaId:'garavelo-fixture'});assert.equal(pending.current,null);
  discard=true;context.open({id:'order-fixture',lojaId:'garavelo-fixture'});
  assert.equal(pending.current.orderId,'order-fixture');assert.equal(pending.current.lojaId,'garavelo-fixture');
  assert.deepEqual(pages,['pedidos']);dirty=false;assert.equal(context.change('clientes'),true);
});

test('local preview cannot select a live API even when the production API environment variable exists',()=>{
  const parser=require('../crm/node_modules/@babel/parser'),path=require('node:path');
  const source=fs.readFileSync(path.join(__dirname,'../crm/src/firebaseConfig.js'),'utf8');
  const ast=parser.parse(source,{sourceType:'module'});
  const declaration=ast.program.body.find(n=>n.type==='ExportNamedDeclaration' && n.declaration?.declarations?.some(d=>d.id.name==='apiBaseUrl'));
  const expression=declaration.declaration.declarations.find(d=>d.id.name==='apiBaseUrl').init;
  const context={localPreview:true,process:{env:{REACT_APP_API_BASE_URL:'https://production-fixture.invalid/api'}}};
  assert.equal(vm.runInNewContext(source.slice(expression.start,expression.end),context),'http://127.0.0.1:5001/demo-doceria-checkout/us-central1/api');
  context.localPreview=false;
  assert.equal(vm.runInNewContext(source.slice(expression.start,expression.end),context),'https://production-fixture.invalid/api');
});
