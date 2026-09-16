(function(root){
  'use strict';

  const DEFAULT_ICONS = ['🍓','🍵','🎀','🧋','🍰','🍡','🌸','♡','✨','🫧','🍒','🧁'];
  root.CramchyModules = root.CramchyModules || {};

  root.CramchyModules.collectibles = {
    init({getCompletedCount, icons=DEFAULT_ICONS}){
      if(typeof getCompletedCount !== 'function'){
        throw new Error('Collectibles requires a completed-count dependency.');
      }
      if(!Array.isArray(icons)) throw new Error('Collectibles icons must be an array.');

      const grid = document.getElementById('collectiblesGrid');

      function render(){
        if(!grid) return;
        const completed = Math.max(0, Number(getCompletedCount()) || 0);
        const unlockedCount = Math.min(icons.length, Math.floor(completed / 3));
        grid.innerHTML = '';
        icons.forEach((icon, index) => {
          const item = document.createElement('div');
          item.className = 'collectible' + (index < unlockedCount ? ' unlocked' : '');
          item.textContent = icon;
          grid.appendChild(item);
        });
      }

      return {render};
    }
  };
})(typeof window === 'undefined' ? globalThis : window);
