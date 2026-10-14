/* Read the existing publisher-owned blocks; never create a second publisher. */
(async function(){
 'use strict';
 var host=document.getElementById('music-sections');if(!host)return;
 try{
  var response=await fetch('/?music-source=1',{cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!response.ok)return;
  var source=new DOMParser().parseFromString(await response.text(),'text/html');
  var blocks=['billboard','spotify-videos','swifties-spotify'].map(function(id){return source.getElementById(id)});
  if(blocks.some(function(block){return !block}))return;
  blocks.forEach(function(block){
   block.querySelectorAll('script,button').forEach(function(el){el.remove()});
   block.querySelectorAll('iframe').forEach(function(frame){frame.loading='lazy'});
   var current=host.querySelector('#'+block.id);if(current)current.replaceWith(block);
  });
  document.dispatchEvent(new Event('matchapp:music-rendered'));
 }catch(_){/* Keep the dated, verified committed sections during source outages. */}
})();
