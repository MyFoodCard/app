import {QrCode} from './vendor/qrcodegen.js';

// Keep the required four-module quiet zone white in every theme.
let previousText='',previousSvg='';
export function qrSvg(text){
  if(text===previousText)return previousSvg;
  const qr=QrCode.encodeText(text,QrCode.Ecc.MEDIUM),border=4,size=qr.size+border*2;
  const cells=[];
  for(let y=0;y<qr.size;y++)for(let x=0;x<qr.size;x++)if(qr.getModule(x,y))cells.push(`M${x+border},${y+border}h1v1h-1z`);
  previousText=text;
  previousSvg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" aria-hidden="true"><rect width="${size}" height="${size}" fill="#fff"/><path d="${cells.join('')}" fill="#000"/></svg>`;
  return previousSvg;
}
