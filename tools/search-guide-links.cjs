'use strict';
// Crawlable navigation for existing public guides; no changes to catalogs or age rules.
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const ROOT=path.resolve(__dirname,'..');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function renderGuideLinks(root=ROOT){
 const groups=[
  {prefix:'/featured/',id:'featured-guides',name:'Featured title guides',note:'Read the exact title guide before checking regional viewing options.'},
  {prefix:'/kids/titles/',id:'family-guides',name:'Reviewed Kids title guides',note:'For families using the web or dedicated Kids app. Review age bands and title guidance with a grown-up before choosing a viewing service.'},
  {prefix:'/awareness/',id:'awareness-guides',name:'Awareness resources',note:'Explore dated observance guides and their official resources.'}
 ];
 const dom=new JSDOM(fs.readFileSync(path.join(root,'sitemap.xml'),'utf8'),{contentType:'text/xml'});
 const urls=[...dom.window.document.querySelectorAll('loc')].map(n=>n.textContent.trim());dom.window.close();
 return groups.map(g=>{
  const links=urls.filter(u=>new URL(u).origin==='https://matchapp.tv'&&new URL(u).pathname.startsWith(g.prefix)).map(u=>{
   const pathname=new URL(u).pathname,file=path.join(root,pathname,'index.html');
   const page=new JSDOM(fs.readFileSync(file,'utf8')),d=page.window.document;
   const excluded=[...d.querySelectorAll('meta[name="robots"],meta[name="googlebot"]')].some(n=>/noindex|\bnone\b/i.test(n.content));
   const label=d.querySelector('h1')?.textContent.trim();page.window.close();
   if(excluded)return '';
   if(!label)throw Error('Guide lacks a visible heading: '+u);
   return '<li><a href="'+escape(pathname)+'">'+escape(label)+'</a></li>';
  }).filter(Boolean);
  return links.length?'<section aria-labelledby="'+g.id+'"><h2 id="'+g.id+'">'+g.name+'</h2><p>'+g.note+'</p><ul>'+links.join('')+'</ul></section>':'';
 }).join('\n');
}
module.exports={renderGuideLinks};
