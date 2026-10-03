(function(){
  'use strict';
  // Apply spacing to the actual display font, not every heading indiscriminately.
  // Inline important wins over the older negative-tracking patch stylesheets.
  const managed=new WeakMap();
  function apply(el){
    if(!(el instanceof HTMLElement)||['SCRIPT','STYLE','LINK'].includes(el.tagName))return;
    const chunky=/DynaPuff/i.test(getComputedStyle(el).fontFamily);
    if(chunky){
      if(!managed.has(el))managed.set(el,{value:el.style.getPropertyValue('letter-spacing'),priority:el.style.getPropertyPriority('letter-spacing')});
      if(el.style.getPropertyValue('letter-spacing')!=='.015em')el.style.setProperty('letter-spacing','.015em','important');
    }else if(managed.has(el)){
      const old=managed.get(el);if(old.value)el.style.setProperty('letter-spacing',old.value,old.priority);else el.style.removeProperty('letter-spacing');managed.delete(el);
    }
  }
  function scan(root){if(!(root instanceof HTMLElement))return;apply(root);root.querySelectorAll('*').forEach(apply);}
  scan(document.body);
  new MutationObserver(records=>{
    const roots=new Set();
    records.forEach(record=>{if(record.type==='attributes')roots.add(record.target);else if(record.type==='childList'){record.addedNodes.forEach(node=>{if(node instanceof HTMLElement)roots.add(node);});}});
    roots.forEach(scan);
  }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
})();
