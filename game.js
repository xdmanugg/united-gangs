(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d', { alpha: false });
  const W = 2120, H = 1680, STEP = 1 / 60, TAU = Math.PI * 2;
  const X = [145, 505, 865, 1225, 1585, 1945], Y = [155, 445, 735, 1025, 1315, 1550], RW = 102;
  const LIME = '#d8fa55', ORANGE = '#ff9f69', CYAN = '#8ee5de', RED = '#ff7b76';
  const PHONE = { p:{x:466,y:464,color:LIME,name:'Los Pistones'}, m:{x:1624,y:715,color:ORANGE,name:'La Marea'} };
  const GARAGE = {x:825,y:1002,color:CYAN};
  const ALLEY = {x:325,from:155,to:445};
  const DOCK = {y:1170,from:1585,to:1945,gates:[1635,1894]};
  const GARAGE_GOAL = {...GARAGE,text:'Garaje',name:'Garaje'};
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
  const mapPoint = (x,y) => ({x,y});
  const goto = (x,y,text,extra={}) => ({...mapPoint(x,y),text,...extra});
  const contracts = {
    p:[
      {name:'El primer encargo',pay:450,intro:'Pistones: «Hay un paquete en la plaza. Tráelo al taller».',steps:[
        goto(865,445,'Recoge el paquete en la plaza del mercado.'),
        goto(1225,735,'Entrega el paquete en el taller de Los Pistones.')]},
      {name:'La vuelta rápida',pay:800,intro:'Pistones: «Consigue un coche. A ver si tienes manos».',time:54,car:true,steps:[
        goto(505,155,'Pasa por el primer control, al norte, con un coche.'),
        goto(1225,155,'Cruza al segundo control por la avenida.',{alert:1}),
        goto(1225,735,'Completa la vuelta en el taller.')]},
    ],
    m:[
      {name:'Turno de noche',pay:550,intro:'Marea: «Recoge la caja del muelle. Es una entrega urgente».',steps:[
        goto(1945,1025,'Recoge la caja al final del paseo del muelle.',{alert:2,time:48}),
        goto(1585,1315,'Lleva la caja al almacén de La Marea.')]},
      {name:'Carga caliente',pay:950,intro:'Marea: «Saca la furgoneta del depósito y llévala al garaje».',steps:[
        goto(1945,1315,'Sube a la furgoneta marcada en el depósito.',{van:true,alert:2,time:55}),
        goto(825,1002,'Lleva esa furgoneta al garaje bajo el paso elevado.')]},
    ],
    x:[{name:'La furgoneta disputada',pay:1050,intro:'Radio: «Las dos bandas quieren la misma furgoneta. Tú decides a quién se la entregas».',steps:[
      goto(1225,445,'Recoge la furgoneta turquesa en el mercado.',{van:true,alert:2}),
      goto(1225,445,'Entrega la furgoneta en P o M: detente y pulsa Acción.',{choice:true})
    ]}],
    f:[{name:'La última salida',pay:1750,intro:'Radio: «¡Todas las patrullas en marcha! Te esperan al otro lado del puerto».',time:65,car:true,alert:3,steps:[
      goto(505,1025,'Sal del barrio por el cruce del sur.'),
      goto(1585,1550,'Cruza el cinturón industrial hacia el este.'),
      goto(1945,1550,'Alcanza la salida del puerto con el coche.')]}],
  };
  const FINAL_COUNT=contracts.p.length+contracts.m.length+contracts.x.length+contracts.f.length;

  // Paint the city once at full world resolution; only dynamic sprites move each frame.
  const terrain = document.createElement('canvas');
  terrain.width=W; terrain.height=H;
  const world=terrain.getContext('2d',{alpha:false}), solids=[], blocks=[];
  const r=rnd(882207);
  function rect(o,x,y,w,h,fill){o.fillStyle=fill;o.fillRect(x,y,w,h);}
  function roof(x,y,w,h,pal,id){
    if(w<34||h<14)return;
    solids.push({x,y,w,h});
    rect(world,x+7,y+10,w+4,h+4,'#1217149c');
    rect(world,x,y,w,h,pal[0]); rect(world,x+3,y+3,w-8,h-8,pal[1]);
    rect(world,x+3,y+3,w-9,3,pal[2]);rect(world,x+4,y+h-6,w-7,3,'#15191670');
    if(h<28){rect(world,x+3,y+h/2,w-9,1,'#181d18a0');}
    else if(id%3===0){
      for(let j=13;j<w-9;j+=9)rect(world,x+j,y+9,1,h-21,'#15191554');
      rect(world,x+9,y+h*.47,w-17,2,'#a5a18d25');
    }else if(id%3===1){
      for(let j=13;j<h-8;j+=14)rect(world,x+8,y+j,w-19,1,'#18201947');
      rect(world,x+w*.29,y+h*.18,w*.42,h*.22,'#2f3833');rect(world,x+w*.29,y+h*.18,w*.42,3,'#85897964');
    }else{
      rect(world,x+11,y+10,w-24,h-24,'#11191328');
      rect(world,x+12,y+11,w-25,1,pal[2]);
      rect(world,x+w*.45,y+7,22,15,'#363d35');rect(world,x+w*.45,y+7,22,2,'#a8ae9469');
    }
    for(let j=0;j<(h<28?0:Math.min(6,w/23));j++){
      const vx=x+10+r()*(w-22),vy=y+9+r()*(h-20);
      rect(world,vx+2,vy+3,8,8,'#14181475');rect(world,vx,vy,7,7,'#465147');rect(world,vx,vy,7,1,'#9ea48e90');
    }
    for(let j=14;j<w-12;j+=18)if(r()>.4)rect(world,x+j,y+h-2,5,2,id%4===0?'#b3b56d75':'#d6ad7270');
  }
  function tree(x,y,rad){
    world.fillStyle='#121c15a8';world.beginPath();world.arc(x+3,y+4,rad,0,TAU);world.fill();
    for(let j=0;j<4;j++){world.fillStyle=['#334934','#42533b','#4b6041','#566548'][j];world.beginPath();world.arc(x+(r()-.5)*rad,y+(r()-.5)*rad,rad*(.55+r()*.23),0,TAU);world.fill();}
  }
  function buildCity(){
    rect(world,0,0,W,H,'#4e5145');
    const palettes=[['#373e39','#60675a','#8a8d77'],['#49423a','#706457','#9f8c70'],['#343c39','#58615b','#888c79'],['#514b3a','#7a705b','#a0987c'],['#46423e','#69615d','#8a7b72']];
    const lastX=2005;
    rect(world,lastX,0,W-lastX,H,'#253e3a');
    for(let j=0;j<440;j++){const xx=lastX+9+r()*130,yy=r()*H;rect(world,xx,yy,4+r()*25,1,r()<.5?'#4c706052':'#132c2a73');}
    for(const y of [370,910,1225]){
      rect(world,1999,y,86,33,'#625c4b');for(let i=0;i<86;i+=6)rect(world,1999+i,y+1,1,31,'#302f25');
      rect(world,1999,y,86,2,'#9d9778');rect(world,2054,y+4,19,25,'#4f5b51');
    }
    const xc=[-55,...X,2056],yc=[-55,...Y,1724];
    for(let row=0;row<yc.length-1;row++)for(let col=0;col<xc.length-1;col++){
      const x=xc[col]+RW/2,y=yc[row]+RW/2,w=xc[col+1]-xc[col]-RW,h=yc[row+1]-yc[row]-RW,id=row*10+col;
      if(w<25||h<25)continue;
      blocks.push({x,y,w,h,id});
      const park=(row===3&&col===2)||(row===1&&col===4), port=col>=5&&row>=3, yard=id%6===0;
      rect(world,x,y,w,h,'#363e34');rect(world,x+2,y+2,w-4,h-4,park?'#6c7256':'#696555');rect(world,x+7,y+7,w-14,h-14,park?'#475b3e':port?'#545c53':'#4e5448');
      for(let tx=x+10;tx<x+w-8;tx+=12){rect(world,tx,y+2,1,5,'#35372d68');rect(world,tx,y+h-7,1,5,'#35372d68');}
      if(row===1&&col===1){
        roof(x+15,y+13,66,64,palettes[1],1);roof(x+19,y+104,63,66,palettes[4],2);
        roof(x+w-83,y+13,67,82,palettes[3],3);roof(x+w-88,y+121,72,49,palettes[0],4);
        for(const yy of [y+91,y+176]){tree(ALLEY.x-38,yy,11);tree(ALLEY.x+39,yy,10);}
        for(let j=y+8;j<y+h-5;j+=6){
          rect(world,ALLEY.x-22,j,44,5,j%12?'#53544b':'#5c5b50');
          for(let i=ALLEY.x-18+(j%12?0:4);i<ALLEY.x+20;i+=9)rect(world,i,j,1,5,'#373b35');
        }
        rect(world,ALLEY.x-23,y,1,h,'#a39b7a85');rect(world,ALLEY.x+22,y,1,h,'#a39b7a85');
      }else if(row===4&&col===5){
        rect(world,x,DOCK.y-27,w,54,'#343f3a');
        rect(world,x,DOCK.y-27,w,2,'#929d7b');rect(world,x,DOCK.y+25,w,2,'#929d7b');
        for(let j=x+7;j<x+w-4;j+=25)rect(world,j,DOCK.y,11,1,'#bcb48b77');
        for(const [dx,dy,bw,bh,id] of [[12,11,107,48,1],[140,20,98,41,3],[15,125,96,48,3],[140,118,100,53,1]]){
          roof(x+dx,y+dy,bw,bh,palettes[id],id);
        }
        for(const gx of DOCK.gates){rect(world,gx-4,DOCK.y-30,8,6,'#aaac8d');rect(world,gx-4,DOCK.y+24,8,6,'#aaac8d');}
      }else if(park){
        rect(world,x+11,y+h/2-11,w-22,22,'#696b56');rect(world,x+w/2-13,y+8,26,h-16,'#696b56');
        if(h>74){rect(world,x+w*.39,y+h*.38,w*.22,h*.24,'#333d33');rect(world,x+w*.42,y+h*.41,w*.16,h*.18,'#527067');}
        for(let j=0;j<17;j++){const tx=x+17+r()*(w-34),ty=y+16+r()*(h-32);if(Math.abs(tx-x-w/2)>20&&Math.abs(ty-y-h/2)>16)tree(tx,ty,7+r()*9);}
      }else if(port){
        roof(x+14,y+13,w*.52,h*.63,palettes[(id+1)%5],0);
        for(let j=0;j<Math.min(4,Math.floor(h/32));j++){
          const cx=x+w*.66,cy=y+17+j*26;roof(cx,cy,w*.24,17,['#544d3c',['#856747','#776c49','#536d65','#8d654d'][j],'#a59876'],0);
        }
        for(let j=15;j<w-15;j+=24){rect(world,x+j,y+h-21,1,12,'#9a906c');rect(world,x+j,y+h-10,12,1,'#9a906c');}
      }else if(w>160&&h>95){
        const left=w*(.34+r()*.12),top=h*(.34+r()*.14);
        roof(x+13,y+13,left,top,palettes[id%5],id);
        roof(x+left+24,y+14,w-left-39,h*(.46+r()*.12),palettes[(id+1)%5],id+1);
        roof(x+13,y+top+27,left+8,h-top-41,palettes[(id+2)%5],id+2);
        if(!yard)roof(x+w*.62,y+h*.68,w*.28,h*.20,palettes[(id+4)%5],id+3);
        else for(let j=0;j<5;j++)rect(world,x+w*.63+j*12,y+h*.76,1,15,'#a29d75');
        if(id%4===0)tree(x+w*.52,y+h*.78,10);
      }else roof(x+10,y+12,w-20,h-24,palettes[id%5],id);
      for(let j=0;j<Math.floor(w*h/1050);j++){const xx=x+3+r()*(w-6),yy=y+3+r()*(h-6);rect(world,xx,yy,1+r()*3,1,'#c2c2a021');}
    }
    for(const x of X)rect(world,x-47,0,94,H,'#333b38');
    for(const y of Y)rect(world,0,y-47,2003,94,'#333b38');
    rect(world,ALLEY.x-22,190,44,17,'#5a594d');rect(world,ALLEY.x-22,394,44,17,'#5a594d');
    for(const gx of [1629,1894])rect(world,gx-4,DOCK.y-25,12,50,'#353d36');
    for(const y of [1315,1550]){
      rect(world,1000,y-43,955,2,'#bd9b6283');rect(world,1000,y+41,955,2,'#bd9b6283');
      for(let k=1050;k<1940;k+=50)rect(world,k,y+34,13,5,'#8c886979');
    }
    for(const x of X){
      for(let j=0;j<H;j+=30){if(Y.some(y=>Math.abs(y-j)<65))continue;rect(world,x-1,j,2,13,'#a69e655a');rect(world,x-42,j,1,16,'#aaa88e47');rect(world,x+41,j,1,16,'#aaa88e47');}
    }
    for(const y of Y)for(let j=0;j<1996;j+=30){
      if(X.some(x=>Math.abs(x-j)<65))continue;rect(world,j,y-1,13,2,'#a69e655a');rect(world,j,y-42,16,1,'#aaa88e47');rect(world,j,y+41,16,1,'#aaa88e47');
    }
    for(const x of X)for(const y of Y){
      for(let j=-31;j<36;j+=10){
        rect(world,x+j,y-61,5,13,'#bab99a65');rect(world,x+j,y+48,5,13,'#bab99a65');
        rect(world,x-61,y+j,13,5,'#bab99a65');rect(world,x+48,y+j,13,5,'#bab99a65');
      }
      for(const [dx,dy] of [[-51,-51],[51,51],[-51,51],[51,-51]]){
        rect(world,x+dx,y+dy,4,4,'#131c17');rect(world,x+dx-1,y+dy-1,3,3,(dx===dy)?'#cfaf64':'#9cb775');
      }
    }
    for(let j=0;j<9900;j++){const x=r()*2003,y=r()*H;if(X.some(a=>Math.abs(a-x)<46)||Y.some(a=>Math.abs(a-y)<46))rect(world,x,y,1+r()*3,1,r()<.5?'#121c1732':'#bdbea420');}
    rect(world,1999,0,8,H,'#8f8470');rect(world,2004,0,3,H,'#121e1b');
    for(let j=0;j<H;j+=27){rect(world,1998,j,10,2,'#343e34');}
    for(const [x,y,t] of [[557,417,'CRUCE'],[350,126,'CASCO VIEJO'],[1724,706,'MUELLE'],[885,997,'TALLER'],[1710,1162,'PASO 04'],[1490,1520,'CINTURÓN INDUSTRIAL'],[1810,1518,'SALIDA →']]){
      world.font='700 10px monospace';world.fillStyle='#a9ae8d9c';world.fillText(t,x,y);
    }
  }
  buildCity();

  const palettes=['#d8f454','#b9b09c','#8da1ab','#a16557','#66847d','#967998','#c99260','#6e747f'];
  const makeCar=(x,y,a,color,extra={})=>({x,y,a,color,s:0,vx:0,vy:0,hp:100,kind:'parked',type:extra.van?'van':'sedan',...extra});
  let game, phase='title', dialog=null, lastFocus=null, muted=true, best=0, selected=true, virtual=false, paintDirty=true;
  let width=1,height=1,dpr=1,viewScale=1,camera={x:0,y:0};
  let audio=null,bus=null,engine=null,engineGain=null,nextBeat=0,beat=0;
  const keys=new Set(), touches=new Map();
  function fresh(){
    const roll=rnd(18317),cars=[makeCar(546,477,0,LIME,{starter:true,id:'starter',type:'compact'})];
    for(let yi=0;yi<Y.length;yi++)for(let xi=0;xi<X.length;xi++){
      if((yi*3+xi)%2!==0||yi===1&&xi===1)continue;
      const xx=(xi===X.length-1)?X[xi]-92:X[xi]+87;
      const van=(xi+yi)%5===0;
      cars.push(makeCar(xx,Y[yi]+35,xi===X.length-1?Math.PI:0,palettes[1+Math.floor(roll()*7)],{id:'p'+yi+xi,van,type:van?'van':(xi+yi)%4===0?'sport':(xi+yi)%3===0?'compact':'sedan'}));
    }
    for(let i=0;i<19;i++){
      const xi=i%X.length,yi=(Math.floor(i/X.length)*2+i)%Y.length;
      const target=(xi<X.length-1&&i%3!==0)?{xi:xi+1,yi}:{xi,yi:yi<Y.length-1?yi+1:yi-1};
      const a=Math.atan2(Y[target.yi]-Y[yi],X[target.xi]-X[xi]), f=.25+roll()*.5;
      const dx=Math.cos(a),dy=Math.sin(a);
      cars.push(makeCar(X[xi]+(X[target.xi]-X[xi])*f-dy*23,Y[yi]+(Y[target.yi]-Y[yi])*f+dx*23,a,palettes[1+Math.floor(roll()*7)],{id:'t'+i,kind:'traffic',node:target,previous:{xi,yi},fraction:f,pace:67+roll()*42,van:i%6===0}));
    }
    const people=Array.from({length:26},(_,i)=>({x:X[i%6]+(i%2?55:-55),y:75+roll()*1490,origin:0,a:i%2?Math.PI/2:-Math.PI/2,color:['#dfa975','#91a68a','#c8b7a4','#91aeb6','#af8280'][i%5],pace:18+roll()*12,range:33+roll()*67}));
    for(const p of people)p.origin=p.y;
    return {player:{x:507,y:486,a:-Math.PI/2,hp:100,car:null},cars,people,police:[],particles:[],marks:[],time:0,cash:0,heat:0,quiet:0,spawn:0,block:null,blockAt:0,
      rep:{p:0,m:0},trust:{p:0,m:0},gift:null,finale:false,waypoint:false,mission:null,missionDone:0,won:false,msg:'',msgUntil:0,hitAt:-2,shake:0,lastSkid:0,safeUntil:0,nav:null,seed:roll};
  }
  game=fresh();
  function player(){return game.player.car || game.player}
  function hits(x,y,r){
    if(x<r+9||x>1998-r||y<r+8||y>H-r-8)return true;
    if(!dockOpen()&&Math.abs(y-DOCK.y)<28+r&&DOCK.gates.some(g=>Math.abs(x-g)<3+r))return true;
    for(const q of solids){
      if(x<q.x-r||x>q.x+q.w+r||y<q.y-r||y>q.y+q.h+r)continue;
      const dx=x-clamp(x,q.x,q.x+q.w),dy=y-clamp(y,q.y,q.y+q.h);
      if(dx*dx+dy*dy<r*r)return true;
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
  function dockOpen(){return game?.gift==='m';}
  function disputeAvailable(){return game.rep.p>=1&&game.rep.m>=1&&!game.gift;}
  function finalAvailable(){return game.rep.p===2&&game.rep.m===2&&!!game.gift;}
  function nearestPhone(p=player()){return dist(p,PHONE.p)<=dist(p,PHONE.m)?PHONE.p:PHONE.m;}
  function activeGoal(){
    const m=game.mission;
    if(m){
      const goal=m.job.steps[m.idx];
      if(goal.choice)return nearestPhone();
      if(goal.van&&m.van)return {...goal,x:m.van.x,y:m.van.y};
      return goal;
    }
    if(game.won)return null;
    if(finalAvailable())return PHONE.p;
    if(disputeAvailable())return nearestPhone();
    if(game.rep.p===2)return PHONE.m;
    if(game.rep.m===2)return PHONE.p;
    return nearestPhone();
  }
  function guideGoal(){return game.waypoint?GARAGE_GOAL:activeGoal();}
  function guideColor(goal=guideGoal()){return goal===GARAGE_GOAL?CYAN:goal===PHONE.m||game.mission?.side==='m'?ORANGE:game.mission?.side==='x'&&goal!==PHONE.p?CYAN:LIME;}
  function startJob(side){
    if(game.mission){notify('Termina el encargo actual antes de aceptar otro.');return;}
    if(game.won){notify('Radio en silencio. Puedes seguir explorando.');return;}
    let caller=side;
    if(disputeAvailable())side='x';
    else if(finalAvailable()){if(side!=='p'){notify('La llamada final te espera en El Cruce.');return;}side='f';}
    if((side==='p'||side==='m')&&game.rep[side]===2){notify('Ya has terminado los encargos de esta banda.');return;}
    const job=contracts[side][side==='f'||side==='x'?0:game.rep[side]];
    const m={side,job,idx:0,deadline:job.time?game.time+job.time:0,van:null};
    game.mission=m;
    game.waypoint=false;
    if(job.steps[0].van){
      m.van=side==='x'?makeCar(1225,445,0,CYAN,{van:true,job:true,id:'disputa'}):makeCar(1945,1315,-Math.PI/2,ORANGE,{van:true,job:true,id:'van'});
      game.cars.push(m.van);
    }
    if(job.alert)raise(job.alert);
    const greeting=(side==='p'||side==='m')&&game.trust[caller]<0?`Radio: «Aún tenemos cuentas pendientes. ${job.name}, y luego hablamos».`:job.intro;
    notify(greeting,6);effect('job');updateUI();
  }
  function cancelJob(reason){
    if(!game.mission)return;
    const van=game.mission.van;
    if(van){if(game.player.car===van){van.job=false;van.id='antigua-'+Math.round(game.time*10);}else game.cars=game.cars.filter(c=>c!==van);}
    game.mission=null;notify(reason,5);effect('loss');updateUI();
  }
  function handoff(side){
    const m=game.mission;
    if(m?.side!=='x'||m.idx!==1)return false;
    if(game.player.car!==m.van){notify('Vuelve con la furgoneta turquesa para hacer el trato.');return true;}
    game.gift=side;
    game.trust[side]=clamp(game.trust[side]+2,-2,4);
    const rival=side==='p'?'m':'p';
    game.trust[rival]=clamp(game.trust[rival]-3,-2,4);
    if(side==='p'){
      game.cars.push(makeCar(546,412,0,LIME,{type:'sport',id:'regalo-p',reward:true,claimed:true}));
    }
    m.van.hp=100;game.heat=0;game.police=[];game.block=null;game.safeUntil=game.time+1.5;
    endJob();
    return true;
  }
  function endJob(){
    const m=game.mission;game.cash+=m.job.pay;game.missionDone++;
    if(m.van)m.van.job=false;game.mission=null;
    const p=player();sparks(p.x,p.y,LIME,26);
    if(m.side==='f'){game.won=true;game.heat=0;game.police=[];game.block=null;finish(true);return;}
    if(m.side==='p'||m.side==='m'){
      game.rep[m.side]++;
      game.trust[m.side]=clamp(game.trust[m.side]+(game.trust[m.side]<0?2:1),-2,4);
    }
    effect('win');
    if(m.side==='x'){
      notify(game.gift==='p'?'Los Pistones te dejan un deportivo junto a su teléfono.':'La Marea ha abierto el paso privado de los muelles.',7);
    }else{
      notify(finalAvailable()?'Encargo completo. Contesta el teléfono de El Cruce para el final.':disputeAvailable()?'Hay una llamada urgente. Contesta cualquiera de los dos teléfonos.':`Encargo completo · +${m.job.pay} CR`,5);
    }
    updateUI();
  }
  function stepJob(){
    const m=game.mission;if(!m)return;
    if(m.deadline&&game.time>m.deadline){cancelJob('Se acabó el tiempo. Vuelve al teléfono para repetir.');return;}
    const goal=m.job.steps[m.idx], car=game.player.car;
    if(goal.choice)return;
    if((m.job.car&&!car)||(goal.van&&car!==m.van)||(m.van&&m.idx>0&&car!==m.van))return;
    if(!goal.van&&dist(player(),goal)>39)return;
    if(goal.alert)raise(goal.alert);
    if(goal.time)m.deadline=game.time+goal.time;
    m.idx++;effect('pass');
    if(m.idx>=m.job.steps.length){if(m.van){m.van.hp=100;game.heat=0;game.police=[];game.block=null;}endJob();return;}
    const next=m.job.steps[m.idx];
    notify(next.choice?'Elige P por el deportivo o M por el atajo.':next.text);updateUI();
  }
  function interactable(){
    const me=player();
    if(dist(me,GARAGE)<43&&(!game.mission?.van||game.mission.idx===0)){
      if(game.heat>0||me.hp<100||game.player.hp<100)return {type:'garage',name:'Usar el garaje'};
    }
    for(const [side,phone] of Object.entries(PHONE)){
      if(dist(me,phone)<38&&(!game.player.car||Math.abs(me.s)<38)){
        const deal=game.mission?.side==='x'&&game.mission.idx===1;
        return {type:'phone',side,name:deal?`Entregar a ${phone.name}`:'Contestar el teléfono'};
      }
    }
    if(game.player.car)return {type:'exit',name:'Bajar del coche'};
    let bestDist=43,car=null;
    for(const c of game.cars){if(c.kind==='traffic')continue;const d=dist(c,me);if(d<bestDist){bestDist=d;car=c;}}
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
    }else if(target.type==='phone'){if(!handoff(target.side))startJob(target.side);}
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
    updateUI();
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
      if(other===c)continue;
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
        const options=[[1,0],[0,1],[-1,0],[0,-1]].map(([x,y])=>({xi:n.xi+x,yi:n.yi+y})).filter(q=>q.xi>=0&&q.xi<X.length&&q.yi>=0&&q.yi<Y.length&&!(q.xi===f.xi&&q.yi===f.yi));
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
  const nodes=Y.flatMap((y,yi)=>X.map((x,xi)=>({x,y,xi,yi})));
  const gridId=(xi,yi)=>yi*X.length+xi;
  const avenueNodes=nodes.concat([{x:ALLEY.x,y:ALLEY.from},{x:ALLEY.x,y:ALLEY.to},{x:DOCK.from,y:DOCK.y},{x:DOCK.to,y:DOCK.y}]);
  const links=[];
  function street(a,b,tag='main'){
    const p=avenueNodes[a],q=avenueNodes[b];
    links.push({a,b,tag,dx:q.x-p.x,dy:q.y-p.y,len:dist(p,q),x:(p.x+q.x)/2,y:(p.y+q.y)/2,id:`${a}:${b}`});
  }
  const [A0,A1,D0,D1]=[nodes.length,nodes.length+1,nodes.length+2,nodes.length+3];
  for(let yi=0;yi<Y.length;yi++)for(let xi=0;xi<X.length;xi++){
    const n=gridId(xi,yi);
    if(xi<X.length-1){
      if(xi===0&&yi<2){const joint=yi===0?A0:A1;street(n,joint);street(joint,n+1);}
      else street(n,n+1);
    }
    if(yi<Y.length-1){
      if(yi===3&&(xi===4||xi===5)){const joint=xi===4?D0:D1;street(n,joint);street(joint,n+X.length);}
      else street(n,n+X.length);
    }
  }
  street(A0,A1,'alley');street(D0,D1,'dock');

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
  function streetRoute(from,to){
    if(!to)return null;
    const blocked=game.block?.id,open=dockOpen(),edges=links.filter(e=>(open||e.tag!=='dock')&&e.id!==blocked);
    const s=roadAnchor(from,edges),t=roadAnchor(to,edges);
    if(!s||!t)return null;
    let points=[{x:from.x,y:from.y},s.q],length;
    if(s.edge===t.edge){
      length=s.d+t.d+Math.abs(s.t-t.t)*s.edge.len;
    }else{
      const count=avenueNodes.length,known=Array(count).fill(false),cost=Array(count).fill(Infinity),prev=Array(count).fill(-1);
      cost[s.edge.a]=s.edge.len*s.t;cost[s.edge.b]=s.edge.len*(1-s.t);
      for(let i=0;i<count;i++){
        let k=-1;
        for(let j=0;j<count;j++)if(!known[j]&&(k===-1||cost[j]<cost[k]))k=j;
        if(k<0||!Number.isFinite(cost[k]))break;
        known[k]=true;
        for(const edge of edges){
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
    if(game.nav?.key!==key||game.time-game.nav.time>.16||dist(p,game.nav.p)>42){
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
        const ahead=lead?{x:clamp(p.x+Math.cos(p.a)*lead*Math.sign(p.s),55,1935),y:clamp(p.y+Math.sin(p.a)*lead*Math.sign(p.s),45,1580)}:p;
        const aim=lead&&ahead!==p&&trace(p.x,p.y,ahead.x,ahead.y,15)?ahead:p;
        if(gap<370&&trace(cop.x,cop.y,aim.x,aim.y,15))cop.aim={x:aim.x,y:aim.y};
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
      if(dist(cop,aim)>4){
        const angle=Math.atan2(aim.y-cop.y,aim.x-cop.x);
        const change=angleDiff(cop.a,angle);
        cop.a+=clamp(change,-3.65*dt,3.65*dt);
        const v=(154+game.heat*24)*(Math.abs(change)>1?.36:1);
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
    stepJob();
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
  function drawCar(c){
    const isPolice=c.kind==='police',isPlayer=c===game.player.car,len=c.van?46:c.type==='sport'?42:c.type==='compact'?34:38,wide=c.van?24:21;
    ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.a);
    rect(ctx,-len/2+4,-wide/2+4,len,wide,'#111811ab');
    for(const x of [-len/2+5,len/2-12])for(const y of [-wide/2-2,wide/2-3])rect(ctx,x,y,7,5,'#191d19');
    path(ctx,[[-len/2+2,-wide/2],[len/2-4,-wide/2],[len/2,-wide/2+4],[len/2,wide/2-4],[len/2-5,wide/2],[-len/2+2,wide/2],[-len/2,-wide/2+3]],c.color);
    rect(ctx,-len/2+3,-wide/2+2,len-9,2,'#fff5c361');rect(ctx,-len/2+3,wide/2-3,len-9,2,'#14201970');
    if(c.van){
      rect(ctx,-len/2+5,-wide/2+4,len*.53,wide-8,'#e6d8a42e');
      rect(ctx,len/2-15,-wide/2+3,5,wide-6,'#263932');
      rect(ctx,-len/2+7,-wide/2+5,len*.45,1,'#fff8c657');
    }else{
      path(ctx,[[-10,-wide/2+3],[5,-wide/2+3],[9,wide/2-3],[-9,wide/2-3]],'#293b37');
      rect(ctx,-6,-wide/2+4,10,wide-8,isPolice?'#e0e7dc':'#47544a');
      rect(ctx,7,-wide/2+4,2,wide-8,'#92a9a188');
    }
    if(isPolice){
      rect(ctx,-len/2+1,-wide/2+4,8,wide-8,'#304652');
      if(c.role==='interceptor')rect(ctx,-len/2+2,-wide/2+4,4,wide-8,'#dbb568');
      const flash=reduced.matches||Math.floor(game.time*5)%2===0;
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
    rect(ctx,-3,-7,7,14,isPlayer?'#d7ee7e':p.color);rect(ctx,1,-3,6,6,isPlayer?'#f6d6a6':'#d4ab87');
    if(isPlayer)rect(ctx,-4,-5,3,10,'#55764f');ctx.restore();
    if(isPlayer)path(ctx,[[p.x-5,p.y-16],[p.x+5,p.y-16],[p.x,p.y-10]],LIME);
  }
  function drawStreetChanges(){
    if(!dockOpen())for(const gx of DOCK.gates){
      rect(ctx,gx-4,DOCK.y-27,8,54,'#211f16');rect(ctx,gx-2,DOCK.y-24,4,48,'#e3ad68');
      for(let i=-21;i<25;i+=7)rect(ctx,gx-2,DOCK.y+i,4,3,'#4c4731');
    }
    else for(const gx of DOCK.gates){rect(ctx,gx-3,DOCK.y-27,6,7,CYAN);rect(ctx,gx-3,DOCK.y+21,6,7,CYAN);}
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
    ctx.setTransform(dpr,0,0,dpr,0,0);rect(ctx,0,0,width,height,'#28352d');
    ctx.save();ctx.scale(viewScale,viewScale);ctx.translate(-camera.x,-camera.y);
    ctx.drawImage(terrain,camera.x,camera.y,Math.min(W-camera.x,ww),Math.min(H-camera.y,wh),camera.x,camera.y,Math.min(W-camera.x,ww),Math.min(H-camera.y,wh));
    for(const m of game.marks){ctx.save();ctx.translate(m.x,m.y);ctx.rotate(m.a);rect(ctx,-14,-9,8,2,'#18201baa');rect(ctx,-14,8,8,2,'#18201baa');ctx.restore();}
    const target=guideGoal(),route=phase==='title'?null:navRoute(target);
    if(route&&route.points.length>1){
      ctx.strokeStyle=guideColor(target)+'86';ctx.lineWidth=2.8;ctx.lineJoin='round';ctx.setLineDash([10,8]);ctx.beginPath();
      route.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.setLineDash([]);
    }
    const m=game.mission, choosing=m?.job.steps[m.idx].choice;
    if(m&&!choosing&&!m.job.steps[m.idx].van){
      const goal=activeGoal();marker(goal.x,goal.y,guideColor(goal),'+',!game.waypoint);
    }
    drawStreetChanges();
    if(!game.won){marker(PHONE.p.x,PHONE.p.y,LIME,'P',choosing||target===PHONE.p);marker(PHONE.m.x,PHONE.m.y,ORANGE,'M',choosing||target===PHONE.m);}
    marker(GARAGE.x,GARAGE.y,CYAN,'G',game.waypoint);
    const visible=o=>o.x>camera.x-40&&o.x<camera.x+ww+40&&o.y>camera.y-40&&o.y<camera.y+wh+40;
    for(const p of game.people)if(visible(p))drawPerson(p);
    for(const c of game.cars)if(c!==game.player.car&&visible(c)){
      drawCar(c);if(c.job&&game.mission?.idx===0)marker(c.x,c.y-27,c.id==='disputa'?CYAN:ORANGE,'+',true);
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
    let s='<rect width="2120" height="1680" fill="#171e17"/><path d="M2008 0h112v1680h-112z" fill="#25403a"/>';
    for(const q of blocks){s+=`<rect x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}" fill="${q.id%4===0?'#384735':'#343d30'}"/>`;}
    for(const x of X)s+=`<path d="M${x} 0v1680" stroke="#55604c" stroke-width="15"/>`;
    for(const y of Y)s+=`<path d="M0 ${y}h2000" stroke="#55604c" stroke-width="15"/>`;
    s+=`<path d="M${ALLEY.x} ${ALLEY.from}V${ALLEY.to}" stroke="#6c6e52" stroke-width="12"/>`;
    for(const [x,y,label,color] of [[PHONE.p.x,PHONE.p.y,'P',LIME],[PHONE.m.x,PHONE.m.y,'M',ORANGE],[GARAGE.x,GARAGE.y,'G',CYAN]])s+=`<circle cx="${x}" cy="${y}" r="48" fill="#1c241a" stroke="${color}" stroke-width="9"/><text x="${x}" y="${y+21}" fill="${color}" font-family="monospace" font-size="63" text-anchor="middle" font-weight="700">${label}</text>`;
    return s;
  };
  const staticMap=mapBase();
  $('mini').innerHTML=staticMap+'<g id="mini-live"></g>';
  function liveMap(){
    const p=player(),goal=phase==='title'?null:guideGoal(),route=navRoute(goal),b=game.block;
    const red=game.police.map(c=>`<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${c.role==='interceptor'?23:19}" fill="${RED}"/>`).join('');
    const dock=`<path d="M${DOCK.from} ${DOCK.y}H${DOCK.to}" stroke="${dockOpen()?'#78b3a3':'#706145'}" stroke-width="12" ${dockOpen()?'':'stroke-dasharray="15 16"'}/>`;
    const block=b?`<path d="M${b.x-17} ${b.y-17}l34 34m0-34-34 34" stroke="${RED}" stroke-width="13"/>`:'';
    const line=route?.points.length>1?`<polyline data-gps="true" points="${route.points.map(q=>[Math.round(q.x),Math.round(q.y)].join(',')).join(' ')}" fill="none" stroke="${guideColor(goal)}" stroke-width="11" stroke-linejoin="round"/>`:'';
    const marked=goal===GARAGE_GOAL||game.mission&&!game.mission.job.steps[game.mission.idx].choice;
    return dock+line+red+block+(goal&&marked?`<circle cx="${goal.x}" cy="${goal.y}" r="43" fill="none" stroke="${guideColor(goal)}" stroke-width="10"/>`:'')+`<circle cx="${p.x}" cy="${p.y}" r="26" fill="#f3f5dc" stroke="#101710" stroke-width="7"/>`;
  }
  const set=(id,text)=>{const e=$(id);if(e.textContent!==text)e.textContent=text;};
  let uiT=0;
  function updateUI(){
    const c=game.player.car,p=player(),m=game.mission,goal=activeGoal();
    set('cash',`${fmt(game.cash)} CR`);set('condition-label',c?CAR_TYPES[c.type].name.toUpperCase():'ENERGÍA');$('integrity').value=p.hp;
    $('stars').setAttribute('aria-label',`Alerta: ${game.heat} de 3`);
    Array.from($('stars').children).forEach((star,i)=>star.classList.toggle('lit',i<game.heat));
    set('neighborhood',p.x>=1430&&p.y>1430?'CINTURÓN INDUSTRIAL':p.x>1510?'VIEJO MUELLE':p.y>1100?'LOS DEPÓSITOS':p.x>1050?'BARRIO DEL TALLER':p.x<430&&p.y<488?'CASCO VIEJO':p.y<300?'BULEVAR NORTE':'EL CRUCE');
    $('speed').hidden=!c;if(c)set('speed',`${Math.round(Math.abs(c.s)*.55)} KM/H`);
    const near=interactable();$('prompt').hidden=!near;
    if(near)set('prompt',`${touchMode()?'ACCIÓN':'E'} · ${near.name}`);
    $('broadcast').hidden=!game.msg||game.time>game.msgUntil;if(!$('broadcast').hidden)set('broadcast',game.msg);
    set('p-count',`${game.rep.p}/2`);set('m-count',`${game.rep.m}/2`);
    for(const [side,hood] of [['p','El Cruce'],['m','Viejo Muelle']]){
      const trust=game.trust[side],tag=$(side+'-rep');
      tag.dataset.rapport=trust<0?'hostile':trust>=2?'ally':'neutral';
      set(side+'-rep',trust<0?'Con recelo':trust>=2?'Aliados':trust===1?'Buena relación':hood);
    }
    $('reward').hidden=!game.gift;
    if(game.gift)set('reward-name',game.gift==='p'?'Deportivo en El Cruce':'Paso privado de los muelles');
    $('mission-distance').hidden=!goal||phase==='title';
    $('mobile-goal').hidden=(!m&&!finalAvailable()&&!disputeAvailable()&&!game.waypoint)||phase!=='play'||game.won&&!game.waypoint;
    const route=phase==='title'?null:navRoute();
    const meters=goal?Math.round(!game.waypoint&&route?route.length:dist(p,goal)):0;
    if(m){
      const seconds=m.deadline?Math.max(0,Math.ceil(m.deadline-game.time)):0;
      set('brief-title',m.job.name);
      const choice=m.job.steps[m.idx].choice;
      const action=touchMode()?'ACCIÓN':'E';
      const objective=choice?`P ofrece un deportivo; M, un atajo. Detente en su teléfono con la furgoneta y pulsa ${action}.`:m.job.steps[m.idx].text;
      set('brief-text',(m.job.car&&!c?'Necesitas un coche. ':'')+objective);
      set('mission-distance',`${m.idx+1}/${m.job.steps.length} · ${choice?'P o M':meters+' m'}${m.deadline?' · '+seconds+' s':''}`);
      set('mobile-goal-progress',m.deadline?`${seconds} s`:`${m.idx+1}/${m.job.steps.length}`);
      set('mobile-goal-text',choice?`P: deportivo · M: atajo. Detente y pulsa ${action}.`:(m.job.car&&!c?'Busca un coche. ': '')+objective);
    }else{
      const all=finalAvailable(),pending=disputeAvailable(),title=phase==='title';
      set('brief-title',title?'Hazte un nombre':game.won?'Ciudad libre':all?'Una última llamada':pending?'Llamada urgente':'Busca un teléfono');
      set('brief-text',title?'Trabaja para las bandas, elige un bando cuando sus intereses choquen y mantén un ojo en el nivel de alerta.':game.won?'Has completado la historia. La ciudad sigue abierta.':all?'Vuelve al teléfono de Los Pistones en El Cruce.':pending?'Contesta cualquiera de los dos teléfonos. Hay una furgoneta en disputa.':'Acércate a un teléfono marcado en el mapa y acepta un encargo.');
      if(goal)set('mission-distance',`${goal.name??'EL CRUCE'} · ${meters} m`);
      if(all){set('mobile-goal-progress','FINAL');set('mobile-goal-text','Vuelve al teléfono P en El Cruce.');}
      if(pending){set('mobile-goal-progress','RADIO');set('mobile-goal-text','Contesta cualquiera de los dos teléfonos.');}
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
    $('title-screen').hidden=phase!=='title';$('hud').hidden=phase==='title';
    $('touch').hidden=phase!=='play'||!!dialog;
    $('pause').disabled=phase==='title'||phase==='end'||phase==='win';
    $('pause').setAttribute('aria-pressed',String(dialog==='pause'));
    set('state-label',dialog==='pause'?'PARTIDA EN PAUSA':dialog==='map'?'PLANO DEL DISTRITO':phase==='title'?'ESPERANDO JUGADOR':phase==='end'?'FUERA DE SERVICIO':phase==='win'?'DISTRITO COMPLETADO':'EN DIRECTO');
    updateUI();paintDirty=true;render();
  }
  function clearInput(){keys.clear();touches.clear();document.querySelectorAll('.held').forEach(b=>b.classList.remove('held'));}
  function start(){
    clearInput();readyAudio();effect('job');game=fresh();phase='play';closeDialog(false);
    notify('Teléfono P: acércate y pulsa '+(touchMode()?'ACCIÓN.':'E.'),5);
    refreshShell();$('stage').focus({preventScroll:true});
  }
  function showDialog(kind){
    if(!dialog)lastFocus=document.activeElement;
    clearInput();dialog=kind;
    const panel=$('overlay-panel'), body=$('dialog-content'),actions=$('dialog-actions');
    panel.classList.toggle('map-dialog',kind==='map');
    $('close-overlay').hidden=kind==='end'||kind==='win';
    const labels={help:['MANUAL DE CALLE','Cómo jugar'],map:['NAVEGACIÓN / UMBRAL','Plano del distrito'],pause:['TRANSMISIÓN EN PAUSA','Partida en pausa'],end:['FIN DE LA PARTIDA','Fuera de servicio'],win:['HISTORIA COMPLETA','El puerto es tuyo']};
    set('dialog-kicker',labels[kind][0]);set('dialog-title',labels[kind][1]);
    let buttons=[];
    if(kind==='help'){
      body.innerHTML='<p>Completa dos encargos de cada banda y resuelve la entrega disputada para desbloquear la misión final.</p><ul><li><strong>WASD / flechas:</strong> muévete. En coche, arriba acelera, abajo frena o da marcha atrás y los lados giran.</li><li><strong>E / Acción:</strong> contesta un teléfono, entra o sal del coche y usa el garaje.</li><li><strong>Espacio / Freno:</strong> activa el freno de mano.</li><li><strong>M / mapa:</strong> consulta el GPS o marca el garaje. <strong>Esc:</strong> pausa.</li><li><strong>Garaje G:</strong> repara, recupera energía y baja la alerta a cero.</li></ul>';
      buttons=[['Entendido','close',true]];
    }else if(kind==='map'){
      body.innerHTML=`<svg viewBox="0 0 2120 1680" class="map-large" role="img" aria-label="Plano con la posición del jugador, la ruta por las calles y los teléfonos">${staticMap+liveMap()}</svg><div class="legend"><span><b style="color:${LIME}">P</b>Pistones</span><span><b style="color:${ORANGE}">M</b>La Marea</span><span><b style="color:${CYAN}">G</b>Garaje</span><span><b>●</b>Tú</span><span><b style="color:${RED}">●</b>Patrulla</span><span><b style="color:${RED}">×</b>Bloqueo</span></div>`;
      buttons=[['Cerrar mapa','close',true],...(phase==='play'?[[game.waypoint?'Quitar destino GPS':'Marcar garaje','waypoint']]:[])];
    }else if(kind==='pause'){
      body.innerHTML='<p>La ciudad y los cronómetros se han detenido.</p>';
      buttons=[['Continuar','close',true],['Cómo jugar','pause-help'],...(game.mission?[['Abandonar encargo','abort']]:[]),['Volver al inicio','title']];
    }else{
      body.innerHTML=`<p id="outcome"></p><p>Encargos: <strong>${game.missionDone}/${FINAL_COUNT}</strong> · Efectivo: <strong>${fmt(game.cash)} CR</strong><br>Récord de esta sesión: <strong>${fmt(best)} CR</strong></p>`;
      if(kind==='win'){set('outcome',`Has completado los seis encargos. Esta noche elegiste a ${PHONE[game.gift].name}.`);buttons=[['Seguir explorando','free',true],['Volver al inicio','title']];}
      else{set('outcome',game.endReason);buttons=[['Reintentar','start',true],['Volver al inicio','title']];}
    }
    actions.innerHTML=buttons.map(([label,id,primary])=>`<button type="button" class="${primary?'primary':'secondary'}" data-action="${id}">${label}</button>`).join('');
    $('overlay').hidden=false;refreshShell();(actions.querySelector('button')||panel).focus({preventScroll:true});
  }
  function closeDialog(focus=true){
    dialog=null;$('overlay').hidden=true;refreshShell();
    if(focus){const target=phase==='play'?$('stage'):lastFocus&&lastFocus.isConnected&&!lastFocus.closest('[hidden]')?lastFocus:$('start-btn');target.focus({preventScroll:true});}
    lastFocus=null;
  }
  function finish(win,reason=''){
    if(phase!=='play')return;
    best=Math.max(best,game.cash);game.endReason=reason;phase=win?'win':'end';
    effect(win?'win':'loss');showDialog(phase);
  }
  function showTitle(){phase='title';game=fresh();closeDialog(false);$('start-btn').focus({preventScroll:true});}
  function pause(){
    if(phase!=='play')return;
    if(dialog)closeDialog();else showDialog('pause');
  }
  function openMap(){if(phase==='end'||phase==='win')return;if(dialog==='map')closeDialog();else if(!dialog)showDialog('map');}
  $('start-btn').addEventListener('click',start);
  $('sound').addEventListener('click',toggleSound);
  $('pause').addEventListener('click',pause);
  $('tutorial').addEventListener('click',()=>showDialog('help'));
  $('map-btn').addEventListener('click',openMap);
  $('touch-map').addEventListener('click',openMap);
  $('close-overlay').addEventListener('click',()=>closeDialog());
  $('dialog-actions').addEventListener('click',e=>{
    const a=e.target.closest('button')?.dataset.action;
    if(a==='close')closeDialog();
    if(a==='start')start();
    if(a==='title')showTitle();
    if(a==='pause-help')showDialog('help');
    if(a==='abort'){cancelJob('Encargo abandonado. Puedes volver a intentarlo.');closeDialog();}
    if(a==='waypoint'){game.waypoint=!game.waypoint;notify(game.waypoint?'GPS: garaje marcado.':'GPS: destino eliminado.');closeDialog();}
    if(a==='free'){phase='play';closeDialog(false);$('stage').focus({preventScroll:true});}
  });
  document.addEventListener('keydown',e=>{
    if(e.ctrlKey||e.altKey||e.metaKey)return;
    if(e.code==='Tab'&&dialog){
      const b=[...$('overlay-panel').querySelectorAll('button:not([hidden])')]; if(!b.length)return;
      if(e.shiftKey&&(document.activeElement===b[0]||!b.includes(document.activeElement))){e.preventDefault();b.at(-1).focus();}
      else if(!e.shiftKey&&(document.activeElement===b.at(-1)||!b.includes(document.activeElement))){e.preventDefault();b[0].focus();}
      return;
    }
    if(e.code==='Escape'&&!e.repeat){e.preventDefault();if(dialog&&dialog!=='end'&&dialog!=='win')closeDialog();else if(!dialog)pause();return;}
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
      mission:m?{name:m.job.name,stage:m.idx+1,stages:m.job.steps.length,left:m.deadline?round(m.deadline-game.time):null,choose:!!m.job.steps[m.idx].choice}:null,
      gps:route?{dest:game.waypoint?'garage':'mission',meters:Math.round(route.length),points:route.points.map(q=>[round(q.x),round(q.y)])}:null,
      finished:game.won,garage:GARAGE,phones:PHONE,
      nearbyCars:game.cars.filter(c=>c.kind!=='traffic'&&dist(c,p)<350).map(c=>({x:round(c.x),y:round(c.y),id:c.id,type:c.type})),
      police:game.police.map(c=>({x:round(c.x),y:round(c.y),role:c.role})),
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
  refreshShell();resize();loop=requestAnimationFrame(tick);
})();
