/* Player profile is local to the current page. The optional backup is user-controlled. */
(() => {
  'use strict';
  const RANKS=50, XP_PER_RANK=500;
  const SHOP={
    stock:{name:'Compacto de serie',type:'compact',color:'#76f0d2',price:0,tag:'ORIGINAL',desc:'Ágil y fácil de controlar en calles estrechas.'},
    halo:{name:'Halo X-9',type:'hover',color:'#b0a3ff',price:16800,tag:'VOLADOR',desc:'Pulsa H para despegar y sobrevolar tejados y canales.'},
    tide:{name:'Marea GT',type:'sedan',color:'#76bcf9',price:3200,tag:'TURISMO',desc:'Más velocidad sin sacrificar estabilidad.'},
    ember:{name:'Brasa RS',type:'sport',color:'#ff8a9d',price:7400,tag:'DEPORTIVO',desc:'Acelera con fuerza. Anticipa las curvas.'},
    titan:{name:'Titán de carga',type:'van',color:'#ffd387',price:4900,tag:'FURGONETA',desc:'Buena adherencia y carrocería ancha.'},
    aurora:{name:'Aurora 50',type:'sport',color:'#dc9ef8',price:null,tag:'PASE · NIVEL 50',desc:'Deportivo con pintura exclusiva del pase.'}
  };
  const fresh=()=>({cash:0,wrenches:0,xp:0,unlocked:false,master:false,claimed:0,freeDone:0,owned:['stock'],equipped:'stock',
    story:{completed:[],rep:{p:0,m:0},trust:{p:0,m:0},gift:null,won:false}});
  const rank=p=>p.unlocked?Math.min(RANKS,p.master?RANKS:Math.floor(p.xp/XP_PER_RANK)):0;
  const rewardFor=n=>n===50?'Aurora 50':n%10===0?'+1 llave inglesa':'+300 CR';
  function collect(p){
    const level=rank(p),old=p.claimed;
    for(let n=old+1;n<=level;n++){
      if(n===50){if(!p.owned.includes('aurora'))p.owned.push('aurora');}
      else if(n%10===0)p.wrenches++;
      else if(n%5===0)p.cash+=300;
    }
    p.claimed=Math.max(old,level);
    return level-old;
  }
  function earn(p,pay,xp,storyDone=false){
    p.cash+=pay;p.xp+=xp;p.wrenches++;
    if(storyDone)p.unlocked=true;
    return collect(p);
  }
  function redeem(p,code){
    if(code.trim().toUpperCase()!=='SALADO')return false;
    p.unlocked=p.master=true;collect(p);return true;
  }
  const storyXP=job=>job.tag==='Gran cierre'?2000:800+job.level*100;
  const pack=p=>'UG6.'+btoa(JSON.stringify(p));
  function unpack(code,ids){
    if(!/^UG6\.[\w+/=]{1,8192}$/.test(code))return null;
    try{
      const d=JSON.parse(atob(code.slice(4))), p=fresh();
      if(!d||typeof d!=='object'||!Array.isArray(d.owned)||!Array.isArray(d.story?.completed))return null;
      const int=(n,min,max)=>Number.isInteger(n)?Math.min(max,Math.max(min,n)):min;
      for(const k of ['cash','xp','wrenches','freeDone'])p[k]=int(d[k],0,1e9);
      p.story.completed=[...new Set(d.story.completed.filter(id=>ids.has(id)))];
      if(p.story.completed.length<ids.size)p.story.completed=p.story.completed.filter(id=>id!=='union');
      p.story.won=p.story.completed.length===ids.size;
      p.story.gift=['p','m'].includes(d.story.gift)?d.story.gift:null;
      for(const k of ['p','m']){p.story.rep[k]=int(d.story.rep?.[k],0,25);p.story.trust[k]=int(d.story.trust?.[k],-2,4);}
      p.master=d.master===true;p.unlocked=d.unlocked===true||p.story.won||p.master;
      p.owned=[...new Set(['stock',...d.owned.filter(id=>Object.hasOwn(SHOP,id)&&id!=='aurora')])];
      if(rank(p)===RANKS)p.owned.push('aurora');
      p.equipped=p.owned.includes(d.equipped)?d.equipped:'stock';
      p.claimed=int(d.claimed,0,rank(p));collect(p);
      return p;
    }catch{return null;}
  }
  window.UnitedProgress={fresh,SHOP,RANKS,XP_PER_RANK,rank,collect,earn,redeem,rewardFor,storyXP,pack,unpack};
})();
