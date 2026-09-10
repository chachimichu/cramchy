(function(){
  const MAP=new Map([
    ['Home','home'],
    ['Planner','planner'],
    ['Courses','courses'],
    ['Tasks','tasks'],
    ['Study','study'],
    ['Grades','grades'],
    ['More','more'],
    ['Dashboard','dashboard'],
    ['Exam Schedule','exam schedule'],
    ['Subjects','subjects'],
    ['Study Timer','study timer'],
    ['Countdown','countdown'],
    ['Matcha Corner','matcha corner'],
    ['Total Exams','total exams'],
    ['Study Topics','study topics'],
    ['Topics Done','topics done'],
    ['Overall Progress','overall progress'],
    ['Closest Exam','closest exam'],
    ["Today's Mission","today's mission"],
    ['Motivation','motivation'],
    ['Study History','study history'],
    ['Total Focused Time','total focused time'],
    ['Collectibles','collectibles'],
    ['Backup & Reset','backup & reset'],
    ['Export Backup','export backup'],
    ['Import Backup','import backup'],
    ['Reset Everything','reset everything'],
    ['START','start'],
    ['PAUSE','pause'],
    ['RESET','reset'],
    ['START / PAUSE','start / pause'],
    ['Set','set'],
    ['Clear','clear'],
    ['Add','add'],
    ['Save','save'],
    ['Cancel','cancel'],
    ['Delete','delete'],
    ['Edit','edit'],
    ['Done','done'],
    ['Not Started','not started'],
    ['In Progress','in progress'],
    ['Low','low'],
    ['Medium','medium'],
    ['High','high'],
    ['Term','term'],
    ['Academic Year','academic year'],
    ['Exam Mode','exam mode'],
    ['Cramchy recommends','cramchy recommends'],
    ["Today's Tasks","today's tasks"],
    ['Coming Up','coming up'],
    ['Planner Reminders','planner reminders'],
    ['My Courses','my courses'],
    ['Exam Season','exam season'],
    ['Pick for Me','pick for me'],
    ['Pick For Me','pick for me'],
    ['Open Planner','open planner'],
    ['View All Tasks →','view all tasks →'],
    ['Enter Exam Mode →','enter exam mode →']
  ]);

  function escapeRegExp(value){return String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}

  function normalizeText(text){
    if(!text) return text;
    let out=text;
    MAP.forEach((to,from)=>{
      out=out.replace(new RegExp('(^|\\s|[✦✧♡])'+escapeRegExp(from)+'(?=\\s|$|[→:])','g'),(match,prefix)=>prefix+to);
    });
    return out;
  }

  function shouldSkip(el){
    if(!el) return true;
    return el.closest('script,style,textarea,code,pre,select,.subject-name,.course-name,.course-title,.exam-subject-name,[data-preserve-case]');
  }

  function applyElementText(el){
    if(shouldSkip(el)) return;
    const tag=el.tagName;
    if(['INPUT','TEXTAREA'].includes(tag)){
      if(el.placeholder) el.placeholder=normalizeText(el.placeholder);
      if(el.type==='button'||el.type==='submit'||el.type==='reset') el.value=normalizeText(el.value);
      return;
    }
    if(el.matches('.topnav .navbtn,.exam-nav-set .navbtn')){
      const before=el.textContent||'';
      const after=before.trim().toLowerCase();
      if(after&&after!==before) el.textContent=after;
      return;
    }
    if(el.childNodes.length===1&&el.childNodes[0].nodeType===Node.TEXT_NODE){
      const before=el.textContent;
      const after=normalizeText(before);
      if(after!==before) el.textContent=after;
    }
    if(el.title) el.title=normalizeText(el.title);
    if(el.getAttribute('aria-label')) el.setAttribute('aria-label',normalizeText(el.getAttribute('aria-label')));
  }

  function walk(root=document.body){
    if(!root) return;
    const elements=root.querySelectorAll('button,a,h1,h2,h3,h4,.section-title,.label,.small-note,.tag,.chip,.btn,input');
    elements.forEach(applyElementText);
  }

  function install(){
    walk();
    let timer=null;
    const schedule=()=>{
      clearTimeout(timer);
      timer=setTimeout(()=>walk(),60);
    };
    new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true});
    document.addEventListener('click',()=>setTimeout(walk,120),true);
    document.addEventListener('change',()=>setTimeout(walk,120),true);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
