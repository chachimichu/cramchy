(function(root){
  'use strict';

  root.CramchyModules = root.CramchyModules || {};

  root.CramchyModules.brainBreak = {
    init({showToast, durationSeconds=5*60, setIntervalFn=root.setInterval.bind(root), clearIntervalFn=root.clearInterval.bind(root)}){
      if(typeof showToast !== 'function') throw new Error('Brain break requires a toast dependency.');

      const display = document.getElementById('breakDisplay');
      const startButton = document.getElementById('breakStartBtn');
      const resetButton = document.getElementById('breakResetBtn');
      const state = {remaining: durationSeconds, running: false, intervalId: null};

      function render(){
        const minutes = Math.floor(state.remaining / 60);
        const seconds = state.remaining % 60;
        if(display) display.textContent = `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
      }

      function pause(){
        if(state.intervalId !== null) clearIntervalFn(state.intervalId);
        state.intervalId = null;
        state.running = false;
      }

      function toggle(){
        if(state.running){
          pause();
          return;
        }
        state.running = true;
        state.intervalId = setIntervalFn(() => {
          state.remaining--;
          render();
          if(state.remaining <= 0){
            pause();
            state.remaining = durationSeconds;
            render();
            showToast('break over. back to the academic trenches ♡');
          }
        }, 1000);
      }

      function reset(){
        pause();
        state.remaining = durationSeconds;
        render();
      }

      startButton?.addEventListener('click', toggle);
      resetButton?.addEventListener('click', reset);

      return {
        render,
        reset,
        snapshot: () => ({remaining: state.remaining, running: state.running}),
        destroy(){
          pause();
          startButton?.removeEventListener('click', toggle);
          resetButton?.removeEventListener('click', reset);
        }
      };
    }
  };
})(typeof window === 'undefined' ? globalThis : window);
