/* Deterministic free-roam world. Only the active sector is materialized. */
(() => {
  'use strict';
  const basins=['Puerto Umbral','Costa Candela','Sierra Eléctrica','Ciudad Prisma','Distrito Art Déco'];
  const starts=[[0,0],[1,0],[0,1],[0,-1],[-1,0]];
  const directions=[
    {id:'N',dx:0,dy:-1,opposite:'S',name:'Norte',arrow:'↑'},
    {id:'E',dx:1,dy:0,opposite:'O',name:'Este',arrow:'→'},
    {id:'S',dx:0,dy:1,opposite:'N',name:'Sur',arrow:'↓'},
    {id:'O',dx:-1,dy:0,opposite:'E',name:'Oeste',arrow:'←'}
  ];
  const mod=(n,d)=>((n%d)+d)%d;
  const type=(x,y)=>mod(mod(x,5)+2*mod(y,5),5);
  const valid=(x,y)=>Number.isSafeInteger(x)&&Number.isSafeInteger(y);
  function hash(x,y){
    let h=2166136261;
    for(const ch of `${x}:${y}`)h=Math.imul(h^ch.charCodeAt(0),16777619);
    return h>>>0;
  }
  function recipe(x,y,chapters){
    const biome=type(x,y),base=chapters[biome],seed=hash(x,y);
    const rand=(i,axis)=>hash(seed,axis+i)%47-23;
    const X=base.x.map((v,i)=>!i||i===base.x.length-1?v:v+rand(i,101));
    const Y=base.y.map((v,i)=>!i||i===base.y.length-1?v:v+rand(i,211));
    const spawn=[X[1]+2,Y[1]+41,X[1]+39,Y[1]+32,0];
    const rows=base.bridges??Y.map((_,i)=>i);
    const row=rows.filter(i=>i>0&&i<Y.length-1);
    const middle=row.length?row:rows;
    const cols=X.map((_,i)=>i).filter(i=>i>=2&&i<X.length-2);
    const gates=directions.map(d=>{
      const horizontal=!!d.dx;
      const indices=horizontal?middle:cols;
      // Both ends choose a connected arterial using the same boundary seed.
      const edgeSeed=hash(d.dx<0||d.dy<0?x+d.dx:x,d.dx<0||d.dy<0?y+d.dy:y);
      const ix=indices[(edgeSeed+(horizontal?13:31))%indices.length];
      const gx=horizontal?(d.dx>0?base.w-55:55):X[ix];
      const gy=horizontal?Y[ix]:(d.dy>0?base.h-55:55);
      const nx=x+d.dx,ny=y+d.dy,neighbor=type(nx,ny);
      return {...d,x:gx,y:gy,nx,ny,neighbor,target:basins[neighbor],text:`Salida ${d.name} · ${basins[neighbor]}`};
    });
    return {x,y,biome,gates,config:{...base,name:basins[biome],seed,x:X,y:Y,spawn,jobs:{},exitBridge:gates[1].y}};
  }
  window.UnitedEndless={basins,starts,type,valid,recipe};
})();
