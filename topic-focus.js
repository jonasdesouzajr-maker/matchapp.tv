/* MatchApp Adult: topic isolation. Pure decisions: no fetches or DOM writes.
   Unknown channel types stay opt-in until independently curated. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports)module.exports=api;
  if(root)root.MatchAppTopicFocus=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
const SCREEN=new Set(['movie','series','limited series','K-drama','novela brasileira','telenovela','documentary','anime','stand-up comedy special']);
const TOPICS=Object.freeze({
  'Cooking & Recipes':'cooking','Fitness & Wellness':'fitness',
  'Spotify playlist':'audio','Apple Music playlist':'audio','Spotify single':'audio',
  'music album':'audio','music artist':'audio','Music & Concerts':'audio',
  'Classical Music':'audio','podcast':'spoken','audiobook':'spoken',
  'News':'news','Sports':'sports','Gospel & Faith':'faith'
});
const COOKING=new Set(['Babish Culinary Universe','Joshua Weissman','Maangchi',"America's Test Kitchen"]);
const FITNESS=new Set(['Fitness Blender','Blogilates','Walk at Home by Leslie Sansone','HASfit',
 'Sydney Cummings Houdyshell','Lucy Wyndham-Read','The Fitness Marshall','growwithjo',
 'MadFit','Pamela Reif','Yoga With Adriene']);
const MUSIC=new Set(['NPR Tiny Desk Concerts','Lofi Girl','T-Series']);
const GENERAL_CHANNELS=new Set([
 'Kurzgesagt – In a Nutshell','Veritasium','Mark Rober','SmarterEveryDay','Vsauce',
 '3Blue1Brown','CGP Grey','TED-Ed','Manual do Mundo','Pitch Meeting','Porta dos Fundos',
 'Whindersson Nunes','Key & Peele','Bad Lip Reading','True Facts',
 'Marques Brownlee (MKBHD)','Linus Tech Tips','Mrwhosetheboss',
 'OverSimplified','Kings and Generals','Bailey Sarian: Dark History','LEMMiNO',
 'Markiplier','Jacksepticeye','The Joy of Painting with Bob Ross',
 'Felipe Neto','Você Sabia?','MrBeast'
]);
// No generic News, live sports or specialist tutorials can enter the random pool.
function topicFor(entry){
  if(!entry)return '';
  const title=String(entry.title||'');
  const cats=Array.isArray(entry.cats)?entry.cats:[];
  if(COOKING.has(title)||cats.includes('Cooking & Recipes'))return 'cooking';
  if(FITNESS.has(title)||cats.includes('Fitness & Wellness'))return 'fitness';
  if(MUSIC.has(title)||cats.includes('Music & Concerts'))return 'audio';
  const special=cats.map(c=>TOPICS[c]).find(Boolean);
  return special||'';
}
function normalizeSelection(selected,preferred){
  const all=[...new Set((Array.isArray(selected)?selected:[selected])
    .filter(c=>typeof c==='string'&&c&&c!=='any'))];
  // A niche topic has to be deliberate and can't be silently mixed with TV.
  const last=preferred&&all.includes(preferred)?preferred:all[all.length-1];
  const group=TOPICS[last]||'screen';
  if(group==='screen')return all.filter(cat=>!(cat in TOPICS));
  return all.filter(cat=>TOPICS[cat]===group);
}
function allow(entry,selection){
  if(!entry || !Array.isArray(entry.cats))return false;
  const cats=entry.cats,chosen=normalizeSelection(selection);
  const channel=cats.includes('YouTube channel')||cats.includes('YouTube Shorts');
  const specialty=topicFor(entry);
  if(!chosen.length){
    if(channel)return specialty===''&&GENERAL_CHANNELS.has(entry.title)&&entry.platform==='YouTube';
    if(specialty)return false;
    return cats.some(c=>SCREEN.has(c))&&!['Spotify','Apple Music','YouTube Music','Apple Podcasts','Audible'].includes(entry.platform);
  }
  const wanted=TOPICS[chosen[0]]||'screen';
  if(wanted!=='screen'){
    if(!specialty || specialty!==wanted)return false;
    if(wanted==='cooking')return chosen.includes('Cooking & Recipes')&&channel;
    if(wanted==='fitness')return chosen.includes('Fitness & Wellness')&&channel;
    // Other specialized topics retain exact category matching.
    return cats.some(c=>chosen.includes(c));
  }
  if(specialty)return false;
  if(channel){
    return chosen.includes('YouTube channel')&&GENERAL_CHANNELS.has(entry.title)&&entry.platform==='YouTube' ||
           chosen.includes('YouTube Shorts')&&GENERAL_CHANNELS.has(entry.title)&&entry.platform==='YouTube'&&cats.includes('YouTube Shorts');
  }
  return cats.some(c=>chosen.includes(c));
}
return Object.freeze({SCREEN,TOPICS,topicFor,normalizeSelection,allow,generalChannels:GENERAL_CHANNELS});
});
