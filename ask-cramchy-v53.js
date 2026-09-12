(function(){
  'use strict';

  const VERSION='V53';
  const APP_KEY='strawberryMatchaMidtermsState_v1';
  const PLANNER_KEY='cramchyPlannerEvents_v2';
  const GWA_KEY='cramchyTermGwaPlanner_v2';
  const TERM_KEY='cramchyGradesSelectedTerm';
  const TYPE_LABEL={class:'class',task:'task',exam:'exam',study:'study block',personal:'personal event'};
  const context={topic:'',period:'',type:'',lastEventId:''};

  function readJson(key,fallback){
    try{
      const value=JSON.parse(localStorage.getItem(key)||'null');
      return value===null?fallback:value;
    }catch(e){return fallback;}
  }

  function appState(){return readJson(APP_KEY,{profile:{},courses:[],quickGwaRows:[],gradebook:{}});}
  function plannerEvents(){
    const events=readJson(PLANNER_KEY,[]);
    return Array.isArray(events)?events.filter(e=>e&&e.date).map(e=>({
      id:String(e.id||''),title:String(e.title||'Untitled event'),type:TYPE_LABEL[e.type]?e.type:'personal',
      course:String(e.course||''),date:String(e.date||''),start:String(e.start||''),end:String(e.end||''),
      notes:String(e.notes||''),done:Boolean(e.done)
    })):[];
  }

  function normalize(raw){
    let q=String(raw||'').toLowerCase().replace(/[’‘]/g,"'").replace(/[–—]/g,'-');
    q=q.replace(/([a-z])\1{2,}/g,'$1');
    const fixes={
      'plann?er':'planner','calender':'calendar','scheduel':'schedule','graes':'grades','gradse':'grades',
      'gradebok':'gradebook','quik':'quick','clases':'classes','clasess':'classes','freatures':'features',
      'fetures':'features','cramchi':'cramchy','cramchy+':'cramchy','tomorow':'tomorrow','tommorow':'tomorrow',
      'upcomming':'upcoming','dead line':'deadline','procastinat':'procrastinat','creater':'creator'
    };
    Object.keys(fixes).forEach(from=>{q=q.replace(new RegExp('\\b'+from+'\\b','g'),fixes[from]);});
    return q.replace(/[^a-z0-9.%:'\-\s]/g,' ').replace(/\s+/g,' ').trim();
  }

  function has(q,pattern){return pattern.test(q);}
  function pad(n){return String(n).padStart(2,'0');}
  function iso(date){return date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate());}
  function dayStart(date){return new Date(date.getFullYear(),date.getMonth(),date.getDate(),0,0,0,0);}
  function plusDays(date,n){const d=new Date(date);d.setDate(d.getDate()+n);return d;}
  function parseIso(value){
    const bits=String(value||'').split('-').map(Number);
    return new Date(bits[0]||2000,(bits[1]||1)-1,bits[2]||1,12,0,0,0);
  }
  function prettyDate(value){
    return parseIso(value).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  }
  function prettyTime(value){
    if(!value)return 'anytime';
    const bits=String(value).split(':').map(Number),h=bits[0]||0,m=bits[1]||0;
    return ((h+11)%12+1)+':'+pad(m)+' '+(h>=12?'PM':'AM');
  }
  function dateTime(event){
    const date=parseIso(event.date),bits=String(event.start||'23:59').split(':').map(Number);
    date.setHours(bits[0]||0,bits[1]||0,0,0);
    return date;
  }

  function periodFrom(q){
    const now=dayStart(new Date());
    if(has(q,/\byesterday\b/))return {name:'yesterday',from:plusDays(now,-1),to:now};
    if(has(q,/\btomorrow\b/))return {name:'tomorrow',from:plusDays(now,1),to:plusDays(now,2)};
    if(has(q,/\btoday\b|\btonight\b/))return {name:'today',from:now,to:plusDays(now,1)};
    if(has(q,/\bnext week\b/)){
      const monday=plusDays(now,(8-(now.getDay()||7))%7||7);
      return {name:'next week',from:monday,to:plusDays(monday,7)};
    }
    if(has(q,/\bthis week\b|\bweek ahead\b|\bnext 7 days\b/))return {name:'the next 7 days',from:now,to:plusDays(now,7)};
    if(has(q,/\bweekend\b/)){
      const saturday=plusDays(now,(6-now.getDay()+7)%7);
      return {name:'this weekend',from:saturday,to:plusDays(saturday,2)};
    }
    const exact=q.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
    if(exact){const d=dayStart(parseIso(exact[0]));return {name:prettyDate(exact[0]),from:d,to:plusDays(d,1)};}
    return null;
  }

  function typeFrom(q){
    if(has(q,/\b(exam|quiz|test)s?\b/))return 'exam';
    if(has(q,/\b(task|deadline|assignment|project|homework|due)s?\b/))return 'task';
    if(has(q,/\b(class|lecture|course meeting)s?\b/))return 'class';
    if(has(q,/\b(study block|study session|review session)s?\b/))return 'study';
    if(has(q,/\b(personal|appointment|errand)s?\b/))return 'personal';
    return '';
  }

  function filterEvents(q){
    const now=new Date(),today=dayStart(now);
    const explicitPeriod=periodFrom(q);
    const standalone=has(q,/\b(overdue|late|missed|upcoming|next|busiest|free day)\b/);
    const period=explicitPeriod||(!standalone&&context.topic==='planner'&&context.period?periodFrom(context.period):null);
    const explicitType=typeFrom(q);
    const type=explicitType||(!standalone&&context.topic==='planner'?context.type:'');
    let events=plannerEvents();
    if(period)events=events.filter(e=>{const d=dayStart(parseIso(e.date));return d>=period.from&&d<period.to;});
    if(type)events=events.filter(e=>e.type===type);
    if(has(q,/\boverdue|late|missed\b/))events=events.filter(e=>!e.done&&dateTime(e)<now);
    else if(has(q,/\b(done|completed|finished)\b/))events=events.filter(e=>e.done);
    else if(has(q,/\bupcoming|next|ahead\b/)&&!period)events=events.filter(e=>!e.done&&dateTime(e)>=today);
    return {events:events.sort((a,b)=>dateTime(a)-dateTime(b)),period:period?.name||'',type};
  }

  function eventLine(event){
    const course=event.course?' · '+event.course:'';
    const status=event.done?' · done':'';
    return '• '+event.title+' — '+prettyDate(event.date)+', '+prettyTime(event.start)+course+status;
  }

  function plannerAnswer(q){
    const plannerWords=/\b(planner|calendar|event|schedule|agenda|deadline|due|upcoming|overdue|busy|busiest|free day|study block)\b|\bday\b.*\bfree\b/;
    const follow=context.topic==='planner'&&has(q,/^(and |what about |how about |how many|which one|what time|where|tomorrow|today|next)/);
    const datedAgenda=Boolean(periodFrom(q))&&has(q,/\b(what do i have|what'?s on|anything|plans?)\b/);
    if(!plannerWords.test(q)&&!follow&&!datedAgenda)return null;
    context.topic='planner';
    const period=periodFrom(q);if(period)context.period=period.name;
    const type=typeFrom(q);if(type)context.type=type;

    if(has(q,/\b(what is|what's|explain|about) (the )?(planner|calendar)\b/)){
      return 'Planner puts classes, tasks, exams, study blocks, and personal events in one calendar. You can switch between Month, Week, and Day, mark events done, add notes and times, and see what is coming next.';
    }
    if(has(q,/\b(how (do|can) i|how to|where (do|can) i)\b.*\b(add|create|edit|delete|remove|complete|mark)\b/)){
      if(has(q,/\b(delete|remove)\b/))return 'Open Planner, tap the event, then choose Delete. Cramchy will remove that calendar event.';
      if(has(q,/\b(edit)\b/))return 'Open Planner and tap the event you want to change. Edit its title, type, course, date, time, or notes, then save.';
      if(has(q,/\b(complete|mark)\b/))return 'Open Planner, tap the event, and mark it done. Completed items stay visible with their finished status.';
      return 'Open Planner and tap “add event.” Choose class, task, exam, study block, or personal; then add the date, optional time/course/notes, and save.';
    }
    if(has(q,/\b(month|week|day) views?\b|\b(planner )?views?\b|\bswitch views?\b/))return 'Planner has Month, Week, and Day views. Open Planner, then use the view buttons above the calendar.';
    if(has(q,/\b(sync|cloud|another device|devices)\b/))return 'Planner events save in this browser and can sync through Cramchy Cloud when you are signed in. Cloud syncing needs an internet connection.';
    if(has(q,/\b(add|create|schedule|put)\b.*\b(event|deadline|exam|task|class|study block)\b/) && !has(q,/\bhow\b/)){
      return 'I can help you find and plan events, but I will not add one without showing you the form. Open Planner, tap “add event,” and enter the details so you can verify them before saving.';
    }

    const result=filterEvents(q),events=result.events;
    if(result.period)context.period=result.period;if(result.type)context.type=result.type;
    if(has(q,/\b(free day|free days|which day is free)\b/)){
      const start=dayStart(new Date()),counts={};
      for(let i=0;i<7;i++)counts[iso(plusDays(start,i))]=0;
      plannerEvents().filter(e=>!e.done&&counts[e.date]!==undefined).forEach(e=>counts[e.date]++);
      const free=Object.keys(counts).filter(d=>counts[d]===0);
      return free.length?'Your free days in the next 7 days are '+free.map(prettyDate).join(', ')+'.':'You have at least one Planner event on every day in the next 7 days.';
    }
    if(has(q,/\b(busiest|most busy)\b/)){
      const counts={};plannerEvents().filter(e=>!e.done&&dateTime(e)>=dayStart(new Date())).forEach(e=>counts[e.date]=(counts[e.date]||0)+1);
      const entries=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
      return entries.length?'Your busiest upcoming day is '+prettyDate(entries[0][0])+' with '+entries[0][1]+' event'+(entries[0][1]===1?'':'s')+'.':'Your Planner has no upcoming events yet.';
    }
    if(has(q,/\b(which|what) (one )?(should i do|comes|is) first\b|\bprioriti[sz]e\b/)){
      const candidates=plannerEvents().filter(e=>!e.done&&dateTime(e)>=dayStart(new Date())).sort((a,b)=>{
        const rank={exam:0,task:1,class:2,study:3,personal:4};
        return dateTime(a)-dateTime(b)||(rank[a.type]-rank[b.type]);
      }).slice(0,3);
      if(!candidates.length)return 'You have no unfinished upcoming Planner events to prioritize.';
      context.lastEventId=candidates[0].id;
      return 'Start with the nearest dated item. My top '+candidates.length+':\n'+candidates.map(eventLine).join('\n');
    }
    if(has(q,/\bhow many|count\b/)){
      const label=result.type?TYPE_LABEL[result.type]+'s':'events';
      const when=result.period?' '+result.period:'';
      return 'You have '+events.length+' '+label+when+'.';
    }
    if(has(q,/\bnext\b/)&&!periodFrom(q)){
      const next=events.find(e=>!e.done&&dateTime(e)>=new Date());
      if(!next)return 'You do not have an upcoming '+(result.type?TYPE_LABEL[result.type]:'Planner event')+' yet.';
      context.lastEventId=next.id;
      const notes=next.notes?' Notes: '+next.notes:'';
      return 'Your next '+TYPE_LABEL[next.type]+' is '+eventLine(next).slice(2)+'.'+notes;
    }
    if(has(q,/\b(details|notes|where|what time)\b/)&&context.lastEventId){
      const event=plannerEvents().find(e=>e.id===context.lastEventId);
      if(event)return eventLine(event).slice(2)+'.'+(event.notes?' Notes: '+event.notes:' No notes were added.');
    }
    const descriptor=(result.type?TYPE_LABEL[result.type]+'s':'events')+(result.period?' '+result.period:'');
    if(!events.length)return 'I found no '+descriptor+' in your Planner.';
    const shown=events.slice(0,6);context.lastEventId=shown[0].id;
    return 'Here '+(shown.length===1?'is':'are')+' your '+descriptor+':\n'+shown.map(eventLine).join('\n')+(events.length>shown.length?'\n…and '+(events.length-shown.length)+' more.':'');
  }

  function numeric(value){
    if(value===''||value===null||value===undefined)return null;
    const n=Number(value);return Number.isFinite(n)?n:null;
  }
  function currentTerm(state){
    let saved='';try{saved=localStorage.getItem(TERM_KEY)||'';}catch(e){}
    return saved||state.profile?.term||'Term 1';
  }
  function gradeEquivalent(raw){
    const rounded=Math.round(Number(raw));
    if(rounded>=96)return '4.0';if(rounded>=90)return '3.5';if(rounded>=84)return '3.0';
    if(rounded>=78)return '2.5';if(rounded>=72)return '2.0';return 'R';
  }
  function termGwaData(){
    const state=appState(),term=currentTerm(state),year=state.profile?.academicYear||'2026–2027';
    const info=readJson(GWA_KEY,{}),courses=(state.courses||[]).filter(c=>(c.academicYear||year)===year&&(c.term||state.profile?.term||'Term 1')===term);
    let weighted=0,units=0,included=0;
    courses.forEach(course=>{
      const row=info[course.id]||{},mode=row.mode||'none';let grade='';
      if(mode==='equiv')grade=String(row.grade||'');
      if(mode==='raw'&&numeric(row.finalRaw)!==null)grade=gradeEquivalent(row.finalRaw);
      if(mode==='midfinal'&&numeric(row.midtermRaw)!==null&&numeric(row.finalsRaw)!==null)grade=gradeEquivalent((Number(row.midtermRaw)+Number(row.finalsRaw))/2);
      const u=numeric(row.units)??numeric(course.units)??0,g=numeric(grade);
      if(g!==null&&g>=1&&u>0){weighted+=g*u;units+=u;included++;}
    });
    return {term,year,courses,included,units,gwa:units?weighted/units:null,pending:Math.max(0,courses.length-included)};
  }
  function quickGwaData(){
    const rows=appState().quickGwaRows||[];let weighted=0,units=0,count=0;
    rows.forEach(row=>{const g=numeric(row.grade),u=numeric(row.units);if(g!==null&&g>=1&&g<=4&&u!==null&&u>0){weighted+=g*u;units+=u;count++;}});
    return {gwa:units?weighted/units:null,units,count};
  }

  function gradesAnswer(q){
    const gradeWords=/\b(gradebook|grades?|gwa|weighted average|grading system|raw percentage|dean'?s list|honors)\b/;
    const follow=context.topic==='grades'&&has(q,/^(and |what about |how about |how is it|why is it|how.*calculat|which one)/);
    if(!gradeWords.test(q)&&!follow)return null;
    const isNew=has(q,/\b(term gwa|quick gwa|three grade|3 grade|grade tools?|grading system|raw percentage|equivalent|round|dean'?s list|honors)\b/);
    if(!isNew&&context.topic!=='grades')return null;
    context.topic='grades';context.period='';context.type='';

    if(has(q,/\b(difference|which|three|3)\b.*\b(grade|gwa)|\bgrade tools?\b/))return 'Grades has three tools: Course Gradebook estimates each course from assessment scores; Term GWA combines final course grades and units for your selected term; Quick GWA is a fast scratch calculator for grade equivalents and units.';
    if(has(q,/\b(course gradebook|gradebook)\b.*\b(how|what|use|for)\b/))return 'Course Gradebook tracks assessment scores inside each course and estimates Midterms, Finals, and Overall results. It is a planning estimate, not an official registrar grade.';
    if(has(q,/\bquick gwa\b/)){
      const d=quickGwaData();
      if(has(q,/\b(what|calculate|current|result|mine|my)\b/)&&d.gwa!==null)return 'Your Quick GWA is '+d.gwa.toFixed(2)+' from '+d.count+' row'+(d.count===1?'':'s')+' and '+d.units+' total units.';
      return 'Quick GWA is the fastest calculator: enter each final grade equivalent and its units. Cramchy computes Σ(grade × units) ÷ Σ(units). It does not change your Course Gradebook.';
    }
    if(has(q,/\bterm gwa\b|\bmy gwa\b|\bcurrent gwa\b/)){
      const d=termGwaData();
      if(d.gwa!==null)return 'Your '+d.term+' GWA is '+d.gwa.toFixed(2)+' across '+d.included+' included course'+(d.included===1?'':'s')+' and '+d.units+' units.'+(d.pending?' '+d.pending+' course'+(d.pending===1?' is':'s are')+' still pending.':'');
      return 'Term GWA uses final course grades and units for '+d.term+'. Add each course result as a grade equivalent, final raw percentage, or Midterms + Finals raw scores; then Cramchy calculates the weighted average.';
    }
    if(has(q,/\b(formula|calculate|computed|weighted average)\b/))return 'GWA formula: add every included course’s grade equivalent × units, then divide by total included units. Non-numeric marks such as R, INC, P, or F are not included in the numeric GWA calculation.';
    if(has(q,/\b(raw|round|equivalent|grading system|4\.0|3\.5|3\.0|2\.5|2\.0)\b/))return 'Cramchy follows the NU zero-based scale used in this app: rounded 96–100 = 4.0, 90–95 = 3.5, 84–89 = 3.0, 78–83 = 2.5, 72–77 = 2.0, and below 72 = R. Raw percentages are rounded first, so 95.50 becomes 96.';
    if(has(q,/\bdean'?s list|honors\b/))return 'In Cramchy’s current NU guide, a numeric GWA of 3.50 or higher is labeled Dean’s List — First Honors, while 3.25–3.49 is labeled Second Honors. Always verify official eligibility rules with NU because non-GWA requirements can also apply.';
    if(has(q,/\b(official|accurate|final)\b/))return 'Cramchy calculates from the data you enter. Gradebook values are estimates; your school portal or registrar remains the official source for final grades and honors eligibility.';
    return null;
  }

  function appAnswer(q){
    const about=/\b(cramchy|this app|the app|developer|creator|founder|built|made|features?|history|story|name|called|cost|price|free|offline|privacy|data|account|cloud|home screen|install|favicon|icon|pwa|version|update|dashboard|courses page|tasks page|study timer|exam mode|settings)\b/;
    if(!about.test(q))return null;

    if(has(q,/\b(who (built|made|created|developed)|developer|creator|founder)\b/))return 'Cramchy was built by Charlene Mikaela D. Caco, a 3rd-year Psychology student from NU Clark. It started as her side hobby because she wanted one app that catered to her own academic needs; she first made it for herself, then decided to share it with friends and anyone who wants to use it.';
    if(has(q,/\b(ai|artificial intelligence|chatgpt)\b.*\b(built|made|create|code|develop)|\b(built|made|coded|developed)\b.*\b(ai|chatgpt)\b/))return 'Charlene Mikaela D. Caco is Cramchy’s developer: she created the concept, chose the features and design direction, tested it, and made the product decisions. AI tools assisted with parts of the coding process, but Cramchy is her project and vision.';
    if(has(q,/\b(why|how).*(called|named)|\bname (story|origin|meaning)|\bwhat does cramchy mean\b/))return 'The name is an inside joke with a purpose. Charlene was a major crammer—quizzes, exams, any chance she got—so “cram” points to the habit she wanted to overcome by becoming more organized. “chy” nods to her nickname Chachi and gaming username chachimi. And “Cramchy” sounded like “crunchy” because she was eating chips when she thought of the silly name. The irony is the point: an app named after cramming that helps her stop cramming and procrastinating.';
    if(has(q,/\b(history|origin|story|why (was|did).*made|purpose|mission)\b/))return 'Cramchy began as Charlene’s personal side project: a Psychology student’s attempt to organize classes, tasks, exams, study sessions, and grades in one place and overcome her own cramming habit. It was officially meant for her own use, but she chose to share it with friends and other students. It is still growing—not perfect, but genuinely functional for the life it was designed around.';
    if(has(q,/\b(who are you|what are you|are you (an )?ai|is ask cramchy (an )?ai|ask cramchy)\b/))return 'I’m Ask Cramchy, the app’s built-in academic helper. In this free version I use an offline response library plus the academic data saved in Cramchy; I am not a paid, open-ended AI service. I can still answer questions about your Cramchy data and teach you how the app works.';
    if(has(q,/\b(features?|what can (cramchy|the app|this app) do|what does (cramchy|the app|this app) do)\b/))return 'Cramchy includes Home, Courses, Tasks, Planner, Study Timer, Grades, Exam Mode, Ask Cramchy, profile/settings, and optional cloud syncing. Grades includes Course Gradebook, Term GWA, and Quick GWA; Planner combines classes, tasks, exams, study blocks, and personal events.';
    if(has(q,/\b(what is|what'?s|explain|how.*use).*(home|dashboard)\b/))return 'Home is your daily command center. It summarizes what matters now, shows reminders and upcoming Planner items, and gives you quick ways to jump into Cramchy’s tools.';
    if(has(q,/\b(what is|what'?s|explain|how.*use).*(courses page|course manager)\b/))return 'Courses is where you set up subjects with details such as course code, units, schedule, room, instructor, academic year, and term. Those course records power schedules, Grades, Exam Mode, and Ask Cramchy answers.';
    if(has(q,/\b(what is|what'?s|explain|how.*use).*(tasks page|task manager)\b/))return 'Tasks is for academic to-dos and deadlines. Add the task, connect it to a course when useful, set its due date, and mark it complete when finished.';
    if(has(q,/\b(what is|what'?s|explain|how.*use).*(study timer|timer)\b/))return 'Study gives you a focus timer tied to your subjects and study history. Use it to run a focused session, then let Cramchy record the work you completed.';
    if(has(q,/\b(what is|what'?s|explain|how.*use).*exam mode\b/))return 'Exam Mode groups an exam period’s dashboard, schedule, subjects, study timer, countdown, and Matcha Corner. Use it when you want a focused workspace for one term or exam period.';
    if(has(q,/\b(what is|what'?s|explain|how.*use).*(more|settings|profile)\b/))return 'More contains profile and app controls such as your name, academic year, term, theme, cloud access, and repair options. Your academic year and term also affect which courses and grades Cramchy shows.';
    if(has(q,/\b(cost|price|paid|subscription|free)\b/))return 'Cramchy is free to use right now. This Ask Cramchy training layer also runs without a paid AI API, so normal questions do not create per-message AI charges.';
    if(has(q,/\b(offline|internet|wifi|data connection)\b/))return 'Ask Cramchy’s trained response library runs in your browser without a paid AI call. The website still needs to load, and sign-in or cloud syncing needs internet; offline availability for the entire app depends on what your browser has cached.';
    if(has(q,/\b(privacy|where.*data|saved|stored|secure)\b/))return 'Your working Cramchy data is saved in the browser on your device. If you sign in and use Cramchy Cloud, supported data can also sync through the app’s cloud service. Avoid putting sensitive personal information in event notes, and remember that clearing browser storage can remove local-only data.';
    if(has(q,/\b(account|sign in|login|cloud|sync)\b/))return 'You can use Cramchy locally in the browser. Signing in enables supported cloud syncing so your saved work can follow your account; syncing requires internet.';
    if(has(q,/\b(home screen|install|pwa|favicon|app icon|icon)\b/))return 'On iPhone, open Cramchy in Safari, tap Share, then Add to Home Screen. The installed shortcut uses Cramchy’s high-quality app icon and opens with an app-like standalone view. If an old icon remains, remove the old shortcut and add it again.';
    if(has(q,/\b(version|latest|update|new)\b/))return 'This preview includes Ask Cramchy '+VERSION+': expanded app knowledge, Planner and newer Grades support, live local-data answers, typo handling, and follow-up context—without a paid AI API.';
    if(has(q,/\b(perfect|limitations?|answer everything|any question)\b/))return 'I know Cramchy’s features, story, Planner, Grades, classes, tasks, exams, study tools, and the data saved in your app. I am broad, but not a general internet chatbot; if I do not understand something, try naming the feature and the result you want.';
    return null;
  }

  const NAV={
    home:{tab:'dashboard',label:'Home'},courses:{tab:'subjects',label:'Courses'},tasks:{tab:'tasks',label:'Tasks'},
    planner:{tab:'planner',label:'Planner'},study:{tab:'timer',label:'Study'},grades:{tab:'grades',label:'Grades'},
    exam:{tab:'exam',label:'Exam Mode'},more:{tab:'more',label:'More'}
  };
  function navTarget(q){
    if(!has(q,/\b(open|go to|show|take me to|navigate)\b/))return null;
    if(has(q,/\bquick gwa\b/))return {tab:'grades',mode:'quickgwa',label:'Quick GWA'};
    if(has(q,/\bterm gwa\b/))return {tab:'grades',mode:'gwa',label:'Term GWA'};
    if(has(q,/\bgradebook\b/))return {tab:'grades',mode:'gradebook',label:'Course Gradebook'};
    return Object.entries(NAV).find(([word])=>new RegExp('\\b'+word+'\\b').test(q))?.[1]||null;
  }
  function navigate(target){
    if(typeof document==='undefined'||!target)return;
    const btn=document.querySelector('.topnav .navbtn[data-tab="'+target.tab+'"]');
    if(btn)btn.click();
    if(target.mode)setTimeout(()=>document.querySelector('#view-grades [data-grades-mode="'+target.mode+'"]')?.click(),80);
  }

  function helpAnswer(q){
    if(!has(q,/^(help|what can i ask|what can you do|show examples|commands|questions)$/))return null;
    return 'You can ask me things like:\n• “What’s on my Planner tomorrow?” or “Which deadline comes first?”\n• “What is my Term GWA?” or “How is Quick GWA different?”\n• “Who built Cramchy?” or “Why is it called Cramchy?”\n• “Was Cramchy built with AI?” or “Is it free?”\n• “How do I add an event?” or “How do I install it on iPhone?”\n• Questions about your classes, exams, tasks, topics, study history, and what to study next.\nYou can also say “open Planner” or “show Quick GWA.”';
  }

  function answer(raw){
    const q=normalize(raw);if(!q)return null;
    const nav=navTarget(q);if(nav)return {text:'Opening '+nav.label+' for you.',action:()=>navigate(nav)};
    const help=helpAnswer(q);if(help)return {text:help};
    const grades=gradesAnswer(q);if(grades)return {text:grades};
    const planner=plannerAnswer(q);if(planner)return {text:planner};
    const app=appAnswer(q);if(app)return {text:app};
    return null;
  }

  function addMessage(role,text){
    const wrap=document.getElementById('askCramchyMessages');if(!wrap)return;
    wrap.querySelectorAll('.ask-chip-row').forEach(row=>row.remove());
    const row=document.createElement('div');row.className='ask-msg '+role;
    const bubble=document.createElement('div');bubble.className='ask-bubble';bubble.textContent=text;
    row.appendChild(bubble);wrap.appendChild(row);wrap.scrollTop=wrap.scrollHeight;
  }
  function submit(raw){
    const input=document.getElementById('askCramchyInput');const text=String(raw||input?.value||'').trim();
    if(!text)return false;
    const result=answer(text);if(!result)return false;
    if(input){input.value='';input.style.height='42px';}
    addMessage('user',text);
    setTimeout(()=>{addMessage('bot',result.text);if(result.action)result.action();},90);
    return true;
  }
  function patchPanel(){
    const panel=document.getElementById('askCramchyPanel');if(!panel||panel.dataset.v53==='yes')return;
    panel.dataset.v53='yes';
    const first=panel.querySelector('.ask-msg.bot .ask-bubble');
    if(first)first.textContent='hiii ♡ I now know Cramchy’s story, Planner, all three Grades tools, and your saved academic data. Ask me anything about the app or your school setup.';
    const wrap=document.getElementById('askCramchyMessages');
    const oldChips=wrap?.querySelector('.ask-chip-row');if(oldChips)oldChips.remove();
    if(wrap){
      const row=document.createElement('div');row.className='ask-chip-row';
      [['planner today','what is on my planner today?'],['my term gwa','what is my term gwa?'],['all features','what features does cramchy have?'],['cramchy story','why is it called cramchy?']].forEach(item=>{
        const button=document.createElement('button');button.type='button';button.className='ask-chip';button.dataset.v53Query=item[1];button.textContent=item[0];row.appendChild(button);
      });
      wrap.appendChild(row);
    }
  }
  function install(){
    document.addEventListener('click',event=>{
      const chip=event.target.closest?.('[data-v53-query]');
      if(chip){event.preventDefault();event.stopImmediatePropagation();submit(chip.dataset.v53Query);return;}
      if(event.target.closest?.('#askCramchySend')){
        const input=document.getElementById('askCramchyInput');
        if(submit(input?.value||'')){event.preventDefault();event.stopImmediatePropagation();}
        else if(input)input.value=normalize(input.value);
      }
    },true);
    document.addEventListener('keydown',event=>{
      if(event.key==='Enter'&&!event.shiftKey&&event.target?.id==='askCramchyInput'){
        if(submit(event.target.value)){event.preventDefault();event.stopImmediatePropagation();}
        else event.target.value=normalize(event.target.value);
      }
    },true);
    const observer=new MutationObserver(()=>patchPanel());observer.observe(document.body,{childList:true,subtree:true});
    patchPanel();
  }

  window.__cramchyAskV53={version:VERSION,answer,normalize,plannerEvents,termGwaData,quickGwaData};
  if(typeof document!=='undefined'&&document.body)install();
})();
