/* Editorial selections, not a live popularity ranking. Original sources checked 2026-09-28. */
(function(root){
'use strict';
const channels=[
 {id:'maangchi',name:'Maangchi',url:'https://www.maangchi.com/',channel:'https://www.youtube.com/channel/UC8gFadPgK2r1ndqLI04Xvvw',language:'English',specialty:'Korean home cooking',description:'Step-by-step Korean cooking from Maangchi, with recipe notes and original demonstration videos.',tags:'korean coreana kimchi rice arroz vegetables legumes bibimbap'},
 {id:'jamie',name:'Jamie Oliver',url:'https://www.jamieoliver.com/',channel:'https://www.youtube.com/user/jamieoliver',language:'English',specialty:'Everyday meals and kitchen skills',description:'Everyday meals, family cooking and practical techniques from Jamie Oliver and his food team.',tags:'eggs ovos breakfast cafe brunch beginner iniciante family familia'},
 {id:'panelinha',name:'Panelinha · Rita Lobo',url:'https://panelinha.com.br/',channel:'https://www.youtube.com/sitepanelinha',language:'Português',specialty:'Brazilian home cooking',description:'Brazilian home cooking, everyday recipes and kitchen lessons from Rita Lobo and the Panelinha team.',tags:'brazil brasil brasileira portuguese portugues omelete eggs ovos salad salada'},
 {id:'foodwishes',name:'Food Wishes · Chef John',url:'https://foodwishes.blogspot.com/',channel:'https://www.youtube.com/foodwishes',language:'English',specialty:'Technique-led comfort food',description:'Chef John teaches approachable cooking techniques through original recipe demonstrations.',tags:'american americana soup sopa tomato tomate comfort techniques tecnicas'}
];
const recipes=[
 {id:'bibimbap',channelId:'maangchi',title:'Bibimbap — mixed rice with vegetables',url:'https://www.maangchi.com/recipe/bibimbap',video:'6QQ67F8y2b8',description:'Maangchi demonstrates the components and assembly of this Korean rice dish. Check the original recipe for ingredients and variations.',tags:'rice arroz vegetables legumes korean coreana bibimbap'},
 {id:'scrambled-eggs',channelId:'jamie',title:'Scrambled eggs — three ways',url:'https://www.jamieoliver.com/inspiration/how-to-make-perfect-scrambled-eggs-3-ways-jamie-oliver/',video:'s9r-CxnCXkg',description:'Jamie Oliver demonstrates English, French and American approaches to scrambled eggs.',tags:'eggs ovos breakfast cafe brunch beginner iniciante'},
 {id:'rita-omelet',channelId:'panelinha',title:'Omelet and salad dressing · Rita live',url:'https://www.youtube.com/watch?v=ATN7ZGO-PPU',video:'ATN7ZGO-PPU',description:'Rita Lobo prepares an omelet and salad dressing in a live cooking lesson with Marcelo Forlani.',tags:'omelet omelette omelete eggs ovos salad salada brazil brasileira'},
 {id:'tomato-soup',channelId:'foodwishes',title:'Fresh tomato soup with crispy cheese toast',url:'https://www.youtube.com/watch?v=4fPYsw8XVm8',video:'4fPYsw8XVm8',description:'Chef John demonstrates fresh tomato soup paired with crispy cheese toast on Food Wishes.',tags:'soup sopa tomato tomate cheese queijo toast torrada comfort'},
 {id:'omelete',channelId:'panelinha',title:'Omelete · Panelinha',url:'https://panelinha.com.br/receita/omelete',image:'https://i.panelinha.com.br/i1/bk-7046-omelete.webp',description:'Panelinha’s written omelet recipe, with ingredient amounts and step-by-step instructions at the original source.',tags:'omelet omelette omelete eggs ovos brazil brasileira'}
];
function normalize(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function isCooking(q){
 const text=normalize(q);
 // A film, series or documentary ABOUT cooking is still a watch request.
 if(/\b(watch|stream|(?:cooking|tv|television)\s+shows?|series|movies?|films?|documentar(?:y|ies|ios?)|assistir|ver|filmes?|series?|documentarios?|peliculas?)\b/.test(text))return false;
 return /\b(recipes?|receitas?|cooking|cookery|culinaria|cozinhar|recetas?|cocinar|maangchi|panelinha|rita lobo|food wishes|chef john|jamie oliver|bibimbap|omelet|omelette|omelete|scrambled eggs|tomato soup)\b/.test(text);
}
function find(q,kind='recipes'){
 const words=normalize(q).split(/[^a-z0-9]+/).filter(w=>w.length>2 && !['the','and','for','with','how','can','make','recipe','recipes','receita','receitas','cooking','channel','channels','uma','para','com','como','quero','cook','find','from'].includes(w));
 const pool=kind==='channels'?channels:recipes;
 const ranked=pool.map(item=>{const c=channels.find(c=>c.id===item.channelId);const hay=normalize([item.title,item.name,item.tags,c?.name,c?.tags].join(' '));return {item,score:words.reduce((n,w)=>n+(hay.includes(w)?1:0),0)};}).sort((a,b)=>b.score-a.score);
 const hits=words.length?ranked.filter(x=>x.score>0).map(x=>x.item):pool;
 return {items:hits.length?hits:channels,fallback:!hits.length,query:String(q||'')};
}
root.MatchCooking=Object.freeze({channels,recipes,find,isCooking,checked:'2026-09-28'});
if(typeof module==='object')module.exports=root.MatchCooking;
})(typeof window==='object'?window:globalThis);
