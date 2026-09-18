(function(root){
  'use strict';
  root.CramchyModules=root.CramchyModules||{};

  const NUMERIC=['4.0','3.5','3.0','2.5','2.0','1.5','1.0'];
  const SPECIAL=['INC','R'];
  const OPTIONS=[
    {v:'',label:'select grade'},
    ...NUMERIC.map(value=>({v:value,label:value})),
    {v:'INC',label:'INC — Incomplete'},
    {v:'R',label:'R — Repeat'}
  ];

  function normalize(value){
    const grade=String(value||'').trim().toUpperCase();
    return [...NUMERIC,...SPECIAL].includes(grade)?grade:'';
  }

  function compute(rows=[]){
    let honor=0,units=0,count=0,excluded=0;
    const blockers=[];
    rows.forEach(row=>{
      const grade=normalize(row?.grade);
      if(!grade)return;
      if(SPECIAL.includes(grade)){
        excluded++;
        blockers.push({grade,reason:grade==='INC'?'incomplete grade':'repeat grade'});
        return;
      }
      const numeric=Number(grade),courseUnits=Number(row?.units);
      if(numeric<2.5)blockers.push({grade,reason:'grade below 2.5'});
      if(Number.isFinite(courseUnits)&&courseUnits>0){honor+=numeric*courseUnits;units+=courseUnits;count++;}
    });
    const gwa=units>0?honor/units:null;
    const uniqueBlockers=[...new Map(blockers.map(item=>[item.grade,item])).values()];
    const meetsGwa=gwa!==null&&gwa>=3.25;
    const eligible=meetsGwa&&uniqueBlockers.length===0;
    let honorLabel='';
    if(eligible&&gwa>=3.50)honorLabel="Dean's List (First Honors)";
    else if(eligible)honorLabel="Dean's List (Second Honors)";
    let message='';
    if(gwa!==null){
      if(uniqueBlockers.length){
        const grades=uniqueBlockers.map(item=>item.grade).join(', ');
        message=`Not qualified for Dean's List because ${grades} ${uniqueBlockers.length===1?'is':'are'} disqualifying.`;
      }else if(honorLabel)message=`Congratulations! ${honorLabel} ♡`;
      else message="GWA computed. Dean's List requires at least 3.25.";
    }
    return {honor,units,count,excluded,gwa,blockers:uniqueBlockers,meetsGwa,eligible,honorLabel,message};
  }

  root.CramchyModules.quickGwaRules={numericGrades:[...NUMERIC],specialGrades:[...SPECIAL],allowedGrades:['',...NUMERIC,...SPECIAL],options:OPTIONS.map(item=>({...item})),normalize,compute};
})(typeof window==='undefined'?globalThis:window);
