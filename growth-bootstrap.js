/* Run before third-party scripts: private invite capabilities never enter page URLs sent to analytics. */
(function (w, d) {
  'use strict';
  var KEY='matchapp_growth_context_v1', TTL=24*60*60*1000;
  var together=/\/together\.html$/.test(w.location.pathname);
  function privateDocument(){
    if(!together)return;
    var robots=d.querySelector('meta[name="robots"]');
    if(!robots){robots=d.createElement('meta');robots.name='robots';d.head.appendChild(robots);}
    robots.content='noindex,follow';
  }
  function privateLocation(){
    var query=new URLSearchParams(w.location.search), fragment=new URLSearchParams(w.location.hash.slice(1));
    var privateURL=/^classic$/i.test(query.get('mode')||'');
    // Mistyped capability links are private too; this does not make them valid.
    query.forEach(function(value,key){if(/^(s|code|invite|resume)$/i.test(key))privateURL=true;});
    fragment.forEach(function(value,key){if(/^(invite|resume)$/i.test(key))privateURL=true;});
    return privateURL;
  }
  function read(){try{var v=JSON.parse(w.sessionStorage.getItem(KEY)||'null');return v&&v.expiresAt>Date.now()?v:null;}catch(_){return null;}}
  function store(value){if(value)privateDocument();try{w.sessionStorage.setItem(KEY,JSON.stringify(value));return true;}catch(_){return false;}}
  var params=new URLSearchParams(w.location.search), hash=new URLSearchParams(w.location.hash.slice(1));
  var kind=hash.has('invite')?'invite':hash.has('resume')?'resume':null;
  var state=read(), error=false;
  var privateVisit=!!(state||privateLocation());
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
  if(together){
    if(!classic)d.documentElement.dataset.growthMode='quick';
    // Only the clean public landing document is indexable. Never undo a
    // private directive when a capability is stripped or a session is reset.
    if(privateVisit||classic)privateDocument();
    function protectNavigation(){
      if(read()||privateLocation())privateDocument();
    }
    w.addEventListener('hashchange',protectNavigation);
    w.addEventListener('popstate',protectNavigation);
    w.addEventListener('pageshow',protectNavigation);
  }
})(window,document);
