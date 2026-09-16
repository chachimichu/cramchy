(function(root){
  'use strict';

  root.CramchyModules = root.CramchyModules || {};

  root.CramchyModules.streak = {
    init({getState, now=()=>new Date()}){
      if(typeof getState !== 'function') throw new Error('Streak requires a state dependency.');

      const display = document.getElementById('streakDisplay');
      const commentary = document.getElementById('mascotCommentary');

      function calculate(){
        const history = Array.isArray(getState().studyHistory) ? getState().studyHistory : [];
        const days = new Set(history.map(item => new Date(item.timestamp).toDateString()));
        let count = 0;
        const cursor = new Date(now());
        if(!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
        while(days.has(cursor.toDateString())){
          count++;
          cursor.setDate(cursor.getDate() - 1);
        }
        return count;
      }

      function render(){
        const streak = calculate();
        if(display) display.textContent = `${streak} day streak`;
        if(commentary){
          commentary.textContent = streak >= 3
            ? 'look at you, actually consistent ♡'
            : (streak >= 1 ? "keep it going, don't break the chain." : 'start today. matcha is watching.');
        }
      }

      return {calculate, render};
    }
  };
})(typeof window === 'undefined' ? globalThis : window);
