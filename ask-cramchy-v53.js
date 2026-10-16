(function(){
  'use strict';

  const VERSION='V54.0';
  const APP_KEY='strawberryMatchaMidtermsState_v1';
  const PLANNER_KEY='cramchyPlannerEvents_v2';
  const GWA_KEY='cramchyTermGwaPlanner_v2';
  const TERM_KEY='cramchyGradesSelectedTerm';
  const AI_CONSENT_KEY='cramchyGroqDataConsent_v1';
  const TYPE_LABEL={class:'class',task:'task',exam:'exam',study:'study block',personal:'personal event'};
  const context={topic:'',period:'',type:'',lastEventId:''};
  let aiHistory=[];

  function readJson(key,fallback){
    try{
      const value=JSON.parse(localStorage.getItem(key)||'null');
      return value===null?fallback:value;
    }catch(e){return fallback;}
  }

  function appState(){return readJson(APP_KEY,{profile:{},courses:[],quickGwaRows:[],gradebook:{}});}
  function userName(){
    const saved=String(appState().profile?.name||'').trim().replace(/\s+/g,' ');
    return saved?saved.split(' ')[0].slice(0,24):'bestie';
  }
  function introText(){return 'hiii, '+userName()+' what are we working on today? ask me anything about Cramchy or your school stuff.';}
  function loreAnswer(){
    return "okay, "+userName()+", here's the Cramchy lore it started as a little side quest by Charlene Mikaela D. Caco, a Psychology student from NU Clark—and it was literally her first time building an app. she used to cram for basically everything: quizzes, exams, deadlines, any chance she got. so she made Cramchy to help herself get organized and slowly beat the cramming-and-procrastinating cycle. the name happened in the most unserious way too: “cram” came from all the cramming, “chy” came from her nickname Chachi and gaming username chachimi, and “Cramchy” sounded like “crunchy” because she was eating chips when she thought of it LOL. it was originally just for her, but she ended up sharing it with friends and other students who might need it too. it’s still growing and it isn’t perfect, but that’s part of the lore—it’s a real first project built around what its developer actually needed.";
  }
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
      return userName()+', Planner is basically your academic life in one calendar—classes, tasks, exams, study blocks, and personal stuff. You can switch between Month, Week, and Day, add notes and times, mark things done, and check what’s coming next.';
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
      if(!candidates.length)return 'you’re all clear, '+userName()+'—there aren’t any unfinished upcoming Planner events to prioritize right now.';
      context.lastEventId=candidates[0].id;
      return 'okay, '+userName()+'—let’s start with the closest dated item. here’s the order I’d go with:\n'+candidates.map(eventLine).join('\n');
    }
    if(has(q,/\bhow many|count\b/)){
      const label=result.type?TYPE_LABEL[result.type]+'s':'events';
      const when=result.period?' '+result.period:'';
      return 'You have '+events.length+' '+label+when+'.';
    }
    if(has(q,/\bnext\b/)&&!periodFrom(q)){
      const next=events.find(e=>!e.done&&dateTime(e)>=new Date());
      if(!next)return 'looks clear, '+userName()+'—you don’t have an upcoming '+(result.type?TYPE_LABEL[result.type]:'Planner event')+' yet.';
      context.lastEventId=next.id;
      const notes=next.notes?' Notes: '+next.notes:'';
      return 'okay, '+userName()+'—your next '+TYPE_LABEL[next.type]+' is '+eventLine(next).slice(2)+'.'+notes;
    }
    if(has(q,/\b(details|notes|where|what time)\b/)&&context.lastEventId){
      const event=plannerEvents().find(e=>e.id===context.lastEventId);
      if(event)return eventLine(event).slice(2)+'.'+(event.notes?' Notes: '+event.notes:' No notes were added.');
    }
    const descriptor=(result.type?TYPE_LABEL[result.type]+'s':'events')+(result.period?' '+result.period:'');
    if(!events.length)return 'you’re clear, '+userName()+'—I couldn’t find any '+descriptor+' in your Planner.';
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

    if(has(q,/\b(difference|which|three|3)\b.*\b(grade|gwa)|\bgrade tools?\b/))return 'okay, quick bestie breakdown: Course Gradebook estimates one course from your assessment scores, Term GWA combines final course grades and units for the term, and Quick GWA is the fast no-fuss calculator when you already have the grade equivalents.';
    if(has(q,/\b(course gradebook|gradebook)\b.*\b(how|what|use|for)\b/))return 'Course Gradebook tracks assessment scores inside each course and estimates Midterms, Finals, and Overall results. It is a planning estimate, not an official registrar grade.';
    if(has(q,/\bquick gwa\b/)){
      const d=quickGwaData();
      if(has(q,/\b(what|calculate|current|result|mine|my)\b/)&&d.gwa!==null)return userName()+', your Quick GWA is '+d.gwa.toFixed(2)+' from '+d.count+' row'+(d.count===1?'':'s')+' and '+d.units+' total units.';
      return 'Quick GWA is the fastest calculator: enter each final grade equivalent and its units. Cramchy computes Σ(grade × units) ÷ Σ(units). It does not change your Course Gradebook.';
    }
    if(has(q,/\bterm gwa\b|\bmy gwa\b|\bcurrent gwa\b/)){
      const d=termGwaData();
      if(d.gwa!==null)return userName()+', your '+d.term+' GWA is '+d.gwa.toFixed(2)+' across '+d.included+' included course'+(d.included===1?'':'s')+' and '+d.units+' units.'+(d.pending?' '+d.pending+' course'+(d.pending===1?' is':'s are')+' still pending.':'');
      return 'Term GWA uses final course grades and units for '+d.term+'. Add each course result as a grade equivalent, final raw percentage, or Midterms + Finals raw scores; then Cramchy calculates the weighted average.';
    }
    if(has(q,/\b(formula|calculate|computed|weighted average)\b/))return 'GWA formula: add every included course’s grade equivalent × units, then divide by total included units. Non-numeric marks such as R, INC, P, or F are not included in the numeric GWA calculation.';
    if(has(q,/\b(raw|round|equivalent|grading system|4\.0|3\.5|3\.0|2\.5|2\.0)\b/))return 'Cramchy follows the NU zero-based scale used in this app: rounded 96–100 = 4.0, 90–95 = 3.5, 84–89 = 3.0, 78–83 = 2.5, 72–77 = 2.0, and below 72 = R. Raw percentages are rounded first, so 95.50 becomes 96.';
    if(has(q,/\bdean'?s list|honors\b/))return 'In Cramchy’s current NU guide, a numeric GWA of 3.50 or higher is labeled Dean’s List — First Honors, while 3.25–3.49 is labeled Second Honors. Always verify official eligibility rules with NU because non-GWA requirements can also apply.';
    if(has(q,/\b(official|accurate|final)\b/))return 'Cramchy calculates from the data you enter. Gradebook values are estimates; your school portal or registrar remains the official source for final grades and honors eligibility.';
    return null;
  }

  function appAnswer(q){
    const about=/\b(cramchy|this app|the app|developer|creator|founder|built|made|features?|history|story|lore|name|called|cost|price|free|offline|privacy|data|account|cloud|home screen|install|favicon|icon|pwa|version|update|dashboard|courses page|tasks page|study timer|exam mode|settings)\b/;
    if(!about.test(q))return null;

    if(has(q,/\b(who (built|made|created|developed)|developer|creator|founder)\b/))return "Cramchy was built by Charlene Mikaela D. Caco, a Psychology student from NU Clark it was her first time building an app, and it started as a side quest because she wanted one place that actually fit all her academic needs. she made it for herself first, then decided to share it with friends and other students too.";
    if(has(q,/\b(ai|artificial intelligence|chatgpt)\b.*\b(built|made|create|code|develop)|\b(built|made|coded|developed)\b.*\b(ai|chatgpt)\b/))return "short answer: Charlene Mikaela D. Caco built Cramchy. she’s a Psychology student from NU Clark, and this was her first time building an app. she came up with the whole concept, features, design direction, and tested everything around what she actually needed as a student. AI tools helped with parts of the coding, but the project and all the big decisions are hers.";
    if(has(q,/\blore\b|\b(history|origin|story|why (was|did).*made|purpose|mission)\b/))return loreAnswer();
    if(has(q,/\b(why|how).*(called|named)|\bname (story|origin|meaning)|\bwhat does cramchy mean\b/))return loreAnswer();
    if(has(q,/\b(who are you|what are you|are you (an )?ai|is ask cramchy (an )?ai|ask cramchy)\b/))return 'I’m Ask Cramchy, your academic helper. I can answer exact questions using your saved Cramchy data, and—if you enable AI—use Groq for open-ended study help with your saved academic context.';
    if(has(q,/\b(features?|what can (cramchy|the app|this app) do|what does (cramchy|the app|this app) do)\b/))return 'a lot, actually LOL—Cramchy has Home, Courses, Tasks, Planner, Study Timer, Grades, Exam Mode, Ask Cramchy, profile/settings, and optional cloud sync. Grades has Course Gradebook, Term GWA, and Quick GWA, while Planner keeps classes, tasks, exams, study blocks, and personal events together.';
    if(has(q,/\b(what is|what'?s|explain|how.*use).*(home|dashboard)\b/))return 'Home is your daily command center. It summarizes what matters now, shows reminders and upcoming Planner items, and gives you quick ways to jump into Cramchy’s tools.';
    if(has(q,/\b(what is|what'?s|explain|how.*use).*(courses page|course manager)\b/))return 'Courses is where you set up subjects with details such as course code, units, schedule, room, instructor, academic year, and term. Those course records power schedules, Grades, Exam Mode, and Ask Cramchy answers.';
    if(has(q,/\b(what is|what'?s|explain|how.*use).*(tasks page|task manager)\b/))return 'Tasks is for academic to-dos and deadlines. Add the task, connect it to a course when useful, set its due date, and mark it complete when finished.';
    if(has(q,/\b(what is|what'?s|explain|how.*use).*(study timer|timer)\b/))return 'Study gives you a focus timer tied to your subjects and study history. Use it to run a focused session, then let Cramchy record the work you completed.';
    if(has(q,/\b(what is|what'?s|explain|how.*use).*exam mode\b/))return 'Exam Mode groups an exam period’s dashboard, schedule, subjects, study timer, countdown, and Matcha Corner. Use it when you want a focused workspace for one term or exam period.';
    if(has(q,/\b(what is|what'?s|explain|how.*use).*(more|settings|profile)\b/))return 'More contains profile and app controls such as your name, academic year, term, theme, cloud access, and repair options. Your academic year and term also affect which courses and grades Cramchy shows.';
    if(has(q,/\b(cost|price|paid|subscription|free)\b/))return 'Cramchy is free to use right now. Groq offers a free API tier with usage limits, so AI replies can pause if its limits are reached.';
    if(has(q,/\b(offline|internet|wifi|data connection)\b/))return 'Exact answers about saved Cramchy data can run in your browser. Groq-powered study help needs an internet connection and your permission to share AI context; sign-in and cloud syncing also need internet.';
    if(has(q,/\b(privacy|where.*data|saved|stored|secure)\b/))return 'Your Cramchy data is saved in your browser and may sync through Cramchy Cloud if you use it. If you enable Ask Cramchy AI, your messages and saved academic details may be sent to Groq for replies. Your sign-in credentials and API key are not included. You can turn AI sharing off anytime.';
    if(has(q,/\b(account|sign in|login|cloud|sync)\b/))return 'You can use Cramchy locally in the browser. Signing in enables supported cloud syncing so your saved work can follow your account; syncing requires internet.';
    if(has(q,/\b(home screen|install|pwa|favicon|app icon|icon)\b/))return 'On iPhone, open Cramchy in Safari, tap Share, then Add to Home Screen. The installed shortcut uses Cramchy’s high-quality app icon and opens with an app-like standalone view. If an old icon remains, remove the old shortcut and add it again.';
    if(has(q,/\b(version|latest|update|new)\b/))return 'This Ask Cramchy update adds Groq-powered open-ended study help while keeping exact answers about your saved Cramchy data grounded in the app.';
    if(has(q,/\b(perfect|limitations?|answer everything|any question)\b/))return 'I can help with study questions and use your saved Cramchy academic data when AI sharing is enabled. I can still make mistakes, so check important grade calculations and school policies against the official source.';
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
    return 'ask away, '+userName()+' try things like:\n• “what’s on my Planner tomorrow?”\n• “what’s my Term GWA?”\n• “what’s the lore behind this app?”\n• “who built Cramchy?”\n• “how do I add an event?”\n• “what should I study next?”\nyou can also say “open Planner” or “show Quick GWA.”';
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

  function appendInline(parent,text){
    const pattern=/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    let cursor=0,match;
    while((match=pattern.exec(text))){
      if(match.index>cursor)parent.appendChild(document.createTextNode(text.slice(cursor,match.index)));
      const token=match[0],tag=token.startsWith('**')?'strong':token.startsWith('`')?'code':'em';
      const node=document.createElement(tag);node.textContent=token.startsWith('**')?token.slice(2,-2):token.slice(1,-1);parent.appendChild(node);cursor=pattern.lastIndex;
    }
    if(cursor<text.length)parent.appendChild(document.createTextNode(text.slice(cursor)));
  }
  function tableCells(line){return line.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(cell=>cell.trim());}
  function renderChatText(bubble,text){
    const lines=String(text||'').replace(/\r/g,'').split('\n');
    const isDivider=line=>/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
    for(let i=0;i<lines.length;){
      const line=lines[i].trim();if(!line){i++;continue;}
      if(line.includes('|')&&((i+1<lines.length&&isDivider(lines[i+1]))||isDivider(line))){
        const dividerAtStart=isDivider(line);let headers=dividerAtStart?[]:tableCells(line),j=dividerAtStart?i+1:i+2,records=[];
        while(j<lines.length&&lines[j].includes('|')&&lines[j].trim()&&!isDivider(lines[j])){records.push(tableCells(lines[j]));j++;}
        const list=document.createElement('div');list.className='ask-ai-table-cards';
        records.forEach(cells=>{
          if(!cells.some(Boolean))return;
          const card=document.createElement('div');card.className='ask-ai-table-card';
          const title=document.createElement('div');title.className='ask-ai-table-title';appendInline(title,cells[0]||'');card.appendChild(title);
          cells.slice(1).forEach((value,index)=>{if(!value)return;const detail=document.createElement('div');detail.className='ask-ai-table-detail';const label=document.createElement('span');label.className='ask-ai-table-label';label.textContent=headers[index+1]||(['Course code','Grade','Details'][index]||'Details');const content=document.createElement('span');content.className='ask-ai-table-value';appendInline(content,value);detail.append(label,content);card.appendChild(detail);});
          list.appendChild(card);
        });
        bubble.appendChild(list);i=j;continue;
      }
      const heading=line.match(/^#{1,3}\s+(.+)/);
      if(heading){const h=document.createElement('div');h.className='ask-ai-heading';appendInline(h,heading[1]);bubble.appendChild(h);i++;continue;}
      const unordered=line.match(/^[-*•]\s+(.+)/),ordered=line.match(/^\d+[.)]\s+(.+)/);
      if(unordered||ordered){const tag=ordered?'ol':'ul',list=document.createElement(tag);list.className='ask-ai-list';while(i<lines.length){const m=lines[i].trim().match(ordered?/^\d+[.)]\s+(.+)/:/^[-*•]\s+(.+)/);if(!m)break;const li=document.createElement('li');appendInline(li,m[1]);list.appendChild(li);i++;}bubble.appendChild(list);continue;}
      let paragraph=line,j=i+1;while(j<lines.length&&lines[j].trim()&&!/^#{1,3}\s|^[-*•]\s|^\d+[.)]\s/.test(lines[j].trim())){paragraph+=' '+lines[j].trim();j++;}
      const p=document.createElement('p');appendInline(p,paragraph);bubble.appendChild(p);i=j;
    }
  }
  function addMessage(role,text){
    const wrap=document.getElementById('askCramchyMessages');if(!wrap)return;
    wrap.querySelectorAll('.ask-chip-row').forEach(row=>row.remove());
    const row=document.createElement('div');row.className='ask-msg '+role;
    const bubble=document.createElement('div');bubble.className='ask-bubble';renderChatText(bubble,text);
    row.appendChild(bubble);wrap.appendChild(row);wrap.scrollTop=wrap.scrollHeight;
    return row;
  }
  function aiEnabled(){try{return localStorage.getItem(AI_CONSENT_KEY)==='true';}catch(e){return false;}}
  function aiSafeData(value,key='',depth=0,limits={string:700,array:80,keys:100}){
    if(/access.?token|refresh.?token|password|secret|api.?key|authorization|supabase|auth(?:token|session)?|email|phone|avatar|image|attachment|base64|binary|storagekey|schemas?version/i.test(key))return undefined;
    if(value===null||value===undefined||typeof value==='boolean'||typeof value==='number')return value;
    if(typeof value==='string')return value.slice(0,limits.string);
    if(depth>=7)return undefined;
    if(Array.isArray(value))return value.slice(-limits.array).map(item=>aiSafeData(item,'',depth+1,limits)).filter(item=>item!==undefined);
    if(typeof value==='object'){
      const out={};Object.keys(value).slice(0,limits.keys).forEach(name=>{const next=aiSafeData(value[name],name,depth+1,limits);if(next!==undefined)out[name]=next;});return out;
    }
    return undefined;
  }
  function aiContextSnapshot(question){
    const s=appState();
    const q=String(question||'').toLowerCase();
    const gradeRelated=/\b(grade|grades|gwa|score|scores|percentage|equivalent|weighted|gradebook|points)\b/.test(q);
    const plannerRelated=/\b(planner|schedule|class|classes|free|room|professor|today|tomorrow|week|deadline|due|task|tasks|quiz|exam|midterm|final)\b/.test(q);
    const studyRelated=/\b(study|studying|topic|topics|review|remember|forget|prepare|preparing|progress|explain|teach|concept|exam|midterm|final|quiz|focus)\b/.test(q);
    const archivedRelated=/\b(previous|last term|archived|past semester|earlier term)\b/.test(q);
    const raw={
      app:'Cramchy student planner',
      profile:s.profile,
      currentTerm:{academicYear:s.profile?.academicYear||'2026–2027',term:currentTerm(s),examPeriod:s.examPeriod||null,examContext:s.examContext||null},
      courses:s.courses||[]
    };
    if(gradeRelated){raw.courseGradebook=s.gradebook||{};raw.termGwaRecords=readJson(GWA_KEY,{});raw.quickGwaRows=s.quickGwaRows||[];}
    if(plannerRelated){raw.tasks=s.missions||[];raw.plannerEvents=plannerEvents();}
    if(studyRelated){raw.subjectProgress=s.subjects||{};raw.examData=s.examData||{};raw.studyHistory=s.studyHistory||[];}
    if(archivedRelated)raw.archivedTerms=s.archivedTerms||[];
    const limits=[{string:500,array:50,keys:80},{string:320,array:30,keys:60},{string:180,array:14,keys:45},{string:100,array:8,keys:30},{string:60,array:4,keys:20},{string:30,array:2,keys:12}];
    for(const bound of limits){
      const safe=aiSafeData(raw,'',0,bound);
      if(JSON.stringify(safe).length<=45000)return safe;
    }
    return aiSafeData({app:raw.app,profile:raw.profile,currentTerm:raw.currentTerm,courses:raw.courses},'',0,{string:30,array:2,keys:12});
  }
  function setAiConsent(enabled){try{localStorage.setItem(AI_CONSENT_KEY,enabled?'true':'false');}catch(e){} }
  function updateAiPrivacyNote(panel){
    if(!panel)return;
    panel.querySelector('.ask-ai-privacy-note')?.remove();
    const wrap=panel.querySelector('#askCramchyMessages');if(!wrap)return;
    let card=wrap.querySelector('.ask-ai-consent');
    if(!card){card=document.createElement('div');card.className='ask-msg bot ask-ai-consent';const bubble=document.createElement('div');bubble.className='ask-bubble ask-ai-consent-bubble';card.appendChild(bubble);const first=wrap.querySelector('.ask-msg.bot');if(first)first.after(card);else wrap.prepend(card);}
    const bubble=card.querySelector('.ask-bubble');bubble.replaceChildren();
    const title=document.createElement('strong');title.className='ask-ai-consent-title';title.textContent=aiEnabled()?'AI sharing is on':'Want open-ended study help?';bubble.appendChild(title);
    const copy=document.createElement('p');copy.textContent=aiEnabled()?'Your message and relevant saved academic context are sent to Groq. You can switch this off anytime.':'Turn on Cramchy AI to send your message and relevant saved academic context to Groq. Your login details and API key are never sent.';bubble.appendChild(copy);
    const button=document.createElement('button');button.type='button';button.className='ask-ai-consent-button';button.dataset.v53AiConsent=aiEnabled()?'disable':'enable';button.textContent=aiEnabled()?'Turn AI off':'Enable AI';bubble.appendChild(button);
  }
  async function askGroq(text){
    const payload={message:text,history:aiHistory.slice(-8),context:aiContextSnapshot(text),dataConsent:true};
    const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    let data={};try{data=await response.json();}catch(e){}
    if(!response.ok)throw new Error(data.error||'The AI reply is unavailable right now.');
    const reply=String(data.reply||'').trim();if(!reply)throw new Error('I couldn’t make a reply just now—please try again.');
    return reply;
  }
  function askAiTurn(text){
    const pending=addMessage('bot','thinking…');pending?.classList.add('ask-ai-pending');
    askGroq(text).then(reply=>{
      pending?.remove();addMessage('bot',reply);
      aiHistory.push({role:'user',content:text},{role:'assistant',content:reply});if(aiHistory.length>12)aiHistory=aiHistory.slice(-12);
    }).catch(error=>{
      pending?.remove();
      const message=error?.message==='AI is not configured yet.'?'AI is almost ready, but the Groq key hasn’t been added to Cramchy’s private server settings yet. Your saved-data answers still work here.':
        error?.message==='Groq is at its free usage limit right now.'?'Groq has reached its current free usage limit. Try again in a little while.':
        /too much saved context/i.test(error?.message||'')?'There’s a lot of saved school data in this account. Try asking about one course or term at a time.':
        'I couldn’t reach the AI just now. Your saved-data answers still work—please try again in a bit.';
      addMessage('bot',message);
    });
  }
  function submit(raw){
    const input=document.getElementById('askCramchyInput');const text=String(raw||input?.value||'').trim();
    if(!text)return false;
    const result=answer(text);
    if(input){input.value='';input.style.height='42px';}
    addMessage('user',text);
    if(result){setTimeout(()=>{addMessage('bot',result.text);if(result.action)result.action();},90);return true;}
    if(!aiEnabled()){
      addMessage('bot','For open-ended study help, enable AI above first. Your Cramchy data questions can still be answered here without sending them to Groq.');
      return true;
    }
    askAiTurn(text);
    return true;
  }
  function patchPanel(){
    const panel=document.getElementById('askCramchyPanel');if(!panel||panel.dataset.v53==='yes')return;
    panel.dataset.v53='yes';
    aiHistory=[];
    const first=panel.querySelector('.ask-msg.bot .ask-bubble');
    if(first)first.textContent=introText();
    const wrap=document.getElementById('askCramchyMessages');
    const oldChips=wrap?.querySelector('.ask-chip-row');if(oldChips)oldChips.remove();
    if(wrap){
      const row=document.createElement('div');row.className='ask-chip-row';
      [['planner today','what is on my planner today?'],['my term gwa','what is my term gwa?'],['all features','what features does cramchy have?'],['cramchy lore',"what's the lore behind this app?"]].forEach(item=>{
        const button=document.createElement('button');button.type='button';button.className='ask-chip';button.dataset.v53Query=item[1];button.textContent=item[0];row.appendChild(button);
      });
      wrap.appendChild(row);
    }
    updateAiPrivacyNote(panel);
  }
  function install(){
    document.addEventListener('click',event=>{
      const consent=event.target.closest?.('[data-v53-ai-consent]');
      if(consent){event.preventDefault();event.stopImmediatePropagation();const action=consent.dataset.v53AiConsent;if(action==='enable'){setAiConsent(true);updateAiPrivacyNote(document.getElementById('askCramchyPanel'));addMessage('bot','AI is on. I can now use your saved academic context to help with open-ended questions. You can turn it off anytime.');}else if(action==='off'){setAiConsent(false);updateAiPrivacyNote(document.getElementById('askCramchyPanel'));addMessage('bot','No worries—AI stays off. You can still ask about saved Cramchy data on this device.');}else if(action==='disable'){setAiConsent(false);updateAiPrivacyNote(document.getElementById('askCramchyPanel'));addMessage('bot','AI sharing is off now. Saved-data answers still work locally.');}return;}
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

  window.__cramchyAskV53={version:VERSION,answer,normalize,plannerEvents,termGwaData,quickGwaData,userName,introText,loreAnswer};
  if(typeof document!=='undefined'&&document.body)install();
})();
