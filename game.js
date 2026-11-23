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
    hover:{name:'Halo X-9',top:349,reverse:110,accel:207,steer:2.42,grip:12,radius:15},
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
  const MIAMI=chapters.length-1,net=window.UnitedNet;
  const atlas=window.UnitedEndless,{stations,playlist}=window.UnitedRadio;
  const discoveries=window.UnitedDiscoveries;
  const progress=window.UnitedProgress,{SHOP}=progress,storyIds=new Set(chapters.flatMap(c=>Object.keys(c.jobs)));
  const FREE_JOB_TYPES=[
    {name:'Paquetería nocturna',tag:'Entrega',pay:850,xp:400,steps:['Recoge el paquete en el cruce señalizado.','Lleva el paquete al siguiente contacto.','Detente para entregar la mercancía.'],stop:2},
    {name:'Circuito exprés',tag:'Contrarreloj',pay:1200,xp:550,time:155,steps:['Cruza la primera baliza.','Marca el paso por el segundo control.','Busca la siguiente baliza.','Cruza la meta.']},
    {name:'Ruta de mantenimiento',tag:'Servicio',pay:1000,xp:475,steps:['Recoge los repuestos.','Haz una parada para revisar el repetidor.','Lleva el informe al punto de salida.'],stop:1},
    {name:'Salida de emergencia',tag:'Persecución',pay:1500,xp:650,time:190,heat:2,steps:['Alcanza el primer punto de escape.','Cruza el siguiente control.','Pasa por el último desvío.','Detén el coche en la salida segura.'],stop:3},
    {name:'Exploración urbana',tag:'Recorrido',pay:800,xp:350,walk:true,steps:['Visita el primer punto de interés.','Busca la segunda marca.','Llega al mirador señalado.']}
  ];
  let profile=progress.fresh(),mode='story',freeSerial=0,latestReward=0,seenReward=0,buddyRide='stock',repairTag=0,pendingRepair=0;
  let lastObjective='',objectiveUntil=0,backDialog=null;
  const terrain=document.createElement('canvas'), world=terrain.getContext('2d',{alpha:false});
  const mapArt=new Image();
  let chapterIndex=0, config, W, H, X, Y, ALLEY, DOCK, PHONE, GARAGE, GARAGE_GOAL, JOB_SPAWN, contracts, JOBS;
  let sector=null,sectorHint=-Infinity;
  let nodes=[], avenueNodes=[], links=[], blocks=[], collisionTiles=new Map();
  const chapterDone=()=>JOBS.reduce((n,[id])=>n+Number(game.completed.has(id)),0);
  const finaleReady=()=>chapters.slice(0,MIAMI).every(c=>Object.keys(c.jobs).every(id=>game.completed.has(id)));
  const rect=(o,x,y,w,h,fill)=>{o.fillStyle=fill;o.fillRect(x,y,w,h);};
  function glow(o,x,y,radius,rgb,opacity){
    const g=o.createRadialGradient(x,y,0,x,y,radius);
    g.addColorStop(0,`rgba(${rgb},${opacity})`);g.addColorStop(.4,`rgba(${rgb},${opacity*.56})`);g.addColorStop(1,`rgba(${rgb},0)`);
    rect(o,x-radius,y-radius,radius*2,radius*2,g);
  }
  function loadChapter(index,keep=true,nextSector=null){
    sector=nextSector;
    chapterIndex=sector?.biome??index;config=sector?.config??chapters[index];W=config.w;H=config.h;X=config.x;Y=config.y;
    contracts=config.jobs;JOBS=Object.entries(contracts);JOB_SPAWN=config.spawn;
    ALLEY=!sector&&index===0?{x:325,from:Y[0],to:Y[1]}:null;
    DOCK=!sector&&index===0?{y:1170,from:X[4],to:X[5],gates:[1635,1894]}:null;
    PHONE={p:{x:X[1]-39,y:Y[1]+19,color:LIME,name:'Los Pistones'},m:{x:X[X.length-2]+37,y:Y[Math.floor(Y.length/2)]-18,color:ORANGE,name:'La Marea'}};
    GARAGE={x:X[2]-40,y:Y[3]-23,color:CYAN};
    GARAGE_GOAL={...GARAGE,text:'Garaje',name:'Garaje'};
    terrain.width=W;terrain.height=H;
    bakeCity();buildStreets();
    game=fresh();
    syncProfile();
    if(keep&&game.gift==='p'&&mode==='story')awardSport();
    if(net.hosting&&net.connected&&mode==='free')spawnBuddy(...JOB_SPAWN);
    document.documentElement.dataset.city=config.style;
    staticMap=mapBase();
    $('mini').setAttribute('viewBox',`0 0 ${W} ${H}`);
    $('mini').innerHTML=staticMap+'<g id="mini-live"></g>';
    paintDirty=true;
  }
  function syncProfile(){
    const s=profile.story;game.cash=profile.cash;
    game.completed=new Set(s.completed);game.missionDone=s.completed.length;
    game.rep=s.rep;game.trust=s.trust;game.gift=s.gift;game.won=s.won;
  }
  function ownedCar(id,x,y,a,ride=profile.equipped){
    const v=SHOP[ride]||SHOP.stock;
    return makeCar(x,y,a,v.color,{id,starter:true,van:v.type==='van',type:v.type});
  }
  function setStarter(id,ride){
    const car=game.cars.find(c=>c.id===id);
    if(!car||actors().some(p=>p.car===car))return false;
    const replacement=ownedCar(id,car.x,car.y,car.a,ride);
    Object.assign(car,replacement);return true;
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
  function loadSector(x,y){
    loadChapter(0,false,atlas.recipe(x,y,chapters));
  }
  function sameSector(x,y){return sector?.x===x&&sector?.y===y;}
  function exitToward(x,y){
    return sector?.gates.find(g=>g.dx===Math.sign(x-sector.x)&&g.dx!==0)
      ||sector?.gates.find(g=>g.dy===Math.sign(y-sector.y)&&g.dy!==0);
  }
  function crossExit(){
    if(!sector)return;
    const team=actors(),near=(actor,g,rad)=>dist(actor.car||actor,g)<rad;
    const gate=sector.gates.find(g=>team.some(a=>near(a,g,42)));
    if(!gate||!atlas.valid(gate.nx,gate.ny))return;
    if(!team.every(a=>near(a,gate,168))){
      if(game.time>sectorHint+3){
        sectorHint=game.time;notify('Reúnete con tu compañero en la salida para cruzar juntos.',3);
      }
      return;
    }
    const previous=game;
    const incoming=atlas.recipe(gate.nx,gate.ny,chapters);
    const entry=incoming.gates.find(g=>g.id===gate.opposite);
    loadChapter(0,false,incoming);
    Object.assign(game,{time:previous.time,enteredAt:previous.time,mission:previous.mission,heat:previous.heat,spawn:.9,quiet:previous.quiet,safeUntil:previous.safeUntil});
    if(game.mission)game.mission.hold=0;
    game.cars=game.cars.filter(c=>!team.some(a=>a.car?.id===c.id));
    const a=Math.atan2(gate.dy,gate.dx);
    const placed=team.map((actor,i)=>{
      const side=team.length===2?(i===0?-19:19):0;
      const x=entry.x+gate.dx*79-gate.dy*side,y=entry.y+gate.dy*79+gate.dx*side;
      const car=actor.car;
      if(car){
        const s=Math.min(145,Math.abs(car.s));
        Object.assign(car,{x,y,a,s,vx:gate.dx*s,vy:gate.dy*s,node:undefined,previous:undefined,kind:'parked'});
        game.cars.push(car);
      }
      return {...actor,x,y,a,car};
    });
    [game.player,game.buddy=null]=placed;
    notify(`${config.name} · sector ${sector.x}, ${sector.y}`,4);
    refreshShell();
  }

  const palettes=['#75ebd1','#c9b7b5','#9ba5b9','#a95975','#568b91','#a797bc','#c78972','#7c889c'];
  const makeCar=(x,y,a,color,extra={})=>({x,y,a,color,s:0,vx:0,vy:0,hp:100,kind:'parked',type:extra.van?'van':'sedan',...extra});
  let game, phase='title', dialog=null, lastFocus=null, muted=true, best=0, selected=true, virtual=false, paintDirty=true;
  let roomStatus='Crea una sala o entra con el código de tu compañero.',guestMenu='',hostInput=0,hostInputAt=0,remoteAction=0,guestAction=0,soloBackup=null,lastRepairRequest=0;
  let width=1,height=1,dpr=1,viewScale=1,camera={x:0,y:0};
  let audio=null,bus=null,musicBus=null,engine=null,engineGain=null,nextBeat=0,beat=0,station=stations[0];
  const keys=new Set(), touches=new Map();
  function driveLink(xi,yi,rx,ry){
    return rx>=0&&rx<X.length&&ry>=0&&ry<Y.length&&
      (yi!==ry||config.canal==null||Math.min(xi,rx)!==config.canal||config.bridges.includes(yi));
  }
  function fresh(){
    const roll=rnd(config.seed+715),[x,y,cx,cy,a=0]=JOB_SPAWN;
    const cars=[ownedCar('starter',cx,cy,a)];
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
    const crowd=rnd(config.seed+1729),people=Array.from({length:53},(_,i)=>{
      const xi=i%X.length,side=config.canal===xi?-1:config.canal===xi-1?1:i%2?1:-1;
      const cross=i%3===0,yi=(Math.floor(i/3)*5+1)%Y.length;
      const ox=cross?X[xi]:X[xi]+side*53,oy=cross?Y[yi]+side*39:125+crowd()*(H-250);
      return {id:i,x:ox,y:oy,ox,oy,cross,origin:i*7.5,a:0,color:['#dfa975','#c4a9d9','#ec89a4','#91c9d6','#af8280'][i%5],pace:18+crowd()*12,range:cross?44:33+crowd()*67,offset:crowd()*TAU,downAt:null};
    });
    const caches=discoveries.local(sector).map(entry=>{
      const ox=X[entry.col],oy=Y[entry.row];
      const spots=[[entry.side*43,-72],[entry.side*43,74],[-entry.side*43,-75],[0,74]];
      const spot=spots.map(([a,b])=>({x:ox+a,y:oy+b})).find(p=>!hits(p.x,p.y,10)&&trace(ox,oy,p.x,p.y,8));
      return {...entry,...(spot??{x:ox,y:oy})};
    });
    return {player:{x,y,a:-Math.PI/2,hp:100,car:null},buddy:null,cars,people,caches,police:[],particles:[],marks:[],time:0,enteredAt:0,cash:0,heat:0,quiet:0,spawn:0,block:null,blockAt:0,
      rep:{p:0,m:0},trust:{p:0,m:0},gift:null,waypoint:false,mission:null,completed:new Set(),missionDone:0,lastReport:null,failed:null,won:false,msg:'',msgUntil:0,hitAt:-2,shake:0,lastSkid:0,safeUntil:0,nav:null,seed:roll};
  }
  function player(){return game.player.car || game.player}
  const actors=()=>game.buddy?[game.player,game.buddy]:[game.player];
  function spawnBuddy(x,y){
    game.cars=game.cars.filter(c=>c.id!=='starter-2');
    const x0=X[nearest(X,x)],y0=Y[nearest(Y,y)];
    game.buddy={x:x0+11,y:y0-20,a:Math.PI/2,hp:100,car:null};
    const car=ownedCar('starter-2',x0+12,y0-47,Math.PI/2,buddyRide);
    if(buddyRide==='stock')car.color=ORANGE;
    game.cars.push(car);
  }
  function hits(x,y,r){
    const east=sector?.gates[1],shore=east&&Math.abs(y-east.y)<46-r?W:config.coast??W;
    if(x<r+9||x>shore-8-r||y<r+8||y>H-r-8)return true;
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
        musicBus=audio.createGain();musicBus.gain.value=station.beat?1:0;musicBus.connect(bus);
        engine=audio.createOscillator();engine.type='triangle';engine.frequency.value=37;
        engineGain=audio.createGain();engineGain.gain.value=0;
        const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=135;
        engine.connect(filter).connect(engineGain).connect(bus);engine.start();
      }
      if(audio.state!=='running')audio.resume().catch(()=>{});
      nextBeat=audio.currentTime+.04;
    }catch{audio=null;}
  }
  function tone(freq,len,type,volume,at,end,output=bus){
    if(muted||!audio||!bus)return;
    at=at??audio.currentTime;
    const osc=audio.createOscillator(), g=audio.createGain();osc.type=type;
    osc.frequency.setValueAtTime(freq,at); if(end)osc.frequency.exponentialRampToValueAtTime(end,at+len);
    g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(volume,at+.013);g.gain.exponentialRampToValueAtTime(.0001,at+len);
    osc.connect(g).connect(output);osc.start(at);osc.stop(at+len+.02);
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
    if(!station.beat||(dialog&&dialog!=='radio')||phase==='end'||phase==='win'){nextBeat=t+.04;return;}
    if(nextBeat<t-.3)nextBeat=t+.035;
    while(nextBeat<t+.075){
      const i=beat%16, root=station.roots[Math.floor(beat/16)%station.roots.length];
      const note=(f,d,w,v,tail)=>tone(f,d,w,v,nextBeat,tail,musicBus);
      if(station.bass.includes(i))note(root*(i===6||i===13?2:1),station.soft?.85:.21,station.wave,.16);
      if(station.kick.includes(i))note(station.drum,.16,'sine',station.soft?.13:.29,33);
      if(station.hat.includes(i))note(2100,.041,'triangle',.027,630);
      if(station.lead.includes(i))for(const [j,ratio] of station.intervals.entries()){
        note(root*ratio*(i%3===0?1.125:1),station.soft?.94:.23+j*.04,'sine',.072-j*.022);
      }
      beat++;nextBeat+=station.beat;
    }
  }
  function setMuted(value){
    muted=value;
    $('sound').setAttribute('aria-pressed',String(!muted));
    const tag=muted?'Activar sonido':'Silenciar';
    $('sound').setAttribute('aria-label',tag);$('sound').title=tag+' (V)';
    $('sound').querySelector('use').setAttribute('href',muted?'#i-mute':'#i-sound');
    if(muted&&audio)audio.suspend().catch(()=>{});else readyAudio();
  }
  function toggleSound(){setMuted(!muted);if(dialog==='radio')renderRadio();}
  function tune(id,redraw=true){
    const next=stations.find(s=>s.id===id);if(!next)return;
    station=next;beat=0;setMuted(false);
    if(musicBus)musicBus.gain.setTargetAtTime(next.beat?1:0,audio.currentTime,.018);
    $('radio-btn').title=`Radio: ${station.name} (R)`;
    set('radio-label',station.beat?station.name:station.id==='spotify'?'Spotify':'Radio');
    if(redraw&&dialog==='radio'){renderRadio();$('dialog-content').querySelector(`[data-station="${id}"]`)?.focus({preventScroll:true});}
  }

  function notify(msg,seconds=3.4){game.msg=msg;game.msgUntil=game.time+seconds;paintDirty=true;}
  function raise(n,reason=''){
    const old=game.heat;
    game.heat=clamp(Math.max(n,game.heat),0,3);game.quiet=0;
    if(game.heat>old){notify(`${reason?reason+' · ':''}Alerta policial: ${game.heat} / 3`);effect('alert');}
    game.spawn=Math.min(game.spawn,.35);
  }
  function sparks(x,y,color,n=11){if(reduced.matches)n=Math.min(4,n);for(let j=0;j<n;j++){const a=Math.random()*TAU,speed=23+Math.random()*133;game.particles.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,ttl:.26+Math.random()*.27,color});}}
  function damage(amount,actor=game.player){
    if(game.time-(actor.hitAt??-2)<.5||game.time<game.safeUntil)return;
    actor.hitAt=game.hitAt=game.time;
    const o=actor.car||actor;o.hp=clamp(o.hp-amount,0,100);
    game.shake=.19;sparks(o.x,o.y,'#ffd17c',12);effect('hit');
    if(o.hp<=0)finish(false,game.buddy?'Uno de los dos jugadores ha quedado fuera de servicio.':actor.car?'El coche ha quedado fuera de servicio.':'Te han atrapado en el distrito.');
  }
  function dockOpen(){return !!DOCK&&game?.gift==='m';}
  function nearestPhone(p=player()){return dist(p,PHONE.p)<=dist(p,PHONE.m)?PHONE.p:PHONE.m;}
  function activeGoal(){
    const m=game.mission;
    if(m){
      const goal=m.job.steps[m.idx];
      if(m.job.sector&&!sameSector(...m.job.sector))return exitToward(...m.job.sector);
      if(goal.choice)return nearestPhone();
      if(goal.van&&m.van)return {...goal,x:m.van.x,y:m.van.y};
      if(goal.escort&&m.ally&&dist(m.ally.car,player())>205)return {...m.ally.car,text:'Vuelve con el convoy C'};
      return goal;
    }
    return null;
  }
  function guideGoal(){return game.waypoint===true?GARAGE_GOAL:game.waypoint||activeGoal();}
  function guideColor(goal=guideGoal()){return goal===GARAGE_GOAL||goal?.arrow?CYAN:goal===PHONE.m||game.mission?.side==='m'?ORANGE:game.mission?.side==='x'&&goal!==PHONE.p?CYAN:LIME;}
  function clearPursuit(){
    game.heat=0;game.police=[];game.block=null;game.blockAt=game.spawn=game.quiet=0;
    resetPedestrianCounts();
  }
  function resetPedestrianCounts(){for(const driver of actors())driver.pedestrianHits=0;}
  function startJob(id){
    if(mode!=='story'||net.connected||net.joining||!Object.hasOwn(contracts,id)||game.completed.has(id)||game.won||chapterIndex===MIAMI&&!finaleReady())return;
    const job=contracts[id],side=job.side,[x,y,cx,cy,a=0]=job.spawn||JOB_SPAWN;
    if(game.player.car)game.player.car.s=game.player.car.vx=game.player.car.vy=0;
    game.cars=game.cars.filter(c=>!c.job&&c.kind!=='ally');
    const starter=game.cars.find(c=>c.id==='starter');
    Object.assign(starter,ownedCar('starter',cx,cy,a),{air:false});
    game.player={x,y,a:-Math.PI/2,hp:100,car:null};
    if(net.hosting&&net.connected)spawnBuddy(x,y);
    clearPursuit();
    game.waypoint=false;game.nav=null;game.shake=0;game.particles.length=0;
    game.safeUntil=game.time+.85;
    const m={id,side,job,idx:0,deadline:id==='union'?game.time+480:0,finishBy:0,pendingTimer:!!job.time,van:null,ally:null,hold:0};
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
  function freeJob(id,kind,points,location){
    const spec=FREE_JOB_TYPES[kind];
    if(!spec||!Number.isSafeInteger(id)||id<1||!Array.isArray(location)||location.length!==2||!atlas.valid(...location)||!Array.isArray(points)||points.length!==spec.steps.length)return null;
    const map=sameSector(...location)?config:atlas.recipe(...location,chapters).config;
    const steps=points.map((ix,i)=>Number.isInteger(ix)&&ix>=0&&ix<map.x.length*map.y.length?{x:map.x[ix%map.x.length],y:map.y[Math.floor(ix/map.x.length)],text:spec.steps[i],action:!!spec.walk,stop:i===spec.stop?2.4:0,alert:i===1?spec.heat:0}:null);
    return steps.every(Boolean)?{...spec,side:'f',steps,serial:id,kind,points,sector:location}:null;
  }
  function startFreeJob(){
    if(mode!=='free'||phase!=='play'||game.mission||!sector)return;
    if(net.joining){net.send({type:'command',cmd:'job'});return;}
    const kind=Math.floor(Math.random()*FREE_JOB_TYPES.length),points=[];
    let prev=player(),prevIx=-1;
    for(const _ of FREE_JOB_TYPES[kind].steps){
      const split=config.canal==null?null:(X[config.canal]+X[config.canal+1])/2;
      const pool=nodes.map((n,i)=>[i,dist(n,prev)]).filter(([i,d])=>{
        const n=nodes[i],cross=split!==null&&(prev.x<split)!==(n.x<split);
        return i!==prevIx&&d>280&&d<910&&(!cross||config.bridges.some(y=>Math.abs(Y[y]-n.y)+Math.abs(Y[y]-prev.y)<580));
      });
      const ix=(pool[Math.floor(Math.random()*pool.length)]||[(prevIx+1)%nodes.length])[0];
      points.push(ix);prev=nodes[ix];prevIx=ix;
    }
    const job=freeJob(++freeSerial,kind,points,[sector.x,sector.y]);
    game.mission={id:`free-${freeSerial}`,side:'f',job,idx:0,hold:0,deadline:job.time?game.time+job.time:0,finishBy:0,pendingTimer:false,van:null,ally:null};
    game.waypoint=false;game.nav=null;notify(`Encargo #${job.serial}: ${job.name}.`,5);effect('job');updateUI();
  }
  function cancelJob(reason){
    if(!game.mission)return;
    game.failed=game.mission.id;
    game.lastReport={title:reason,detail:'Tu progreso se conserva. Puedes repetir la misión o elegir otra.',style:'retry'};
    game.mission=null;game.waypoint=false;game.cars=game.cars.filter(c=>c.kind!=='ally');clearPursuit();effect('loss');
    if(mode==='free'){notify(`${reason}. Puedes aceptar otro encargo.`,6);if(dialog)closeDialog();updateUI();}
    else showBoard();
  }
  function awardSport(){
    const [,,x,y]=JOB_SPAWN;
    if(!game.cars.some(c=>c.reward))game.cars.push(makeCar(x,y-65,0,LIME,{type:'sport',id:'regalo-p',reward:true,claimed:true}));
  }
  function handoff(side,actor){
    const m=game.mission;
    if(!m?.job.steps[m.idx].choice)return false;
    if(actor.car!==m.van)return false;
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
    const m=game.mission,story=mode==='story';
    const xp=story?progress.storyXP(m.job):m.job.xp,oldRank=progress.rank(profile);
    game.mission=null;game.waypoint=false;clearPursuit();
    const p=player();sparks(p.x,p.y,LIME,26);
    if(!story){
      profile.freeDone++;progress.earn(profile,m.job.pay,xp);syncProfile();
      if(net.hosting&&net.connected)latestReward=m.job.serial*8+m.job.kind+1;
      notify(`Encargo completado · +${fmt(m.job.pay)} CR · +${xp} XP · +1 llave inglesa`,7);effect('win');updateUI();return;
    }
    game.completed.add(m.id);profile.story.completed=[...game.completed];
    if(m.side==='p'||m.side==='m'){
      game.rep[m.side]++;
      game.trust[m.side]=clamp(game.trust[m.side]+(game.trust[m.side]<0?2:1),-2,4);
    }
    profile.story.gift=game.gift;profile.story.won=game.completed.size===FINAL_COUNT;
    progress.earn(profile,m.job.pay,xp,profile.story.won);syncProfile();
    const reward=m.side==='x'?(game.gift==='p'?' · Deportivo en El Cruce':' · Atajo de los muelles abierto'):'';
    game.lastReport={title:'Misión completada',detail:`${m.job.name} · +${fmt(m.job.pay)} CR · +${xp} XP · +1 llave${reward}`,style:'success'};
    if(game.missionDone===FINAL_COUNT){
      notify(`La fiesta ya está en marcha. Pase desbloqueado · nivel ${Math.max(oldRank,progress.rank(profile))}/50.`,7);finish(true);return;
    }
    if(chapterDone()===JOBS.length){best=Math.max(best,game.cash);effect('win');showCities();return;}
    effect('win');showBoard();
  }
  function holdingCargo(m){
    return !!m.van&&m.job.steps.slice(0,m.idx).some(s=>s.van);
  }
  function escortStep(m,goal,dt){
    if(!m.ally){
      const from=m.job.steps[m.idx-1];
      const route=streetRoute(from,goal,true);
      if(!route?.points.length)return false;
      const a=makeCar(from.x,from.y,0,'#ffbf83',{type:'van',van:true,kind:'ally',id:'convoy'});
      m.ally={car:a,route:route.points,index:1};game.cars.push(a);
    }
    const a=m.ally,car=a.car;
    if(!actors().some(p=>p.car&&dist(car,p.car)<=205))return false;
    const t=a.route[a.index];
    if(!t)return actors().some(p=>p.car&&dist(goal,p.car)<132);
    const d=dist(t,car),step=dt*125;
    if(d<=step){car.x=t.x;car.y=t.y;a.index++;}
    else{car.a=Math.atan2(t.y-car.y,t.x-car.x);car.x+=Math.cos(car.a)*step;car.y+=Math.sin(car.a)*step;}
    return a.index===a.route.length&&actors().some(p=>p.car&&dist(goal,p.car)<132);
  }
  function stepJob(dt){
    const m=game.mission;if(!m)return;
    if(timeLimit(m)&&game.time>timeLimit(m)){cancelJob('Se acabó el tiempo');return;}
    if(m.job.sector&&!sameSector(...m.job.sector))return;
    const goal=m.job.steps[m.idx], team=actors();
    if(m.pendingTimer&&team.some(p=>p.car&&(!m.job.steps[0].van||p.car===m.van))){
      m.pendingTimer=false;m.deadline=game.time+m.job.time;
      if(m.job.alert){raise(m.job.alert);game.spawn=2.8;}
      notify(`Cuenta atrás: ${m.job.time} s. ${goal.text}`,4);updateUI();
    }
    if(goal.choice){
      const driver=team.find(p=>p.car===m.van);
      if(driver)for(const [side,phone] of Object.entries(PHONE))if(dist(driver.car,phone)<52){handoff(side,driver);break;}
      return;
    }
    if(m.pendingTimer)return;
    if(goal.escort){if(escortStep(m,goal,dt))advanceGoal(goal);return;}
    const range=goal.action||goal.stop?61:49,mustVan=holdingCargo(m)||goal.van;
    const ready=team.some(p=>{
      const car=p.car;
      return (!mustVan||car===m.van)&&(car||goal.action&&!m.job.time)&&!car?.air
        &&(goal.van||dist(car||p,goal)<range)&&(!goal.stop||Math.abs(car?.s??Infinity)<=13);
    });
    if(!ready){m.hold=0;return;}
    if(goal.stop){m.hold+=dt;if(m.hold<goal.stop)return;}
    advanceGoal(goal);
  }
  const timeLimit=m=>m.deadline&&m.finishBy?Math.min(m.deadline,m.finishBy):m.deadline||m.finishBy||0;
  function advanceGoal(goal){
    const m=game.mission;
    if(goal.alert)raise(goal.alert);
    if(goal.time)m.deadline=game.time+goal.time;
    if(m.ally){game.cars=game.cars.filter(c=>c!==m.ally.car);m.ally=null;}
    m.hold=0;
    m.idx++;effect('pass');
    if(m.idx>=m.job.steps.length){endJob();return;}
    const next=m.job.steps[m.idx];
    if(mode==='story'&&m.idx===m.job.steps.length-1)m.finishBy=game.time+(m.id==='union'?105:next.choice?130:next.escort?135:95);
    notify(next.choice?'Elige P por el deportivo o M por el atajo.':next.escort?'Mantente cerca del vehículo marcado con C.':next.text);updateUI();
  }
  function interactable(actor=game.player){
    const me=actor.car||actor,m=game.mission,goal=m?.job.steps[m.idx],occupied=c=>actors().some(p=>p!==actor&&p.car===c);
    if(actor===game.player){
      const cache=nearbyCache();
      if(cache)return {type:'cache',name:'Leer inscripción',cache};
    }
    if(dist(me,GARAGE)<54&&(game.heat>0||me.hp<100||actor.hp<100))return {type:'garage',name:'Usar el garaje'};
    if(actor.car)return actor.car.air?{type:'air',name:'Aterriza primero'}:{type:'exit',name:'Bajar del coche'};
    if(m?.van&&!occupied(m.van)&&dist(m.van,me)<43&&(goal?.van||holdingCargo(m)))return {type:'enter',car:m.van,name:'Subir a la furgoneta'};
    let bestDist=43,car=null;
    for(const c of game.cars){if(c.kind==='traffic'||c.kind==='ally'||occupied(c))continue;const d=dist(c,me);if(d<bestDist){bestDist=d;car=c;}}
    if(car)return {type:'enter',car,name:car.van?'Subir a la furgoneta':car.type==='sport'?'Subir al deportivo':'Subir al coche'};
    return null;
  }
  function interact(p=game.player){
    if(phase!=='play'||dialog)return;
    if(p===game.player){
      const cache=nearbyCache();
      if(cache&&progress.discover(profile,cache.id)){
        showPersonal(`Hallazgo anotado · ${cache.code}. Abre Hallazgos para canjearlo.`,7600);effect('pass');return;
      }
    }
    if(net.joining){guestAction=(guestAction+1)&65535;sendInput();return;}
    const target=interactable(p);if(!target)return;
    if(target.type==='garage'){
      const o=p.car||p;if(o.s!==undefined&&Math.abs(o.s)>38){notify('Frena para usar el garaje.');return;}
      o.hp=100;p.hp=100;clearPursuit();game.waypoint=false;game.safeUntil=game.time+2;
      effect('job');notify('Garaje: reparación completa y alerta a cero.');
    }else if(target.type==='air'){
      actorNotify(p,'Aterriza antes de bajar del coche.');
    }else if(target.type==='exit'){
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
  function actorNotify(actor,msg){
    if(actor===game.player)notify(msg);
    else if(net.hosting)net.send({type:'notice',msg});
  }
  function repair(){
    if(phase!=='play'||dialog)return;
    const car=game.player.car;
    if(!car){notify('Sube a un coche para usar una llave inglesa.');return;}
    if(car.hp>=100){notify('El coche ya está en buen estado.');return;}
    if(!progress.canRepair(profile)){notify('No tienes llaves inglesas. Completa un encargo para conseguir una.');return;}
    if(net.joining){
      if(pendingRepair)return;
      pendingRepair=++repairTag;const request=pendingRepair;
      net.send({type:'command',cmd:'repair',request});
      setTimeout(()=>{if(pendingRepair===request)pendingRepair=0;},4000);return;
    }
    progress.useWrench(profile);car.hp=100;sparks(car.x,car.y,CYAN);effect('job');notify(repairedText());updateUI();
  }
  const repairedText=()=>profile.unlimitedWrenches?'Reparación completa · llaves infinitas.':'Reparación completa · −1 llave inglesa.';
  function flight(actor=game.player){
    if(phase!=='play'||dialog)return;
    if(net.joining){net.send({type:'command',cmd:'flight'});return;}
    const c=actor.car;
    if(c?.type!=='hover')return;
    if(c.air&&(hits(c.x,c.y,16)||game.cars.some(o=>o!==c&&!o.air&&dist(o,c)<34))){
      actorNotify(actor,'Busca una calle despejada para aterrizar.');return;
    }
    c.air=!c.air;game.nav=null;effect('open');
    actorNotify(actor,c.air?'Halo X-9 en vuelo · H para aterrizar.':'Halo X-9 en tierra.');
  }

  const down=(a,b)=>keys.has(a)||(b&&keys.has(b))||[...touches.values()].some(k=>k===a||k===b);
  const localMask=()=>Number(down('ArrowUp','KeyW'))+2*Number(down('ArrowDown','KeyS'))+4*Number(down('ArrowLeft','KeyA'))+8*Number(down('ArrowRight','KeyD'))+16*Number(down('ShiftLeft','ShiftRight'));
  function hitPedestrians(driver,c){
    if(Math.hypot(c.vx,c.vy)<42)return;
    const front=c.van?13:10,dx=Math.cos(c.a)*front,dy=Math.sin(c.a)*front;
    for(const p of game.people){
      if(p.downAt!==null||Math.abs(p.x-c.x)>30||Math.abs(p.y-c.y)>30)continue;
      if(Math.min(Math.hypot(p.x-c.x-dx,p.y-c.y-dy),Math.hypot(p.x-c.x+dx,p.y-c.y+dy))>16)continue;
      p.downAt=game.time;p.a=c.a+.8;
      const hitsBefore=driver.pedestrianHits??0;
      driver.pedestrianHits=Math.min(6,hitsBefore+1);
      if(hitsBefore===5)raise(1,'Aviso de atropellos');
      if(!reduced.matches)sparks(p.x,p.y,'#f9e3c1',4);
      c.s*=.88;c.vx*=.88;c.vy*=.88;
    }
  }
  function vehicleContact(driver,c,other,rad){
    if(other===c||other.air)return;
    const dx=c.x-other.x,dy=c.y-other.y,limit=rad+(other.van?15:13);
    if(Math.abs(dx)>limit||Math.abs(dy)>limit)return;
    const gap=Math.hypot(dx,dy);
    if(gap>=limit||gap<=.05)return;
    const approach=-(c.vx*dx+c.vy*dy)/gap;
    if(approach>36)raise(3,'Choque entre vehículos');
    if(other.kind==='police')return; // Patrol AI applies the physical response separately.
    move(c,dx/gap*(limit-gap)*.72,dy/gap*(limit-gap)*.72,rad);
    if(Math.abs(c.s)>76)damage(Math.min(22,Math.abs(c.s)/16),driver);
    c.s*=.80;c.vx*=.80;c.vy*=.80;
  }
  function movement(dt,p=game.player,mask=localMask()){
    const u=!!(mask&1),d=!!(mask&2),l=!!(mask&4),r=!!(mask&8);
    const c=p.car,hor=Number(r)-Number(l),ver=Number(d)-Number(u);
    if(!c){
      if(hor||ver){const len=Math.hypot(hor,ver);p.a=Math.atan2(ver,hor);move(p,hor/len*145*dt,ver/len*145*dt,8);}
      return;
    }
    const brake=!!(mask&16), spec=CAR_TYPES[c.type], {top,accel,radius:rad}=spec;
    if(u&&!d)c.s+=dt*(c.s<0?330:accel);
    else if(d&&!u)c.s-=dt*(c.s>0?327:accel*.75);
    else c.s*=Math.pow(.61,dt);
    if(brake)c.s*=Math.pow(.15,dt);
    c.s=clamp(c.s,-spec.reverse,top);if(Math.abs(c.s)<1)c.s=0;
    c.a+=hor*(c.s<0?-1:1)*(spec.steer+(brake?.68:0))*clamp(Math.abs(c.s)/48,0,1)*dt;
    const grip=Math.min(1,dt*(brake?4.9:spec.grip));
    c.vx+=(Math.cos(c.a)*c.s-c.vx)*grip;c.vy+=(Math.sin(c.a)*c.s-c.vy)*grip;
    if(c.air){
      c.x=clamp(c.x+c.vx*dt,20,W-20);c.y=clamp(c.y+c.vy*dt,20,H-20);return;
    }
    const beforeX=c.x,beforeY=c.y;
    let crash=move(c,c.vx*dt,c.vy*dt,rad);
    if(roadblockHit(c,rad)){
      c.x=beforeX;c.y=beforeY;crash=true;
      if(Math.abs(c.s)>90&&game.time-game.hitAt>.5)notify('Barricada policial. Busca otra calle.',2.4);
    }
    if(crash){const v=Math.hypot(c.vx,c.vy);c.s*=-.23;c.vx*=.12;c.vy*=.12;if(v>66)damage(Math.min(27,v/10),p);}
    hitPedestrians(p,c);
    for(const other of game.cars)vehicleContact(p,c,other,rad);
    for(const other of game.police)vehicleContact(p,c,other,rad);
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
  }
  function positionPedestrians(){
    const t=game.time-game.enteredAt;
    for(const p of game.people){
      if(p.downAt!==null)continue;
      const wave=t*p.pace/p.range+p.offset,d=Math.sin(wave)*p.range,forward=Math.cos(wave)>0;
      p.x=p.ox+(p.cross?d:0);p.y=p.oy+(p.cross?0:d);
      p.a=p.cross?(forward?0:Math.PI):(forward?Math.PI/2:-Math.PI/2);
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
    avenueNodes=ALLEY?nodes.concat([{x:ALLEY.x,y:ALLEY.from},{x:ALLEY.x,y:ALLEY.to},{x:DOCK.from,y:DOCK.y},{x:DOCK.to,y:DOCK.y}]):nodes.slice();
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
    for(const g of sector?.gates||[]){
      const id=avenueNodes.push(g)-1;
      street(gridId(nearest(X,g.x),nearest(Y,g.y)),id,'exit');
    }
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
    const team=actors(),spawnTarget=(team[game.police.length%team.length].car||team[game.police.length%team.length]);
    if(game.heat===0){
      if(game.police.length)game.police.length=0;
      return;
    }
    game.spawn-=dt;
    if(game.spawn<=0&&game.police.length<game.heat+1){
      const candidates=nodes.filter(n=>dist(n,spawnTarget)>315&&dist(n,spawnTarget)<640&&game.police.every(q=>dist(q,n)>90));
      const at=candidates[Math.floor(game.seed()*candidates.length)]||nodes.find(n=>dist(n,spawnTarget)>410);
      if(at){
        const role=game.heat>=2&&game.police.length%2===1?'interceptor':'patrulla';
        game.police.push(makeCar(at.x,at.y,Math.atan2(spawnTarget.y-at.y,spawnTarget.x-at.x),'#d2ded1',{kind:'police',role,rethink:0,aim:null}));
      }
      game.spawn=game.police.length===1?1.8:3.4;
    }
    let close=false;
    for(const cop of game.police){
      const target=team.length===2&&dist(cop,team[1].car||team[1])<dist(cop,player())?team[1]:team[0],p=target.car||target;
      const gap=dist(cop,p);
      if(gap<232&&!p.air)close=true;
      if(gap>1010){cop.gone=true;continue;}
      cop.rethink-=dt;
      if(cop.rethink<=0||!cop.aim||dist(cop,cop.aim)<16){
        cop.rethink=.23;
        const lead=cop.role==='interceptor'&&target.car&&Math.abs(p.s)>80?clamp(Math.abs(p.s)*.65,65,175):0;
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
      if(!p.air&&gap<(target.car?29:21)){
        const n=gap||1;
        move(p,(p.x-cop.x)/n*9,(p.y-cop.y)/n*9,target.car?15:8);
        if(target.car)p.s*=.83;
        damage(target.car?11+game.heat*2:14+game.heat*2,target);
        if(phase!=='play')return;
      }
    }
    game.police=game.police.filter(c=>!c.gone);
    if(close)game.quiet=0;
    else if((game.quiet+=dt)>8.5){
      game.heat--;game.quiet=0;game.police=game.police.slice(0,game.heat);
      if(game.heat===0){resetPedestrianCounts();notify('Has perdido a las patrullas.');}
    }
  }
  function update(dt){
    if(phase!=='play'||dialog||!selected&&!net.connected||net.joining)return;
    game.time+=dt;game.shake=Math.max(0,game.shake-dt);
    positionPedestrians();
    movement(dt);if(phase!=='play')return;
    if(game.buddy)movement(dt,game.buddy,performance.now()-hostInputAt<550?hostInput:0);
    if(phase!=='play')return;
    crossExit();
    traffic(dt);chase(dt);if(phase!=='play')return;
    policeBlock();
    stepJob(dt);
    if(game.waypoint===true&&dist(player(),GARAGE)<39){game.waypoint=false;notify('Garaje: destino alcanzado.');}
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
    const isPolice=c.kind==='police',isPlayer=c===game.player.car,hover=c.type==='hover',len=c.van?46:hover?47:c.type==='sport'?42:c.type==='compact'?34:38,wide=c.van?24:21;
    if(c.air){ctx.fillStyle='#0e112547';ctx.beginPath();ctx.ellipse(c.x+5,c.y+4,24,13,c.a,0,TAU);ctx.fill();}
    ctx.save();ctx.translate(c.x,c.y-(c.air?15:0));ctx.rotate(c.a);
    if(isPolice||isPlayer||c.kind==='traffic'){
      ctx.drawImage(headlights,len/2-5,-22,isPlayer?67:51,44);
      ctx.drawImage(taillights,-len/2-18,-14,24,28);
    }
    rect(ctx,-len/2+4,-wide/2+4,len,wide,'#100e20ab');
    for(const x of [-len/2+5,len/2-12])for(const y of [-wide/2-2,wide/2-3])rect(ctx,x,y,7,5,hover?'#4a4377':'#191d19');
    if(hover){
      if(c.air)ctx.drawImage(blueLights,-55,-30,66,60);
      for(const side of [-1,1]){
        path(ctx,[[-20,side*7],[8,side*8],[-2,side*17],[-20,side*14]],'#7c78bd');
        rect(ctx,-19,side*13-1,12,3,c.air?'#b7fff6':'#a8a3ea');
      }
    }
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
    if(isPlayer){const y=c.y-(c.air?40:26);path(ctx,[[c.x-5,y],[c.x+5,y],[c.x,y+6]],LIME);}
  }
  function drawPerson(p,isPlayer=false){
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.a);
    if(p.downAt!=null){
      const age=game.time-p.downAt;
      ctx.globalAlpha=clamp((2.6-age)*2,0,1);
      rect(ctx,-9,-3,18,8,'#151426ae');rect(ctx,-5,-3,10,6,p.color);
      rect(ctx,-10,-2,6,4,'#252d36');rect(ctx,5,-2,4,4,'#d4ab87');ctx.restore();return;
    }
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
    if(m&&(!m.job.sector||sameSector(...m.job.sector))&&!choosing&&!m.job.steps[m.idx].van){
      const goal=m.job.steps[m.idx];marker(goal.x,goal.y,guideColor(goal),goal.action?'●':goal.stop?'Ⅱ':'+',!game.waypoint);
    }
    drawStreetChanges();
    if(!game.won){marker(PHONE.p.x,PHONE.p.y,LIME,'P',choosing||target===PHONE.p);marker(PHONE.m.x,PHONE.m.y,ORANGE,'M',choosing||target===PHONE.m);}
    marker(GARAGE.x,GARAGE.y,CYAN,'G',game.waypoint);
    for(const g of sector?.gates||[]){
      const a=Math.atan2(g.dy,g.dx),x=g.x-g.dx*58,y=g.y-g.dy*58;
      ctx.save();ctx.translate(x,y);ctx.rotate(a);
      for(const side of [-1,1]){rect(ctx,-47,side*41-2,91,4,'#9ed2ff');rect(ctx,-44,side*37-2,75,3,'#9ed2ff47');}
      for(const step of [-31,-5,21])path(ctx,[[step+9,0],[step,12],[step-6,12],[step+2,0],[step-6,-12],[step,-12]],'#abdef7a0');
      ctx.restore();
      marker(g.x,g.y,CYAN,g.arrow,target===g);
      if(dist(p,g)<260){
        ctx.font='700 12px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        const label=g.target.toUpperCase(),w=ctx.measureText(label).width+18;
        rect(ctx,g.x-w/2,g.y-41,w,21,'#17152be8');
        ctx.fillStyle=CYAN;ctx.fillText(label,g.x,g.y-30);
      }
    }
    for(const cache of game.caches){
      if(dist(p,cache)>145||profile.discoveries.includes(cache.id))continue;
      const x=cache.x,y=cache.y,near=nearbyCache()===cache;
      rect(ctx,x-10,y-6,23,15,'#211628ab');
      rect(ctx,x-10,y-8,20,14,'#714d59');rect(ctx,x-8,y-6,16,10,'#c77c77');
      rect(ctx,x-6,y-4,12,6,'#382a47');rect(ctx,x-4,y-2,8,2,'#ffe2a6');
      if(near)marker(x,y-22,'#ffd99d','+',true);
    }
    const visible=o=>o.x>camera.x-40&&o.x<camera.x+ww+40&&o.y>camera.y-40&&o.y<camera.y+wh+40;
    for(const p of game.people)if(visible(p)&&(p.downAt===null||game.time-p.downAt<2.6))drawPerson(p);
    for(const c of game.cars)if(c!==game.player.car&&!c.air&&visible(c)){
      drawCar(c);if(c.job&&m?.job.steps[m.idx].van)marker(c.x,c.y-27,ORANGE,'+',true);
      if(c.kind==='ally')marker(c.x,c.y-27,'#ffbf83','C',true);
      if(c.reward)marker(c.x,c.y-26,LIME,'D');
    }
    if(game.buddy){
      const other=game.buddy.car||game.buddy;
      if(visible(other)){
        if(!game.buddy.car)drawPerson({...other,color:ORANGE,origin:3});
        marker(other.x,other.y-(game.buddy.car?33:25),ORANGE,net.joining?'1':'2');
      }
    }
    for(const c of game.police)if(visible(c))drawCar(c);
    for(const c of game.cars)if(c.air&&c!==game.player.car&&visible(c))drawCar(c);
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
    for(const g of sector?.gates||[])s+=`<circle cx="${g.x}" cy="${g.y}" r="45" fill="#23213a" stroke="${CYAN}" stroke-width="9"/><text x="${g.x}" y="${g.y+20}" fill="${CYAN}" font-family="sans-serif" font-size="60" text-anchor="middle" font-weight="700">${g.arrow}</text>`;
    return s;
  };
  let staticMap='';
  function liveMap(){
    const p=player(),goal=phase==='title'?null:guideGoal(),route=navRoute(goal),b=game.block;
    const red=game.police.map(c=>`<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${c.role==='interceptor'?23:19}" fill="${RED}"/>`).join('');
    const dock=DOCK?`<path d="M${DOCK.from} ${DOCK.y}H${DOCK.to}" stroke="${dockOpen()?'#82d4c0':'#887068'}" stroke-width="14" ${dockOpen()?'':'stroke-dasharray="18 16"'}/>`:'';
    const block=b?`<path d="M${b.x-17} ${b.y-17}l34 34m0-34-34 34" stroke="${RED}" stroke-width="13"/>`:'';
    const line=route?.points.length>1?`<polyline data-gps="true" points="${route.points.map(q=>[Math.round(q.x),Math.round(q.y)].join(',')).join(' ')}" fill="none" stroke="${guideColor(goal)}" stroke-width="16" stroke-linejoin="round"/>`:'';
    const marked=goal===GARAGE_GOAL||goal?.arrow||game.mission&&!game.mission.job.steps[game.mission.idx].choice;
    const ally=game.mission?.ally?.car;
    const other=game.buddy?.car||game.buddy;
    return dock+line+red+block+(ally?`<circle cx="${ally.x}" cy="${ally.y}" r="31" fill="#ffbf83"/>`:'')+(goal&&marked?`<circle cx="${goal.x}" cy="${goal.y}" r="55" fill="none" stroke="${guideColor(goal)}" stroke-width="11"/>`:'')+(other?`<circle cx="${other.x}" cy="${other.y}" r="33" fill="${ORANGE}" stroke="#1f2139" stroke-width="8"/>`:'')+`<circle cx="${p.x}" cy="${p.y}" r="36" fill="#fff0f7" stroke="#1f2139" stroke-width="9"/>`;
  }
  const set=(id,text)=>{const e=$(id);if(e.textContent!==text)e.textContent=text;};
  function nearbyCache(){
    const p=game.player;
    return mode==='free'&&phase==='play'&&!dialog&&!p.car?game.caches.find(c=>
      dist(p,c)<43&&!profile.discoveries.includes(c.id)&&trace(p.x,p.y,c.x,c.y,5)):null;
  }
  let uiT=0,personalMessage='',personalUntil=0;
  function updateUI(){
    const c=game.player.car,p=player(),m=game.mission,goal=activeGoal();
    set('cash',`${fmt(profile.cash)} CR`);set('wrench-stock',profile.unlimitedWrenches?'∞ llaves':`${profile.wrenches} ${profile.wrenches===1?'llave':'llaves'}`);
    $('journal-badge').hidden=profile.discoveries.length===profile.discoveryClaims.length;
    set('journal-badge',profile.discoveries.length-profile.discoveryClaims.length);
    set('condition-label',c?.air?'EN VUELO':c?CAR_TYPES[c.type].name.toUpperCase():'ENERGÍA');$('integrity').value=p.hp;
    $('free-job').hidden=mode!=='free'||phase!=='play';$('free-job').disabled=!!m||!!dialog;
    $('touch-flight').hidden=c?.type!=='hover';
    $('stars').setAttribute('aria-label',`Alerta: ${game.heat} de 3`);
    Array.from($('stars').children).forEach((star,i)=>star.classList.toggle('lit',i<game.heat));
    const district=(p.x>W*.56?2:0)+(p.y>H*.55?1:0);
    set('neighborhood',config.districts[district].toUpperCase());
    $('speed').hidden=!c;if(c)set('speed',`${Math.round(Math.abs(c.s)*.55)} KM/H`);
    const near=interactable();$('prompt').hidden=!near;
    if(near)set('prompt',`${touchMode()?'ACCIÓN':'E'} · ${near.name}`);
    const privateMsg=personalUntil>performance.now()?personalMessage:'';
    const objectiveKey=m?`${mode}/${chapterIndex}/${m.id}/${m.idx}`:'';
    if(objectiveKey!==lastObjective){
      lastObjective=objectiveKey;objectiveUntil=m?performance.now()+5400:0;
      if(m){set('objective-tag',`RADIO / OBJETIVO ${m.idx+1} DE ${m.job.steps.length}`);set('objective-message',m.job.steps[m.idx].text);}
    }
    const showObjective=phase==='play'&&!dialog&&!!m&&performance.now()<objectiveUntil;
    $('objective-toast').hidden=!showObjective;
    $('broadcast').hidden=showObjective&&!privateMsg||!privateMsg&&(!game.msg||game.time>game.msgUntil);
    if(!$('broadcast').hidden)set('broadcast',privateMsg||game.msg);
    set('guide-mode',mode==='free'?'MODO LIBRE':'CAMPAÑA');
    set('campaign-count',mode==='free'?`${profile.freeDone} SECUNDARIAS`:`${game.missionDone}/${FINAL_COUNT} MISIONES`);
    for(const [side,hood] of [['p','El Cruce'],['m','Viejo Muelle']]){
      const trust=game.trust[side],tag=$(side+'-rep');
      tag.dataset.rapport=trust<0?'hostile':trust>=2?'ally':'neutral';
      set(side+'-rep',trust<0?'Con recelo':trust>=2?'Aliados':trust===1?'Buena relación':hood);
    }
    $('reward').hidden=!game.gift;
    if(game.gift)set('reward-name',game.gift==='p'?'Deportivo disponible junto a la salida':'Paso privado de Puerto Umbral');
    $('mission-distance').hidden=!goal||phase==='title';
    $('mobile-goal').hidden=(!m&&!game.waypoint)||phase!=='play';
    $('mobile-goal').classList.toggle('clock',!!m&&!!timeLimit(m));
    const route=phase==='title'?null:navRoute();
    const meters=goal?Math.round(!game.waypoint&&route?route.length:dist(p,goal)):0;
    if(m){
      const limit=timeLimit(m),seconds=limit?Math.max(0,Math.ceil(limit-game.time)):0;
      set('brief-title',m.job.name);
      const stage=m.job.steps[m.idx],choice=stage.choice;
      const source=m.job.steps[0].van?'la furgoneta marcada':'un coche';
      let objective=stage.text;
      if(choice)objective='Acércate con la furgoneta a P para el deportivo o a M para el atajo. La entrega es automática.';
      else if(m.pendingTimer)objective=`Sube a ${source} para iniciar el cronómetro.`;
      else if(goal?.arrow)objective=`El encargo sigue en el sector ${m.job.sector.join(', ')}. Toma la salida ${goal.name.toLowerCase()} para volver.`;
      else if(stage.stop)objective+=` Quédate parado ${Math.ceil(stage.stop)} s dentro de la marca.`;
      else if(stage.escort)objective=goal?.kind==='ally'?'Vuelve con el convoy C: se ha detenido.':`${objective} Mantente cerca del convoy C.`;
      if(!c&&!m.pendingTimer&&!stage.van&&!stage.action&&!choice&&!game.buddy)objective='Sube a un coche. '+objective;
      if(stage.stop&&m.hold>0){const remain=Math.max(1,Math.ceil(stage.stop-m.hold));objective=`Mantén el coche parado · ${remain} s`;}
      set('brief-text',objective);
      set('mission-distance',`${m.idx+1}/${m.job.steps.length} · ${choice?'P o M':meters+' m'}${limit?' · '+seconds+' s':''}`);
      set('mobile-goal-progress',m.pendingTimer?'SALIDA':limit?`${seconds} s`:`${m.idx+1}/${m.job.steps.length}`);
      set('mobile-goal-text',objective);
    }else{
      const title=phase==='title',remaining=JOBS.length-chapterDone();
      set('brief-title',mode==='free'?'Patrulla libre':game.won?'Campaña completa':title?config.subtitle:remaining===0?'Mapa completado':'Elige una misión');
      set('brief-text',mode==='free'?'Sigue las salidas del mapa para explorar más sectores o pulsa J para pedir un encargo.':game.won?'Las 25 misiones están completas.':title?config.story:remaining===0?'Ya completaste todas las misiones de este mapa.':`Queda${remaining===1?'':'n'} ${remaining} ${remaining===1?'misión':'misiones'} en ${config.name}. Puedes hacerlas en el orden que quieras.`);
    }
    if(game.waypoint){
      const dest=guideGoal();
      set('mission-distance',`GPS · ${dest.name} · ${Math.round(route?.length??dist(p,dest))} m`);
      $('mission-distance').hidden=false;set('mobile-goal-progress','GPS');set('mobile-goal-text',dest.arrow?dest.text:'Sigue la ruta azul para llegar al garaje.');
    }
    $('mini-live').innerHTML=liveMap();
  }
  const touchMode=()=>matchMedia('(pointer:coarse), (max-width:760px)').matches;
  function refreshShell(){
    $('stage').dataset.phase=phase==='title'?'title':dialog||phase;
    $('title-screen').hidden=phase!=='title';$('hud').hidden=!['play','end','win'].includes(phase);
    $('touch').hidden=phase!=='play'||!!dialog;
    $('pause').disabled=phase!=='play';
    $('fs-pause').disabled=phase!=='play'||!!dialog;
    $('map-btn').disabled=phase!=='title'&&phase!=='play';
    $('pause').setAttribute('aria-pressed',String(dialog==='pause'));
    for(const id of ['shop-btn','pass-btn','radio-btn','journal-btn','fs-btn'])$(id).tabIndex=dialog?-1:0;
    $('shop-btn').disabled=$('pass-btn').disabled=!!dialog;
    $('radio-btn').disabled=$('journal-btn').disabled=!!dialog;
    set('state-label',net.connected?'LIBRE ONLINE · '+(net.hosting?'J1':'J2'):dialog==='pause'?'PARTIDA EN PAUSA':dialog==='map'?'PLANO DE LA CIUDAD':phase==='title'?'ELIGE CÓMO JUGAR':phase==='board'?'CENTRAL DE ENCARGOS':phase==='select'?'SELECCIÓN DE MAPA':phase==='end'?'FUERA DE SERVICIO':phase==='win'?'CAMPAÑA COMPLETA':mode==='free'?'MODO LIBRE':'HISTORIA LOCAL');
    set('city-stamp',sector?`SECTOR ${sector.x}, ${sector.y}`:config.stamp);set('city-header',config.name);
    set('mini-title',sector?'MAPA DEL SECTOR':'PLANO DE LA CIUDAD');
    set('mini-caption',sector?'Flechas: salidas · G: garaje':'P / M: teléfonos · G: garaje');
    set('campaign-title',sector?'Distritos vecinos':'Ruta a Miami');
    set('track-detail',sector?'Cuatro salidas · modo libre':'24 misiones antes del final');
    $('chapter-list').setAttribute('aria-label',sector?'Distritos vecinos':'Capítulos de la campaña');
    canvas.setAttribute('aria-label',`${config.name}, vista cenital`);
    $('mini').setAttribute('aria-label',`Mapa de ${config.name}`);
    $('chapter-list').innerHTML=sector?sector.gates.map(g=>`<li data-status="open"><span class="chapter-number">${g.arrow}</span><span class="chapter-name">${g.target}</span><span class="chapter-score">${g.name}</span></li>`).join(''):chapters.map((c,i)=>{
      const ids=Object.keys(c.jobs),done=ids.filter(id=>game.completed.has(id)).length;
      const status=done===ids.length?'complete':i===chapterIndex?'active':i===MIAMI&&!finaleReady()?'locked':'open';
      return `<li data-status="${status}" ${i===chapterIndex?'aria-current="step"':''}><span class="chapter-number">0${i+1}</span><span class="chapter-name">${c.name}</span><span class="chapter-score" aria-label="${done} de ${ids.length} misiones">${done}/${ids.length}</span></li>`;
    }).join('');
    updateUI();paintDirty=true;render();
  }
  function clearInput(){keys.clear();touches.clear();document.querySelectorAll('.held').forEach(b=>b.classList.remove('held'));}
  function start(){
    if(net.busy)leaveRoom(false);
    mode='story';clearInput();readyAudio();effect('job');
    if(sector)loadChapter(0,false);
    if(game.won){phase='win';showDialog('win');}
    else showCities();
  }
  function startFree(){
    if(net.busy)leaveRoom(false);
    mode='free';clearInput();readyAudio();effect('job');showCities();
  }
  function showBoard(){
    phase='board';game.msg='';game.waypoint=false;game.nav=null;showDialog('jobs');
  }
  function showCities(){phase='select';game.msg='';game.mission=null;clearPursuit();game.waypoint=false;game.nav=null;showDialog('cities');}
  function chooseWorld(index){
    if(net.joining||!Number.isInteger(index)||!chapters[index])return;
    if(mode==='free'){
      if(index===MIAMI)return;
      enterFree(...atlas.starts[index]);return;
    }
    if(net.connected||index===MIAMI&&!finaleReady()||game.won)return;
    if(index!==chapterIndex)loadChapter(index);
    showBoard();
  }
  function enterFree(x,y){
    loadSector(x,y);sectorHint=-Infinity;phase='play';closeDialog(false);$('stage').focus({preventScroll:true});
    notify('Sigue las flechas del mapa para explorar o pulsa J para pedir un encargo.',6);
  }
  function showOnline(){
    mode='free';phase='title';
    roomStatus='Crea una sala o entra con el código de tu compañero.';
    showDialog('online');
  }
  function renderLobby(){
    const body=$('dialog-content'), previous=$('room-input')?.value||'';
    body.innerHTML=`<p class="room-intro">Dos jugadores, dos coches y encargos infinitos en modo libre. La historia se juega en local.</p>
      <p id="room-message" class="room-status" role="status"></p>
      ${net.hosting&&net.code?`<div class="room-code"><div><span>CÓDIGO DE SALA</span><output id="room-code">${net.code}</output></div><button type="button" class="secondary" data-online="copy">Copiar código</button></div>`
      :net.busy?'<div class="room-wait">Estableciendo conexión…</div>'
      :'<div class="room-options"><button class="primary" type="button" data-online="host">Crear sala</button><form id="room-form"><label for="room-input">Código de sala</label><div><input id="room-input" name="code" type="text" maxlength="8" spellcheck="false" autocomplete="off" autocapitalize="characters" placeholder="Ej. 7H2MV5FT"><button class="secondary" type="submit">Unirme</button></div></form></div>'}`;
    set('room-message',roomStatus);
    if($('room-input'))$('room-input').value=previous;
  }
  function leaveRoom(goTitle=true){
    net.close();hostInput=0;remoteAction=guestAction=0;guestMenu='';
    pendingRepair=0;seenReward=latestReward=lastRepairRequest=0;buddyRide='stock';
    game.buddy=null;
    if(soloBackup!==null){loadChapter(soloBackup,false);soloBackup=null;}
    syncProfile();
    if(goTitle)showTitle();
  }
  function sendInput(){
    if(!net.joining||!net.connected)return;
    net.send({type:'input',mask:phase==='play'&&!dialog&&selected?localMask():0,action:guestAction});
  }
  const quant=n=>Math.round((n||0)*100)/100;
  const actorWire=p=>[quant(p.x),quant(p.y),quant(p.a),quant(p.hp),p.car?.id??null,p.pedestrianHits??0];
  const carWire=c=>[c.id??null,quant(c.x),quant(c.y),quant(c.a%TAU),quant(c.s),quant(c.hp),c.type,c.color,c.kind,Number(!!c.van)+2*Number(!!c.starter)+4*Number(!!c.reward)+8*Number(!!c.job)+16*Number(!!c.air),c.role??null];
  function sendSnapshot(){
    if(!net.hosting||!net.connected||!game.buddy)return;
    const m=game.mission;
    net.send({type:'state',sector:sector?[sector.x,sector.y]:atlas.starts[0],phase,menu:dialog||'',t:quant(game.time),entered:quant(game.enteredAt),heat:game.heat,reward:latestReward,end:game.endReason,
      msg:game.msg,until:game.msgUntil,car:game.cars.map(carWire),cop:game.police.map(carWire),p:[actorWire(game.player),actorWire(game.buddy)],
      pd:game.people.filter(p=>p.downAt!==null).map(p=>[p.id,quant(p.x),quant(p.y),quant(p.a),quant(p.downAt)]),
      block:game.block&&{id:game.block.id,x:game.block.x,y:game.block.y,dx:game.block.dx},
      m:m&&[m.job.serial,m.job.kind,m.job.points,m.idx,m.deadline,m.hold,m.job.sector]});
  }
  function receiveSnapshot(d){
    if(!Array.isArray(d.sector)||d.sector.length!==2||!atlas.valid(...d.sector)||!['select','wait','play','end'].includes(d.phase)
      ||!Array.isArray(d.car)||d.car.length>130||!Array.isArray(d.cop)||d.cop.length>8
      ||!Array.isArray(d.p)||d.p.length!==2||d.p.some(p=>!Array.isArray(p)||!p.slice(0,4).every(Number.isFinite))
      ||!Number.isFinite(d.t))return;
    const changedWorld=!sameSector(...d.sector);
    if(changedWorld)loadSector(...d.sector);
    const parseCar=v=>({id:v[0],x:v[1],y:v[2],a:v[3],s:v[4],hp:v[5],type:Object.hasOwn(CAR_TYPES,v[6])?v[6]:'sedan',
      color:typeof v[7]==='string'&&/^#[0-9a-f]{6}$/i.test(v[7])?v[7]:CYAN,kind:v[8],van:!!(v[9]&1),starter:!!(v[9]&2),reward:!!(v[9]&4),job:!!(v[9]&8),air:!!(v[9]&16)&&v[6]==='hover',role:v[10]});
    const parseActor=v=>({x:v[0],y:v[1],a:v[2],hp:v[3],car:v[4]===null?null:byId.get(v[4])||null,pedestrianHits:clamp(Math.trunc(v[5])||0,0,6)});
    const carOk=v=>Array.isArray(v)&&v.slice(1,6).length===5&&v.slice(1,6).every(Number.isFinite);
    const cars=d.car.filter(carOk).map(parseCar),byId=new Map(cars.map(c=>[c.id,c]));
    game.cars=cars;game.police=d.cop.filter(carOk).map(parseCar);
    game.player=parseActor(d.p[1]);game.buddy=parseActor(d.p[0]);
    Object.assign(game,{time:d.t,enteredAt:Number.isFinite(d.entered)?d.entered:0,heat:clamp(Math.round(d.heat)||0,0,3),
      endReason:String(d.end??'').slice(0,180),msg:typeof d.msg==='string'?d.msg.slice(0,240):'',msgUntil:Number(d.until)||0,block:d.block&&[d.block.x,d.block.y,d.block.dx].every(Number.isFinite)?d.block:null});
    for(const p of game.people)p.downAt=null;
    if(Array.isArray(d.pd)&&d.pd.length<=game.people.length)for(const v of d.pd){
      if(!Array.isArray(v)||v.length!==5||!v.every(Number.isFinite)||!Number.isInteger(v[0]))continue;
      const p=game.people[v[0]];
      if(p)Object.assign(p,{x:v[1],y:v[2],a:v[3],downAt:v[4]});
    }
    positionPedestrians();
    if(Number.isSafeInteger(d.reward)&&d.reward>seenReward){
      const prize=FREE_JOB_TYPES[d.reward%8-1];
      if(prize){seenReward=d.reward;profile.freeDone++;progress.earn(profile,prize.pay,prize.xp);syncProfile();}
    }
    const v=d.m,prior=game.mission?.job;
    const job=Array.isArray(v)?prior?.serial===v[0]&&prior.kind===v[1]?prior:freeJob(v[0],v[1],v[2],v[6]):null;
    game.mission=job&&Number.isInteger(v[3])&&job.steps[v[3]]?{id:`free-${job.serial}`,side:'f',job,idx:v[3],deadline:Number(v[4])||0,finishBy:0,pendingTimer:false,hold:Number(v[5])||0,van:null,ally:null}:null;
    const next=`${d.phase}/${d.menu}`;
    if(next!==guestMenu){
      guestMenu=next;
      if(d.phase==='play'&&!d.menu){
        phase='play';closeDialog(false);$('stage').focus({preventScroll:true});
      }else if(d.phase==='end'){phase=d.phase;showDialog(d.phase);}
      else{phase='wait';showDialog(d.phase==='play'?'hostpause':'waiting');}
    }else if(changedWorld){refreshShell();}
    paintDirty=true;
  }
  net.onStatus=msg=>{
    roomStatus=msg;
    if(dialog==='online'){
      if($('room-input')&&!net.busy)set('room-message',msg);
      else renderLobby();
    }
  };
  net.onConnect=()=>{
    hostInputAt=hostInput=remoteAction=guestAction=0;guestMenu='';
    mode='free';seenReward=latestReward=lastRepairRequest=0;buddyRide='stock';
    if(net.hosting){
      loadSector(...atlas.starts[0]);
      showCities();
      sendSnapshot();
    }else{
      soloBackup=chapterIndex;
      loadSector(...atlas.starts[0]);phase='wait';showDialog('waiting');sendInput();sendRide();
    }
  };
  net.onLost=msg=>{leaveRoom(false);showOnline();roomStatus=msg;renderLobby();};
  net.onData=d=>{
    if(net.hosting&&d.type==='input'){
      if(!Number.isInteger(d.mask)||d.mask<0||d.mask>31||!Number.isInteger(d.action)||d.action<0||d.action>65535)return;
      hostInput=d.mask;hostInputAt=performance.now();
      if(d.action!==remoteAction){
        remoteAction=d.action;
        if(game.buddy&&performance.now()-lastRemoteUse>100){lastRemoteUse=performance.now();interact(game.buddy);}
      }
    }else if(net.hosting&&d.type==='command'){
      if(d.cmd==='ride'&&typeof d.ride==='string'&&Object.hasOwn(SHOP,d.ride)){
        buddyRide=d.ride;if(setStarter('starter-2',buddyRide)&&buddyRide==='stock')game.cars.find(c=>c.id==='starter-2').color=ORANGE;
      }
      if(phase!=='play'||dialog||!game.buddy)return;
      if(d.cmd==='job')startFreeJob();
      if(d.cmd==='flight')flight(game.buddy);
      if(d.cmd==='repair'&&Number.isSafeInteger(d.request)&&d.request>lastRepairRequest){
        lastRepairRequest=d.request;
        const c=game.buddy.car,ok=!!c&&c.hp<100;
        if(ok){c.hp=100;sparks(c.x,c.y,CYAN);}
        net.send({type:'repaired',request:d.request,ok});
      }
    }else if(net.joining){
      if(d.type==='state')receiveSnapshot(d);
      if(d.type==='notice'&&typeof d.msg==='string')showPersonal(d.msg.slice(0,170));
      if(d.type==='repaired'&&pendingRepair&&pendingRepair===d.request){
        pendingRepair=0;
        if(d.ok===true&&progress.useWrench(profile))showPersonal(repairedText());
      }
    }
  };
  function showPersonal(msg,ms=4600){personalMessage=msg;personalUntil=performance.now()+ms;updateUI();}
  function sendRide(){if(net.joining)net.send({type:'command',cmd:'ride',ride:profile.equipped});}
  let lastRemoteUse=-Infinity;
  const networkTick=setInterval(()=>{
    if(net.hosting)sendSnapshot();
    if(net.joining){sendInput();if(phase==='play'&&!dialog)updateUI();}
  },45);
  const sideDialogs=['shop','pass','save','radio','journal'];
  function openSide(kind,from=dialog){
    if(!sideDialogs.includes(from))backDialog=from;
    showDialog(kind);
  }
  function closeSide(){
    const from=backDialog;backDialog=null;
    if(from)showDialog(from);else closeDialog();
  }
  function renderShop(){
    $('dialog-content').innerHTML=`<div class="arcade-summary"><div><span>SALDO DISPONIBLE</span><strong>${fmt(profile.cash)} CR</strong></div><div><span>INVENTARIO</span><strong>${icon('wrench')} ${profile.unlimitedWrenches?'∞ llaves':profile.wrenches}</strong></div></div>
      <p>Compra con créditos del juego. El vehículo equipado aparece en tu próxima salida. Al cruzar a otro sector, conservas el coche que conduces.</p>
      <div class="garage-cards">${Object.entries(SHOP).filter(([id,v])=>!v.field||profile.owned.includes(id)).map(([id,v])=>{
        const owned=profile.owned.includes(id),equipped=profile.equipped===id,locked=v.price===null&&!owned;
        const label=equipped?'Equipado':owned?'Equipar':locked?'Nivel 50':`${fmt(v.price)} CR`;
        return `<article class="garage-card" style="--paint:${v.color}"><div class="ride-mark">${icon(id==='halo'?'wing':'grid')}</div><small>${v.tag}</small><h3>${v.name}</h3><p>${v.desc}</p><button type="button" class="${!owned&&!locked?'primary':'secondary'}" data-ride="${id}" ${equipped||locked||!owned&&profile.cash<v.price?'disabled':''}>${label}</button></article>`;
      }).join('')}</div><p id="shop-message" class="arcade-feedback" role="status"></p>`;
  }
  function renderPass(){
    const level=progress.rank(profile),threshold=progress.XP_PER_RANK,cap=progress.RANKS,fill=level===cap?100:Math.floor(profile.xp%threshold/threshold*100);
    const label=profile.unlocked?(level===cap?'PASE COMPLETADO':`${fmt(profile.xp%threshold)} / ${fmt(threshold)} XP PARA EL SIGUIENTE NIVEL`):`${fmt(profile.xp)} XP ACUMULADA`;
    $('dialog-content').innerHTML=`<div class="arcade-summary pass-summary"><div><span>${profile.unlocked?'NIVEL DEL PASE':'PASE BLOQUEADO'}</span><strong>${level} / ${cap}</strong></div><div><span>EXPERIENCIA TOTAL</span><strong>${fmt(profile.xp)} XP</strong></div></div>
      <div class="pass-meter"><progress value="${profile.unlocked?fill:0}" max="100" aria-label="Progreso del nivel"></progress><span>${label}</span></div>
      <p>${profile.unlocked?'Gana XP en la historia o en secundarias. Cada 500 XP sube un nivel; los hitos entregan su recompensa automáticamente.':'Termina la historia para desbloquear el pase. La XP que ganes mientras está bloqueado se acumula.'}</p>
      <ol class="pass-grid" aria-label="50 niveles del pase">${Array.from({length:cap},(_,i)=>i+1).map(n=>{
        const reward=progress.rewardFor(n);
        return `<li class="${n<=level?'earned':''} ${reward?'milestone':''} ${n===cap?'top-rank':''}" title="${reward||'Nivel '+n}"><span>${String(n).padStart(2,'0')}</span>${reward?`<small>${reward}</small>`:''}</li>`;
      }).join('')}</ol>
      <form id="pass-form" class="arcade-form"><label for="pass-code">Código de recompensa</label><div><input id="pass-code" maxlength="18" autocomplete="off" spellcheck="false" placeholder="Escribe el código"><button class="secondary" type="submit">Canjear</button></div></form>
      <p id="pass-message" class="arcade-feedback" role="status"></p>`;
  }
  const rewardLabels=reward=>[reward.cash?`+${fmt(reward.cash)} CR`:'',reward.xp?`+${fmt(reward.xp)} XP`:'',reward.tools?`+${reward.tools} ${reward.tools===1?'llave inglesa':'llaves inglesas'}`:'',reward.car?SHOP[reward.car]?.name:''].filter(Boolean);
  function renderJournal(){
    const entries=profile.discoveries.map(id=>discoveries.byId.get(id));
    const claimed=profile.discoveryClaims;
    $('dialog-content').innerHTML=`<div class="arcade-summary journal-summary"><div><span>CÓDIGOS ANOTADOS</span><strong>${entries.length}</strong></div><div><span>RECOMPENSAS CANJEADAS</span><strong>${claimed.length}</strong></div></div>
      ${entries.length?`<ul class="journal-list" aria-label="Inscripciones que conoces">${entries.map(e=>{
        const used=claimed.includes(e.id);
        return `<li><div><span>${e.name}</span><strong>${e.code}</strong><small>${rewardLabels(e.reward).join(' · ')}</small></div>${used?'<span class="journal-status">Canjeado</span>':`<button class="secondary" type="button" data-claim="${e.id}">Canjear</button>`}</li>`;
      }).join('')}</ul>`:`<div class="journal-empty">${icon('journal')}<div><strong>Aún no hay hallazgos</strong><p>Explora el modo libre. Si encuentras una inscripción, acércate a pie y pulsa E o Acción para anotarla.</p></div></div>`}
      <p id="journal-message" class="arcade-feedback" role="status"></p>`;
  }
  function redeemCode(code,from){
    const status=from==='journal'?'journal-message':'pass-message';
    const result=progress.redeem(profile,code);
    if(!result){set(status,'Código no reconocido.');return;}
    syncProfile();
    if(from==='journal')renderJournal();else renderPass();
    updateUI();if(!result.already)effect('win');
    if(result.type==='discovery'){
      set(status,result.already?'Esta recompensa ya está canjeada.':`Recompensa canjeada: ${rewardLabels(result.reward).join(' · ')}.`);
    }else if(result.type==='tools'){
      set(status,'Llaves infinitas activas. Pulsa Espacio para reparar sin gastar inventario.');
    }else{
      const payout=rewardLabels({...result,car:result.car?'aurora':null});
      set(status,payout.length?`Pase completado. Recompensas entregadas: ${payout.join(' · ')}.`:'El pase ya está completo. No quedan recompensas por entregar.');
    }
    if(from==='journal')$('overlay-panel').focus({preventScroll:true});else $('pass-code').focus();
  }
  function renderRadio(){
    $('dialog-content').innerHTML=`<div class="radio-readout"><div><span>EN EL DIAL</span><strong>${station.freq} <b>${station.name}</b></strong></div><span aria-live="polite">${muted?'SONIDO EN PAUSA':station.beat?'EN EMISIÓN':station.genre.toUpperCase()}</span></div>
      <div class="radio-grid" aria-label="Emisoras">${stations.map(s=>s.id==='spotify'
        ?`<a class="radio-channel" data-station="${s.id}" href="${playlist}" target="_blank" rel="noopener noreferrer" style="--station:${s.color}"><span>EXT · EN OTRA PESTAÑA</span><strong>Abrir playlist en Spotify ↗</strong><small>${s.desc}</small></a>`
        :`<button class="radio-channel" type="button" data-station="${s.id}" aria-pressed="${station===s}" style="--station:${s.color}"><span>${s.freq} ${s.beat?'FM':'· SIN MÚSICA'}</span><strong>${s.name}</strong><small>${s.genre}</small></button>`
      ).join('')}</div><p class="radio-note"><strong>V</strong> silencia todo. <strong>Solo efectos</strong> deja el motor y los avisos activos.</p>`;
  }
  function renderSave(){
    $('dialog-content').innerHTML=`<p>El juego conserva tu progreso mientras la página esté abierta. Copia este respaldo para continuar otro día en cualquier navegador.</p>
      <div class="arcade-form"><label for="backup-out">Tu respaldo actual</label><textarea id="backup-out" rows="3" readonly></textarea><button class="secondary" type="button" id="copy-backup">Copiar respaldo</button></div>
      <form id="save-form" class="arcade-form"><label for="backup-in">Restaurar un respaldo (reemplaza tu perfil actual)</label><textarea id="backup-in" rows="3" maxlength="8196" placeholder="Pega tu código UG6..." required></textarea><button class="secondary" type="submit">Restaurar perfil</button></form>
      <p id="save-message" class="arcade-feedback" role="status"></p>`;
    $('backup-out').value=progress.pack(profile);
  }
  function toggleFullscreen(){
    const active=$('cabinet').classList.toggle('viewport-fill');
    document.documentElement.classList.toggle('game-expanded',active);
    $('fs-btn').setAttribute('aria-pressed',String(active));
    const label=active?'Salir de pantalla completa':'Pantalla completa';
    $('fs-btn').setAttribute('aria-label',label);set('fs-label',label);
    resize();
  }
  function showDialog(kind){
    if(!dialog)lastFocus=document.activeElement;
    clearInput();dialog=kind;
    const panel=$('overlay-panel'), body=$('dialog-content'),actions=$('dialog-actions');
    panel.classList.toggle('map-dialog',kind==='map');
    panel.classList.toggle('atlas-dialog',kind==='map'&&!!sector);
    panel.classList.toggle('board-dialog',kind==='jobs'||kind==='cities'||sideDialogs.includes(kind));
    panel.classList.toggle('arcade-dialog',sideDialogs.includes(kind));
    $('close-overlay').hidden=['end','win','jobs','cities','online','waiting','hostpause'].includes(kind);
    const labels={jobs:[`${chapterIndex===MIAMI?'MISIÓN FINAL':'CENTRAL DE ENCARGOS'} / ${config.name.toUpperCase()}`, net.joining?'El anfitrión elige':'Elige una misión'],
      cities:[net.connected?'MODO LIBRE · JUGADOR 1':mode==='free'?'MODO LIBRE LOCAL':'HISTORIA LOCAL',mode==='free'?'Elige dónde empezar':'Elige un mapa'],online:['MODO LIBRE · 2 JUGADORES','Juega en línea'],
      waiting:['COOPERATIVO · JUGADOR 2','En la sala'],hostpause:['COOPERATIVO · JUGADOR 2','Partida en espera'],
      help:['MANUAL DE CALLE','Cómo jugar'],map:[`NAVEGACIÓN / ${config.name.toUpperCase()}`,sector?'Mapa del sector':'Plano de la ciudad'],pause:['TRANSMISIÓN EN PAUSA','Partida en pausa'],end:['TRANSMISIÓN INTERRUMPIDA','Fuera de servicio'],win:['CAMPAÑA COMPLETA · 25/25','United Gangs'],
      shop:['GARAJE / INVENTARIO','Tienda de coches'],pass:['RECOMPENSAS / 50 NIVELES','Pase de batalla'],save:['PERFIL / GUARDADO MANUAL','Respaldo de partida'],radio:['AUDIO / DIAL NOCTURNO','Radio de United Gangs'],journal:['EXPLORACIÓN / DIARIO DE CALLE','Hallazgos']};
    set('dialog-kicker',labels[kind][0]);set('dialog-title',labels[kind][1]);
    let buttons=[];
    if(sideDialogs.includes(kind)){
      if(kind==='shop')renderShop();else if(kind==='pass')renderPass();else if(kind==='radio')renderRadio();else if(kind==='journal')renderJournal();else renderSave();
      buttons=[['Cerrar','close',true],...(kind==='pass'&&!net.connected&&phase==='title'?[['Respaldo de partida','save']]:[]),...(kind==='journal'?[['Introducir código','pass']]:[])];
    }else if(kind==='jobs'){
      const report=game.lastReport;
      body.innerHTML=`<div class="board-progress"><span><strong>${chapterDone()}/${JOBS.length}</strong> en el capítulo</span><span>${fmt(game.cash)} CR</span></div>${report?'<div class="board-report" id="board-report" role="status"></div>':''}<div class="job-list">${JOBS.map(([id,job],i)=>{
        const done=game.completed.has(id),meta=done?'Completada':`${job.tag} · ${job.steps.length} etapas · ${fmt(job.pay)} CR · ${fmt(progress.storyXP(job))} XP`,hint=done?'HECHA':job.level===1?'FÁCIL':job.level===2?'MEDIA':'DIFÍCIL';
        return `<button type="button" class="job-card" data-job="${id}" data-level="${job.level}" ${done||net.joining?'disabled':''}><span class="job-number" aria-hidden="true">0${i+1}</span><span class="job-info"><strong>${job.name}</strong><span>${job.summary}</span><small>${meta}</small></span><span class="job-rank">${hint} ${done||net.joining?'':icon('arrow')}</span></button>`;
      }).join('')}</div>`;
      if(report){
        $('board-report').classList.add(report.style);
        $('board-report').textContent=`${report.title}: ${report.detail}`;
      }
      buttons=[['Cambiar mapa','cities'],['Tienda','shop'],['Pase','pass']];
    }else if(kind==='cities'){
      body.innerHTML=`<p class="cities-intro">${mode==='free'?'Elige tu primer distrito. Las salidas conectan un mundo sin final, con encargos ilimitados y un distrito Art Déco inspirado en Miami.':'Elige cualquiera de las cuatro ciudades. Miami se abre cuando completas las otras 24 misiones.'}</p>
        <div class="cities-grid">${(mode==='free'?chapters.slice(0,MIAMI):chapters).map((c,i)=>{
          const ids=Object.keys(c.jobs),done=ids.filter(x=>game.completed.has(x)).length,locked=i===MIAMI&&(mode==='free'||!finaleReady());
          return `<button type="button" class="city-card" data-world="${i}" data-theme="${c.style}" ${locked?'disabled':''}>
            <span class="city-index">0${i+1}</span><span class="city-name">${c.name}</span><span class="city-progress">${locked?'EXCLUSIVA · MISIÓN FINAL':mode==='free'?'EXPLORA / ENCARGOS INFINITOS':i===MIAMI?'MISIÓN FINAL DISPONIBLE':`${done}/${ids.length} ${done===ids.length?'COMPLETADAS':'MISIONES'}`}</span>${locked?'':icon('arrow')}
          </button>`;
        }).join('')}</div>`;
      buttons=[net.connected?['Salir de la sala','leave']:['Volver a la portada','title'],['Tienda','shop'],['Pase','pass']];
    }else if(kind==='online'){
      renderLobby();buttons=[['Volver a la portada','leave']];
    }else if(kind==='waiting'||kind==='hostpause'){
      body.innerHTML=`<p>${kind==='waiting'?'Conectado. El anfitrión está eligiendo un mapa.':'El anfitrión abrió un menú. La partida se reanudará cuando lo cierre.'}</p>`;
      buttons=[['Salir de la sala','leave']];
    }else if(kind==='help'){
      body.innerHTML='<p>En modo libre, sigue las salidas hacia distritos nuevos. Si ves una inscripción, léela a pie con E o Acción y consúltala en Hallazgos.</p><ul><li><strong>WASD / flechas:</strong> caminar y conducir. <strong>E:</strong> interactúa. <strong>Espacio:</strong> repara el coche.</li><li><strong>Mayús:</strong> freno de mano. <strong>H:</strong> vuela con el Halo X-9. Las misiones se completan desde tierra.</li><li><strong>J:</strong> pide un encargo. <strong>R:</strong> elige emisora. <strong>V:</strong> silencia todo.</li><li><strong>M:</strong> mapa. <strong>I:</strong> hallazgos. <strong>F:</strong> pantalla completa. <strong>Esc:</strong> menú.</li><li><strong>Alerta:</strong> el sexto atropello activa una estrella. Un choque fuerte contra otro vehículo activa tres.</li></ul>';
      buttons=[['Entendido','close',true]];
    }else if(kind==='map'){
      body.innerHTML=`<svg viewBox="0 0 ${W} ${H}" class="map-large" role="img" aria-label="Mapa de juego de ${config.name} con tu ruta">${staticMap+liveMap()}</svg>${sector?`<p class="atlas-note">Sector ${sector.x}, ${sector.y}. Marca una salida y conduce hasta la flecha para cruzar${net.connected?' con tu compañero':''}.</p><div class="atlas-exits">${sector.gates.map(g=>`<button class="secondary" type="button" data-exit="${g.id}"><b>${g.arrow} ${g.name}</b><span>${g.target} · ${g.nx}, ${g.ny}</span></button>`).join('')}</div>`:`<div class="legend"><span><b style="color:${LIME}">P</b>Pistones</span><span><b style="color:${ORANGE}">M</b>La Marea</span><span><b style="color:${CYAN}">G</b>Garaje</span><span><b>●</b>Tú</span><span><b style="color:${RED}">●</b>Patrulla</span><span><b style="color:${RED}">×</b>Bloqueo</span>${config.style==='miami'?'<span>Escenario ficticio inspirado en <a href="https://www.miamiandbeaches.com/neighborhoods/south-beach" target="_blank" rel="noopener noreferrer">South Beach</a>.</span>':''}</div>`}`;
      buttons=[['Cerrar mapa','close',true]];
      if(phase==='play'){
        if(game.waypoint!==true)buttons.push(['Marcar garaje','waypoint']);
        if(game.waypoint)buttons.push(['Quitar GPS','clear-gps']);
      }
    }else if(kind==='pause'){
      body.innerHTML=net.joining?'<p>Este menú no detiene la partida del anfitrión.</p>':'<p>La ciudad y los cronómetros se han detenido.</p>';
      buttons=[['Continuar','close',true],['Tienda','shop'],['Pase de batalla','pass'],['Radio','radio'],['Hallazgos','journal'],['Cómo jugar','pause-help'],...(!net.joining&&game.mission?[['Abandonar encargo','abort']]:[]),
        ...(!net.joining?[['Cambiar mapa','cities']]:[]),net.connected?['Salir de la sala','leave']:['Volver al inicio','title']];
    }else{
      body.innerHTML=`<p id="outcome"></p><p>Campaña: <strong>${game.missionDone}/${FINAL_COUNT}</strong> · Efectivo: <strong>${fmt(game.cash)} CR</strong><br>Récord de esta sesión: <strong>${fmt(best)} CR</strong></p>`;
      if(kind==='win'){set('outcome','Has completado las 25 misiones y desbloqueado el pase de batalla. Los Pistones y La Marea ya celebran juntos en Miami.');buttons=[['Ver pase de batalla','pass',true],['Volver a la portada','title'],['Reiniciar solo la historia','reset']];}
      else{
        set('outcome',game.endReason+(game.failed?' Tus misiones completadas se conservan.':''));
        buttons=net.joining?[['Salir de la sala','leave']]:mode==='free'?[['Volver a la ciudad','respawn',true],['Cambiar mapa','cities'],net.connected?['Salir de la sala','leave']:['Volver a la portada','title']]:game.failed?[['Reintentar','retry',true],['Elegir otra misión','board'],['Cambiar mapa','cities']]:[['Cambiar mapa','cities',true],['Volver a la portada','title']];
      }
    }
    actions.innerHTML=buttons.map(([label,id,primary])=>`<button type="button" class="${primary?'primary':'secondary'}" data-action="${id}">${label}</button>`).join('');
    $('overlay').hidden=false;panel.scrollTop=0;refreshShell();
    (kind==='jobs'||kind==='cities'||kind==='online'||sideDialogs.includes(kind)?panel:actions.querySelector('button')||panel).focus({preventScroll:true});
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
    mode='story';backDialog=null;
    if(reset){profile.story=progress.fresh().story;loadChapter(0,false);}
    else if(sector)loadChapter(0,false);
    else{game.mission=null;game.waypoint=false;clearPursuit();}
    phase='title';closeDialog(false);$('start-btn').focus({preventScroll:true});
  }
  function pause(){
    if(phase!=='play')return;
    if(dialog)closeDialog();else showDialog('pause');
  }
  function openMap(){if(phase!=='play'&&phase!=='title')return;if(dialog==='map')closeDialog();else if(!dialog)showDialog('map');}
  $('start-btn').addEventListener('click',start);
  $('free-btn').addEventListener('click',startFree);
  $('coop-btn').addEventListener('click',showOnline);
  $('free-job').addEventListener('click',()=>{startFreeJob();$('stage').focus({preventScroll:true});});
  $('shop-btn').addEventListener('click',()=>openSide('shop'));
  $('pass-btn').addEventListener('click',()=>openSide('pass'));
  $('radio-btn').addEventListener('click',()=>openSide('radio'));
  $('journal-btn').addEventListener('click',()=>openSide('journal'));
  $('fs-btn').addEventListener('click',()=>{toggleFullscreen();if(!dialog)$('stage').focus({preventScroll:true});});
  $('sound').addEventListener('click',toggleSound);
  $('pause').addEventListener('click',pause);
  $('fs-pause').addEventListener('click',pause);
  $('tutorial').addEventListener('click',()=>showDialog('help'));
  $('map-btn').addEventListener('click',openMap);
  $('touch-map').addEventListener('click',openMap);
  $('close-overlay').addEventListener('click',()=>sideDialogs.includes(dialog)?closeSide():closeDialog());
  $('dialog-content').addEventListener('click',e=>{
    if(dialog==='journal'){
      const id=e.target.closest('[data-claim]')?.dataset.claim;
      if(id&&profile.discoveries.includes(id))redeemCode(discoveries.byId.get(id).code,'journal');
    }
    if(dialog==='radio'){
      const channel=e.target.closest('[data-station]')?.dataset.station;
      // Don't remove the link before its browser-managed navigation takes place.
      if(channel==='spotify'){tune(channel,false);setTimeout(()=>{if(dialog==='radio')renderRadio();},0);}
      else if(channel)tune(channel);
    }
    if(dialog==='map'&&phase==='play'){
      const exit=sector?.gates.find(g=>g.id===e.target.closest('[data-exit]')?.dataset.exit);
      if(exit){game.waypoint=exit;game.nav=null;notify(`GPS: ${exit.text}.`);closeDialog();}
    }
    const button=e.target.closest('[data-job]');
    if(dialog==='jobs'&&button&&!button.disabled)startJob(button.dataset.job);
    const city=e.target.closest('[data-world]');
    if(dialog==='cities'&&city&&!city.disabled)chooseWorld(+city.dataset.world);
    const ride=e.target.closest('[data-ride]')?.dataset.ride;
    if(dialog==='shop'&&ride&&Object.hasOwn(SHOP,ride)){
      const v=SHOP[ride],owned=profile.owned.includes(ride);
      if(!owned&&(v.price===null||v.price>profile.cash))return;
      if(!owned){profile.cash-=v.price;profile.owned.push(ride);}
      profile.equipped=ride;syncProfile();
      if(net.joining)sendRide();else setStarter('starter',ride);
      renderShop();updateUI();set('shop-message',`${v.name} ${owned?'equipado':'comprado y equipado'}.`);$('overlay-panel').focus({preventScroll:true});
    }
    if(dialog==='save'&&e.target.closest('#copy-backup')){
      const box=$('backup-out'),fallback=()=>{if(!box.isConnected)return;box.focus();box.select();set('save-message','Respaldo seleccionado. Cópialo para conservarlo.');};
      if(navigator.clipboard?.writeText)navigator.clipboard.writeText(box.value).then(()=>{if(box.isConnected)set('save-message','Respaldo copiado.');}).catch(fallback);else fallback();
    }
    const action=e.target.closest('[data-online]')?.dataset.online;
    if(dialog==='online'&&action==='host')net.host();
    if(dialog==='online'&&action==='copy'){
      const code=net.code,stillOpen=()=>dialog==='online'&&net.code===code;
      const copied=()=>{if(stillOpen())set('room-message','Código copiado. Envíalo a tu compañero.');};
      const fallback=()=>{
        const output=$('room-code'),selection=getSelection();
        if(!stillOpen()||!output||!selection)return;
        const range=document.createRange();range.selectNodeContents(output);selection.removeAllRanges();selection.addRange(range);
        set('room-message','Código seleccionado. Cópialo y envíalo a tu compañero.');
      };
      if(navigator.clipboard?.writeText)navigator.clipboard.writeText(code).then(copied).catch(fallback);else fallback();
    }
  });
  $('dialog-content').addEventListener('submit',e=>{
    if(dialog==='online'&&e.target.id==='room-form'){e.preventDefault();net.join($('room-input').value);}
    if(dialog==='pass'&&e.target.id==='pass-form'){
      e.preventDefault();redeemCode($('pass-code').value,'pass');
    }
    if(dialog==='save'&&phase==='title'&&!net.busy&&e.target.id==='save-form'){
      e.preventDefault();
      const restored=progress.unpack($('backup-in').value.trim(),storyIds);
      if(!restored){set('save-message','No se reconoce ese respaldo. Tu progreso no ha cambiado.');return;}
      profile=restored;loadChapter(0,false);renderSave();updateUI();set('save-message','Perfil restaurado.');
    }
  });
  $('dialog-actions').addEventListener('click',e=>{
    const a=e.target.closest('button')?.dataset.action;
    if(a==='close')sideDialogs.includes(dialog)?closeSide():closeDialog();
    if(a==='leave')leaveRoom();
    if(a==='title')showTitle();
    if(a==='reset')showTitle(true);
    if(a==='board')showBoard();
    if(a==='cities')showCities();
    if(a==='respawn'){if(sector)enterFree(sector.x,sector.y);else chooseWorld(chapterIndex);}
    if(sideDialogs.includes(a))openSide(a);
    if(a==='retry'&&game.failed)startJob(game.failed);
    if(a==='pause-help')showDialog('help');
    if(a==='abort')cancelJob('Misión abandonada');
    if(a==='waypoint'||a==='clear-gps'){game.waypoint=a==='waypoint';game.nav=null;notify(game.waypoint?'GPS: garaje marcado.':'GPS: destino eliminado.');closeDialog();}
  });
  document.addEventListener('keydown',e=>{
    if(e.ctrlKey||e.altKey||e.metaKey)return;
    if(e.code==='Tab'&&dialog){
      const b=[...$('overlay-panel').querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled)')].filter(el=>!el.closest('[hidden]')); if(!b.length)return;
      if(e.shiftKey&&(document.activeElement===b[0]||!b.includes(document.activeElement))){e.preventDefault();b.at(-1).focus();}
      else if(!e.shiftKey&&(document.activeElement===b.at(-1)||!b.includes(document.activeElement))){e.preventDefault();b[0].focus();}
      return;
    }
    if(e.code==='Escape'&&!e.repeat){
      e.preventDefault();
      if($('cabinet').classList.contains('viewport-fill')&&!dialog)toggleFullscreen();
      else if(sideDialogs.includes(dialog))closeSide();
      else if(dialog==='online')leaveRoom();
      else if(dialog==='jobs'&&!net.joining)showCities();
      else if(dialog==='cities'&&!net.connected)showTitle();
      else if(dialog&&!['end','win','hostpause','waiting','jobs','cities'].includes(dialog))closeDialog();
      else if(!dialog)pause();return;
    }
    if(dialog==='jobs'&&!net.joining&&!e.repeat&&/^[1-6]$/.test(e.key)){
      const job=JOBS[Number(e.key)-1];if(job){e.preventDefault();startJob(job[0]);}return;
    }
    if(e.target.closest('input,textarea'))return;
    if(e.code==='KeyV'&&!e.repeat){toggleSound();return;}
    if(e.code==='KeyR'&&!e.repeat){if(dialog==='radio')closeSide();else if(!dialog)openSide('radio');return;}
    if(e.code==='KeyI'&&!e.repeat){if(dialog==='journal')closeSide();else if(!dialog)openSide('journal');return;}
    if(e.code==='KeyF'&&!e.repeat){e.preventDefault();toggleFullscreen();return;}
    if(e.code==='KeyM'&&!e.repeat){e.preventDefault();openMap();return;}
    if(e.code==='Enter'&&phase==='title'&&!dialog&&!e.target.closest('button,a')){e.preventDefault();start();return;}
    if(phase!=='play'||dialog)return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','Space','KeyE','KeyH','KeyJ'].includes(e.code)){
      if(e.code==='Space'&&e.target.closest('button'))return;
      e.preventDefault();keys.add(e.code);
      if(e.code==='KeyE'&&!e.repeat)interact();
      if(e.code==='Space'&&!e.repeat)repair();
      if(e.code==='KeyH'&&!e.repeat)flight();
      if(e.code==='KeyJ'&&!e.repeat)startFreeJob();
    }
  });
  document.addEventListener('keyup',e=>keys.delete(e.code));
  addEventListener('blur',()=>{clearInput();if(!net.connected&&!virtual&&phase==='play'&&!dialog)showDialog('pause');});
  document.addEventListener('visibilitychange',()=>{selected=!document.hidden;if(!selected){clearInput();if(!net.connected&&!virtual&&phase==='play'&&!dialog)showDialog('pause');}});
  for(const b of document.querySelectorAll('[data-key]')){
    const code=b.dataset.key;
    const use=()=>{if(code==='KeyE')interact();if(code==='Space')repair();if(code==='KeyH')flight();};
    b.addEventListener('pointerdown',e=>{
      if(phase!=='play'||dialog)return;
      e.preventDefault();b.setPointerCapture(e.pointerId);touches.set(e.pointerId,code);b.classList.add('held');use();
    });
    const off=e=>{touches.delete(e.pointerId);if(![...touches.values()].includes(code))b.classList.remove('held');};
    b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('lostpointercapture',off);
    b.addEventListener('click',e=>{if(e.detail===0)use();});
  }

  const round=n=>Math.round(n*10)/10;
  window.render_game_to_text=()=>{
    const p=player(),m=game.mission,goal=activeGoal(),route=phase==='title'?null:navRoute();
    return JSON.stringify({phase:dialog||phase,mode,time:round(game.time),coordinates:'World origin top-left; x east, y south',
      player:{x:round(p.x),y:round(p.y),angle:round(p.a),hp:round(p.hp),onFoot:!game.player.car,carId:game.player.car?.id,carType:game.player.car?.type,flying:!!p.air,speed:round(p.s||0)},
      controls:'WASD/arrows drive, E interact, Space repair, Shift handbrake, H flight, J side job, R radio, I journal, F fullscreen, M map, Esc pause',
      incidents:{pedestrianHits:game.player.pedestrianHits??0,down:game.people.filter(p=>p.downAt!==null).length},
      discoveries:{found:profile.discoveries.length,claimed:profile.discoveryClaims.length},
      alert:game.heat,cash:game.cash,crewJobs:game.rep,trust:game.trust,reward:game.gift,dockOpen:dockOpen(),
      profile:{wrenches:profile.wrenches,unlimitedWrenches:profile.unlimitedWrenches,xp:profile.xp,passUnlocked:profile.unlocked,passRank:progress.rank(profile),freeMissions:profile.freeDone,equipped:profile.equipped,owned:profile.owned},
      radio:{station:station.id,muted,music:!!station.beat&&!muted,audio:audio?.state},
      atlas:sector?{x:sector.x,y:sector.y,biome:sector.biome,seed:config.seed,gates:sector.gates.map(({id,x,y,nx,ny,target})=>({id,x,y,nx,ny,target})),jobSector:m?.job.sector??null}:null,
      goal:goal?{x:round(goal.x),y:round(goal.y),text:goal.text||goal.name}:null,
      mission:m?{id:m.id,name:m.job.name,stage:m.idx+1,stages:m.job.steps.length,kind:['van','choice','escort','action','stop'].find(k=>m.job.steps[m.idx][k])||'checkpoint',left:timeLimit(m)?round(timeLimit(m)-game.time):null,finalLeft:m.finishBy?round(m.finishBy-game.time):null,waitingForCar:m.pendingTimer,choose:!!m.job.steps[m.idx].choice,hold:round(m.hold),convoy:m.ally?{x:round(m.ally.car.x),y:round(m.ally.car.y)}:null}:null,
      campaign:{total:FINAL_COUNT,chapter:config.number,city:config.name,map:{width:W,height:H},completed:[...game.completed],remaining:JOBS.map(([id])=>id).filter(id=>!game.completed.has(id))},
      coop:net.connected?{role:net.hosting?'host':'guest',partner:game.buddy?{x:round((game.buddy.car||game.buddy).x),y:round((game.buddy.car||game.buddy).y),carId:game.buddy.car?.id??null}:null}:null,
      gps:route?{dest:game.waypoint===true?'garage':game.waypoint?.id??(goal?.arrow?goal.id:'mission'),meters:Math.round(route.length),points:route.points.map(q=>[round(q.x),round(q.y)])}:null,
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
    if(!virtual&&!net.joining&&phase==='play'&&!dialog){
      acc+=dt;
      while(acc>=STEP){update(STEP);acc-=STEP;}
      uiT+=dt;if(uiT>.115){updateUI();uiT=0;}
    }else acc=0;
    music();render();loop=requestAnimationFrame(tick);
  }
  addEventListener('pagehide',e=>{cancelAnimationFrame(loop);if(!e.persisted){net.close();clearInterval(networkTick);}if(audio&&audio.state==='running')audio.suspend().catch(()=>{});});
  addEventListener('pageshow',e=>{if(e.persisted){previous=0;loop=requestAnimationFrame(tick);}});
  loadChapter(0,false);
  mapArt.addEventListener('load',()=>{bakeCity();paintDirty=true;});
  mapArt.src='./assets/rooftop-materials.webp';
  refreshShell();resize();loop=requestAnimationFrame(tick);
})();
