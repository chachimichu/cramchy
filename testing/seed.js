(function(root){
  'use strict';
  function seedCramchyTestData(options={}){
    const now=new Date(options.now || Date.now());
    if(!Number.isFinite(now.getTime())) throw new Error('Invalid seed date');
    const date=(offset=0)=>{const d=new Date(now);d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
    const academicYear='2026–2027', term='Term 1';
    const courses=['Cognitive Psychology','Anatomy Practice','Teaching Practice','No Scores Yet'].map((name,i)=>({
      id:`seed-course-${i}`,name:`[TEST] ${name}`,code:`TEST${i+1}`,units:3,academicYear,term,
      professor:'Sample Instructor',color:'pink',gwaMode:'auto',gwaFinalGrade:'',
      schedules:[{id:`seed-schedule-${i}`,day:'Monday',start:'09:00',end:'10:00',room:'Test room'}],
      gradingScheme:{ww:30,pt:20,attendance:10,exam:40}
    }));
    const gradebook={};
    courses.forEach((c,i)=>{gradebook[c.id]={midterms:i===3?[]:['ww','pt','attendance','exam'].map((category,j)=>({
      id:`seed-score-${i}-${j}`,name:`[TEST] ${category}`,category,score:[95.78,95.5,95.49][i],total:100,date:date()
    })),finals:[]};});
    const state={profile:{name:'Test Student',academicYear,term,onboarded:true,theme:'strawberry-matcha',motivation:'mixed'},courses,gradebook,
      missions:[{id:'seed-task-1',text:'[TEST] Review attention notes',done:false},{id:'seed-task-2',text:'[TEST] Finish practice worksheet',done:true}],
      customCountdown:{date:date(7),time:'09:00'},
      quickGwaRows:[{id:'seed-gwa-1',grade:'4.0',units:3},{id:'seed-gwa-2',grade:'3.5',units:3}],
      studyHistory:[],subjects:{},examPeriod:null,examContext:{academicYear,term},archivedTerms:[]};
    const events=['class','study','task','exam','personal'].map((type,i)=>({id:`seed-event-${i}`,title:`[TEST] ${type} example`,type,course:courses[0].name,date:date(i-1),start:'10:00',end:'11:00',notes:'Synthetic test data',done:i===0}));
    return {'strawberryMatchaMidtermsState_v1':JSON.stringify(state),'cramchyPlannerEvents_v2':JSON.stringify(events),'cramchySpecialLetterSeen_v2':'1'};
  }
  root.seedCramchyTestData=seedCramchyTestData;
})(typeof window==='undefined'?globalThis:window);
