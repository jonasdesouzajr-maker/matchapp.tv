/* Extra catalog titles appended after app.js loads. */
(function(){
const extra=[
{title:"Stranger Things",year:2016,country:"United States",countryCode:"US",synopsis:"Kids in Hawkins face supernatural threats.",platform:"Netflix",cats:["series"],moods:["intense and thrilling","nostalgic"],vibes:["fast-paced binge-worthy"],ratings:["teen PG-13","any"]},
{title:"Wednesday",year:2022,country:"United States",countryCode:"US",synopsis:"Wednesday Addams investigates murders at Nevermore.",platform:"Netflix",cats:["series"],moods:["dark and gritty","mind-bending"],vibes:["fast-paced binge-worthy"],ratings:["teen PG-13","any"]},
{title:"Squid Game",year:2021,country:"South Korea",countryCode:"KR",synopsis:"Deadly children's games for a giant prize.",platform:"Netflix",cats:["series"],moods:["intense and thrilling","dark and gritty"],vibes:["fast-paced binge-worthy"],ratings:["teen PG-13","any"]},
{title:"The Bear",year:2022,country:"United States",countryCode:"US",synopsis:"A young chef returns to a Chicago sandwich shop.",platform:"Hulu",cats:["series"],moods:["intense and thrilling","dark and gritty"],vibes:["prestige and critically acclaimed"],ratings:["teen PG-13","any"]},
{title:"Shogun",year:2024,country:"United States",countryCode:"US",synopsis:"A shipwrecked sailor is pulled into feudal Japan.",platform:"Hulu",cats:["limited series"],moods:["epic and adventurous","dark and gritty"],vibes:["prestige and critically acclaimed"],ratings:["teen PG-13","any"]},
{title:"The Last of Us",year:2023,country:"United States",countryCode:"US",synopsis:"Joel and Ellie cross a ruined America.",platform:"Max",cats:["series"],moods:["heartbreaking","intense and thrilling"],vibes:["prestige and critically acclaimed"],ratings:["mature adults only R rated","any"]},
{title:"The Boys",year:2019,country:"United States",countryCode:"US",synopsis:"Vigilantes take on corrupt superheroes.",platform:"Prime Video",cats:["series"],moods:["dark and gritty","intense and thrilling"],vibes:["fast-paced binge-worthy"],ratings:["mature adults only R rated","any"]},
{title:"Ted Lasso",year:2020,country:"United States",countryCode:"US",synopsis:"An American coach takes a Premier League side.",platform:"Apple TV+",cats:["series"],moods:["light and feel-good","funny"],vibes:["prestige and critically acclaimed"],ratings:["teen PG-13","any"]},
{title:"Severance",year:2022,country:"United States",countryCode:"US",synopsis:"Office workers split their memories at the door.",platform:"Apple TV+",cats:["series"],moods:["mind-bending","dark and gritty"],vibes:["prestige and critically acclaimed"],ratings:["teen PG-13","any"]},
{title:"The Mandalorian",year:2019,country:"United States",countryCode:"US",synopsis:"A bounty hunter protects a small green child.",platform:"Disney+",cats:["series"],moods:["epic and adventurous"],vibes:["fast-paced binge-worthy"],ratings:["all ages family friendly","any"]},
{title:"Inside Out 2",year:2024,country:"United States",countryCode:"US",synopsis:"Anxiety joins Riley's mind.",platform:"Disney+",cats:["movie","kids"],moods:["light and feel-good","heartbreaking"],vibes:["fast-paced binge-worthy"],ratings:["all ages family friendly","kids","any"]},
{title:"Dune: Part Two",year:2024,country:"United States",countryCode:"US",synopsis:"Paul joins the Fremen.",platform:"Max",cats:["movie"],moods:["epic and adventurous","intense and thrilling"],vibes:["prestige and critically acclaimed"],ratings:["teen PG-13","any"]},
{title:"Demon Slayer",year:2019,country:"Japan",countryCode:"JP",synopsis:"Tanjiro hunts demons to save his sister.",platform:"Crunchyroll",cats:["anime"],moods:["epic and adventurous","intense and thrilling"],vibes:["fast-paced binge-worthy"],ratings:["teen PG-13","any"]},
{title:"Pantanal",year:2022,country:"Brazil",countryCode:"BR",synopsis:"The Leôncio family on the wetlands.",platform:"Globoplay",cats:["novela brasileira"],moods:["romantic","epic and adventurous"],vibes:["long running series"],ratings:["teen PG-13","any"]},
{title:"Bluey",year:2018,country:"Australia",countryCode:"AU",synopsis:"A Blue Heeler pup turns ordinary days into games.",platform:"Disney+",cats:["kids","series"],moods:["light and feel-good","cozy comfort watch"],vibes:["easy background watch"],ratings:["all ages family friendly","kids","any"]},
{title:"Folklore",year:2020,country:"United States",countryCode:"US",synopsis:"Taylor Swift cabin-season album.",platform:"Spotify",cats:["music album"],moods:["nostalgic","heartbreaking"],vibes:["easy background watch"],ratings:["all ages family friendly","any"]}
];
function merge(){
  if(typeof CONTENT_CATALOG==="undefined"||!Array.isArray(CONTENT_CATALOG))return setTimeout(merge,50);
  const have=new Set(CONTENT_CATALOG.map(e=>String(e.title||"").toLowerCase()));
  extra.forEach(e=>{if(!have.has(e.title.toLowerCase())){CONTENT_CATALOG.push(e);have.add(e.title.toLowerCase());}});
  window.__MATCHAPP_CATALOG_PLUS=extra.length;
}
merge();
})();
