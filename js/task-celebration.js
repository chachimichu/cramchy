(function(){
  'use strict';
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  let cleanup=null;
  function task(origin){
    if(reduce.matches||typeof Element.prototype.animate!=='function'||!origin||![origin.left,origin.top,origin.width,origin.height].every(Number.isFinite))return;
    cleanup?.();
    const layer=document.createElement('div');
    layer.setAttribute('aria-hidden','true');
    layer.style.cssText='position:fixed;inset:0;z-index:10020;pointer-events:none;overflow:hidden;';
    document.body.appendChild(layer);
    const x=origin.left+origin.width/2,y=origin.top+origin.height/2;
    const spots=[[-17,-16,9],[20,-13,11],[26,9,7],[4,25,8],[-22,14,6]];
    const animations=[];
    const remove=()=>{animations.forEach(a=>a.cancel());layer.remove();if(cleanup===remove)cleanup=null;};
    cleanup=remove;
    spots.forEach(([dx,dy,size],i)=>{
      const piece=document.createElement('i');
      piece.style.cssText=`position:absolute;left:${x+dx-size/2}px;top:${y+dy-size/2}px;width:${size}px;height:${size}px;background:${i%2?'#e9b85d':'#ef89a4'};clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%);`;
      layer.appendChild(piece);
      animations.push(piece.animate([{opacity:0,transform:'scale(.5)'},{opacity:1,transform:'scale(1)',offset:.2},{opacity:0,transform:'scale(.85)'}],{duration:600,delay:i*25,easing:'ease-out'}));
    });
    Promise.all(animations.map(a=>a.finished.catch(()=>{}))).then(()=>{if(cleanup===remove)remove();});
  }
  reduce.addEventListener?.('change',()=>{if(reduce.matches)cleanup?.();});
  window.CramchyCelebrate={task};
})();
