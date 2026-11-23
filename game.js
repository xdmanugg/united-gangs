(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d', { alpha: false });
  const STEP = 1 / 60, TAU = Math.PI * 2;
  const COP_BASE=102, COP_PER_STAR=20;
  const LIME = '#76f0d2', ORANGE = '#ffabcf', CYAN = '#9ed2ff', RED = '#ff798e';
  const CAR_TYPES = {
    compact:{name:'Compacto',top:262,reverse:110,accel:188,steer:2.65,grip:15.4,radius:13},
    sedan:{name:'Berlina',top:288,reverse:113,accel:168,steer:2.4,grip:12.8,radius:14},
    sport:{name:'Deportivo',top:335,reverse:119,accel:215,steer:2.36,grip:10.8,radius:14},
    van:{name:'Furgoneta',top:236,reverse:92,accel:136,steer:1.94,grip:15,radius:16},
  };
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const nearest = (list,n) => list.reduce((best,next,i) => Math.abs(next-n) < Math.abs(list[best]-n) ? i : best,0);
  const rnd = seed => () => ((seed = (Math.imul(1664525,seed) + 1013904223) >>> 0)/4294967296);
  const angleDiff = (a,b) => Math.atan2(Math.sin(b-a),Math.cos(b-a));
  const fmt = new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const chapters=window.UnitedCampaign, FINAL_COUNT=chapters.reduce((n,c)=>n+Object.keys(c.jobs).length,0);
  const terrain=document.createElement('canvas'), world=terrain.getContext('2d',{alpha:false});
  const mapArt=new Image();
  let chapterIndex=0, config, W, H, X, Y, ALLEY, DOCK, PHONE, GARAGE, GARAGE_GOAL, JOB_SPAWN, contracts, JOBS;
  let nodes=[], avenueNodes=[], links=[], blocks=[], collisionTiles=new Map();
  const chapterDone=()=>JOBS.reduce((n,[id])=>n+Number(game.completed.has(id)),0);
  const rect=(o,x,y,w,h,fill)=>{o.fillStyle=fill;o.fillRect(x,y,w,h);};
  function glow(o,x,y,radius,rgb,opacity){
    const g=o.createRadialGradient(x,y,0,x,y,radius);
    g.addColorStop(0,`rgba(${rgb},${opacity})`);g.addColorStop(.4,`rgba(${rgb},${opacity*.56})`);g.addColorStop(1,`rgba(${rgb},0)`);
    rect(o,x-radius,y-radius,radius*2,radius*2,g);
  }
  function loadChapter(index,keep=true){
    const old=keep?game:null;
    chapterIndex=index;config=chapters[index];W=config.w;H=config.h;X=config.x;Y=config.y;
    contracts=config.jobs;JOBS=Object.entries(contracts);JOB_SPAWN=config.spawn;
    ALLEY=index===0?{x:325,from:Y[0],to:Y[1]}:null;
    DOCK=index===0?{y:1170,from:X[4],to:X[5],gates:[1635,1894]}:null;
    PHONE={p:{x:X[1]-39,y:Y[1]+19,color:LIME,name:'Los Pistones'},m:{x:X[X.length-2]+37,y:Y[Math.floor(Y.length/2)]-18,color:ORANGE,name:'La Marea'}};
    GARAGE={x:X[2]-40,y:Y[3]-23,color:CYAN};
    GARAGE_GOAL={...GARAGE,text:'Garaje',name:'Garaje'};
    terrain.width=W;terrain.height=H;
    bakeCity();buildStreets();
    game=fresh();
    if(old){
      for(const k of ['cash','rep','trust','gift','completed','missionDone','won'])game[k]=old[k];
      if(game.gift==='p')awardSport();
    }
    document.documentElement.dataset.city=config.style;
    staticMap=mapBase();
    $('mini').setAttribute('viewBox',`0 0 ${W} ${H}`);
    $('mini').innerHTML=staticMap+'<g id="mini-live"></g>';
    paintDirty=true;
  }
  function bakeCity(){
    const city=window.UnitedCity(world,config,mapArt,{alley:ALLEY,dock:DOCK});
    blocks=city.blocks;collisionTiles=new Map();
    for(const s of city.solids)for(let y=Math.floor(s.y/128);y<=Math.floor((s.y+s.h)/128);y++){
      for(let x=Math.floor(s.x/128);x<=Math.floor((s.x+s.w)/128);x++){
        const k=y*64+x;
        if(!collisionTiles.has(k))collisionTiles.set(k,[]);
        collisionTiles.get(k).push(s);
      }
    }
  }

  const palettes=['#75ebd1','#c9b7b5','#9ba5b9','#a95975','#568b91','#a797bc','#c78972','#7c889c'];
  const makeCar=(x,y,a,color,extra={})=>({x,y,a,color,s:0,vx:0,vy:0,hp:100,kind:'parked',type:extra.van?'van':'sedan',...extra});
  let game, phase='title', dialog=null, lastFocus=null, muted=true, best=0, selected=true, virtual=false, paintDirty=true;
  let width=1,height=1,dpr=1,viewScale=1,camera={x:0,y:0};
  let audio=null,bus=null,engine=null,engineGain=null,nextBeat=0,beat=0;
  const keys=new Set(), touches=new Map();
  function driveLink(xi,yi,rx,ry){
    return rx>=0&&rx<X.length&&ry>=0&&ry<Y.length&&
      (yi!==ry||config.canal==null||Math.min(xi,rx)!==config.canal||config.bridges.includes(yi));
  }
  function fresh(){
    const roll=rnd(config.seed+715),[x,y,cx,cy,a=0]=JOB_SPAWN;
    const cars=[makeCar(cx,cy,a,LIME,{starter:true,id:'starter',type:'compact'})];
    for(let yi=0;yi<Y.length;yi++)for(let xi=0;xi<X.length;xi++){
      if((yi*3+xi)%3!==0||yi===1&&xi===1)continue;
      const xx=(xi===X.length-1||!driveLink(xi,yi,xi+1,yi))?X[xi]-82:X[xi]+87;
      if(hits(xx,Y[yi]+35,17))continue;
      const van=(xi+yi)%5===0;
      cars.push(makeCar(xx,Y[yi]+35,xi===X.length-1?Math.PI:0,palettes[1+Math.floor(roll()*7)],{id:`p${yi}-${xi}`,van,type:van?'van':(xi+yi)%4===0?'sport':(xi+yi)%3===0?'compact':'sedan'}));
    }
    for(let i=0;i<31+chapterIndex*2;i++){
      const xi=(i*5+(i/X.length|0))%X.length,yi=(Math.floor(i/X.length)*2+i)%Y.length;
      const target=i%3!==0&&driveLink(xi,yi,xi+1,yi)?{xi:xi+1,yi}:{xi,yi:yi<Y.length-1?yi+1:yi-1};
      const a=Math.atan2(Y[target.yi]-Y[yi],X[target.xi]-X[xi]), f=.25+roll()*.5;
      const dx=Math.cos(a),dy=Math.sin(a);
      cars.push(makeCar(X[xi]+(X[target.xi]-X[xi])*f-dy*23,Y[yi]+(Y[target.yi]-Y[yi])*f+dx*23,a,palettes[1+Math.floor(roll()*7)],{id:'t'+i,kind:'traffic',node:target,previous:{xi,yi},fraction:f,pace:67+roll()*42,van:i%6===0}));
    }
    const people=Array.from({length:53},(_,i)=>{
      const xi=i%X.length,side=config.canal===xi?-1:config.canal===xi-1?1:i%2?1:-1;
      return {x:X[xi]+side*53,y:75+roll()*(H-150),origin:0,a:i%2?Math.PI/2:-Math.PI/2,color:['#dfa975','#c4a9d9','#ec89a4','#91c9d6','#af8280'][i%5],pace:18+roll()*12,range:33+roll()*67};
    });
    for(const p of people)p.origin=p.y;
    return {player:{x,y,a:-Math.PI/2,hp:100,car:null},cars,people,police:[],particles:[],marks:[],time:0,cash:0,heat:0,quiet:0,spawn:0,block:null,blockAt:0,
      rep:{p:0,m:0},trust:{p:0,m:0},gift:null,waypoint:false,mission:null,completed:new Set(),missionDone:0,lastReport:null,failed:null,won:false,msg:'',msgUntil:0,hitAt:-2,shake:0,lastSkid:0,safeUntil:0,nav:null,seed:roll};
  }
  function player(){return game.player.car || game.player}
  function hits(x,y,r){
    if(x<r+9||x>(config.coast??W)-8-r||y<r+8||y>H-r-8)return true;
    const canal=config.canal;
    if(canal!=null&&x+r>X[canal]+53&&x-r<X[canal+1]-53&&!config.bridges.some(i=>Math.abs(y-Y[i])<47-r))return true;
    if(DOCK&&!dockOpen()&&Math.abs(y-DOCK.y)<28+r&&DOCK.gates.some(g=>Math.abs(x-g)<3+r))return true;
    for(let yi=Math.floor((y-r)/128);yi<=Math.floor((y+r)/128);yi++)for(let xi=Math.floor((x-r)/128);xi<=Math.floor((x+r)/128);xi++){
      for(const q of collisionTiles.get(yi*64+xi)||[]){
        if(x<q.x-r||x>q.x+q.w+r||y<q.y-r||y>q.y+q.h+r)continue;
        const dx=x-clamp(x,q.x,q.x+q.w),dy=y-clamp(y,q.y,q.y+q.h);
        if(dx*dx+dy*dy<r*r)return true;
      }
    }
    return false;
  }
  function trace(x,y,tx,ty,r){
    const n=Math.ceil(Math.hypot(tx-x,ty-y)/24);
    for(let i=1;i<=n;i++){const f=i/n;if(hits(x+(tx-x)*f,y+(ty-y)*f,r))return false;}
    return true;
  }
  function move(obj,dx,dy,r){
    let along=false,across=false;
    if(!hits(obj.x+dx,obj.y,r)){obj.x+=dx;}else along=true;
    if(!hits(obj.x,obj.y+dy,r)){obj.y+=dy;}else across=true;
    return along||across;
  }
  function resize(){
    const b=$('stage').getBoundingClientRect();
    width=Math.max(1,b.width);height=Math.max(1,b.height);dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    viewScale=width<520? Math.max(.69,Math.min(.84,width/455)) : Math.min(1.2,Math.max(.91,width/830));
    paintDirty=true;render();
  }
  new ResizeObserver(resize).observe($('stage'));

  // Original music and effects: a quiet four-bar synth loop and reactive motor.
  function readyAudio(){
    if(muted)return;
    try{
      if(!audio){
        audio=new (window.AudioContext||window.webkitAudioContext)();
        bus=audio.createGain();bus.gain.value=.34;bus.connect(audio.destination);
        engine=audio.createOscillator();engine.type='triangle';engine.frequency.value=37;
        engineGain=audio.createGain();engineGain.gain.value=0;
        const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=135;
        engine.connect(filter).connect(engineGain).connect(bus);engine.start();
      }
      if(audio.state!=='running')audio.resume().catch(()=>{});
      nextBeat=audio.currentTime+.04;
    }catch{audio=null;}
  }
  function tone(freq,len,type,volume,at,end){
    if(muted||!audio||!bus)return;
    at=at??audio.currentTime;
    const osc=audio.createOscillator(), g=audio.createGain();osc.type=type;
    osc.frequency.setValueAtTime(freq,at); if(end)osc.frequency.exponentialRampToValueAtTime(end,at+len);
    g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(volume,at+.013);g.gain.exponentialRampToValueAtTime(.0001,at+len);
    osc.connect(g).connect(bus);osc.start(at);osc.stop(at+len+.02);
  }
  function effect(name){
    if(!audio||muted)return;
    const t=audio.currentTime;
    const tones={
      open:[[220,.14,'triangle',.19,0,96]], hit:[[73,.25,'sawtooth',.21,0,27]], alert:[[560,.19,'triangle',.16,0,760],[440,.26,'triangle',.13,.18,335]],
      job:[[246,.12,'square',.09,0],[329,.16,'square',.08,.105],[440,.22,'triangle',.12,.21]],
      pass:[[330,.11,'triangle',.16,0],[494,.19,'triangle',.13,.11]], loss:[[164,.18,'triangle',.18,0],[123,.22,'triangle',.15,.19],[82,.47,'triangle',.16,.35]],
      win:[[262,.21,'triangle',.22,0],[330,.23,'triangle',.18,.12],[392,.26,'triangle',.19,.24],[523,.65,'triangle',.18,.36]]
    };
    for(const [f,d,type,v,delay,end] of tones[name]||[])tone(f,d,type,v,t+delay,end);
  }
  function music(){
    if(!audio||muted||audio.state!=='running')return;
    const t=audio.currentTime, car=phase==='play'&&!dialog?game.player.car:null;
    engineGain.gain.setTargetAtTime(car?.s ? .06+Math.min(.12,Math.abs(car.s)/1900):0,t,.06);
    if(car)engine.frequency.setTargetAtTime(28+Math.abs(car.s)*.16,t,.05);
    if(dialog||phase==='end'||phase==='win'){nextBeat=t+.04;return;}
    if(nextBeat<t-.3)nextBeat=t+.035;
    while(nextBeat<t+.075){
      const i=beat%16, root=[55,49,58.27,46.25][Math.floor(beat/16)%4];
      if([0,3,6,8,10,13].includes(i))tone(root*(i===6||i===13?2:1),.25,'triangle',.18,nextBeat);
      if([0,4,8,12].includes(i))tone(94,.16,'sine',.30,nextBeat,34);
      if(i%2===1)tone(2100,.037,'triangle',.029,nextBeat,630);
      if(i===2||i===10){tone(root*4,.23,'sine',.07,nextBeat);tone(root*6,.26,'sine',.051,nextBeat);}
      beat++;nextBeat+=.145;
    }
  }
  function toggleSound(){
    muted=!muted;
    $('sound').setAttribute('aria-pressed',String(!muted));
    const tag=muted?'Activar sonido':'Silenciar';
    $('sound').setAttribute('aria-label',tag);$('sound').title=tag+' (V)';
    $('sound').querySelector('use').setAttribute('href',muted?'#i-mute':'#i-sound');
    if(muted&&audio)audio.suspend().catch(()=>{});else readyAudio();
  }

  function notify(msg,seconds=3.4){game.msg=msg;game.msgUntil=game.time+seconds;paintDirty=true;}
  function raise(n){
    const old=game.heat;
    game.heat=clamp(Math.max(n,game.heat),0,3);game.quiet=0;
    if(game.heat>old){notify('Alerta policial: '+game.heat+' / 3');effect('alert');}
    game.spawn=Math.min(game.spawn,.35);
  }
  function sparks(x,y,color,n=11){if(reduced.matches)n=Math.min(4,n);for(let j=0;j<n;j++){const a=Math.random()*TAU,speed=23+Math.random()*133;game.particles.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,ttl:.26+Math.random()*.27,color});}}
  function damage(amount){
    if(game.time-game.hitAt<.5||game.time<game.safeUntil)return;
    game.hitAt=game.time;
    const o=player();o.hp=clamp(o.hp-amount,0,100);
    game.shake=.19;sparks(o.x,o.y,'#ffd17c',12);effect('hit');
    if(o.hp<=0)finish(false,game.player.car?'El coche ha quedado fuera de servicio.':'Te han atrapado en el distrito.');
  }
  function dockOpen(){return !!DOCK&&game?.gift==='m';}
  function nearestPhone(p=player()){return dist(p,PHONE.p)<=dist(p,PHONE.m)?PHONE.p:PHONE.m;}
  function activeGoal(){
    const m=game.mission;
    if(m){
      const goal=m.job.steps[m.idx];
      if(goal.choice)return nearestPhone();
      if(goal.van&&m.van)return {...goal,x:m.van.x,y:m.van.y};
      if(goal.escort&&m.ally&&dist(m.ally.car,player())>205)return {...m.ally.car,text:'Vuelve con el convoy C'};
      return goal;
    }
    return null;
  }
  function guideGoal(){return game.waypoint?GARAGE_GOAL:activeGoal();}
  function guideColor(goal=guideGoal()){return goal===GARAGE_GOAL?CYAN:goal===PHONE.m||game.mission?.side==='m'?ORANGE:game.mission?.side==='x'&&goal!==PHONE.p?CYAN:LIME;}
  function clearPursuit(){
    game.heat=0;game.police=[];game.block=null;game.blockAt=game.spawn=game.quiet=0;
  }
  function startJob(id){
    if(!Object.hasOwn(contracts,id)||game.completed.has(id)||game.won)return;
    const job=contracts[id],side=job.side,[x,y,cx,cy,a=0]=job.spawn||JOB_SPAWN;
    if(game.player.car)game.player.car.s=game.player.car.vx=game.player.car.vy=0;
    game.cars=game.cars.filter(c=>!c.job&&c.kind!=='ally');
    const starter=game.cars.find(c=>c.starter);
    Object.assign(starter,{x:cx,y:cy,a,s:0,vx:0,vy:0,hp:100});
    game.player={x,y,a:-Math.PI/2,hp:100,car:null};
    clearPursuit();
    game.waypoint=false;game.nav=null;game.shake=0;game.particles.length=0;
    game.safeUntil=game.time+.85;
    const m={id,side,job,idx:0,deadline:0,pendingTimer:!!job.time,van:null,ally:null,hold:0};
    game.mission=m;game.failed=null;game.lastReport=null;
    const parking=job.steps.find(s=>s.van);
    if(parking){
      m.van=makeCar(parking.x,parking.y,0,ORANGE,{van:true,job:true,id:'furgoneta'});
      game.cars.push(m.van);
    }
    const greeting=(side==='p'||side==='m')&&game.trust[side]<0?`Radio: «Aún tenemos cuentas pendientes. ${job.name}, y luego hablamos».`:job.intro;
    notify(greeting,6);readyAudio();effect('job');
    phase='play';closeDialog(false);$('stage').focus({preventScroll:true});
  }
  function cancelJob(reason){
    if(!game.mission)return;
    game.failed=game.mission.id;
    game.lastReport={title:reason,detail:'Tu progreso se conserva. Puedes repetir la misión o elegir otra.',style:'retry'};
    game.mission=null;game.waypoint=false;game.cars=game.cars.filter(c=>c.kind!=='ally');clearPursuit();effect('loss');showBoard();
  }
  function awardSport(){
    const [,,x,y]=JOB_SPAWN;
    if(!game.cars.some(c=>c.reward))game.cars.push(makeCar(x,y-65,0,LIME,{type:'sport',id:'regalo-p',reward:true,claimed:true}));
  }
  function handoff(side){
    const m=game.mission;
    if(!m?.job.steps[m.idx].choice)return false;
    if(game.player.car!==m.van){notify('Vuelve con la furgoneta marcada para hacer el trato.');return true;}
    game.gift=side;
    game.trust[side]=clamp(game.trust[side]+2,-2,4);
    const rival=side==='p'?'m':'p';
    game.trust[rival]=clamp(game.trust[rival]-3,-2,4);
    if(side==='p')awardSport();
    m.van.hp=100;
    endJob();
    return true;
  }
  function endJob(){
    const m=game.mission;game.cash+=m.job.pay;game.completed.add(m.id);game.missionDone=game.completed.size;
    game.mission=null;game.waypoint=false;clearPursuit();
    const p=player();sparks(p.x,p.y,LIME,26);
    if(m.side==='p'||m.side==='m'){
      game.rep[m.side]++;
      game.trust[m.side]=clamp(game.trust[m.side]+(game.trust[m.side]<0?2:1),-2,4);
    }
    const reward=m.side==='x'?(game.gift==='p'?' · Deportivo en El Cruce':' · Atajo de los muelles abierto'):'';
    game.lastReport={title:'Misión completada',detail:`${m.job.name} · +${fmt(m.job.pay)} CR${reward}`,style:'success'};
    if(game.missionDone===FINAL_COUNT){
      game.won=true;notify('La fiesta ya está en marcha. Miami queda abierta.',5);finish(true);return;
    }
    if(chapterDone()===JOBS.length){best=Math.max(best,game.cash);effect('win');showChapter();return;}
    effect('win');showBoard();
  }
  function correctCar(m){
    return !!game.player.car&&(!m.van||!m.job.steps.slice(0,m.idx).some(s=>s.van)||game.player.car===m.van);
  }
  function escortStep(m,goal,dt){
    const p=player();
    if(!m.ally){
      const from=m.job.steps[m.idx-1];
      const route=streetRoute(from,goal,true);
      if(!route?.points.length)return false;
      const a=makeCar(from.x,from.y,0,'#ffbf83',{type:'van',van:true,kind:'ally',id:'convoy'});
      m.ally={car:a,route:route.points,index:1};game.cars.push(a);
    }
    const a=m.ally,car=a.car;
    if(dist(car,p)>205||!game.player.car)return false;
    const t=a.route[a.index];
    if(!t)return dist(goal,p)<132;
    const d=dist(t,car),step=dt*125;
    if(d<=step){car.x=t.x;car.y=t.y;a.index++;}
    else{car.a=Math.atan2(t.y-car.y,t.x-car.x);car.x+=Math.cos(car.a)*step;car.y+=Math.sin(car.a)*step;}
    return a.index===a.route.length&&dist(goal,p)<132;
  }
  function stepJob(dt){
    const m=game.mission;if(!m)return;
    if(m.deadline&&game.time>m.deadline){cancelJob('Se acabó el tiempo');return;}
    const goal=m.job.steps[m.idx], car=game.player.car;
    if(m.pendingTimer&&car&&(!m.job.steps[0].van||car===m.van)){
      m.pendingTimer=false;m.deadline=game.time+m.job.time;
      if(m.job.alert){raise(m.job.alert);game.spawn=2.8;}
      notify(`Cuenta atrás: ${m.job.time} s. ${goal.text}`,4);updateUI();
    }
    if(goal.choice)return;
    if(goal.escort){if(escortStep(m,goal,dt))advanceGoal(goal);return;}
    if(!correctCar(m)||(goal.van&&car!==m.van)){m.hold=0;return;}
    const range=goal.action||goal.stop?61:49;
    if(!goal.van&&dist(player(),goal)>range){m.hold=0;return;}
    if(goal.action)return;
    if(goal.stop){
      if(Math.abs(car.s)>13){m.hold=0;return;}
      m.hold+=dt;if(m.hold<goal.stop)return;
    }
    advanceGoal(goal);
  }
  function advanceGoal(goal){
    const m=game.mission;
    if(goal.alert)raise(goal.alert);
    if(goal.time)m.deadline=game.time+goal.time;
    if(m.ally){game.cars=game.cars.filter(c=>c!==m.ally.car);m.ally=null;}
    m.hold=0;
    m.idx++;effect('pass');
    if(m.idx>=m.job.steps.length){endJob();return;}
    const next=m.job.steps[m.idx];
    notify(next.choice?'Elige P por el deportivo o M por el atajo.':next.escort?'Mantente cerca del vehículo marcado con C.':next.text);updateUI();
  }
  function interactable(){
    const me=player(),m=game.mission,goal=m?.job.steps[m.idx];
    if(goal?.action&&dist(me,goal)<=61&&correctCar(m)&&Math.abs(me.s)<39)return {type:'contact',name:'Confirmar objetivo'};
    for(const [side,phone] of Object.entries(PHONE)){
      if(goal?.choice&&dist(me,phone)<50&&(!game.player.car||Math.abs(me.s)<39)){
        return {type:'phone',side,name:`Entregar a ${phone.name}`};
      }
    }
    if(dist(me,GARAGE)<54&&(game.heat>0||me.hp<100||game.player.hp<100))return {type:'garage',name:'Usar el garaje'};
    if(game.player.car)return {type:'exit',name:'Bajar del coche'};
    if(m?.van&&dist(m.van,me)<43&&(goal?.van||m.job.steps.slice(0,m.idx).some(s=>s.van)))return {type:'enter',car:m.van,name:'Subir a la furgoneta'};
    let bestDist=43,car=null;
    for(const c of game.cars){if(c.kind==='traffic'||c.kind==='ally')continue;const d=dist(c,me);if(d<bestDist){bestDist=d;car=c;}}
    if(car)return {type:'enter',car,name:car.van?'Subir a la furgoneta':car.type==='sport'?'Subir al deportivo':'Subir al coche'};
    return null;
  }
  function interact(){
    if(phase!=='play'||dialog)return;
    const target=interactable();if(!target)return;
    const p=game.player;
    if(target.type==='garage'){
      const o=player();if(o.s!==undefined&&Math.abs(o.s)>38){notify('Frena para usar el garaje.');return;}
      o.hp=100;p.hp=100;game.heat=0;game.police=[];game.block=null;game.waypoint=false;game.safeUntil=game.time+2;
      effect('job');notify('Garaje: reparación completa y alerta a cero.');
    }else if(target.type==='phone'){
      handoff(target.side);
    }else if(target.type==='contact'){
      advanceGoal(game.mission.job.steps[game.mission.idx]);return;
    }
    else if(target.type==='exit'){
      const c=p.car;
      if(Math.abs(c.s)>72){notify('Frena antes de bajar.');return;}
      let spot=null;
      for(const a of [c.a+Math.PI/2,c.a-Math.PI/2,c.a+Math.PI,c.a]){
        const x=c.x+Math.cos(a)*29,y=c.y+Math.sin(a)*29;
        if(!hits(x,y,8)&&!hits((x+c.x)/2,(y+c.y)/2,7)){spot={x,y,a};break;}
      }
      if(!spot){notify('No hay espacio para bajar.');return;}
      Object.assign(p,spot,{car:null});c.s=c.vx=c.vy=0;effect('open');
    }else{
      const c=target.car;p.car=c;c.s=c.vx=c.vy=0;effect('open');
      if(!c.starter&&!c.claimed&&!c.job)raise(1);
      c.claimed=true;
      if(c.reward)notify('Deportivo de Los Pistones · mayor velocidad, menos agarre.');
    }
    game.nav=null;updateUI();
  }

  const down=(a,b)=>keys.has(a)||(b&&keys.has(b))||[...touches.values()].some(k=>k===a||k===b);
  function movement(dt){
    const u=down('ArrowUp','KeyW'),d=down('ArrowDown','KeyS'),l=down('ArrowLeft','KeyA'),r=down('ArrowRight','KeyD');
    const p=game.player,c=p.car,hor=Number(r)-Number(l),ver=Number(d)-Number(u);
    if(!c){
      if(hor||ver){const len=Math.hypot(hor,ver);p.a=Math.atan2(ver,hor);move(p,hor/len*145*dt,ver/len*145*dt,8);}
      return;
    }
    const brake=down('Space'), spec=CAR_TYPES[c.type], {top,accel,radius:rad}=spec;
    if(u&&!d)c.s+=dt*(c.s<0?330:accel);
    else if(d&&!u)c.s-=dt*(c.s>0?327:accel*.75);
    else c.s*=Math.pow(.61,dt);
    if(brake)c.s*=Math.pow(.15,dt);
    c.s=clamp(c.s,-spec.reverse,top);if(Math.abs(c.s)<1)c.s=0;
    c.a+=hor*(c.s<0?-1:1)*(spec.steer+(brake?.68:0))*clamp(Math.abs(c.s)/48,0,1)*dt;
    const grip=Math.min(1,dt*(brake?4.9:spec.grip));
    c.vx+=(Math.cos(c.a)*c.s-c.vx)*grip;c.vy+=(Math.sin(c.a)*c.s-c.vy)*grip;
    const beforeX=c.x,beforeY=c.y;
    let crash=move(c,c.vx*dt,c.vy*dt,rad);
    if(roadblockHit(c,rad)){
      c.x=beforeX;c.y=beforeY;crash=true;
      if(Math.abs(c.s)>90&&game.time-game.hitAt>.5)notify('Barricada policial. Busca otra calle.',2.4);
    }
    if(crash){const v=Math.hypot(c.vx,c.vy);c.s*=-.23;c.vx*=.12;c.vy*=.12;if(v>66)damage(Math.min(27,v/10));}
    for(const other of game.cars){
      if(other===c||other.kind==='ally')continue;
      const dx=c.x-other.x,dy=c.y-other.y,limit=rad+(other.van?15:13);
      if(Math.abs(dx)>limit||Math.abs(dy)>limit)continue;
      const gap=Math.hypot(dx,dy);
      if(gap<limit&&gap>.05){
        move(c,dx/gap*(limit-gap)*.72,dy/gap*(limit-gap)*.72,rad);
        if(Math.abs(c.s)>76)damage(Math.min(22,Math.abs(c.s)/16));
        c.s*=.80;c.vx*=.80;c.vy*=.80;
      }
    }
    if(brake&&Math.abs(c.s)>52&&game.time-game.lastSkid>.054){
      game.lastSkid=game.time;
      if(game.marks.length>105)game.marks.shift();
      game.marks.push({x:c.x,y:c.y,a:c.a});
    }
  }
  function traffic(dt){
    for(const c of game.cars){
      if(c.kind!=='traffic')continue;
      const f=c.previous,n=c.node, dx=X[n.xi]-X[f.xi],dy=Y[n.yi]-Y[f.yi],len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len;
      c.fraction+=dt*c.pace/len;
      if(c.fraction>=1){
        const options=[[1,0],[0,1],[-1,0],[0,-1]].map(([x,y])=>({xi:n.xi+x,yi:n.yi+y})).filter(q=>driveLink(n.xi,n.yi,q.xi,q.yi)&&!(q.xi===f.xi&&q.yi===f.yi));
        c.previous=n;c.node=options[Math.floor(game.seed()*options.length)]||f;c.fraction=0;
        continue;
      }
      const near=clamp(Math.min(c.fraction,1-c.fraction)*len/29,0,1);
      c.a=Math.atan2(dy,dx);
      c.x=X[f.xi]+dx*c.fraction-uy*23*near;c.y=Y[f.yi]+dy*c.fraction+ux*23*near;
    }
    for(const p of game.people){
      p.y+=Math.sin(p.a)*p.pace*dt;
      if(p.y<p.origin-p.range||p.y>p.origin+p.range||p.y<24||p.y>H-24){p.y=clamp(p.y,Math.max(24,p.origin-p.range),Math.min(H-24,p.origin+p.range));p.a*=-1;}
    }
  }
  const gridId=(xi,yi)=>yi*X.length+xi;
  function street(a,b,tag='main'){
    const p=avenueNodes[a],q=avenueNodes[b];
    links.push({a,b,tag,dx:q.x-p.x,dy:q.y-p.y,len:dist(p,q),x:(p.x+q.x)/2,y:(p.y+q.y)/2,id:`${a}:${b}`});
  }
  function buildStreets(){
    nodes=Y.flatMap((y,yi)=>X.map((x,xi)=>({x,y,xi,yi})));
    const [A0,A1,D0,D1]=[nodes.length,nodes.length+1,nodes.length+2,nodes.length+3];
    avenueNodes=ALLEY?nodes.concat([{x:ALLEY.x,y:ALLEY.from},{x:ALLEY.x,y:ALLEY.to},{x:DOCK.from,y:DOCK.y},{x:DOCK.to,y:DOCK.y}]):nodes;
    links=[];
    for(let yi=0;yi<Y.length;yi++)for(let xi=0;xi<X.length;xi++){
      const n=gridId(xi,yi);
      if(driveLink(xi,yi,xi+1,yi)){
        if(ALLEY&&xi===0&&yi<2){const joint=yi===0?A0:A1;street(n,joint);street(joint,n+1);}
        else street(n,n+1);
      }
      if(yi<Y.length-1){
        if(DOCK&&yi===3&&(xi===4||xi===5)){const joint=xi===4?D0:D1;street(n,joint);street(joint,n+X.length);}
        else street(n,n+X.length);
      }
    }
    if(ALLEY)street(A0,A1,'alley');if(DOCK)street(D0,D1,'dock');
  }

  function roadAnchor(p,edges){
    let best,score=Infinity;
    for(const edge of edges){
      const node=avenueNodes[edge.a],t=clamp(((p.x-node.x)*edge.dx+(p.y-node.y)*edge.dy)/(edge.len*edge.len),0,1);
      const q={x:node.x+t*edge.dx,y:node.y+t*edge.dy},d=dist(p,q);
      if(d<score&&trace(p.x,p.y,q.x,q.y,3)){score=d;best={edge,t,q,d};}
    }
    if(!best){
      for(const edge of edges){
        const node=avenueNodes[edge.a],t=clamp(((p.x-node.x)*edge.dx+(p.y-node.y)*edge.dy)/(edge.len*edge.len),0,1);
        const q={x:node.x+t*edge.dx,y:node.y+t*edge.dy},d=dist(p,q);
        if(d<score){score=d;best={edge,t,q,d};}
      }
    }
    return best;
  }
  function streetRoute(from,to,ignoreBlock=false){
    if(!to)return null;
    const blocked=ignoreBlock?null:game.block?.id,open=dockOpen(),edges=links.filter(e=>(open||e.tag!=='dock')&&e.id!==blocked);
    const s=roadAnchor(from,edges),t=roadAnchor(to,edges);
    if(!s||!t)return null;
    let points=[{x:from.x,y:from.y},s.q],length;
    if(s.edge===t.edge){
      length=s.d+t.d+Math.abs(s.t-t.t)*s.edge.len;
    }else{
      const count=avenueNodes.length,known=Array(count).fill(false),cost=Array(count).fill(Infinity),prev=Array(count).fill(-1);
      const adjacency=Array.from({length:count},()=>[]);
      for(const e of edges){adjacency[e.a].push(e);adjacency[e.b].push(e);}
      cost[s.edge.a]=s.edge.len*s.t;cost[s.edge.b]=s.edge.len*(1-s.t);
      for(let i=0;i<count;i++){
        let k=-1;
        for(let j=0;j<count;j++)if(!known[j]&&(k===-1||cost[j]<cost[k]))k=j;
        if(k<0||!Number.isFinite(cost[k]))break;
        known[k]=true;
        for(const edge of adjacency[k]){
          const other=edge.a===k?edge.b:edge.b===k?edge.a:-1;
          if(other!==-1&&!known[other]&&cost[k]+edge.len<cost[other]){cost[other]=cost[k]+edge.len;prev[other]=k;}
        }
      }
      const a=cost[t.edge.a]+t.edge.len*t.t,b=cost[t.edge.b]+t.edge.len*(1-t.t);
      length=s.d+t.d+Math.min(a,b);
      if(!Number.isFinite(length))return null;
      const mid=[];for(let n=a<=b?t.edge.a:t.edge.b;n!==-1;n=prev[n])mid.unshift(avenueNodes[n]);
      points=points.concat(mid);
    }
    points.push(t.q,{x:to.x,y:to.y});
    return {points:points.filter((p,i)=>i===0||dist(p,points[i-1])>.75),length};
  }
  function navRoute(goal=guideGoal()){
    if(!goal)return null;
    const p=player(),key=`${goal.x}:${goal.y}:${game.block?.id??''}:${dockOpen()}`;
    if(game.nav?.key!==key||dist(p,game.nav.p)>32){
      game.nav={key,p:{x:p.x,y:p.y},time:game.time,path:streetRoute(p,goal)};
    }
    return game.nav.path;
  }
  function roadblockHit(p,r){
    const b=game.block;
    if(!b)return false;
    return Math.abs((b.dx?p.x-b.x:p.y-b.y))<r+7&&Math.abs((b.dx?p.y-b.y:p.x-b.x))<r+38;
  }
  function policeBlock(){
    if(game.heat<3){game.block=null;game.blockAt=0;return;}
    if(game.block){
      if(game.time>=game.block.until){game.block=null;game.blockAt=game.time+12;}
      return;
    }
    if(!game.blockAt){game.blockAt=game.time+5;return;}
    if(game.time<game.blockAt)return;
    const me=player(),guide=guideGoal();
    const candidates=links.filter(l=>l.tag==='main'&&l.len>130&&dist(l,me)>165&&dist(l,me)<520&&(!guide||dist(l,guide)>75));
    const score=l=>{
      const dx=l.x-me.x,dy=l.y-me.y,d=Math.hypot(dx,dy),dir=me.s<0?-1:1;
      return (dx*Math.cos(me.a)+dy*Math.sin(me.a))/d*dir*100-Math.abs(d-335)*.18+(guide?(dist(me,guide)-dist(l,guide))*.1:0);
    };
    candidates.sort((a,b)=>score(b)-score(a));
    if(candidates.length){
      game.block={...candidates[0],until:game.time+13};
      notify('Bloqueo policial. Revisa el desvío en el plano.',4);effect('alert');
    }else game.blockAt=game.time+5;
  }
  function chase(dt){
    const p=player();
    if(game.heat===0){
      if(game.police.length)game.police.length=0;
      return;
    }
    game.spawn-=dt;
    if(game.spawn<=0&&game.police.length<game.heat+1){
      const candidates=nodes.filter(n=>dist(n,p)>315&&dist(n,p)<640&&game.police.every(q=>dist(q,n)>90));
      const at=candidates[Math.floor(game.seed()*candidates.length)]||nodes.find(n=>dist(n,p)>410);
      if(at){
        const role=game.heat>=2&&game.police.length%2===1?'interceptor':'patrulla';
        game.police.push(makeCar(at.x,at.y,Math.atan2(p.y-at.y,p.x-at.x),'#d2ded1',{kind:'police',role,rethink:0,aim:null}));
      }
      game.spawn=game.police.length===1?1.8:3.4;
    }
    let close=false;
    for(const cop of game.police){
      const gap=dist(cop,p);
      if(gap<232)close=true;
      if(gap>1010){cop.gone=true;continue;}
      cop.rethink-=dt;
      if(cop.rethink<=0||!cop.aim||dist(cop,cop.aim)<16){
        cop.rethink=.23;
        const lead=cop.role==='interceptor'&&game.player.car&&Math.abs(p.s)>80?clamp(Math.abs(p.s)*.65,65,175):0;
        const ahead=lead?{x:clamp(p.x+Math.cos(p.a)*lead*Math.sign(p.s),55,(config.coast??W)-55),y:clamp(p.y+Math.sin(p.a)*lead*Math.sign(p.s),45,H-45)}:p;
        const aim=lead&&ahead!==p&&trace(p.x,p.y,ahead.x,ahead.y,15)?ahead:p;
        if(gap<370&&trace(cop.x,cop.y,aim.x,aim.y,15)){
          cop.aim={x:aim.x,y:aim.y};cop.path=null;
        }
        else if(config.canal!=null&&(cop.x<X[config.canal+1])!==(aim.x<X[config.canal+1])){
          if(!cop.path||dist(cop.path.end,aim)>105){
            cop.path={end:{x:aim.x,y:aim.y},points:streetRoute(cop,aim,true)?.points.slice(1)||[]};
          }
          while(cop.path.points.length&&dist(cop,cop.path.points[0])<25)cop.path.points.shift();
          cop.aim=cop.path.points[0]||aim;
          cop.rethink=.42;
        }
        else{
          const here=nodes[nearest(Y,cop.y)*X.length+nearest(X,cop.x)];
          const goal=nodes[nearest(Y,aim.y)*X.length+nearest(X,aim.x)];
          const dx=Math.sign(goal.xi-here.xi),dy=Math.sign(goal.yi-here.yi);
          const vertical=dy?nodes[(here.yi+dy)*X.length+here.xi]:null;
          const horizontal=dx?nodes[here.yi*X.length+here.xi+dx]:null;
          const next=[horizontal,vertical].filter(Boolean).sort((a,b)=>dist(a,aim)-dist(b,aim)).find(n=>trace(cop.x,cop.y,n.x,n.y,15));
          cop.aim=next||here;
        }
      }
      const aim=cop.aim;
      cop.s=0;
      if(dist(cop,aim)>4){
        const angle=Math.atan2(aim.y-cop.y,aim.x-cop.x);
        const change=angleDiff(cop.a,angle);
        cop.a+=clamp(change,-3.65*dt,3.65*dt);
        const v=(COP_BASE+game.heat*COP_PER_STAR)*(Math.abs(change)>1?.36:1);
        cop.s=v;
        if(move(cop,Math.cos(cop.a)*v*dt,Math.sin(cop.a)*v*dt,15))cop.rethink=0;
      }
      if(gap<(game.player.car?29:21)){
        const n=gap||1;
        move(p,(p.x-cop.x)/n*9,(p.y-cop.y)/n*9,game.player.car?15:8);
        if(game.player.car)p.s*=.83;
        damage(game.player.car?11+game.heat*2:14+game.heat*2);
      }
    }
    game.police=game.police.filter(c=>!c.gone);
    if(close)game.quiet=0;
    else if((game.quiet+=dt)>8.5){
      game.heat--;game.quiet=0;game.police=game.police.slice(0,game.heat);
      if(game.heat===0)notify('Has perdido a las patrullas.');
    }
  }
  function update(dt){
    if(phase!=='play'||dialog||!selected)return;
    game.time+=dt;game.shake=Math.max(0,game.shake-dt);
    movement(dt);if(phase!=='play')return;
    traffic(dt);chase(dt);if(phase!=='play')return;
    policeBlock();
    stepJob(dt);
    if(game.waypoint&&dist(player(),GARAGE)<39){game.waypoint=false;notify('Garaje: destino alcanzado.');}
    for(let i=game.particles.length-1;i>=0;i--){
      const p=game.particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.ttl-=dt;p.vx*=.94;p.vy*=.94;
      if(p.ttl<=0)game.particles.splice(i,1);
    }
    paintDirty=true;
  }

  // Camera, sprites and readable target markers.
  function path(o,points,fill){
    o.beginPath();for(let i=0;i<points.length;i++)i?o.lineTo(...points[i]):o.moveTo(...points[i]);o.closePath();o.fillStyle=fill;o.fill();
  }
  function marker(x,y,color,label,pulse=false){
    const w=2+(pulse&&!reduced.matches?Math.sin(game.time*5):0);
    ctx.fillStyle='#111a16b3';ctx.beginPath();ctx.arc(x,y,15+w,0,TAU);ctx.fill();
    ctx.lineWidth=2;ctx.strokeStyle=color;ctx.beginPath();ctx.arc(x,y,14+w,0,TAU);ctx.stroke();
    ctx.font='700 14px monospace';ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,x,y+1);
  }
  function lightSprite(rgb,strength){
    const sprite=document.createElement('canvas');sprite.width=sprite.height=64;
    glow(sprite.getContext('2d'),32,32,31,rgb,strength);
    return sprite;
  }
  const headlights=lightSprite('255,232,158',.39),taillights=lightSprite('255,97,88',.46),blueLights=lightSprite('96,168,255',.4);
  function drawCar(c){
    const isPolice=c.kind==='police',isPlayer=c===game.player.car,len=c.van?46:c.type==='sport'?42:c.type==='compact'?34:38,wide=c.van?24:21;
    ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.a);
    if(isPolice||isPlayer||c.kind==='traffic'){
      ctx.drawImage(headlights,len/2-5,-22,isPlayer?67:51,44);
      ctx.drawImage(taillights,-len/2-18,-14,24,28);
    }
    rect(ctx,-len/2+4,-wide/2+4,len,wide,'#100e20ab');
    for(const x of [-len/2+5,len/2-12])for(const y of [-wide/2-2,wide/2-3])rect(ctx,x,y,7,5,'#191d19');
    const body=[[-len/2+3,-wide/2],[len/2-5,-wide/2],[len/2,-wide/2+4],[len/2,wide/2-4],[len/2-5,wide/2],[-len/2+3,wide/2],[-len/2,wide/2-2],[-len/2,-wide/2+3]];
    path(ctx,body,c.color);
    const sheen=ctx.createLinearGradient(0,-wide/2,0,wide/2);
    sheen.addColorStop(0,'#1c153661');sheen.addColorStop(.26,'#fff2df5c');sheen.addColorStop(.55,'#ffdfff08');sheen.addColorStop(1,'#191c4282');
    path(ctx,body,sheen);
    rect(ctx,4,-wide/2-1,4,2,c.color);rect(ctx,4,wide/2-1,4,2,c.color);
    rect(ctx,-len/2+3,-wide/2+2,len-9,2,'#fff5c361');rect(ctx,-len/2+3,wide/2-3,len-9,2,'#14201970');
    if(c.van){
      rect(ctx,-len/2+5,-wide/2+4,len*.53,wide-8,'#e6d8a42e');
      rect(ctx,len/2-15,-wide/2+3,5,wide-6,'#263932');
      rect(ctx,-len/2+7,-wide/2+5,len*.45,1,'#fff8c657');
    }else{
      const glass=ctx.createLinearGradient(0,-wide/2,0,wide/2);
      glass.addColorStop(0,'#abc6db');glass.addColorStop(.32,'#536a89');glass.addColorStop(1,'#182135');
      path(ctx,[[-11,-wide/2+3],[6,-wide/2+3],[10,wide/2-3],[-10,wide/2-3]],glass);
      rect(ctx,-6,-wide/2+5,10,wide-10,isPolice?'#e0e7dc':c.color);
      path(ctx,[[-6,-wide/2+5],[4,-wide/2+5],[4,-wide/2+8],[-6,-wide/2+7]],'#fff3ec72');
      rect(ctx,10,-wide/2+5,1,wide-10,'#2a213854');
    }
    if(isPolice){
      const flash=reduced.matches||Math.floor(game.time*5)%2===0;
      ctx.drawImage(flash?taillights:blueLights,-25,flash?-27:-14,46,43);
      rect(ctx,-len/2+1,-wide/2+4,8,wide-8,'#304652');
      if(c.role==='interceptor')rect(ctx,-len/2+2,-wide/2+4,4,wide-8,'#dbb568');
      rect(ctx,-4,-7,4,6,flash?'#ff7274':'#8e4a51');rect(ctx,-4,1,4,6,flash?'#566d99':'#88c6ff');
      rect(ctx,-3,flash?-9:1,16,8,flash?'#ff6e761c':'#82b6ff21');
    }
    if(c.type==='sport'){rect(ctx,-len/2+2,-wide/2+2,3,wide-4,'#25362e');rect(ctx,len/2-8,-1,6,2,'#f8ffd387');}
    rect(ctx,len/2-2,-wide/2+3,3,4,'#fff5b2');rect(ctx,len/2-2,wide/2-7,3,4,'#fff5b2');
    rect(ctx,-len/2,-wide/2+3,2,4,'#f48b72');rect(ctx,-len/2,wide/2-7,2,4,'#f48b72');
    if(isPlayer){ctx.strokeStyle='#f5ffc0';ctx.lineWidth=1;ctx.strokeRect(-len/2-2,-wide/2-2,len+4,wide+4);}
    ctx.restore();
    if(isPlayer)path(ctx,[[c.x-5,c.y-26],[c.x+5,c.y-26],[c.x,c.y-20]],LIME);
  }
  function drawPerson(p,isPlayer=false){
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.a);
    const stride=reduced.matches?0:Math.sin(game.time*13+(isPlayer?1:p.origin))*(isPlayer&&(keys.size||touches.size)?2.5:1.2);
    rect(ctx,-6,-4,13,11,'#12181285');rect(ctx,-7+stride,-4,6,3,'#252d28');rect(ctx,-7-stride,2,6,3,'#252d28');
    path(ctx,[[-5,-6],[1,-7],[4,-4],[4,4],[1,7],[-5,6]],isPlayer?'#79f1d1':p.color);
    rect(ctx,-4,-5,4,9,'#281e437b');
    ctx.fillStyle=isPlayer?'#f6d6a6':'#d4ab87';ctx.beginPath();ctx.ellipse(3,0,4,3.6,0,0,TAU);ctx.fill();
    rect(ctx,0,-2,2,4,'#342537bd');ctx.restore();
    if(isPlayer)path(ctx,[[p.x-5,p.y-16],[p.x+5,p.y-16],[p.x,p.y-10]],LIME);
  }
  function drawStreetChanges(){
    if(DOCK){
      if(!dockOpen())for(const gx of DOCK.gates){
        rect(ctx,gx-4,DOCK.y-27,8,54,'#2e2438');rect(ctx,gx-2,DOCK.y-24,4,48,'#e3ad68');
        for(let i=-21;i<25;i+=7)rect(ctx,gx-2,DOCK.y+i,4,3,'#4c4731');
      }
      else for(const gx of DOCK.gates){rect(ctx,gx-3,DOCK.y-27,6,7,CYAN);rect(ctx,gx-3,DOCK.y+21,6,7,CYAN);}
    }
    const b=game.block;if(!b)return;
    ctx.save();ctx.translate(b.x,b.y);if(!b.dx)ctx.rotate(Math.PI/2);
    rect(ctx,-9,-41,18,82,'#402d27bb');rect(ctx,-4,-39,8,78,'#261d1c');
    for(let y=-37;y<37;y+=10)rect(ctx,-3,y,6,5,'#ec986d');
    for(const y of [-37,37]){rect(ctx,-7,y-4,14,8,'#b5423c');rect(ctx,-4,y-3,8,6,RED);}
    ctx.restore();marker(b.x,b.y,RED,'!',true);
  }
  function render(){
    if(!paintDirty||!ctx)return;
    paintDirty=false;
    const p=player(),ww=width/viewScale,wh=height/viewScale;
    const look=game.player.car?clamp(game.player.car.s*.23,-29,60):22;
    const shake=game.shake&&!reduced.matches?Math.sin(game.time*112)*game.shake*15:0;
    camera.x=clamp(p.x+Math.cos(p.a)*look-ww/2+shake,0,Math.max(0,W-ww));
    camera.y=clamp(p.y+Math.sin(p.a)*look-wh/2+shake,0,Math.max(0,H-wh));
    ctx.setTransform(dpr,0,0,dpr,0,0);rect(ctx,0,0,width,height,'#232439');
    ctx.save();ctx.scale(viewScale,viewScale);ctx.translate(-camera.x,-camera.y);
    ctx.drawImage(terrain,camera.x,camera.y,Math.min(W-camera.x,ww),Math.min(H-camera.y,wh),camera.x,camera.y,Math.min(W-camera.x,ww),Math.min(H-camera.y,wh));
    for(const m of game.marks){ctx.save();ctx.translate(m.x,m.y);ctx.rotate(m.a);rect(ctx,-14,-9,8,2,'#18201baa');rect(ctx,-14,8,8,2,'#18201baa');ctx.restore();}
    const target=guideGoal(),route=phase==='title'?null:navRoute(target);
    if(route&&route.points.length>1){
      ctx.lineJoin='round';ctx.lineCap='round';ctx.setLineDash([9,9]);ctx.beginPath();
      route.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
      ctx.strokeStyle='#1c1d35ae';ctx.lineWidth=5;ctx.stroke();ctx.strokeStyle=guideColor(target)+'b4';ctx.lineWidth=2.7;ctx.stroke();ctx.setLineDash([]);ctx.lineCap='butt';
    }
    const m=game.mission, choosing=m?.job.steps[m.idx].choice;
    if(m&&!choosing&&!m.job.steps[m.idx].van){
      const goal=m.job.steps[m.idx];marker(goal.x,goal.y,guideColor(goal),goal.action?'●':goal.stop?'Ⅱ':'+',!game.waypoint);
    }
    drawStreetChanges();
    if(!game.won){marker(PHONE.p.x,PHONE.p.y,LIME,'P',choosing||target===PHONE.p);marker(PHONE.m.x,PHONE.m.y,ORANGE,'M',choosing||target===PHONE.m);}
    marker(GARAGE.x,GARAGE.y,CYAN,'G',game.waypoint);
    const visible=o=>o.x>camera.x-40&&o.x<camera.x+ww+40&&o.y>camera.y-40&&o.y<camera.y+wh+40;
    for(const p of game.people)if(visible(p))drawPerson(p);
    for(const c of game.cars)if(c!==game.player.car&&visible(c)){
      drawCar(c);if(c.job&&m?.job.steps[m.idx].van)marker(c.x,c.y-27,ORANGE,'+',true);
      if(c.kind==='ally')marker(c.x,c.y-27,'#ffbf83','C',true);
      if(c.reward)marker(c.x,c.y-26,LIME,'D');
    }
    for(const c of game.police)if(visible(c))drawCar(c);
    if(game.player.car)drawCar(game.player.car);else drawPerson(game.player,true);
    for(const p of game.particles){ctx.globalAlpha=clamp(p.ttl*3,0,1);rect(ctx,p.x,p.y,3,2,p.color);}
    ctx.globalAlpha=1;ctx.restore();
    if(phase==='title')return;
    const goal=guideGoal();
    if(goal){
      const tx=(goal.x-camera.x)*viewScale,ty=(goal.y-camera.y)*viewScale,l=23,r=width-23,t=88,b=height-(width<=760&&game.mission?96:55);
      if(tx<l||tx>r||ty<t||ty>b){
        const x=clamp(tx,l,r),y=clamp(ty,t,b),a=Math.atan2(ty-y,tx-x);
        ctx.save();ctx.translate(x,y);ctx.rotate(a);
        ctx.fillStyle='#141e15';ctx.beginPath();ctx.arc(0,0,12,0,TAU);ctx.fill();
        path(ctx,[[7,0],[-5,6],[-3,0],[-5,-6]],guideColor(goal));ctx.restore();
      }
    }
  }

  const mapBase=()=>{
    let s=`<rect width="${W}" height="${H}" fill="#17172a"/>`;
    if(config.coast)s+=`<rect x="${config.coast}" width="${W-config.coast}" height="${H}" fill="#326272"/>`;
    if(config.canal!=null)s+=`<rect x="${X[config.canal]+53}" width="${X[config.canal+1]-X[config.canal]-106}" height="${H}" fill="${config.style==='mesa'?'#684b5d':'#2a536c'}"/>`;
    for(const q of blocks){s+=`<rect x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}" fill="${q.park?'#39545f':q.id%4===0?'#3e395c':'#33334d'}"/>`;}
    for(const e of links)if(e.tag!=='dock'){
      const p=avenueNodes[e.a];s+=`<path d="M${p.x} ${p.y}l${e.dx} ${e.dy}" stroke="${e.tag==='alley'?'#877494':'#626383'}" stroke-width="${e.tag==='alley'?12:17}"/>`;
    }
    for(const [x,y,label,color] of [[PHONE.p.x,PHONE.p.y,'P',LIME],[PHONE.m.x,PHONE.m.y,'M',ORANGE],[GARAGE.x,GARAGE.y,'G',CYAN]])s+=`<circle cx="${x}" cy="${y}" r="62" fill="#23213a" stroke="${color}" stroke-width="10"/><text x="${x}" y="${y+26}" fill="${color}" font-family="sans-serif" font-size="75" text-anchor="middle" font-weight="700">${label}</text>`;
    return s;
  };
  let staticMap='';
  function liveMap(){
    const p=player(),goal=phase==='title'?null:guideGoal(),route=navRoute(goal),b=game.block;
    const red=game.police.map(c=>`<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${c.role==='interceptor'?23:19}" fill="${RED}"/>`).join('');
    const dock=DOCK?`<path d="M${DOCK.from} ${DOCK.y}H${DOCK.to}" stroke="${dockOpen()?'#82d4c0':'#887068'}" stroke-width="14" ${dockOpen()?'':'stroke-dasharray="18 16"'}/>`:'';
    const block=b?`<path d="M${b.x-17} ${b.y-17}l34 34m0-34-34 34" stroke="${RED}" stroke-width="13"/>`:'';
    const line=route?.points.length>1?`<polyline data-gps="true" points="${route.points.map(q=>[Math.round(q.x),Math.round(q.y)].join(',')).join(' ')}" fill="none" stroke="${guideColor(goal)}" stroke-width="16" stroke-linejoin="round"/>`:'';
    const marked=goal===GARAGE_GOAL||game.mission&&!game.mission.job.steps[game.mission.idx].choice;
    const ally=game.mission?.ally?.car;
    return dock+line+red+block+(ally?`<circle cx="${ally.x}" cy="${ally.y}" r="31" fill="#ffbf83"/>`:'')+(goal&&marked?`<circle cx="${goal.x}" cy="${goal.y}" r="55" fill="none" stroke="${guideColor(goal)}" stroke-width="11"/>`:'')+`<circle cx="${p.x}" cy="${p.y}" r="36" fill="#fff0f7" stroke="#1f2139" stroke-width="9"/>`;
  }
  const set=(id,text)=>{const e=$(id);if(e.textContent!==text)e.textContent=text;};
  let uiT=0;
  function updateUI(){
    const c=game.player.car,p=player(),m=game.mission,goal=activeGoal();
    set('cash',`${fmt(game.cash)} CR`);set('condition-label',c?CAR_TYPES[c.type].name.toUpperCase():'ENERGÍA');$('integrity').value=p.hp;
    $('stars').setAttribute('aria-label',`Alerta: ${game.heat} de 3`);
    Array.from($('stars').children).forEach((star,i)=>star.classList.toggle('lit',i<game.heat));
    const district=(p.x>W*.56?2:0)+(p.y>H*.55?1:0);
    set('neighborhood',config.districts[district].toUpperCase());
    $('speed').hidden=!c;if(c)set('speed',`${Math.round(Math.abs(c.s)*.55)} KM/H`);
    const near=interactable();$('prompt').hidden=!near;
    if(near)set('prompt',`${touchMode()?'ACCIÓN':'E'} · ${near.name}`);
    $('broadcast').hidden=!game.msg||game.time>game.msgUntil;if(!$('broadcast').hidden)set('broadcast',game.msg);
    set('campaign-count',`${game.missionDone}/${FINAL_COUNT} MISIONES`);
    for(const [side,hood] of [['p','El Cruce'],['m','Viejo Muelle']]){
      const trust=game.trust[side],tag=$(side+'-rep');
      tag.dataset.rapport=trust<0?'hostile':trust>=2?'ally':'neutral';
      set(side+'-rep',trust<0?'Con recelo':trust>=2?'Aliados':trust===1?'Buena relación':hood);
    }
    $('reward').hidden=!game.gift;
    if(game.gift)set('reward-name',game.gift==='p'?'Deportivo disponible junto a la salida':'Paso privado de Puerto Umbral');
    $('mission-distance').hidden=!goal||phase==='title';
    $('mobile-goal').hidden=(!m&&!game.waypoint)||phase!=='play';
    const route=phase==='title'?null:navRoute();
    const meters=goal?Math.round(!game.waypoint&&route?route.length:dist(p,goal)):0;
    if(m){
      const seconds=m.deadline?Math.max(0,Math.ceil(m.deadline-game.time)):0;
      set('brief-title',m.job.name);
      const stage=m.job.steps[m.idx],choice=stage.choice;
      const action=touchMode()?'ACCIÓN':'E';
      const source=m.job.steps[0].van?'la furgoneta marcada':'un coche';
      let objective=stage.text;
      if(choice)objective=`P: deportivo. M: atajo. Detente junto al teléfono con la furgoneta y pulsa ${action}.`;
      else if(m.pendingTimer)objective=`Sube a ${source} para iniciar el cronómetro.`;
      else if(stage.action)objective+=` Detente y pulsa ${action}.`;
      else if(stage.stop)objective+=` Quédate parado ${Math.ceil(stage.stop)} s dentro de la marca.`;
      else if(stage.escort)objective=goal?.kind==='ally'?'Vuelve con el convoy C: se ha detenido.':`${objective} Mantente cerca del convoy C.`;
      if(!c&&!m.pendingTimer&&!stage.van)objective='Sube a un coche. '+objective;
      if(stage.stop&&m.hold>0){const remain=Math.max(1,Math.ceil(stage.stop-m.hold));objective=`Mantén el coche parado · ${remain} s`;}
      set('brief-text',objective);
      set('mission-distance',`${m.idx+1}/${m.job.steps.length} · ${choice?'P o M':meters+' m'}${m.deadline?' · '+seconds+' s':''}`);
      set('mobile-goal-progress',m.pendingTimer?'SALIDA':m.deadline?`${seconds} s`:`${m.idx+1}/${m.job.steps.length}`);
      set('mobile-goal-text',objective);
    }else{
      const title=phase==='title',remaining=JOBS.length-chapterDone();
      set('brief-title',game.won?'Ciudad libre':title?config.subtitle:remaining===0?'Capítulo completo':'Elige una misión');
      set('brief-text',game.won?'Las 25 misiones están completas. Miami sigue abierta.':title?config.story:remaining===0?'Las cinco misiones del capítulo están completas.':`Queda${remaining===1?'':'n'} ${remaining} ${remaining===1?'misión':'misiones'} en ${config.name}. Puedes hacerlas en el orden que quieras.`);
    }
    if(game.waypoint){
      set('mission-distance',`GPS · Garaje · ${Math.round(route?.length??dist(p,GARAGE))} m`);
      $('mission-distance').hidden=false;set('mobile-goal-progress','GPS');set('mobile-goal-text','Sigue la ruta azul para llegar al garaje.');
    }
    $('mini-live').innerHTML=liveMap();
  }
  const touchMode=()=>matchMedia('(pointer:coarse), (max-width:760px)').matches;
  function refreshShell(){
    $('stage').dataset.phase=phase==='title'?'title':dialog||phase;
    $('title-screen').hidden=phase!=='title';$('hud').hidden=phase==='title'||phase==='board'||phase==='chapter';
    $('touch').hidden=phase!=='play'||!!dialog;
    $('pause').disabled=phase!=='play';
    $('map-btn').disabled=phase!=='title'&&phase!=='play';
    $('pause').setAttribute('aria-pressed',String(dialog==='pause'));
    set('state-label',dialog==='pause'?'PARTIDA EN PAUSA':dialog==='map'?'PLANO DE LA CIUDAD':phase==='title'?'ESPERANDO JUGADOR':phase==='board'?'CENTRAL DE ENCARGOS':phase==='chapter'?'CAPÍTULO COMPLETO':phase==='end'?'FUERA DE SERVICIO':phase==='win'?'CAMPAÑA COMPLETA':'EN DIRECTO');
    set('start-label',game.missionDone?'CONTINUAR':'JUGAR');
    set('city-stamp',config.stamp);set('city-header',config.name);
    canvas.setAttribute('aria-label',`${config.name}, vista cenital`);
    $('mini').setAttribute('aria-label',`Mapa de ${config.name}`);
    $('chapter-list').innerHTML=chapters.map((c,i)=>{
      const done=Object.keys(c.jobs).filter(id=>game.completed.has(id)).length;
      const status=done===5?'complete':i===chapterIndex?'active':'locked';
      return `<li data-status="${status}" ${i===chapterIndex?'aria-current="step"':''}><span class="chapter-number">0${i+1}</span><span class="chapter-name">${c.name}</span><span class="chapter-score" aria-label="${done} de 5 misiones">${done}/5</span></li>`;
    }).join('');
    updateUI();paintDirty=true;render();
  }
  function clearInput(){keys.clear();touches.clear();document.querySelectorAll('.held').forEach(b=>b.classList.remove('held'));}
  function start(){
    clearInput();readyAudio();effect('job');
    if(game.won){phase='win';showDialog('win');}
    else if(chapterDone()===JOBS.length)showChapter();else showBoard();
  }
  function showBoard(){
    phase='board';game.msg='';game.waypoint=false;game.nav=null;showDialog('jobs');
  }
  function showChapter(){phase='chapter';showDialog('chapter');}
  function showDialog(kind){
    if(!dialog)lastFocus=document.activeElement;
    clearInput();dialog=kind;
    const panel=$('overlay-panel'), body=$('dialog-content'),actions=$('dialog-actions');
    panel.classList.toggle('map-dialog',kind==='map');
    panel.classList.toggle('board-dialog',kind==='jobs');
    $('close-overlay').hidden=['end','win','jobs','chapter'].includes(kind);
    const labels={jobs:[`CAPÍTULO 0${config.number} / ${config.name.toUpperCase()}`,'Elige una misión'],chapter:[`CAPÍTULO 0${config.number} · 5/5`,`${config.name} completado`],help:['MANUAL DE CALLE','Cómo jugar'],map:[`NAVEGACIÓN / ${config.name.toUpperCase()}`,'Plano de la ciudad'],pause:['TRANSMISIÓN EN PAUSA','Partida en pausa'],end:['TRANSMISIÓN INTERRUMPIDA','Fuera de servicio'],win:['CAMPAÑA COMPLETA · 25/25','United Gangs']};
    set('dialog-kicker',labels[kind][0]);set('dialog-title',labels[kind][1]);
    let buttons=[];
    if(kind==='jobs'){
      const report=game.lastReport;
      body.innerHTML=`<div class="board-progress"><span><strong>${chapterDone()}/${JOBS.length}</strong> en el capítulo</span><span>${fmt(game.cash)} CR</span></div>${report?'<div class="board-report" id="board-report" role="status"></div>':''}<div class="job-list">${JOBS.map(([id,job],i)=>{
        const done=game.completed.has(id),meta=done?'Completada':`${job.tag} · ${job.steps.length} etapas · ${fmt(job.pay)} CR`,hint=done?'HECHA':job.level===1?'FÁCIL':job.level===2?'MEDIA':'DIFÍCIL';
        return `<button type="button" class="job-card" data-job="${id}" data-level="${job.level}" ${done?'disabled':''}><span class="job-number" aria-hidden="true">0${i+1}</span><span class="job-info"><strong>${job.name}</strong><span>${job.summary}</span><small>${meta}</small></span><span class="job-rank">${hint} ${done?'':icon('arrow')}</span></button>`;
      }).join('')}</div>`;
      if(report){
        $('board-report').classList.add(report.style);
        $('board-report').textContent=`${report.title}: ${report.detail}`;
      }
      buttons=[['Volver a la portada','title']];
    }else if(kind==='chapter'){
      const next=chapters[chapterIndex+1];
      body.innerHTML=`<p>${game.lastReport?.detail??'Has completado las cinco misiones.'}</p><div class="chapter-pass"><span>PRÓXIMA PARADA / 0${next.number}</span><strong>${next.name}</strong><p>${next.story}</p></div><p>Campaña: <strong>${game.missionDone}/${FINAL_COUNT}</strong> · Efectivo: <strong>${fmt(game.cash)} CR</strong></p>`;
      buttons=[[`Viajar a ${next.name}`,'next',true],['Volver a la portada','title']];
    }else if(kind==='help'){
      body.innerHTML='<p>Elige las cinco misiones de cada capítulo en el orden que prefieras. Al completar las cinco, viajas a un mapa nuevo.</p><ul><li><strong>WASD / flechas:</strong> muévete. En coche, arriba acelera, abajo frena o da marcha atrás y los lados giran.</li><li><strong>E / Acción:</strong> entra o sal del coche, usa el garaje, o detente y confirma un objetivo.</li><li><strong>Espacio / Freno:</strong> freno de mano. En una parada técnica, quédate quieto en la marca.</li><li><strong>Convoy C:</strong> acompaña al coche marcado; se detiene si te alejas.</li><li><strong>M / mapa:</strong> consulta el GPS o marca el garaje. <strong>Esc:</strong> pausa.</li><li><strong>Garaje G:</strong> repara el vehículo y baja la alerta a cero.</li></ul>';
      buttons=[['Entendido','close',true]];
    }else if(kind==='map'){
      body.innerHTML=`<svg viewBox="0 0 ${W} ${H}" class="map-large" role="img" aria-label="Mapa de juego de ${config.name} con tu ruta">${staticMap+liveMap()}</svg><div class="legend"><span><b style="color:${LIME}">P</b>Pistones</span><span><b style="color:${ORANGE}">M</b>La Marea</span><span><b style="color:${CYAN}">G</b>Garaje</span><span><b>●</b>Tú</span><span><b style="color:${RED}">●</b>Patrulla</span><span><b style="color:${RED}">×</b>Bloqueo</span>${config.style==='miami'?'<span>Escenario ficticio inspirado en <a href="https://www.miamiandbeaches.com/neighborhoods/south-beach" target="_blank" rel="noopener noreferrer">South Beach</a>.</span>':''}</div>`;
      buttons=[['Cerrar mapa','close',true],...(phase==='play'?[[game.waypoint?'Quitar destino GPS':'Marcar garaje','waypoint']]:[])];
    }else if(kind==='pause'){
      body.innerHTML='<p>La ciudad y los cronómetros se han detenido.</p>';
      buttons=[['Continuar','close',true],['Cómo jugar','pause-help'],...(game.mission?[['Abandonar encargo','abort']]:[]),['Volver al inicio','title']];
    }else{
      body.innerHTML=`<p id="outcome"></p><p>Campaña: <strong>${game.missionDone}/${FINAL_COUNT}</strong> · Efectivo: <strong>${fmt(game.cash)} CR</strong><br>Récord de esta sesión: <strong>${fmt(best)} CR</strong></p>`;
      if(kind==='win'){set('outcome','Has completado los cinco capítulos. Los Pistones y La Marea celebran juntos en Miami; la ciudad se queda abierta para ti.');buttons=[['Explorar Miami','free',true],['Nueva partida','reset']];}
      else{
        set('outcome',game.endReason+(game.failed?' Tus misiones completadas se conservan.':''));
        buttons=game.failed?[['Reintentar','retry',true],['Elegir otra misión','board']]:[['Volver a explorar','free',true],['Nueva partida','reset']];
      }
    }
    actions.innerHTML=buttons.map(([label,id,primary])=>`<button type="button" class="${primary?'primary':'secondary'}" data-action="${id}">${label}</button>`).join('');
    $('overlay').hidden=false;panel.scrollTop=0;refreshShell();
    (kind==='jobs'?panel:actions.querySelector('button')||panel).focus({preventScroll:true});
  }
  function closeDialog(focus=true){
    dialog=null;$('overlay').hidden=true;refreshShell();
    if(focus){const target=phase==='play'?$('stage'):lastFocus&&lastFocus.isConnected&&!lastFocus.closest('[hidden]')?lastFocus:$('start-btn');target.focus({preventScroll:true});}
    lastFocus=null;
  }
  function finish(win,reason=''){
    if(phase!=='play')return;
    if(!win){
      game.failed=game.mission?.id??null;game.mission=null;game.waypoint=false;
      game.lastReport={title:'Misión interrumpida',detail:'Tu progreso se conserva. Elige una misión para volver a intentarlo.',style:'retry'};
    }
    best=Math.max(best,game.cash);game.endReason=reason;phase=win?'win':'end';
    effect(win?'win':'loss');showDialog(phase);
  }
  function showTitle(reset=false){
    if(reset)loadChapter(0,false);
    else{game.mission=null;game.waypoint=false;clearPursuit();}
    phase='title';closeDialog(false);$('start-btn').focus({preventScroll:true});
  }
  function pause(){
    if(phase!=='play')return;
    if(dialog)closeDialog();else showDialog('pause');
  }
  function openMap(){if(phase!=='play'&&phase!=='title')return;if(dialog==='map')closeDialog();else if(!dialog)showDialog('map');}
  $('start-btn').addEventListener('click',start);
  $('sound').addEventListener('click',toggleSound);
  $('pause').addEventListener('click',pause);
  $('tutorial').addEventListener('click',()=>showDialog('help'));
  $('map-btn').addEventListener('click',openMap);
  $('touch-map').addEventListener('click',openMap);
  $('close-overlay').addEventListener('click',()=>closeDialog());
  $('dialog-content').addEventListener('click',e=>{
    const button=e.target.closest('[data-job]');
    if(dialog==='jobs'&&button&&!button.disabled)startJob(button.dataset.job);
  });
  $('dialog-actions').addEventListener('click',e=>{
    const a=e.target.closest('button')?.dataset.action;
    if(a==='close')closeDialog();
    if(a==='title')showTitle();
    if(a==='reset')showTitle(true);
    if(a==='board')showBoard();
    if(a==='next'&&phase==='chapter'&&chapterDone()===JOBS.length&&chapterIndex<chapters.length-1){loadChapter(chapterIndex+1);showBoard();}
    if(a==='retry'&&game.failed)startJob(game.failed);
    if(a==='pause-help')showDialog('help');
    if(a==='abort')cancelJob('Misión abandonada');
    if(a==='waypoint'){game.waypoint=!game.waypoint;notify(game.waypoint?'GPS: garaje marcado.':'GPS: destino eliminado.');closeDialog();}
    if(a==='free'){
      if(phase==='end'){
        const [x,y]=JOB_SPAWN;clearPursuit();game.player={x,y,a:-Math.PI/2,hp:100,car:null};game.nav=null;
      }
      phase='play';closeDialog(false);$('stage').focus({preventScroll:true});
    }
  });
  document.addEventListener('keydown',e=>{
    if(e.ctrlKey||e.altKey||e.metaKey)return;
    if(e.code==='Tab'&&dialog){
      const b=[...$('overlay-panel').querySelectorAll('button:not(:disabled),a[href]')].filter(el=>!el.closest('[hidden]')); if(!b.length)return;
      if(e.shiftKey&&(document.activeElement===b[0]||!b.includes(document.activeElement))){e.preventDefault();b.at(-1).focus();}
      else if(!e.shiftKey&&(document.activeElement===b.at(-1)||!b.includes(document.activeElement))){e.preventDefault();b[0].focus();}
      return;
    }
    if(e.code==='Escape'&&!e.repeat){
      e.preventDefault();if(dialog==='jobs'||dialog==='chapter')showTitle();
      else if(dialog&&dialog!=='end'&&dialog!=='win')closeDialog();else if(!dialog)pause();return;
    }
    if(dialog==='jobs'&&!e.repeat&&/^[1-5]$/.test(e.key)){
      e.preventDefault();const id=JOBS[Number(e.key)-1][0];startJob(id);return;
    }
    if(e.code==='KeyV'&&!e.repeat){toggleSound();return;}
    if(e.code==='KeyM'&&!e.repeat){e.preventDefault();openMap();return;}
    if(e.code==='Enter'&&phase==='title'&&!dialog&&!e.target.closest('button,a')){e.preventDefault();start();return;}
    if(phase!=='play'||dialog)return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','Space','KeyE'].includes(e.code)){
      if(e.code==='Space'&&e.target.closest('button')&&!touchMode())return;
      e.preventDefault();keys.add(e.code);
      if(e.code==='KeyE'&&!e.repeat)interact();
    }
  });
  document.addEventListener('keyup',e=>keys.delete(e.code));
  addEventListener('blur',()=>{clearInput();if(!virtual&&phase==='play'&&!dialog)showDialog('pause');});
  document.addEventListener('visibilitychange',()=>{selected=!document.hidden;if(!selected){clearInput();if(!virtual&&phase==='play'&&!dialog)showDialog('pause');}});
  for(const b of document.querySelectorAll('[data-key]')){
    const code=b.dataset.key;
    b.addEventListener('pointerdown',e=>{
      if(phase!=='play'||dialog)return;
      e.preventDefault();b.setPointerCapture(e.pointerId);touches.set(e.pointerId,code);b.classList.add('held');if(code==='KeyE')interact();
    });
    const off=e=>{touches.delete(e.pointerId);if(![...touches.values()].includes(code))b.classList.remove('held');};
    b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('lostpointercapture',off);
    b.addEventListener('click',e=>{if(e.detail===0&&code==='KeyE')interact();});
  }

  const round=n=>Math.round(n*10)/10;
  window.render_game_to_text=()=>{
    const p=player(),m=game.mission,goal=activeGoal(),route=phase==='title'?null:navRoute();
    return JSON.stringify({phase:dialog||phase,time:round(game.time),coordinates:'World origin top-left; x east, y south',
      player:{x:round(p.x),y:round(p.y),angle:round(p.a),hp:round(p.hp),onFoot:!game.player.car,carId:game.player.car?.id,carType:game.player.car?.type,speed:round(p.s||0)},
      controls:'WASD/arrow keys move and drive, E interact, Space handbrake, M map, Esc pause',
      alert:game.heat,cash:game.cash,crewJobs:game.rep,trust:game.trust,reward:game.gift,dockOpen:dockOpen(),
      goal:goal?{x:round(goal.x),y:round(goal.y),text:goal.text||goal.name}:null,
      mission:m?{id:m.id,name:m.job.name,stage:m.idx+1,stages:m.job.steps.length,kind:['van','choice','escort','action','stop'].find(k=>m.job.steps[m.idx][k])||'checkpoint',left:m.deadline?round(m.deadline-game.time):null,waitingForCar:m.pendingTimer,choose:!!m.job.steps[m.idx].choice,hold:round(m.hold),convoy:m.ally?{x:round(m.ally.car.x),y:round(m.ally.car.y)}:null}:null,
      campaign:{total:FINAL_COUNT,chapter:config.number,city:config.name,map:{width:W,height:H},completed:[...game.completed],remaining:JOBS.map(([id])=>id).filter(id=>!game.completed.has(id))},
      gps:route?{dest:game.waypoint?'garage':'mission',meters:Math.round(route.length),points:route.points.map(q=>[round(q.x),round(q.y)])}:null,
      finished:game.won,garage:GARAGE,phones:PHONE,
      nearbyCars:game.cars.filter(c=>c.kind!=='traffic'&&dist(c,p)<350).map(c=>({x:round(c.x),y:round(c.y),id:c.id,type:c.type})),
      police:game.police.map(c=>({x:round(c.x),y:round(c.y),role:c.role,speed:round(c.s||0)})),patrolMaxSpeed:COP_BASE+game.heat*COP_PER_STAR,
      block:game.block?{x:game.block.x,y:game.block.y,horizontal:!!game.block.dx}:null,prompt:interactable()?.name||null});
  };
  window.advanceTime=ms=>{
    virtual=true;
    const frames=clamp(Math.round(ms/(STEP*1000)),1,60*90);
    for(let i=0;i<frames;i++)update(STEP);
    updateUI();render();
  };
  let previous=0,acc=0,fpsT=0,frames=0,loop;
  function tick(now){
    const dt=previous?Math.min(.1,(now-previous)/1000):0;previous=now;frames++;
    if(!fpsT)fpsT=now;
    if(now-fpsT>=800){set('debug',`2D / ${Math.round(frames*1000/(now-fpsT))} FPS`);fpsT=now;frames=0;}
    if(!virtual&&phase==='play'&&!dialog){
      acc+=dt;
      while(acc>=STEP){update(STEP);acc-=STEP;}
      uiT+=dt;if(uiT>.115){updateUI();uiT=0;}
    }else acc=0;
    music();render();loop=requestAnimationFrame(tick);
  }
  addEventListener('pagehide',()=>{cancelAnimationFrame(loop);if(audio&&audio.state==='running')audio.suspend().catch(()=>{});});
  addEventListener('pageshow',e=>{if(e.persisted){previous=0;loop=requestAnimationFrame(tick);}});
  loadChapter(0,false);
  mapArt.addEventListener('load',()=>{bakeCity();paintDirty=true;});
  mapArt.src='./assets/rooftop-materials.webp';
  refreshShell();resize();loop=requestAnimationFrame(tick);
})();
