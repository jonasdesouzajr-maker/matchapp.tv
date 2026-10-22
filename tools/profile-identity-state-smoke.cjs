'use strict';
// Isolated Chromium fixture: actual Profile markup/CSS and registration/geography
// initializers, fictional identity only, and no live application/backend access.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const argv=process.argv.slice(2),options={};
for(let i=0;i<argv.length;i+=2){
  if(!['--source','--shared-source','--output','--executable-path'].includes(argv[i])||!argv[i+1])throw Error('Expected --source, --shared-source, --output, or --executable-path followed by a value');
  options[argv[i]]=argv[i+1];
}
const sourceRoot=path.resolve(options['--source']||path.join(__dirname,'..'));
const sharedRoot=path.resolve(options['--shared-source']||sourceRoot);
const output=path.resolve(options['--output']||path.join(sourceRoot,'artifacts','profile-identity-state'));
const read=(file,shared=false)=>fs.readFileSync(path.join(shared?sharedRoot:sourceRoot,file),'utf8');
const profile=read('profile.js'),html=read('profile/profile.html');
const css=read('patches/reference-pages.css',true),registration=read('registration-upgrade.js',true),geography=read('profile-geography.js',true);
const a=profile.indexOf('function calculateAgeFromDOB('),b=profile.indexOf('window.retryLockedProfile =',a);
if(a<0||b<a)throw Error('Actual Profile identity runtime markers missing');
const languageListener=profile.match(/^document\.addEventListener\('matchapp:langchange',checkAndRenderProfileState\);$/m)?.[0];
if(!languageListener)throw Error('Actual Profile language listener missing');
const runtime=profile.slice(a,b)+'\n'+languageListener;
const card=html.match(/<article\b[^>]*\bid="account-details"[^>]*>[\s\S]*?<\/article>/)?.[0];
if(!card)throw Error('Actual My Details article missing');
const inlineCSS=[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match=>match[1]).join('\n');
const script=value=>'<script>'+value.replace(/<\/script/gi,'<\\/script')+'</script>';
const origin='https://profile-identity-fixture.invalid';
const report={scope:'Isolated desktop Chromium at responsive viewport widths; actual scoped CSS/registration/geography, fictional identity, no physical device or live account',sourceRoot,sharedRoot,sourceSHA256:{},cases:[],errors:[],blockedRequests:[],started:new Date().toISOString()};
for(const [file,content]of Object.entries({'profile.js':profile,'profile/profile.html':html,'patches/reference-pages.css':css,'registration-upgrade.js':registration,'profile-geography.js':geography}))report.sourceSHA256[file]=crypto.createHash('sha256').update(content).digest('hex');
fs.mkdirSync(output,{recursive:true});
function setup(state){
  const RealDate=Date,fixed=Date.parse('2026-06-20T12:00:00Z');
  window.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}};
  const seed={match_profile_locked:String(state.locked),match_user_name:'Morgan Example',match_user_country:'Brazil',match_user_dob:'05/03/1992',match_user_sign:'Pisces',match_user_age:'33',match_user_region:'Paraná',match_lang:'pt-BR',fixture_sentinel:'unchanged'};
  for(const [key,value]of Object.entries(seed))localStorage.setItem(key,value);
  window.__fixture={writes:[],backend:[],observerInstalls:0,observerCallbacks:0,seed};
  const originalSet=Storage.prototype.setItem;
  window.__fixture.setLocale=language=>originalSet.call(localStorage,'match_lang',language);
  Storage.prototype.setItem=function(key,value){window.__fixture.writes.push({key,value:String(value)});return originalSet.call(this,key,value);};
  const OriginalObserver=MutationObserver;
  window.MutationObserver=class extends OriginalObserver{
    constructor(callback){
      const scope={identity:false};
      super((...args)=>{if(scope.identity)window.__fixture.observerCallbacks++;callback(...args);});
      this.__fixtureScope=scope;
    }
    observe(target,...args){
      if(target===document.getElementById('editable-fields-section')){
        this.__fixtureScope.identity=true;window.__fixture.observerInstalls++;
      }
      return super.observe(target,...args);
    }
  };
  window.matchProfileState={status:state.status,userId:'fictional-fixture-account'};
  window.STAR_SIGN_TRAITS={Pisces:'Fixture trait',Libra:'Fixture trait'};
  window.formatSign=value=>value;
  window.populateEmail=()=>{};
  window.renderProfileGrids=()=>{};
  window.t=key=>localStorage.getItem('match_lang')+':'+key;
  window.saveProfileData=()=>{window.__fixture.backend.push('unexpected-save');throw Error('Saving is forbidden in this fixture');};
  window.supabaseClient={auth:{getUser:async()=>({data:{user:null}})}};
  window.fetch=async()=>{window.__fixture.backend.push('unexpected-fetch');throw Error('Live requests are forbidden in this fixture');};
  document.getElementById('account-details').hidden=false;
  document.getElementById('account-details').classList.add('profile-hub-open');
}
async function settle(page){
  await page.evaluate(()=>new Promise(resolve=>{
    const finish=()=>{clearTimeout(timer);resolve();};
    const timer=setTimeout(finish,1000);
    requestAnimationFrame(()=>requestAnimationFrame(finish));
  }));
}
function fieldSnapshot(){
  return [...document.querySelectorAll('#editable-fields-section input,#editable-fields-section select,#editable-fields-section textarea,#editable-fields-section button')].map(node=>({id:node.id,value:node.value,checked:node.checked,disabled:node.disabled}));
}
function metrics(){
  const section=document.getElementById('editable-fields-section'),card=document.getElementById('locked-info-card'),save=document.getElementById('save-profile-btn');
  const controls=[...section.querySelectorAll('input,select,textarea,button')];
  return {display:getComputedStyle(section).display,rectangles:section.getClientRects().length,priority:section.style.getPropertyPriority('display'),controls:controls.map(node=>({id:node.id,disabled:node.disabled,rectangles:node.getClientRects().length})),cardDisplay:getComputedStyle(card).display,cardRectangles:card.getClientRects().length,age:document.getElementById('lock-val-age').innerText,saveDisabled:save.disabled,saveHidden:save.hidden,locale:localStorage.getItem('match_lang'),writes:window.__fixture.writes,backend:window.__fixture.backend,observerInstalls:window.__fixture.observerInstalls,observerCallbacks:window.__fixture.observerCallbacks,storedAge:localStorage.getItem('match_user_age'),sentinel:localStorage.getItem('fixture_sentinel')};
}
const scenarios=[];
for(const width of [320,390,800,1366])for(const order of ['before','after']){
  scenarios.push({width,order,status:'ready',locked:true});
  scenarios.push({width,order,status:'ready',locked:false});
  if(width===800)for(const status of ['loading','error','signedout'])scenarios.push({width,order,status,locked:true});
}
let browser,watchdog,timedOut=false;
(async()=>{
  try{
    watchdog=setTimeout(()=>{timedOut=true;browser?.close().catch(()=>{});},120000);
    browser=await chromium.launch({headless:true,timeout:20000,...(options['--executable-path']?{executablePath:options['--executable-path']}:{})});
    for(const state of scenarios){
      if(timedOut)throw Error('Fixture exceeded its 120-second overall budget');
      const label=state.width+'-'+state.status+'-'+(state.locked?'locked':'unlocked')+'-registration-'+state.order;
      const result={label,...state,checks:[],errors:[]};report.cases.push(result);
      const context=await browser.newContext({viewport:{width:state.width,height:1100},locale:'en-US',timezoneId:'UTC'});
      const page=await context.newPage();page.setDefaultTimeout(6000);
      page.on('pageerror',error=>result.errors.push(error.message));
      const check=(name,ok,detail)=>result.checks.push({name,ok:Boolean(ok),detail});
      try{
        const fixture='<!doctype html><html class="ma-reference" lang="pt-BR"><head><meta charset="utf-8"><style>'+inlineCSS+'\n'+css+'</style></head><body class="matchapp-profile profile-page-v3"><main class="main-layout"><div class="container">'+card+'</div></main>'+script('('+setup.toString()+')('+JSON.stringify(state)+');')+script(geography)+(state.order==='before'?script(registration):'')+script(runtime)+'</body></html>';
        await context.route('**/*',route=>{
          if(route.request().url()===origin+'/profile/profile.html'&&route.request().method()==='GET')return route.fulfill({status:200,contentType:'text/html',body:fixture});
          report.blockedRequests.push({case:label,url:route.request().url(),method:route.request().method()});return route.abort();
        });
        await page.goto(origin+'/profile/profile.html',{waitUntil:'domcontentloaded',timeout:10000});
        await settle(page);
        let beforeLate;
        if(state.status==='ready'&&!state.locked){
          beforeLate=await page.evaluate(()=>{
            const name=document.getElementById('profile-name'),country=document.getElementById('profile-country'),dob=document.getElementById('profile-dob');
            name.value='Taylor Draft';dob.value='12/08/1995';country.value='Japan';country.disabled=true;
            const save=document.getElementById('save-profile-btn');save.disabled=true;window.__fixture.pendingSave=()=>{};save.onclick=window.__fixture.pendingSave;
            name.focus();name.setSelectionRange(2,8,'backward');
            return {name:name.value,dob:dob.value,country:country.value};
          });
        }
        if(state.order==='after'){await page.addScriptTag({content:registration});await settle(page);}
        const initial=await page.evaluate(metrics);result.metrics=initial;
        check('actual registration controls inserted',initial.controls.some(node=>node.id==='registration-terms')&&initial.controls.some(node=>node.id==='registration-region'));
        const blocked=state.status!=='ready'||state.locked;
        if(blocked){
          check('editable ancestor has no computed layout',initial.display==='none'&&initial.rectangles===0,initial.display);
          check('all original and late controls are disabled and invisible',initial.controls.every(node=>node.disabled&&node.rectangles===0),initial.controls);
          check('state hide has important priority',initial.priority==='important',initial.priority);
          check('locked summary matches readiness',state.status==='ready'?initial.cardRectangles>0:initial.cardRectangles===0,initial.cardDisplay);
          check('save is not interactive',initial.saveDisabled);
          if(state.status==='ready')check('locked age derives from saved DOB',initial.age==='34 years old',initial.age);
        }else{
          check('ready unlocked keeps approved grid layout',initial.display==='grid'&&initial.rectangles>0&&initial.priority==='',initial.display);
          check('ready unlocked hides locked summary',initial.cardRectangles===0,initial.cardDisplay);
          const drafts=await page.evaluate(()=>({name:document.getElementById('profile-name').value,dob:document.getElementById('profile-dob').value,country:document.getElementById('profile-country').value}));
          check('late insertion preserves existing identity edits',JSON.stringify(drafts)===JSON.stringify(beforeLate),drafts);
          const preserved=await page.evaluate(snapshotSource=>{
            const snapshot=Function('return ('+snapshotSource+')')();
            document.getElementById('registration-terms').checked=true;document.getElementById('registration-privacy').checked=true;document.getElementById('registration-marketing').checked=true;
            const language=document.getElementById('registration-language');language.value='ja';language.disabled=true;
            const name=document.getElementById('profile-name');name.focus();name.setSelectionRange(2,8,'backward');
            window.__fixture.setLocale('ar');
            const before=snapshot();
            document.dispatchEvent(new CustomEvent('matchapp:langchange'));
            return {before};
          },fieldSnapshot.toString());
          await settle(page);
          const after=await page.evaluate(snapshotSource=>{
            const snapshot=Function('return ('+snapshotSource+')')(),name=document.getElementById('profile-name'),save=document.getElementById('save-profile-btn');
            return {fields:snapshot(),focused:document.activeElement===name,caret:[name.selectionStart,name.selectionEnd,name.selectionDirection],saveDisabled:save.disabled,pendingHandler:save.onclick===window.__fixture.pendingSave,locale:localStorage.getItem('match_lang')};
          },fieldSnapshot.toString());
          check('language repaint preserves edits, consents and disabled controls',JSON.stringify(after.fields)===JSON.stringify(preserved.before),after.fields);
          check('language repaint preserves focus and caret',after.focused&&JSON.stringify(after.caret)===JSON.stringify([2,8,'backward']),after.caret);
          check('pending save stays disabled with its original handler',after.saveDisabled&&after.pendingHandler);
          check('deliberate app language remains selected',after.locale==='ar',after.locale);
        }
        const final=await page.evaluate(metrics);
        check('one scoped observer is installed',final.observerInstalls===1,final.observerInstalls);
        const callbacks=final.observerCallbacks;await settle(page);
        check('observer does not trigger itself',await page.evaluate(()=>window.__fixture.observerCallbacks)===callbacks,callbacks);
        check('display repair writes no storage or backend data',final.writes.length===0&&final.backend.length===0,{writes:final.writes,backend:final.backend});
        check('cached age and fixture data remain unchanged',final.storedAge==='33'&&final.sentinel==='unchanged');
        check('no script exceptions',result.errors.length===0,result.errors);
        if(state.order==='after'&&(state.status==='ready'||state.status==='error')){
          const screenshot=label+'.png';await page.screenshot({path:path.join(output,screenshot),fullPage:true,timeout:6000});result.screenshot=screenshot;
        }
      }catch(error){result.errors.push(error.stack||String(error));}
      finally{await context.close();}
      result.ok=result.errors.length===0&&result.checks.every(item=>item.ok);
    }
  }catch(error){report.errors.push(error.stack||String(error));}
  finally{
    clearTimeout(watchdog);if(browser)await browser.close().catch(error=>report.errors.push(String(error)));
    report.finished=new Date().toISOString();report.passed=report.cases.filter(item=>item.ok).length;report.failed=report.cases.filter(item=>!item.ok).length;
    report.ok=!timedOut&&report.errors.length===0&&report.failed===0&&report.cases.length===scenarios.length;
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({ok:report.ok,cases:report.cases.length,passed:report.passed,failed:report.failed,errors:report.errors.length,report:path.join(output,'report.json')}));
    if(!report.ok)process.exitCode=1;
  }
})();
