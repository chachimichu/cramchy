(function(){
  // Planner v3 passes its root selector into the helper as a string.
  // Give that string the tiny scoped querySelectorAll bridge the helper expects.
  // No polling, observers, or repeated DOM work.
  if(typeof String.prototype.querySelectorAll !== 'function'){
    Object.defineProperty(String.prototype,'querySelectorAll',{
      configurable:true,
      enumerable:false,
      value:function(selector){
        const root=document.querySelector(String(this));
        return root ? root.querySelectorAll(selector) : [];
      }
    });
  }
})();
