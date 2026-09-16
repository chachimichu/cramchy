(function(root){
  'use strict';

  root.CramchyModules=root.CramchyModules||{};
  const COLORS={pink:'#e98aa7',matcha:'#91aa78',lavender:'#9b82c7',blue:'#779cca',peach:'#d99678',rose:'#c96f83'};
  const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  root.CramchyModules.courses={
    init({getState,getAcademicContext,saveState,showToast,createId,escapeHtml,confirmAction,openModal,onOpenCourses,onChanged,onRemoved,now=()=>new Date()}){
      const required={getState,getAcademicContext,saveState,showToast,createId,escapeHtml,confirmAction,openModal,onOpenCourses,onChanged,onRemoved,now};
      Object.entries(required).forEach(([name,value])=>{if(typeof value!=='function')throw new Error(`Courses requires ${name}.`);});
      const catalog=document.getElementById('dynamicCourseGrid');
      const home=document.getElementById('dailyCourseStrip');
      const addButton=document.getElementById('addCourseBtn');

      function all(){
        const state=getState();
        if(!Array.isArray(state.courses))state.courses=[];
        return state.courses;
      }
      function forTerm(year,term){
        const current=getAcademicContext();
        return all().filter(course=>(course.academicYear||current.year)===year&&(course.term||current.term)===term);
      }
      function current(){const context=getAcademicContext();return forTerm(context.year,context.term);}
      function displayTime(value){
        if(!value)return '';
        const [hour,minute]=String(value).split(':').map(Number);
        if(!Number.isFinite(hour))return String(value);
        return `${(hour%12)||12}:${String(minute||0).padStart(2,'0')} ${hour>=12?'PM':'AM'}`;
      }
      function normalizeSchedules(course){
        if(Array.isArray(course?.schedules)&&course.schedules.length)return course.schedules;
        const raw=String(course?.schedule||'').trim();
        if(!raw)return [];
        const match=raw.match(/^(Sun(?:day)?|Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?)\s*[·|-]\s*([^·]+?)[–-]([^·]+?)(?:\s*[·|-]\s*(.*))?$/i);
        if(!match)return [{id:createId(),day:'',start:'',end:'',room:raw,legacy:true}];
        const dayMap={sun:'Sunday',sunday:'Sunday',mon:'Monday',monday:'Monday',tue:'Tuesday',tuesday:'Tuesday',wed:'Wednesday',wednesday:'Wednesday',thu:'Thursday',thursday:'Thursday',fri:'Friday',friday:'Friday',sat:'Saturday',saturday:'Saturday'};
        const parseClock=value=>{const clock=String(value).trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);if(!clock)return '';let hour=+clock[1];if(clock[3].toUpperCase()==='PM'&&hour<12)hour+=12;if(clock[3].toUpperCase()==='AM'&&hour===12)hour=0;return `${String(hour).padStart(2,'0')}:${clock[2]}`;};
        return [{id:createId(),day:dayMap[match[1].toLowerCase()]||'',start:parseClock(match[2]),end:parseClock(match[3]),room:(match[4]||'').replace(/^Room\s*/i,'').trim()}];
      }
      function scheduleText(schedule){
        if(schedule.legacy)return schedule.room||'Schedule not set';
        const times=schedule.start&&schedule.end?`${displayTime(schedule.start)}–${displayTime(schedule.end)}`:(schedule.start?displayTime(schedule.start):'Time not set');
        return `${schedule.day||'Day not set'} · ${times}${schedule.room?` · ${schedule.room}`:''}`;
      }
      function nextClass(){
        let best=null;
        const currentTime=now();
        current().forEach(course=>normalizeSchedules(course).forEach(schedule=>{
          if(!DAYS.includes(schedule.day)||!/^\d{2}:\d{2}$/.test(schedule.start||''))return;
          const [hour,minute]=schedule.start.split(':').map(Number);
          const when=new Date(currentTime);
          when.setSeconds(0,0);when.setHours(hour,minute,0,0);
          when.setDate(currentTime.getDate()+(DAYS.indexOf(schedule.day)-currentTime.getDay()+7)%7);
          if(when<=currentTime)when.setDate(when.getDate()+7);
          if(!best||when<best.when)best={course,schedule,when};
        }));
        return best;
      }
      function nextLabel(){const next=nextClass();return next?`${next.course.code||next.course.name} · ${displayTime(next.schedule.start)}`:'—';}

      function upsert(course){
        const state=getState();
        const index=all().findIndex(item=>item.id===course.id);
        if(index>=0)state.courses=all().map(item=>item.id===course.id?course:item);else all().push(course);
        if(!state.gradebook||typeof state.gradebook!=='object')state.gradebook={};
        if(!state.gradebook[course.id])state.gradebook[course.id]={midterms:[],finals:[]};
        saveState();onChanged();showToast(index>=0?'course updated':'course added');return course;
      }
      function remove(courseId){
        const state=getState();
        const course=all().find(item=>item.id===courseId);if(!course)return false;
        if(!confirmAction(`Remove ${course.name}? Its gradebook and course-linked exam workspace entries will also be removed.`))return false;
        state.courses=all().filter(item=>item.id!==courseId);
        if(state.gradebook)delete state.gradebook[courseId];
        const context=getAcademicContext();
        const key=`${course.academicYear||context.year}::${course.term||context.term}`;
        const record=state.examData?.[key],subjectId=`course-${courseId}`;
        if(record)['midterms','finals'].forEach(period=>{const data=record[period];if(!data)return;data.exams=(data.exams||[]).filter(exam=>(exam.subjectId||exam.id)!==subjectId);if(data.subjects)delete data.subjects[subjectId];if(data.subjectNames)delete data.subjectNames[subjectId];});
        onRemoved(courseId);saveState();onChanged();showToast('course removed');return true;
      }

      function renderCatalog(){
        if(!catalog)return;
        const courses=current();
        if(!courses.length){catalog.innerHTML='<div class="card shell-empty" style="grid-column:1/-1;"><div class="big">no courses yet</div><p>Add your first course. You can edit, schedule, or remove it anytime.</p><button class="btn" data-course-action="add">+ add course</button></div>';return;}
        catalog.innerHTML=courses.map(course=>{const schedules=normalizeSchedules(course);const scheduleHtml=schedules.length?schedules.map(schedule=>`<div class="schedule-chip"><span>${escapeHtml(scheduleText(schedule))}</span></div>`).join(''):'<div class="schedule-chip"><span>no class schedule yet</span></div>';return `<div class="course-card-dynamic" style="--course-accent:${COLORS[course.color]||COLORS.pink}"><div class="course-accent"></div><div class="course-card-body"><div class="course-top"><div><h3>${escapeHtml(course.name)}</h3><div class="meta">${escapeHtml(course.code||'No code')}${course.units?` · ${course.units} units`:''}<br>${escapeHtml(course.professor||'Professor not set')}${course.section?` · ${escapeHtml(course.section)}`:''}</div></div></div><div class="schedule-stack">${scheduleHtml}</div><div class="course-card-help">You can change details anytime. “Schedules” lets you add multiple meeting days.</div><div class="course-actions"><button data-course-action="edit" data-course-id="${escapeHtml(course.id)}">✎ edit course</button><button data-course-action="schedule" data-course-id="${escapeHtml(course.id)}">🗓 edit schedules</button><button class="danger" data-course-action="delete" data-course-id="${escapeHtml(course.id)}">remove course</button></div></div></div>`;}).join('');
      }
      function renderHome(){
        if(!home)return;
        const courses=current().slice(0,6);
        if(!courses.length){home.innerHTML='<div class="card shell-empty" style="grid-column:1/-1;"><div class="big">add your courses</div><p>Once added, your daily dashboard will use their schedules and grades.</p><button class="btn" data-course-action="add">+ add course</button></div>';return;}
        home.innerHTML=courses.map(course=>{const schedule=normalizeSchedules(course)[0];return `<button type="button" class="home-course" data-course-action="open" data-course-id="${escapeHtml(course.id)}" style="text-align:left;font:inherit;"><h4>${escapeHtml(course.name)}</h4><p>${escapeHtml(course.code||'No code')}${schedule?`<br>${escapeHtml(scheduleText(schedule))}`:'<br>no schedule yet'}</p></button>`;}).join('');
      }
      function handleAction(event){
        const button=event.target.closest?.('[data-course-action]');if(!button)return;
        const action=button.dataset.courseAction,id=button.dataset.courseId;
        if(action==='add')openModal();else if(action==='edit')openModal(id,false);else if(action==='schedule')openModal(id,true);else if(action==='delete')remove(id);else if(action==='open')onOpenCourses();
      }
      function handleAdd(){openModal();}
      catalog?.addEventListener('click',handleAction);home?.addEventListener('click',handleAction);addButton?.addEventListener('click',handleAdd);
      return {all,forTerm,current,normalizeSchedules,displayTime,scheduleText,nextClass,nextLabel,upsert,remove,renderCatalog,renderHome,destroy(){catalog?.removeEventListener('click',handleAction);home?.removeEventListener('click',handleAction);addButton?.removeEventListener('click',handleAdd);}};
    }
  };
})(typeof window==='undefined'?globalThis:window);
