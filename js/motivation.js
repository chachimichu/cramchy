(function(root){
  'use strict';

  const DEFAULT_MOTIVATIONS = [
    "Studying doesn't suck as much as failing.",
    "Don't cry when seeing your results; it was your choice and you chose not to study.",
    "Your maximum is someone else's minimum. Go study.",
    "I thought you wanted to prove that you're the best?",
    "You said you wanted to be the best. Act like it.",
    "Someone is studying while you're scrolling. Guess who gets the score?",
    "Your competition doesn't care that you're tired.",
    "You don't get to want Rank 1 and study like you're okay with Rank 3.",
    "You wanted to prove them wrong. Here's your chance.",
    "You can't complain about being overlooked when you're not giving them anything to notice.",
    "The score you're praying for is hiding inside the hours you're wasting.",
    "You know you're capable of more. That's exactly why you're not allowed to settle.",
    "Someone with less talent but better discipline is already ahead of you.",
    "Your potential means nothing if you keep choosing comfort.",
    "You're not competing with their intelligence. You're competing with their consistency.",
    "Future you will either thank you for tonight or wonder why you gave up so easily.",
    "Imagine meeting future you in 2029 and having to explain why you didn't try.",
    "She got where you wanted to be because she did what you kept postponing.",
    "Your future degree won't care how unmotivated you felt tonight.",
    "The woman you want to become is built during the hours nobody sees.",
    "You keep saying \"future psychologist.\" Start studying like one.",
    "You don't become exceptional by occasionally feeling motivated.",
    "Your future self deserves better than your excuses.",
    "Don't cry over a score you were unwilling to prepare for.",
    "You can't manifest a perfect score. You have to earn it.",
    "The exam doesn't care how badly you wanted 100.",
    "You had the time. You chose your distractions. Remember that when the results come out.",
    "Every question you can't answer tomorrow has a reason you ignored tonight.",
    "Don't ask why they scored higher. Ask how badly they wanted it.",
    "A perfect score starts long before the test paper reaches your desk.",
    "You don't need luck. You need preparation.",
    "Stop hoping the exam is easy. Become prepared enough that it doesn't matter."
  ];

  root.CramchyModules = root.CramchyModules || {};

  root.CramchyModules.motivation = {
    init({getState, saveState, random=Math.random, messages=DEFAULT_MOTIVATIONS}){
      if(typeof getState !== 'function' || typeof saveState !== 'function'){
        throw new Error('Motivation requires state and saveState dependencies.');
      }
      if(!Array.isArray(messages) || !messages.length){
        throw new Error('Motivation requires at least one message.');
      }

      const text = document.getElementById('motivationText');
      const button = document.getElementById('pushBtn');

      function currentIndex(){
        const value = Number(getState().motivationIndex);
        return Number.isFinite(value) ? Math.abs(Math.trunc(value)) % messages.length : 0;
      }

      function render(){
        if(text) text.textContent = messages[currentIndex()];
      }

      function showAnother(){
        const current = currentIndex();
        let next = Math.floor(random() * messages.length);
        if(messages.length > 1){
          while(next === current) next = Math.floor(random() * messages.length);
        }
        getState().motivationIndex = next;
        saveState();
        render();
      }

      button?.addEventListener('click', showAnother);

      return {
        render,
        destroy(){ button?.removeEventListener('click', showAnother); }
      };
    }
  };
})(typeof window === 'undefined' ? globalThis : window);
