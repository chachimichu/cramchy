(function(){
  const STORAGE_KEY='strawberryMatchaMidtermsState_v1';
  const MIGRATION_KEY='cramchyExamSubjectDedupeV23';

  const ALIASES=new Map([
    ['anatomy','humananatomy'],['humananatomy','humananatomy'],['humananatomyandphysiology','humananatomy'],['humananatomyphysiology','humananatomy'],['anatomyandphysiology','humananatomy'],['anatomyphysiology','humananatomy'],['anaphy','humananatomy'],
    ['edtech','educationaltechnology'],['educationaltechnology','educationaltechnology'],
    ['teaching','principleofteaching'],['principleofteaching','principleofteaching'],['principlesofteaching','principleofteaching'],['printea','principleofteaching'],
    ['cogpsych','cognitivepsychology'],['cognitivepsychology','cognitivepsychology'],['cogpsy','cognitivepsychology'],
    ['field','fieldmethodsinpsychology'],['fieldmethods','fieldmethodsinpsychology'],['fieldmethod','fieldmethodsinpsychology'],['fieldmethodsinpsychology','fieldmethodsinpsychology']
  ]);

  function rawKey(value){
    return String(value||'').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'').trim();
  }
  function key(value){
    const k=rawKey(value);
    if(!k) return '';
    if(ALIASES.has(k)) return ALIASES.get(k);
    if(k.includes('humananatomy')||k.includes('anatomyandphysiology')||k.includes('anatomyphysiology')) return 'humananatomy';
    if(k.includes('educationaltechnology')||k==='edtech') return 'educationaltechnology';
    if(k.includes('principleofteaching')||k.includes('principlesofteaching')||k==='printea') return 'principleofteaching';
    if(k.includes('cognitivepsychology')||k==='cogpsy'||k==='cogpsych') return 'cognitivepsychology';
    if(k.includes('fieldmethod')) return 'fieldmethodsinpsychology';
    return k;
  }
  function courseKey(course){
    if(!course||typeof course!=='object') return '';
    return key(course.code)||key(course.name)||key(course.title)||key(course.subject)||key(course.id);
  }
  function richness(item){
    if(!item||typeof item!=='object') return 0;
    let score=0;
    Object.values(item).forEach(value=>{
      if(Array.isArray(value)) score+=value.length*2;
      else if(value&&typeof value==='object') score+=Object.keys(value).length;
      else if(String(value||'').trim()) score+=1;
    });
    return score;
  }
  function mergeCourse(base,next){
    if(typeof base==='string') return next;
    if(typeof next==='string') return base;
    const primary=richness(next)>=richness(base)?next:base;
    const secondary=primary===next?base:next;
    const merged={...secondary,...primary};
    Object.keys(secondary||{}).forEach(prop=>{
      if((merged[prop]===undefined||merged[prop]===null||merged[prop]==='')&&secondary[prop]!==undefined){
        merged[prop]=secondary[prop];
      }
    });
    return merged;
  }
  function dedupeArrayByName(list){
    if(!Array.isArray(list)) return {list,changed:false};
    const seen=new Map();
    const out=[];
    let changed=false;
    list.forEach(item=>{
      const k=typeof item==='string'?key(item):courseKey(item);
      if(!k){ out.push(item); return; }
      if(seen.has(k)){
        const prevIndex=seen.get(k);
        out[prevIndex]=mergeCourse(out[prevIndex],item);
        changed=true;
      }else{
        seen.set(k,out.length);
        out.push(item);
      }
    });
    return {list:out,changed};
  }
  function dedupeObjectKeys(obj){
    if(!obj||typeof obj!=='object'||Array.isArray(obj)) return false;
    const seen=new Map();
    let changed=false;
    Object.keys(obj).forEach(prop=>{
      const k=key(prop);
      if(!k) return;
      if(seen.has(k)){
        const keep=seen.get(k);
        obj[keep]=mergeCourse(obj[keep],obj[prop]);
        delete obj[prop];
        changed=true;
      }else seen.set(k,prop);
    });
    return changed;
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
      if(data.subjects&&typeof data.subjects==='object'){
        if(dedupeObjectKeys(data.subjects)) changed=true;
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
          ['subjectData','subjectsById','courseData'].forEach(prop=>{
            if(bucket[prop]&&typeof bucket[prop]==='object'&&!Array.isArray(bucket[prop])){
              if(dedupeObjectKeys(bucket[prop])) changed=true;
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
    const seen=new Map();
    Array.from(root.querySelectorAll(selector)).forEach(el=>{
      const k=textKey(el);
      if(!k) return;
      if(seen.has(k)){
        const first=seen.get(k);
        if(el.classList.contains('active')) first?.click?.();
        el.remove();
      }else seen.set(k,el);
    });
  }
  function cleanVisibleDuplicates(){
    const examMode=document.body.classList.contains('exam-mode-active');
    if(!examMode) return;
    const legacy=document.querySelector('#view-subjects .legacy-subjects-panel');
    const tabs=document.querySelector('#subjectTabs');
    removeDuplicateChildren(tabs,'.subject-tab-btn,button');
    removeDuplicateChildren(legacy,'.subject-card,.exam-subject-card,.course-card,[data-subject-id],[data-subject]');
    document.querySelectorAll('select').forEach(select=>{
      const id=String(select.id||'').toLowerCase();
      if(!select.closest('#view-subjects')&&!id.includes('subject')&&!id.includes('course')) return;
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
