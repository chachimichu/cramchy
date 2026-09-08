(function(){
  const STATE_KEY='strawberryMatchaMidtermsState_v1';
  const FALLBACK_COLORS=['#8baee8','#ef89a4','#b79ae6','#8eb480','#e9a55d','#ee7279'];

  function $(s,r=document){return r.querySelector(s);}
  function $all(s,r=document){return Array.from(r.querySelectorAll(s));}
  function readState(){try{return JSON.parse(localStorage.getItem(STATE_KEY)||'{}')||{};}catch(e){return {};}}
  function validHex(v){const s=String(v||'').trim();return /^#[0-9a-f]{6}$/i.test(s)?s:null;}
  function findDirectTitle(home,needle){return $all(':scope > .section-title',home).find(el=>String(el.textContent||'').toLowerCase().includes(needle));}

  function prepStats(home){
    const stats=$(':scope > .daily-stats',home); if(!stats)return;
    stats.classList.add('home-status-strip');
    [['#dailyNextClass','class',1],['#dailyTasksLeft','task',2],['#dailyExamDays','exam',3],['#dailyStudyTime','study',4]].forEach(([id,type,order])=>{
      const value=$(id,stats); const card=value?.closest('.daily-stat');
      if(card){card.classList.add('home-status-card','status-'+type);card.style.order=String(order);}
    });
  }

  function applyCourseColors(){
    const s=readState();
    const courses=Array.isArray(s.courses)?s.courses:[];
    const byId=new Map(courses.map((c,i)=>[String(c.id),validHex(c.color)||FALLBACK_COLORS[i%FALLBACK_COLORS.length]]));
    $all('#dailyCourseStrip .home-course').forEach((el,i)=>{
      el.style.setProperty('--course-accent',byId.get(String(el.dataset.homeCourse))||FALLBACK_COLORS[i%FALLBACK_COLORS.length]);
    });
  }

  function addRecommendationSticker(card){
    if(!card||$('.home-study-sticker',card))return;
    const img=document.createElement('img');
    img.className='home-study-sticker';
    img.src='assets/ask-cramchy.png';
    img.alt='';
    img.setAttribute('aria-hidden','true');
    card.appendChild(img);
  }

  function build(){
    const home=$('#view-dashboard .daily-home'); if(!home)return false;
    if(home.dataset.commandCenterV6==='1'){prepStats(home);applyCourseColors();return true;}

    const hero=$(':scope > .cramchy-home-header',home);
    const stats=$(':scope > .daily-stats',home);
    const columns=$(':scope > .daily-columns',home);
    if(!hero||!stats||!columns||columns.children.length<2)return false;

    prepStats(home);

    const taskColumn=columns.children[0];
    const upcomingColumn=columns.children[1];
    const countdown=$('#dailyCountdownBox',home);
    const comingTitle=findDirectTitle(home,'coming up');
    const studyTitle=findDirectTitle(home,'what should i study');
    const studyCard=$('.smart-study-card',home);
    const coursesTitle=findDirectTitle(home,'my courses');
    const courseStrip=$('#dailyCourseStrip',home);
    const examTitle=findDirectTitle(home,'exam season');
    const examCard=$('.exam-entry-card',home);

    const grid=document.createElement('div');
    grid.className='home-command-grid';

    const today=document.createElement('section');
    today.className='home-command-panel home-today-panel';
    today.innerHTML='<div class="home-command-heading"><div><span class="home-heading-dot dot-task"></span><h3>today</h3></div><span class="home-heading-note">your actual to-do zone</span></div>';
    taskColumn.classList.add('home-today-content');
    const innerTaskTitle=$('.section-title',taskColumn);
    if(innerTaskTitle)innerTaskTitle.textContent="today's tasks";
    today.appendChild(taskColumn);

    const side=document.createElement('aside');
    side.className='home-command-side';

    const coming=document.createElement('section');
    coming.className='home-command-panel home-coming-panel';
    coming.innerHTML='<div class="home-command-heading"><div><span class="home-heading-dot dot-exam"></span><h3>coming up</h3></div><span class="home-heading-note">no jump scares pls</span></div>';
    if(countdown){countdown.classList.add('home-theme-surface','home-next-exam');coming.appendChild(countdown);}
    upcomingColumn.classList.add('home-upcoming-content');
    const innerUpcomingTitle=$('.section-title',upcomingColumn);
    if(innerUpcomingTitle)innerUpcomingTitle.remove();
    coming.appendChild(upcomingColumn);

    const recommend=document.createElement('section');
    recommend.className='home-command-panel home-recommend-panel';
    recommend.innerHTML='<div class="home-command-heading"><div><span class="home-heading-dot dot-study"></span><h3>Cramchy recommends</h3></div></div>';
    if(studyCard){
      studyCard.classList.add('home-recommend-card');
      const copyTitle=$('h3',studyCard);
      if(copyTitle&&/pick something for me/i.test(copyTitle.textContent||''))copyTitle.textContent='pick my next move';
      recommend.appendChild(studyCard);
      addRecommendationSticker(studyCard);
    }
    side.append(coming,recommend);
    grid.append(today,side);

    stats.insertAdjacentElement('afterend',grid);
    columns.remove();
    if(comingTitle)comingTitle.remove();
    if(studyTitle)studyTitle.remove();

    if(coursesTitle&&courseStrip){
      const courses=document.createElement('section');
      courses.className='home-courses-section home-command-panel';
      const head=document.createElement('div');
      head.className='home-command-heading';
      head.innerHTML='<div><span class="home-heading-dot dot-class"></span><h3>my courses</h3></div><span class="home-heading-note">same colors, everywhere</span>';
      courses.append(head,courseStrip);
      grid.insertAdjacentElement('afterend',courses);
      coursesTitle.remove();
    }

    if(examCard){
      examCard.classList.add('home-exam-banner-compact','home-theme-surface');
      if(examTitle)examTitle.remove();
      const anchor=$('.home-courses-section',home)||grid;
      anchor.insertAdjacentElement('afterend',examCard);
    }

    home.dataset.commandCenterV6='1';
    applyCourseColors();

    const courseRoot=$('#dailyCourseStrip');
    if(courseRoot&&!courseRoot.dataset.colorWatch){
      courseRoot.dataset.colorWatch='1';
      new MutationObserver(applyCourseColors).observe(courseRoot,{childList:true});
    }
    return true;
  }

  function init(){
    let tries=0;
    const run=()=>{tries++;if(build()||tries>16)return;setTimeout(run,120);};
    run();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
