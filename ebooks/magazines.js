/* MatchApp adult magazine discovery: curated publisher identities, not issue inventory.
   Free routes mean official free ARTICLES, never a free downloadable paywalled issue.
   An individual issue's front cover is displayed only at its original publisher page.
   No adult/XXX titles; this module is never loaded by Kids Mode. */
(function(root){
'use strict';
const RAW=[
 ['time','TIME','TIME','https://time.com/','https://time.com/vault/','https://time.com/subscribe/','history,contemporary','curious,reflective','GLOBAL','World reporting, society, culture and the people shaping current events.'],
 ['national-geographic','National Geographic','National Geographic','https://www.nationalgeographic.com/','https://www.nationalgeographic.com/magazine/','https://www.nationalgeographic.com/subscribe/magazines/','nature,science,history','curious,awe,adventurous','GLOBAL','Photography-rich reporting on wildlife, Earth, archaeology and exploration.'],
 ['the-economist','The Economist','The Economist','https://www.economist.com/','https://www.economist.com/weeklyedition','https://subscribe.economist.com/','economics,business,technology','cerebral,curious,reflective','GLOBAL','International economics, business, politics and science reporting.'],
 ['wired','WIRED','Condé Nast','https://www.wired.com/','https://www.wired.com/magazine/','https://www.wired.com/subscribe/','technology,science,business','curious,cerebral,practical','GLOBAL','Technology, design, science and the effects of emerging ideas.'],
 ['new-yorker','The New Yorker','Condé Nast','https://www.newyorker.com/','https://www.newyorker.com/magazine','https://www.newyorker.com/subscribe/','literary,contemporary,comedy','witty,reflective,curious','GLOBAL','Long-form reporting, criticism, fiction and illustration.'],
 ['scientific-american','Scientific American','Springer Nature','https://www.scientificamerican.com/','https://www.scientificamerican.com/magazine/','https://www.scientificamerican.com/getsciam/','science,technology,nature','curious,cerebral,awe','GLOBAL','Accessible science reporting and research-based explanation.'],
 ['new-scientist','New Scientist','New Scientist','https://www.newscientist.com/','https://www.newscientist.com/issue/','https://www.newscientist.com/subscribe/','science,technology,nature','curious,cerebral,awe','GLOBAL','Science and technology news, discoveries and analysis.'],
 ['vogue','Vogue','Condé Nast','https://www.vogue.com/','https://www.vogue.com/magazine','https://www.vogue.com/subscribe/','contemporary,biography','glamorous,curious,inspiring','GLOBAL','Fashion, designers, culture and style journalism.'],
 ['forbes','Forbes','Forbes','https://www.forbes.com/','https://www.forbes.com/','https://www.forbes.com/subscribe/','business,economics,technology','practical,inspiring,curious','GLOBAL','Entrepreneurship, business, money and innovation reporting.'],
 ['smithsonian','Smithsonian Magazine','Smithsonian Institution','https://www.smithsonianmag.com/','https://www.smithsonianmag.com/magazine/','https://www.smithsonianmag.com/subscribe/','history,science,nature','curious,awe,reflective','GLOBAL','History, arts, science and discoveries from a museum perspective.'],
 ['rolling-stone','Rolling Stone','Rolling Stone','https://www.rollingstone.com/','https://www.rollingstone.com/','https://www.rollingstone.com/subscribe/','contemporary,biography','nostalgic,curious,witty','GLOBAL','Music, popular culture and entertainment features.'],
 ['billboard','Billboard','Billboard','https://www.billboard.com/','https://www.billboard.com/','https://www.billboard.com/subscribe/','contemporary,business','curious,glamorous,nostalgic','GLOBAL','Music charts, artist interviews and the music business.'],
 ['bon-appetit','Bon Appétit','Condé Nast','https://www.bonappetit.com/','https://www.bonappetit.com/','https://www.bonappetit.com/subscribe/','contemporary,nonfiction','cozy,practical,curious','GLOBAL','Food writing, recipes and cooking inspiration.'],
 ['architectural-digest','Architectural Digest','Condé Nast','https://www.architecturaldigest.com/','https://www.architecturaldigest.com/','https://www.architecturaldigest.com/subscribe/','contemporary,nonfiction','glamorous,dreamy,curious','GLOBAL','Architecture, interiors, buildings and creative homes.'],
 ['nature-journal','Nature','Springer Nature','https://www.nature.com/nature/','https://www.nature.com/nature/volumes','https://www.nature.com/nature/subscribe','science,technology,nature','cerebral,curious,awe','GLOBAL','Research journal with science news and summaries; research articles may require access.'],
 ['science-focus','BBC Science Focus','Our Media','https://www.sciencefocus.com/','https://www.sciencefocus.com/','https://www.sciencefocus.com/subscribe','science,technology,nature','curious,awe,practical','GB','Popular-science features and explainers from the UK.'],
 ['monocle','Monocle','Monocle','https://monocle.com/','https://monocle.com/','https://monocle.com/subscribe/','business,contemporary','glamorous,curious,reflective','GB','Global affairs, travel, cities, design and independent businesses.'],
 ['superinteressante','Superinteressante','Editora Abril','https://super.abril.com.br/','https://super.abril.com.br/','https://assine.abril.com.br/','science,history,technology','curious,cerebral,awe','BR','Portuguese-language popular science, history and big ideas.'],
 ['exame','Exame','Exame','https://exame.com/','https://exame.com/','https://exame.com/','business,economics,technology','practical,inspiring,curious','BR','Brazilian business, economic and technology reporting.'],
 ['veja','Veja','Editora Abril','https://veja.abril.com.br/','https://veja.abril.com.br/','https://assine.abril.com.br/','contemporary,history','curious,reflective,cerebral','BR','Brazilian current affairs, society and cultural coverage.'],
 ['galileu','Galileu','Editora Globo','https://revistagalileu.globo.com/','https://revistagalileu.globo.com/','https://revistagalileu.globo.com/','science,technology,nature','curious,awe,cerebral','BR','Science, technology and culture reporting in Portuguese.'],
 ['national-geographic-brasil','National Geographic Brasil','National Geographic','https://www.nationalgeographicbrasil.com/','https://www.nationalgeographicbrasil.com/','https://www.nationalgeographic.com/subscribe/magazines/','nature,science,history','adventurous,awe,curious','BR','Brazilian Portuguese nature, science and exploration journalism.'],
 ['australian-geographic','Australian Geographic','Australian Geographic','https://www.australiangeographic.com.au/','https://www.australiangeographic.com.au/','https://www.australiangeographic.com.au/subscribe/','nature,science,history','adventurous,awe,curious','AU','Australian wildlife, geography, conservation and exploration.'],
 ['nikkei-asia','Nikkei Asia','Nikkei','https://asia.nikkei.com/','https://asia.nikkei.com/','https://asia.nikkei.com/','business,economics,technology','cerebral,curious,practical','JP','Asia-focused international economics, businesses and technology news.'],
 ["atlantic","The Atlantic","The Atlantic","https://www.theatlantic.com/","https://www.theatlantic.com/magazine/","https://www.theatlantic.com/subscribe/","history,contemporary,literary","curious,cerebral,reflective","GLOBAL","Long-form journalism, essays and literature on politics, science and culture."],
 ["vanity-fair","Vanity Fair","Condé Nast","https://www.vanityfair.com/","https://www.vanityfair.com/magazine","https://www.vanityfair.com/subscribe/","contemporary,biography","glamorous,curious,witty","GLOBAL","Film, culture, society and profiles from an international magazine."],
 ["gq","GQ","Condé Nast","https://www.gq.com/","https://www.gq.com/magazine","https://www.gq.com/subscribe/","contemporary,biography","glamorous,curious,practical","GLOBAL","Style, culture, interviews and profiles."],
 ["cntraveler","Condé Nast Traveler","Condé Nast","https://www.cntraveler.com/","https://www.cntraveler.com/magazine","https://www.cntraveler.com/subscribe/","nature,contemporary","adventurous,curious,dreamy","GLOBAL","Travel reporting, destinations and cultural experiences."],
 ["harpers","Harper's Magazine","Harper's Magazine Foundation","https://harpers.org/","https://harpers.org/archive/","https://harpers.org/subscribe/","literary,history,contemporary","cerebral,curious,reflective","GLOBAL","Long-form essays, literature and social reporting."],
 ["paris-review","The Paris Review","The Paris Review","https://www.theparisreview.org/","https://www.theparisreview.org/issues","https://www.theparisreview.org/subscribe","literary,contemporary","reflective,curious,inspiring","GLOBAL","Original writing and in-depth interviews with writers."],
 ["mit-tech-review","MIT Technology Review","MIT Technology Review","https://www.technologyreview.com/","https://www.technologyreview.com/magazine/","https://www.technologyreview.com/subscribe/","technology,science,business","cerebral,curious,practical","GLOBAL","Reporting and analysis about emerging technology and its effects."],
 ["elle","ELLE","Hearst","https://www.elle.com/","https://www.elle.com/","https://www.elle.com/subscribe/","contemporary,biography","glamorous,curious,inspiring","GLOBAL","Fashion, culture, style and interviews."],
 ["harpers-bazaar","Harper's Bazaar","Hearst","https://www.harpersbazaar.com/","https://www.harpersbazaar.com/","https://www.harpersbazaar.com/subscribe/","contemporary,biography","glamorous,curious,inspiring","GLOBAL","Fashion, cultural reporting and style journalism."],
 ["runners-world","Runner's World","Hearst","https://www.runnersworld.com/","https://www.runnersworld.com/","https://www.runnersworld.com/subscribe/","nature,science,nonfiction","practical,inspiring,curious","GLOBAL","Running, fitness, training, gear and endurance."],
 ["outside","Outside","Outside Interactive","https://www.outsideonline.com/","https://www.outsideonline.com/","https://www.outsideonline.com/","nature,contemporary","adventurous,awe,inspiring","GLOBAL","Outdoor adventure, travel and environmental reporting."],
 ["tokyo-weekender","Tokyo Weekender","Tokyo Weekender","https://www.tokyoweekender.com/","https://www.tokyoweekender.com/","https://www.tokyoweekender.com/","contemporary,history","curious,glamorous,adventurous","JP","Japan-based culture, travel, food, events and everyday life."],
 ["piaui","piauí","piauí","https://piaui.folha.uol.com.br/","https://piaui.folha.uol.com.br/","https://piaui.folha.uol.com.br/","contemporary,literary,history","cerebral,curious,reflective","BR","Brazilian long-form journalism, essays and cultural reporting."]
];
const OFFICIAL_ICONS=Object.freeze({
 // Vogue publishes its icon below this versioned editorial assets directory,
 // not at /favicon.ico. Keep the source on Vogue's own domain.
 vogue:'https://www.vogue.com/verso/static/vogue-global/assets/us/favicon.ico'
});
const BLOCK=/\b(?:xxx|porn(?:ographic|ography|star|hub)?|hentai|erotica|hardcore(?:\s+sex)?|onlyfans)\b/i;
const magazines=Object.freeze(RAW.map(r=>Object.freeze({
 id:'mag-'+r[0],title:r[1],publisher:r[2],site:r[3],issues:r[4],
 subscription:r[5],genres:r[6].split(','),moods:r[7].split(','),region:r[8],
 summary:r[9],access:['free','paid'],kind:'magazine',
 // Original publisher-brand icon, not a fictional mock issue cover.
 icon:OFFICIAL_ICONS[r[0]]||new URL('/favicon.ico',r[3]).href
})).filter(x=>!BLOCK.test(x.title+' '+x.publisher+' '+x.summary)));
function matches(m,p){
 if(p.access&&p.access!=='any'&&!m.access.includes(p.access))return false;
 if(p.genre&&p.genre!=='any'&&!m.genres.includes(p.genre))return false;
 if(p.mood&&p.mood!=='any'&&!m.moods.includes(p.mood))return false;
 return true;
}
function select(p,market,exclusions){
 const disallowed=exclusions instanceof Set?exclusions:new Set(exclusions||[]);
 // Magazine matching honors the SAME hard mood/genre/access contract as
 // e-books and audiobooks. Recycled already-seen titles are managed by the
 // caller's second explicit pass, never by weakening the selected mood.
 const pool=magazines.filter(m=>!disallowed.has(m.id)&&matches(m,p));
 if(!pool.length)return null;
 const local=pool.filter(m=>m.region===market);
 return (local.length?local:pool)[Math.floor(Math.random()*(local.length?local.length:pool.length))];
}
function buyLinks(m,market,affiliate){
 const a=affiliate&&typeof affiliate.amazonMagazineSearchUrl==='function'
  ?affiliate.amazonMagazineSearchUrl(m,market):'';
 const results=[];
 if(a)results.push({name:'Amazon — search for this magazine',url:a,verified:false});
 results.push({name:'Publisher subscription / issue options',url:m.subscription,verified:false});
 return results;
}
root.MatchAppMagazines=Object.freeze({items:magazines,select,buyLinks,byId:id=>magazines.find(m=>m.id===id)||null});
})(window);
