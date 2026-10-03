(function(root){
  'use strict';
  const keys=['ww','pt','attendance','exam'];
  function equivalent(value){if(value===null||!Number.isFinite(value))return null;const p=Math.round(value);return p>=96?'4.0':p>=90?'3.5':p>=84?'3.0':p>=78?'2.5':p>=72?'2.0':'R';}
  function period(entries,weights){
    const validWeights=keys.every(k=>Number.isFinite(Number(weights[k]))&&Number(weights[k])>=0&&Number(weights[k])<=100)&&Math.abs(keys.reduce((s,k)=>s+Number(weights[k]),0)-100)<.001;
    const categories=keys.map(key=>{
      const rows=(entries||[]).filter(a=>a.category===key);
      const usable=rows.filter(a=>Number.isFinite(Number(a.score))&&Number(a.score)>=0&&Number.isFinite(Number(a.total))&&Number(a.total)>0);
      const earned=usable.reduce((s,a)=>s+Number(a.score),0),total=usable.reduce((s,a)=>s+Number(a.total),0);
      const percentage=total>0?earned/total*100:null,weight=Number(weights[key]);
      return {key,rows,earned,total,percentage,weight,contribution:percentage===null?null:percentage*weight/100,invalid:rows.length-usable.length};
    });
    const covered=categories.filter(c=>c.weight>0&&c.percentage!==null).reduce((s,c)=>s+c.weight,0);
    const missing=categories.filter(c=>c.weight>0&&c.percentage===null).map(c=>c.key);
    const contribution=categories.reduce((s,c)=>s+(c.contribution||0),0);
    const value=validWeights&&covered>0?contribution/covered*100:null;
    return {categories,covered,missing,contribution,value,equivalent:equivalent(value),validWeights,complete:validWeights&&missing.length===0,invalid:categories.reduce((s,c)=>s+c.invalid,0)};
  }
  function course(data,weights){const midterms=period(data?.midterms,weights),finals=period(data?.finals,weights);const value=midterms.value!==null&&finals.value!==null?(midterms.value+finals.value)/2:null;return {midterms,finals,value,equivalent:equivalent(value),complete:midterms.complete&&finals.complete};}
  function validate(name,score,total,extraCredit=false){
    if(!String(name||'').trim())return 'Give this assessment a name.';
    if(String(score).trim()===''||String(total).trim()==='')return 'Enter both your score and the total possible points.';
    const s=Number(score),t=Number(total);
    if(!Number.isFinite(s)||s<0||!Number.isFinite(t)||t<=0)return 'Use a score of zero or more and a total greater than zero.';
    if(s>t&&!extraCredit)return 'The score is above the total. Correct it or mark this as extra credit.';
    return '';
  }
  const api={keys,equivalent,period,course,validate};if(typeof module==='object'&&module.exports)module.exports=api;else root.CramchyGradeInsights=api;
})(typeof globalThis==='object'?globalThis:this);
