(function(){
  const STORAGE_KEY='strawberryMatchaMidtermsState_v1';
  const MIGRATION_KEY='cramchyExamSubjectDedupeV21';

  const ALIASES=new Map([
    ['anatomy','humananatomy'],['humananatomy','humananatomy'],['anaphy','humananatomy'],
    ['edtech','educationaltechnology'],['educationaltechnology','educationaltechnology'],
    ['teaching','principleofteaching'],['principleofteaching','principleofteaching'],['principlesofteaching','principleofteaching'],['printea','principleofteaching'],
    ['cogpsych','cognitivepsychology'],['cognitivepsychology','cognitivepsychology'],['cogpsy','cognitivepsychology'],
    ['field','fieldmethodsinpsychology'],['fieldmethods','fieldmethodsinpsychology'],['fieldmethodsinpsychology','fieldmethodsinpsychology']
  ]);

  function rawKey(value){
    return String(value||'').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'').trim();
  }
  function key(value){
    const k=rawKey(value);
    return ALIASES.get(k)||k;
  }
  function courseKey(course){
    if(!course||typeof course!=='object') return '';
    return key(course.code)||key(course.name)||key(course.title)||key(course.subject)||key(course.id);
  }
  function mergeCourse(base,next){
    const merged={...base,...next};
    Object.keys(base||{}).forEach(prop=>{
      if((next?.[prop]===undefined||next?.[prop]===null||next?.[prop]==='')&&base[prop]!==undefined){
        merged[prop]=base[prop];
      }
    });
    return merged;
  }
  function dedupeArrayByName(list){
    if(!Array.isArray(list)) return {list,changed:false};
    const seen=new Map();
    const out=[];
    let changed=false;
    list.forEach((item,index)=>{
      const k=typeof item==='string'?key(item):courseKey(item);
      if(!k){ out.push(item); return; }
      if(seen.has(k)){
        const prevIndex=seen.get(k);
        if(typeof item==='object'&&typeof out[prevIndex]==='object') out[prevIndex]=mergeCourse(out[prevIndex],item);
        changed=true;
      }else{
        seen.set(k,out.length);
        out.push(item);
      }
    });
    return {list:out,changed};
  }
  function repairLocalState(){
    try{
      if(sessionStorage.getItem(MIGRATION_KEY)==='done') return false;
      const raw=localStorage.getItem(STORAGE_KEY);
      if(!raw){sessionStorage.setItem(MIGRATION_KEY,'done');return false;}
      const data=JSON.parse(raw);
      let changed=false;
      if(Array.isArray(data.courses)){
        const res=dedupeArrayByName(data.courses);
        if(res.changed){data.courses=res.list;changed=true;}
      }
      if(data.examData&&typeof data.examData==='object'){
        Object.values(data.examData).forEach(bucket=>{
          if(!bucket||typeof bucket!=='object') return;
          ['subjects','courses','subjectOrder','subjectList'].forEach(prop=>{
            if(Array.isArray(bucket[prop])){
              const res=dedupeArrayByName(bucket[prop]);
              if(res.changed){bucket[prop]=res.list;changed=true;}
            }
          });
        });
      }
      sessionStorage.setItem(MIGRATION_KEY,'done');
      if(changed){
        localStorage.setItem(STORAGE_KEY,JSON.stringify(data));
        if(!sessionStorage.getItem(MIGRATION_KEY+'Reloaded')){
          sessionStorage.setItem(MIGRATION_KEY+'Reloaded','1');
          setTimeout(()=>location.reload(),120);
        }
      }
      return changed;
    }catch(err){
      console.warn('Cramchy exam subject dedupe skipped.',err);
      sessionStorage.setItem(MIGRATION_KEY,'done');
      return false;
    }
  }

  function textKey(el){
    let text=String(el?.textContent||'').replace(/\s+/g,' ').trim();
    text=text.replace(/^(exam subjects?|subjects?|course)\s*/i,'').trim();
    return key(text);
  }
  function removeDuplicateChildren(root,selector){
    if(!root) return;
    const seen=new Set();
    Array.from(root.querySelectorAll(selector)).forEach(el=>{
      const k=textKey(el);
      if(!k) return;
      if(seen.has(k)){
        if(el.classList.contains('active')){
          const first=Array.from(root.querySelectorAll(selector)).find(candidate=>textKey(candidate)===k&&candidate!==el);
          first?.click?.();
        }
        el.remove();
      }else seen.add(k);
    });
  }
  function cleanVisibleDuplicates(){
    const examMode=document.body.classList.contains('exam-mode-active');
    if(!examMode) return;
    const legacy=document.querySelector('#view-subjects .legacy-subjects-panel');
    const tabs=document.querySelector('#subjectTabs');
    removeDuplicateChildren(tabs,'.subject-tab-btn,button');
    removeDuplicateChildren(legacy,'.subject-card,.exam-subject-card,.course-card');
    document.querySelectorAll('select').forEach(select=>{
      if(!select.closest('#view-subjects')&&!select.id.toLowerCase().includes('subject')) return;
      const seen=new Set();
      Array.from(select.options||[]).forEach(option=>{
        const k=key(option.textContent||option.value);
        if(!k) return;
        if(seen.has(k)) option.remove(); else seen.add(k);
      });
    });
  }
  function boot(){
    repairLocalState();
    let queued=false;
    const queue=()=>{
      if(queued) return;
      queued=true;
      requestAnimationFrame(()=>{queued=false;cleanVisibleDuplicates();});
    };
    queue();
    new MutationObserver(queue).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    document.addEventListener('click',queue,true);
    document.addEventListener('change',queue,true);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
