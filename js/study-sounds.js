(function(){
  'use strict';
  const view=document.getElementById('view-timer');
  if(!view||document.getElementById('studySoundsCard'))return;
  const choices=[
    {id:'gamma',name:'Gamma waves',note:'Soft 40 Hz binaural-style tones; headphones recommended.'},
    {id:'white',name:'White noise',note:'Steady, even broadband noise.'},
    {id:'cafe',name:'Café ambience',note:'A warm, low café-like room hum.'},
    {id:'rain',name:'Rain',note:'Layered soft rain texture.'},
    {id:'lofi',name:'Lo-fi study beats',note:'Original chill beats with soft drums, warm keys, and a mellow melody.'}
  ];
  let selected='gamma',volume=0.2,ctx=null,master=null,nodes=[],scheduler=0,running=false,runId=0,beat=0,nextBeat=0;
  try{
    const saved=JSON.parse(localStorage.getItem('cramchyStudySounds_v1')||'{}');
    if(choices.some(choice=>choice.id===saved.selected))selected=saved.selected;
    if(Number.isFinite(saved.volume))volume=Math.max(0,Math.min(0.5,saved.volume));
  }catch(_){}
  const history=Array.from(view.querySelectorAll('.section-title')).find(node=>/study history/i.test(node.textContent||''));
  const markup=
    '<section class="card study-sounds-card" id="studySoundsCard" aria-labelledby="studySoundsTitle">'+
      '<div class="study-sounds-head"><div><h3 id="studySoundsTitle">study sounds</h3><p>Choose a soft background for your session.</p></div><span class="study-sounds-status" id="studySoundStatus" role="status" aria-live="polite">paused</span></div>'+
      '<div class="study-sounds-options" role="group" aria-label="Choose a study sound">'+
        '<button type="button" class="study-sound-choice" data-study-sound="gamma"><span aria-hidden="true">〰</span><b>gamma waves</b></button>'+
        '<button type="button" class="study-sound-choice" data-study-sound="white"><span aria-hidden="true">〰</span><b>white noise</b></button>'+
        '<button type="button" class="study-sound-choice" data-study-sound="cafe"><span aria-hidden="true">☕</span><b>café</b></button>'+
        '<button type="button" class="study-sound-choice" data-study-sound="rain"><span aria-hidden="true">☂</span><b>rain</b></button>'+
        '<button type="button" class="study-sound-choice" data-study-sound="lofi"><span aria-hidden="true">♫</span><b>lo-fi study</b></button>'+
      '</div>'+
      '<div class="study-sounds-controls"><button type="button" class="study-sound-play" id="studySoundToggle" aria-pressed="false">▶ play sound</button><label class="study-sound-volume" for="studySoundVolume"><span>volume</span><input id="studySoundVolume" type="range" min="0" max="0.5" step="0.01" aria-label="Study sound volume"></label></div>'+
      '<p class="study-sounds-note" id="studySoundNote"></p>'+
    '</section>';
  if(history)history.insertAdjacentHTML('beforebegin',markup);else view.insertAdjacentHTML('beforeend',markup);
  const card=document.getElementById('studySoundsCard');
  const toggle=document.getElementById('studySoundToggle');
  const slider=document.getElementById('studySoundVolume');
  const status=document.getElementById('studySoundStatus');
  const note=document.getElementById('studySoundNote');
  slider.value=String(volume);
  function save(){
    try{localStorage.setItem('cramchyStudySounds_v1',JSON.stringify({selected:selected,volume:volume}));}catch(_){}
  }
  function activeChoice(){return choices.find(choice=>choice.id===selected)||choices[0];}
  function paint(){
    card.querySelectorAll('[data-study-sound]').forEach(button=>{
      const active=button.dataset.studySound===selected;
      button.classList.toggle('is-selected',active);
      button.setAttribute('aria-pressed',String(active));
    });
    toggle.textContent=running?'Ⅱ pause sound':'▶ play sound';
    toggle.setAttribute('aria-pressed',String(running));
    status.textContent=running?'playing '+activeChoice().name.toLowerCase():'paused';
    note.textContent=activeChoice().note;
  }
  function ensureAudio(){
    if(ctx)return Promise.resolve();
    const AudioContextType=window.AudioContext||window.webkitAudioContext;
    if(!AudioContextType)throw new Error('Audio playback is not supported in this browser.');
    ctx=new AudioContextType();
    master=ctx.createGain();
    master.gain.value=0;
    master.connect(ctx.destination);
    return ctx.resume();
  }
  function track(node){nodes.push(node);node.onended=function(){nodes=nodes.filter(item=>item!==node);};return node;}
  function noiseSource(){
    const buffer=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate);
    const data=buffer.getChannelData(0);
    let brown=0;
    for(let i=0;i<data.length;i++){
      const white=Math.random()*2-1;
      brown=(brown+0.018*white)/1.018;
      data[i]=Math.max(-1,Math.min(1,brown*3.5));
    }
    const source=track(ctx.createBufferSource());
    source.buffer=buffer;source.loop=true;
    return source;
  }
  function addNoise(type,frequency,amount,q){
    const source=noiseSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    filter.type=type;filter.frequency.value=frequency;if(q)filter.Q.value=q;
    gain.gain.value=amount;
    source.connect(filter);filter.connect(gain);gain.connect(master);source.start();
  }
  function addTone(frequency,pan,amount){
    const oscillator=track(ctx.createOscillator()),gain=ctx.createGain(),panner=ctx.createStereoPanner();
    oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.value=amount;
    panner.pan.value=pan;oscillator.connect(gain);gain.connect(panner);panner.connect(master);oscillator.start();
  }
  function playKick(at){
    const oscillator=track(ctx.createOscillator()),gain=ctx.createGain();
    oscillator.type='sine';oscillator.frequency.setValueAtTime(112,at);oscillator.frequency.exponentialRampToValueAtTime(48,at+0.13);
    gain.gain.setValueAtTime(0.15,at);gain.gain.exponentialRampToValueAtTime(0.001,at+0.2);
    oscillator.connect(gain);gain.connect(master);oscillator.start(at);oscillator.stop(at+0.22);
  }
  function playSnare(at){
    const source=track(noiseSource()),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    filter.type='bandpass';filter.frequency.value=1800;filter.Q.value=0.7;
    gain.gain.setValueAtTime(0.001,at);gain.gain.linearRampToValueAtTime(0.045,at+0.008);gain.gain.exponentialRampToValueAtTime(0.001,at+0.13);
    source.connect(filter);filter.connect(gain);gain.connect(master);source.start(at);source.stop(at+0.15);
    const tone=track(ctx.createOscillator()),tg=ctx.createGain();
    tone.type='triangle';tone.frequency.value=185;tg.gain.setValueAtTime(0.035,at);tg.gain.exponentialRampToValueAtTime(0.001,at+0.09);
    tone.connect(tg);tg.connect(master);tone.start(at);tone.stop(at+0.1);
  }
  function playHat(at,amount){
    const source=track(noiseSource()),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    filter.type='highpass';filter.frequency.value=7200;
    gain.gain.setValueAtTime(amount||0.018,at);gain.gain.exponentialRampToValueAtTime(0.001,at+0.055);
    source.connect(filter);filter.connect(gain);gain.connect(master);source.start(at);source.stop(at+0.07);
  }
  function playChord(at,index){
    const chords=[
      [130.81,164.81,196.00,246.94,293.66],
      [146.83,174.61,220.00,261.63,329.63],
      [98.00,123.47,146.83,174.61,220.00],
      [130.81,164.81,196.00,246.94,293.66]
    ];
    chords[index%chords.length].forEach((frequency,i)=>{
      const oscillator=track(ctx.createOscillator()),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
      oscillator.type=i<2?'triangle':'sine';oscillator.frequency.value=frequency;
      filter.type='lowpass';filter.frequency.value=1050;filter.Q.value=0.45;
      const level=i===0?0.052:0.024;
      gain.gain.setValueAtTime(0.001,at);gain.gain.linearRampToValueAtTime(level,at+0.045);gain.gain.setTargetAtTime(0.001,at+1.45,0.34);
      oscillator.connect(filter);filter.connect(gain);gain.connect(master);oscillator.start(at);oscillator.stop(at+3.1);
    });
  }
  function playBass(at,frequency){
    const oscillator=track(ctx.createOscillator()),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    oscillator.type='triangle';oscillator.frequency.value=frequency;filter.type='lowpass';filter.frequency.value=240;
    gain.gain.setValueAtTime(0.001,at);gain.gain.linearRampToValueAtTime(0.065,at+0.025);gain.gain.exponentialRampToValueAtTime(0.001,at+0.42);
    oscillator.connect(filter);filter.connect(gain);gain.connect(master);oscillator.start(at);oscillator.stop(at+0.45);
  }
  function playMelody(at,frequency){
    if(!frequency)return;
    const oscillator=track(ctx.createOscillator()),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    oscillator.type='triangle';oscillator.frequency.value=frequency;filter.type='lowpass';filter.frequency.value=1700;
    gain.gain.setValueAtTime(0.001,at);gain.gain.linearRampToValueAtTime(0.026,at+0.012);gain.gain.exponentialRampToValueAtTime(0.001,at+0.3);
    oscillator.connect(filter);filter.connect(gain);gain.connect(master);oscillator.start(at);oscillator.stop(at+0.32);
  }
  function makeLofi(){
    beat=0;nextBeat=ctx.currentTime+0.08;
    const beatSeconds=60/76,tickSeconds=beatSeconds/2;
    const melody=[523.25,null,659.25,null,587.33,null,493.88,null,440,null,523.25,null,392,null,440,null,523.25,null,587.33,null,659.25,null,587.33,null,493.88,null,440,null,392,null,440,null];
    const bass=[65.41,73.42,49.00,65.41];
    const schedule=function(){
      while(nextBeat<ctx.currentTime+0.18){
        const step=beat%32,bar=Math.floor(step/8),within=step%8;
        const swing=within%2===1?0.035:0;
        const at=nextBeat+swing;
        if(within===0)playChord(at,bar);
        if(within===0||within===4)playKick(at);
        if(within===2||within===6)playSnare(at);
        if(within%2===1)playHat(at,within===7?0.012:0.017);
        if(within===0||within===4)playBass(at,bass[bar]);
        playMelody(at,melody[step]);
        nextBeat+=tickSeconds;beat++;
      }
    };
    schedule();scheduler=window.setInterval(schedule,60);
  }
  function buildSound(){
    if(selected==='gamma'){
      addNoise('lowpass',850,0.035);
      addTone(220,-1,0.028);addTone(260,1,0.028);
    }else if(selected==='white'){
      addNoise('lowpass',11000,0.22);
    }else if(selected==='rain'){
      addNoise('lowpass',1200,0.24,0.5);
      addNoise('highpass',2600,0.075,0.4);
    }else if(selected==='cafe'){
      addNoise('lowpass',420,0.22,0.7);
      addNoise('bandpass',780,0.055,0.8);
    }else if(selected==='lofi'){
      makeLofi();
    }
    const now=ctx.currentTime;
    master.gain.cancelScheduledValues(now);master.gain.setValueAtTime(0,now);
    master.gain.linearRampToValueAtTime(volume,now+0.35);
  }
  function stopLayers(){
    runId++;
    const id=runId;
    if(scheduler){window.clearInterval(scheduler);scheduler=0;}
    if(ctx&&master){
      const now=ctx.currentTime;
      master.gain.cancelScheduledValues(now);master.gain.setTargetAtTime(0,now,0.035);
    }
    window.setTimeout(()=>{
      if(id!==runId)return;
      nodes.forEach(node=>{try{node.stop();}catch(_){}});
      nodes=[];
    },140);
  }
  async function startSound(){
    try{
      await ensureAudio();
      stopLayers();
      running=true;paint();
      window.setTimeout(()=>{if(running)buildSound();},150);
    }catch(_){
      running=false;status.textContent='audio unavailable';
      note.textContent='This browser could not start audio. Try refreshing or another browser.';
      paint();
    }
  }
  card.querySelectorAll('[data-study-sound]').forEach(button=>button.addEventListener('click',()=>{
    selected=button.dataset.studySound;save();paint();
    if(running)startSound();
  }));
  toggle.addEventListener('click',()=>{
    if(running){running=false;stopLayers();paint();}
    else startSound();
  });
  slider.addEventListener('input',()=>{
    volume=Number(slider.value);save();
    if(running&&ctx&&master){
      const now=ctx.currentTime;master.gain.cancelScheduledValues(now);master.gain.setTargetAtTime(volume,now,0.05);
    }
  });
  paint();
})();