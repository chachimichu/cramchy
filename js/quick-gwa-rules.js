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
      if(honorLabel)message=`Congratulations! ${honorLabel}`;
      else message="Here's your GWA";
    }
    return {honor,units,count,excluded,gwa,blockers:uniqueBlockers,meetsGwa,eligible,honorLabel,message};
  }

  function formatMessage(result,name=''){
    if(!result||result.gwa==null)return '';
    const prefix=String(name||'').trim();
    const address=prefix?prefix+', ':'';
    if(result.eligible){
      const honors=result.gwa>=3.50?'First Honors':'Second Honors';
      return `${address}you did it! Your grades meet the calculator’s criteria for the Dean’s List (${honors}). You should be proud of yourself! 💗`;
    }
    const reasons=[];
    if(result.blockers?.some(item=>item.reason==='grade below 2.5'))reasons.push('at least one of your subject grades was below 2.5');
    if(result.gwa<3.25)reasons.push(`your GWA of ${result.gwa.toFixed(2)} was below the required 3.25`);
    const special=result.blockers?.filter(item=>item.reason==='incomplete grade'||item.reason==='repeat grade')||[];
    if(special.length){
      const labels=[...new Set(special.map(item=>item.grade))];
      const gradeNoun=labels.length===1?'grade':'grades',verb=labels.length===1?'needs':'need';
      reasons.push(`${labels.join(' and ')} ${gradeNoun} ${verb} review, so this estimate can’t confirm your eligibility`);
    }
    if(!reasons.length)reasons.push('your results did not meet the Dean’s List criteria used by this estimate');
    const explanation=reasons.length===1?reasons[0]:reasons.slice(0,-1).join(', ')+', and '+reasons[reasons.length-1];
    const followUp=special.length?' Please check with your campus how those grades affect eligibility.':' Keep going—you can work toward it again next term.';
    return `${address}you didn’t qualify under the calculator’s Dean’s List criteria because ${explanation}. This doesn’t erase your effort.${followUp} 💗`;
  }

  root.CramchyModules.quickGwaRules={numericGrades:[...NUMERIC],specialGrades:[...SPECIAL],allowedGrades:['',...NUMERIC,...SPECIAL],options:OPTIONS.map(item=>({...item})),normalize,compute,formatMessage};
})(typeof window==='undefined'?globalThis:window);
