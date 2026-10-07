(function(){
  'use strict';
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  let cleanup=null;
  function task(origin){
    if(reduce.matches||typeof Element.prototype.animate!=='function')return;
    cleanup?.();
    const layer=document.createElement('div');
    layer.setAttribute('aria-hidden','true');
    layer.style.cssText='position:fixed;inset:0;z-index:10020;pointer-events:none;overflow:hidden;';
    document.body.appendChild(layer);
    const x=Math.max(12,Math.min(innerWidth-12,origin?origin.left+origin.width/2:innerWidth/2));
    const y=Math.max(12,Math.min(innerHeight-12,origin?origin.top+origin.height/2:innerHeight*.45));
    const colors=['#ef89a4','#b899ed','#8eb480','#e9a55d','#8baee8'];
    const animations=[];
    const remove=()=>{animations.forEach(a=>a.cancel());layer.remove();if(cleanup===remove)cleanup=null;};
    cleanup=remove;
    for(let i=0;i<22;i++){
      const piece=document.createElement('i'),dx=(Math.random()-.5)*210,rise=35+Math.random()*65;
      piece.style.cssText=`position:absolute;left:${x}px;top:${y}px;width:6px;height:9px;border-radius:2px;background:${colors[i%colors.length]};`;
      layer.appendChild(piece);
      animations.push(piece.animate([{opacity:1,transform:'translate(-3px,-4px) rotate(0deg)'},{opacity:1,transform:`translate(${dx*.55}px,${-rise}px) rotate(${dx*2}deg)`,offset:.35},{opacity:0,transform:`translate(${dx}px,${70+Math.random()*70}px) rotate(${dx*4}deg)`}],{duration:850,easing:'ease-out'}));
    }
    Promise.all(animations.map(a=>a.finished.catch(()=>{}))).then(()=>{if(cleanup===remove)remove();});
  }
  reduce.addEventListener?.('change',()=>{if(reduce.matches)cleanup?.();});
  window.CramchyCelebrate={task};
})();
