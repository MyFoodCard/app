// Keep the original order for the existing translation packs and version 1 profiles.
export const LEGACY_ALLERGENS = ['milk','eggs','peanuts','nuts','wheat','soy','fish','crustaceans','molluscs','sesame','celery','mustard','lupin','sulphites','flaxseed'];
export const COMMON_ALLERGENS = LEGACY_ALLERGENS.filter(key=>key!=='flaxseed');
export const MORE_ALLERGENS = ['flaxseed','sunflower','poppy','pumpkin','pea','chickpea','lentil','bean','buckwheat','pinenut','kiwi','banana','rye','barley','oats','almond','brazilnut','cashew','hazelnut','macadamia','pecan','pistachio','walnut'];
export const ALLERGENS = [...COMMON_ALLERGENS,...MORE_ALLERGENS];
export const INTOLERANCE_ONLY = ['lactose','fructose','sorbitol','onion','garlic','whitesugar','trehalose'];
export const INGREDIENTS = [...ALLERGENS,...INTOLERANCE_ONLY];
export const DIETS = ['vegan','vegetarian','halal','kosher','glutenfree','nopork','noalcohol'];
export const LANGUAGES = ['en','sk','cs','de','fr','es','ar','th'];
export const emptyProfile = () => ({version:3,mustAvoid:[],avoidIfPossible:[],diets:[],crossContact:true,language:'en'});
export const requirementCount = p => p.mustAvoid.length+p.avoidIfPossible.length+p.diets.length;
export function cleanProfile(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('This is not a MyFoodCard profile.');
  const version=value.version??1;
  if (![1,2,3].includes(version)) throw new Error('This profile version is not supported.');
  const list = (items,allowed) => {
    if (items===undefined && version===1) return [];
    if (!Array.isArray(items) || items.length>allowed.length*2 || items.some(item=>!allowed.includes(item))) throw new Error('This profile contains unsupported food requirements. Nothing has been imported.');
    return [...new Set(items)];
  };
  const diets=list(value.diets,DIETS);
  let mustAvoid,avoidIfPossible;
  if(version===3){
    mustAvoid=list(value.mustAvoid,INGREDIENTS);
    avoidIfPossible=list(value.avoidIfPossible,INGREDIENTS);
  }else{
    mustAvoid=list(value.allergens,ALLERGENS);avoidIfPossible=[];
    const entries=value.intolerances??(version===1?[]:null);
    if (!Array.isArray(entries) || entries.length>INGREDIENTS.length) throw new Error('This profile contains invalid intolerances.');
    for(const item of entries){
      if (!item || !INGREDIENTS.includes(item.ingredient) || !['must','prefer'].includes(item.avoidance)) throw new Error('This profile contains an unsupported intolerance or avoidance instruction.');
      (item.avoidance==='must'?mustAvoid:avoidIfPossible).push(item.ingredient);
    }
  }
  // Migration and overlaps always preserve the stronger instruction.
  mustAvoid=[...new Set(mustAvoid)];
  avoidIfPossible=[...new Set(avoidIfPossible)].filter(key=>!mustAvoid.includes(key));
  if(version>=2 && (!LANGUAGES.includes(value.language) || typeof value.crossContact!=='boolean')) throw new Error('This profile contains unsupported settings.');
  return {version:3,mustAvoid,avoidIfPossible,diets,crossContact:typeof value.crossContact==='boolean'?value.crossContact:true,language:LANGUAGES.includes(value.language)?value.language:'en'};
}
export function searchIngredients(query,labels){
  const normalize=text=>text.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
  const words=normalize(query.trim()).split(/\s+/).filter(Boolean);
  return INGREDIENTS.filter(key=>words.every(word=>normalize(labels[key]).includes(word))).sort((a,b)=>labels[a].localeCompare(labels[b],'en'));
}
export function addIngredient(profile,group,ingredient){
  if(!['mustAvoid','avoidIfPossible'].includes(group)||!INGREDIENTS.includes(ingredient))throw new Error('Unsupported ingredient selection.');
  return cleanProfile({...profile,[group]:[...profile[group],ingredient]});
}
export function toggleItem(items,item,checked){return checked?[...new Set([...items,item])]:items.filter(value=>value!==item);}
export function inRing(lon,lat,ring){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const [xi,yi]=ring[i], [xj,yj]=ring[j];
    if(((yi>lat)!==(yj>lat))&&(lon<(xj-xi)*(lat-yi)/(yj-yi)+xi))inside=!inside;
  }
  return inside;
}
function inPolygon(lon,lat,rings){return inRing(lon,lat,rings[0])&&!rings.slice(1).some(ring=>inRing(lon,lat,ring));}
export function countryAt(lon,lat,countries){
  if(!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lon)>180||Math.abs(lat)>90)return null;
  return countries.find(country=>{
    const {type,coordinates}=country.geometry;
    const polygons=type==='Polygon'?[coordinates]:type==='MultiPolygon'?coordinates:[];
    return polygons.some(rings=>inPolygon(lon,lat,rings));
  })||null;
}
// The bundled map generalizes coastlines. Offer nearby land, never a silent language switch.
export function countrySuggestions(lon,lat,countries){
  if(!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lon)>180||Math.abs(lat)>90)return [];
  const inside=countryAt(lon,lat,countries);
  if(inside)return [{country:inside,distanceKm:0,approximate:false}];
  const wrap=angle=>((angle+540)%360)-180;
  const scaleX=111.195*Math.cos(lat*Math.PI/180),scaleY=111.195;
  const distanceToRing=ring=>{
    let nearest=Infinity;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const ax=wrap(ring[j][0]-lon)*scaleX,ay=(ring[j][1]-lat)*scaleY;
      const bx=ax+wrap(ring[i][0]-ring[j][0])*scaleX,by=(ring[i][1]-lat)*scaleY;
      const dx=bx-ax,dy=by-ay,length=dx*dx+dy*dy;
      const t=length?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/length)):0;
      nearest=Math.min(nearest,Math.hypot(ax+t*dx,ay+t*dy));
    }
    return nearest;
  };
  return countries.map(country=>{
    const {type,coordinates}=country.geometry;
    const polygons=type==='Polygon'?[coordinates]:type==='MultiPolygon'?coordinates:[];
    const distanceKm=Math.min(...polygons.flatMap(rings=>rings.map(distanceToRing)));
    return {country,distanceKm,approximate:true};
  }).filter(match=>match.distanceKm<=25).sort((a,b)=>a.distanceKm-b.distanceKm).slice(0,3);
}
const COUNTRY_LANGUAGES={SVK:['sk'],CZE:['cs'],DEU:['de'],AUT:['de'],CHE:['de','fr'],LIE:['de'],FRA:['fr'],BEL:['fr','de'],LUX:['fr','de'],ESP:['es'],MEX:['es'],GTM:['es'],HND:['es'],SLV:['es'],NIC:['es'],CRI:['es'],PAN:['es'],CUB:['es'],DOM:['es'],COL:['es'],VEN:['es'],ECU:['es'],PER:['es'],BOL:['es'],PRY:['es'],CHL:['es'],ARG:['es'],URY:['es'],THA:['th'],EGY:['ar'],SAU:['ar'],ARE:['ar'],QAT:['ar'],KWT:['ar'],OMN:['ar'],BHR:['ar'],JOR:['ar'],LBN:['ar'],SYR:['ar'],IRQ:['ar'],PSE:['ar'],MAR:['ar'],DZA:['ar'],TUN:['ar'],LBY:['ar'],YEM:['ar'],GBR:['en'],IRL:['en'],USA:['en'],CAN:['en','fr'],AUS:['en'],NZL:['en']};
export function languageSuggestions(code){return COUNTRY_LANGUAGES[code]||[];}
