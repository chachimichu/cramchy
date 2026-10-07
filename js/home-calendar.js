(function(root){
  'use strict';
  const pad=n=>String(n).padStart(2,'0');
  const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  function date(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return null;
    const [y,m,d]=value.split('-').map(Number),result=new Date(y,m-1,d,12);
    return iso(result)===value?result:null;
  }
  function cells(selected){
    const d=date(selected);if(!d)return [];
    const first=new Date(d.getFullYear(),d.getMonth(),1,12),count=new Date(d.getFullYear(),d.getMonth()+1,0,12).getDate();
    return [...Array(first.getDay()).fill(null),...Array.from({length:count},(_,i)=>iso(new Date(d.getFullYear(),d.getMonth(),i+1,12)))];
  }
  function shift(selected,amount){
    const d=date(selected);if(!d)return selected;
    const first=new Date(d.getFullYear(),d.getMonth()+amount,1,12),last=new Date(first.getFullYear(),first.getMonth()+1,0,12).getDate();
    return iso(new Date(first.getFullYear(),first.getMonth(),Math.min(d.getDate(),last),12));
  }
  function merge(...sources){
    const seen=new Set();
    return sources.flat().filter(e=>{
      if(!e||!date(e.date))return false;
      const key=String(e.id||`${e.date}|${e.start}|${e.title}|${e.type}`);
      if(seen.has(key))return false;seen.add(key);return true;
    }).slice().sort((a,b)=>a.date.localeCompare(b.date)||String(a.start||'99:99').localeCompare(String(b.start||'99:99'))||String(a.title||'').localeCompare(String(b.title||'')));
  }
  const api={iso,date,cells,shift,merge};root.CramchyHomeCalendar=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
