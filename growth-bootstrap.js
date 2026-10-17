/* Run before third-party scripts: private invite capabilities never enter page URLs sent to analytics. */
(function (w, d) {
  'use strict';
  var KEY='matchapp_growth_context_v1', TTL=24*60*60*1000;
  function read(){try{var v=JSON.parse(w.sessionStorage.getItem(KEY)||'null');return v&&v.expiresAt>Date.now()?v:null;}catch(_){return null;}}
  function store(value){try{w.sessionStorage.setItem(KEY,JSON.stringify(value));return true;}catch(_){return false;}}
  var params=new URLSearchParams(w.location.search), hash=new URLSearchParams(w.location.hash.slice(1));
  var kind=hash.has('invite')?'invite':hash.has('resume')?'resume':null;
  var state=read(), error=false;
  if(kind){
    var token=hash.get(kind)||'';
    // Remove even an invalid reserved fragment, without ever echoing its value.
    w.history.replaceState(null,'',w.location.pathname+w.location.search);
    if(/^[a-f0-9]{64}$/.test(token)){
      if(!state||state.token!==token||state.kind!==kind)state={kind:kind,token:token,expiresAt:Date.now()+TTL};
      store(state);
    }else{state=null;error=true;try{w.sessionStorage.removeItem(KEY);}catch(_){}}
  }
  if(params.get('new')==='1'){state=null;try{w.sessionStorage.removeItem(KEY);}catch(_){}w.history.replaceState(null,'',w.location.pathname);}
  var classic=params.has('s')||params.has('code')||params.get('mode')==='classic';
  var context={key:KEY,state:state,invalid:error,classic:classic,store:store,read:read};
  w.MatchAppGrowthContext=context;
  if(/\/together\.html$/.test(w.location.pathname)&&!classic){
    d.documentElement.dataset.growthMode='quick';
    // No private invitation is an indexable document.
    var robots=d.querySelector('meta[name="robots"]');
    if(!robots){robots=d.createElement('meta');robots.name='robots';d.head.appendChild(robots);}
    robots.content='noindex,follow';
  }
})(window,document);
