export const ALLERGENS = ['milk','eggs','peanuts','nuts','wheat','soy','fish','crustaceans','molluscs','sesame','celery','mustard','lupin','sulphites','flaxseed'];
export const DIETS = ['vegan','vegetarian','halal','kosher','glutenfree','nopork','noalcohol'];
export const LANGUAGES = ['en','sk','cs','de','fr','es','ar','th'];
export const emptyProfile = () => ({version:1,name:'',allergens:[],diets:[],crossContact:true,language:'en'});
export function cleanProfile(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('This is not a MyFoodCard profile.');
  if (value.version !== undefined && value.version !== 1) throw new Error('This profile version is not supported.');
  const filter = (items, allowed) => [...new Set(Array.isArray(items) ? items.filter(item=>allowed.includes(item)) : [])];
  return {version:1,name:typeof value.name==='string'?value.name.slice(0,60):'',allergens:filter(value.allergens,ALLERGENS),diets:filter(value.diets,DIETS),crossContact:typeof value.crossContact==='boolean'?value.crossContact:true,language:LANGUAGES.includes(value.language)?value.language:'en'};
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
const COUNTRY_LANGUAGES={SVK:['sk'],CZE:['cs'],DEU:['de'],AUT:['de'],CHE:['de','fr'],LIE:['de'],FRA:['fr'],BEL:['fr','de'],LUX:['fr','de'],ESP:['es'],MEX:['es'],GTM:['es'],HND:['es'],SLV:['es'],NIC:['es'],CRI:['es'],PAN:['es'],CUB:['es'],DOM:['es'],COL:['es'],VEN:['es'],ECU:['es'],PER:['es'],BOL:['es'],PRY:['es'],CHL:['es'],ARG:['es'],URY:['es'],THA:['th'],EGY:['ar'],SAU:['ar'],ARE:['ar'],QAT:['ar'],KWT:['ar'],OMN:['ar'],BHR:['ar'],JOR:['ar'],LBN:['ar'],SYR:['ar'],IRQ:['ar'],PSE:['ar'],MAR:['ar'],DZA:['ar'],TUN:['ar'],LBY:['ar'],YEM:['ar'],GBR:['en'],IRL:['en'],USA:['en'],CAN:['en','fr'],AUS:['en'],NZL:['en']};
export function languageSuggestions(code){return COUNTRY_LANGUAGES[code]||[];}
