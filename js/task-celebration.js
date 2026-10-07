(function(){
  'use strict';
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  let cleanup=null;
  function task(){
    if(reduce.matches||typeof Element.prototype.animate!=='function')return;
    cleanup?.();
    const layer=document.createElement('div');
    layer.setAttribute('aria-hidden','true');
    layer.style.cssText='position:fixed;inset:0;z-index:10020;pointer-events:none;overflow:hidden;';
    document.body.appendChild(layer);
    const colors=['#ef89a4','#b899ed','#8eb480','#e9a55d','#8baee8'];
    const animations=[];
    const remove=()=>{animations.forEach(a=>a.cancel());layer.remove();if(cleanup===remove)cleanup=null;};
    cleanup=remove;
    for(let i=0;i<22;i++){
      const piece=document.createElement('i'),x=(i+.2+Math.random()*.6)*innerWidth/22,dx=(Math.random()-.5)*40,fall=Math.min(innerHeight*.45,280)+Math.random()*40,angle=Math.random()*180;
      piece.style.cssText=`position:absolute;left:${x}px;top:-12px;width:6px;height:${i%2?6:9}px;border-radius:${i%3?2:50}%;background:${colors[i%colors.length]};`;
      layer.appendChild(piece);
      animations.push(piece.animate([{opacity:0,transform:`translate(0,0) rotate(${angle}deg)`},{opacity:.9,transform:`translate(${dx*.2}px,${fall*.15}px) rotate(${angle+45}deg)`,offset:.15},{opacity:.8,transform:`translate(${-dx*.3}px,${fall*.7}px) rotate(${angle+150}deg)`,offset:.7},{opacity:0,transform:`translate(${dx}px,${fall}px) rotate(${angle+220}deg)`}],{duration:1100,delay:Math.random()*160,easing:'linear'}));
    }
    Promise.all(animations.map(a=>a.finished.catch(()=>{}))).then(()=>{if(cleanup===remove)remove();});
  }
  reduce.addEventListener?.('change',()=>{if(reduce.matches)cleanup?.();});
  window.CramchyCelebrate={task};
})();
