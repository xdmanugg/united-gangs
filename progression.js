/* Player profile is local to the current page. The optional backup is user-controlled. */
(() => {
  'use strict';
  const RANKS=50, XP_PER_RANK=500;
  const discoveries=window.UnitedDiscoveries;
  const SHOP={
    stock:{name:'Compacto de serie',type:'compact',color:'#76f0d2',price:0,tag:'ORIGINAL',desc:'Ágil y fácil de controlar en calles estrechas.'},
    halo:{name:'Halo X-9',type:'hover',color:'#b0a3ff',price:16800,tag:'VOLADOR',desc:'Pulsa H para despegar y sobrevolar tejados y canales.'},
    tide:{name:'Marea GT',type:'sedan',color:'#76bcf9',price:3200,tag:'TURISMO',desc:'Más velocidad sin sacrificar estabilidad.'},
    ember:{name:'Brasa RS',type:'sport',color:'#ff8a9d',price:7400,tag:'DEPORTIVO',desc:'Acelera con fuerza. Anticipa las curvas.'},
    titan:{name:'Titán de carga',type:'van',color:'#ffd387',price:4900,tag:'FURGONETA',desc:'Buena adherencia y carrocería ancha.'},
    aurora:{name:'Aurora 50',type:'sport',color:'#dc9ef8',price:null,tag:'PASE · NIVEL 50',desc:'Deportivo con pintura exclusiva del pase.'},
    nacre:{name:'Nácar GT',type:'sport',color:'#c8f4ed',price:null,tag:'EDICIÓN DE EXPLORACIÓN',desc:'Deportivo con acabado perlado y faros de cristal.',field:true},
    copper:{name:'Correo de Cobre',type:'van',color:'#dc9c73',price:null,tag:'EDICIÓN DE EXPLORACIÓN',desc:'Furgoneta de reparto con pintura metalizada.',field:true}
  };
  const fresh=()=>({cash:0,wrenches:0,unlimitedWrenches:false,xp:0,unlocked:false,master:false,claimed:0,freeDone:0,owned:['stock'],equipped:'stock',
    discoveries:[],discoveryClaims:[],story:{completed:[],rep:{p:0,m:0},trust:{p:0,m:0},gift:null,won:false}});
  const rank=p=>p.unlocked?Math.min(RANKS,p.master?RANKS:Math.floor(p.xp/XP_PER_RANK)):0;
  const milestone=n=>n<5||n>RANKS||n%5!==0?null:n===50?{car:'aurora',label:'Aurora 50'}:n%10===0?{tools:1,label:'+1 llave inglesa'}:{cash:300,label:'+300 CR'};
  const rewardFor=n=>milestone(n)?.label??'';
  function collect(p){
    const level=rank(p),old=p.claimed;
    for(let n=old+1;n<=level;n++){
      const reward=milestone(n);
      if(!reward)continue;
      if(reward.car&&!p.owned.includes(reward.car))p.owned.push(reward.car);
      p.wrenches+=reward.tools??0;p.cash+=reward.cash??0;
    }
    p.claimed=Math.max(old,level);
    return level-old;
  }
  function earn(p,pay,xp,storyDone=false){
    p.cash+=pay;p.xp+=xp;p.wrenches++;
    if(storyDone)p.unlocked=true;
    return collect(p);
  }
  function discover(p,id){
    if(!discoveries.byId.has(id)||p.discoveries.includes(id))return false;
    p.discoveries.push(id);return true;
  }
  // Fingerprints keep private game codes out of interface text; they aren't a security boundary.
  function legacyCode(key){
    let h=2166136261;
    for(const ch of 'UG/08/'+key)h=Math.imul(h^ch.charCodeAt(0),16777619);
    return h>>>0;
  }
  function redeem(p,code){
    const key=code.trim().toUpperCase();
    if(!/^[A-Z0-9]{1,18}$/.test(key))return null;
    const entry=discoveries.byCode.get(key);
    if(entry){
      const {id,reward}=entry,already=p.discoveryClaims.includes(id);
      discover(p,id);
      if(!already){
        p.discoveryClaims.push(id);
        p.cash+=reward.cash??0;p.xp+=reward.xp??0;p.wrenches+=reward.tools??0;
        if(reward.car&&!p.owned.includes(reward.car))p.owned.push(reward.car);
        collect(p);
      }
      return {type:'discovery',already,reward,entry};
    }
    const digest=legacyCode(key);
    if(key.length===8&&digest===0x591a63ce){
      const already=p.unlimitedWrenches;
      p.unlimitedWrenches=true;return {type:'tools',already};
    }
    if(key.length!==6||digest!==0xe6cb3155)return null;
    const cash=p.cash,tools=p.wrenches,car=p.owned.includes('aurora'),already=p.master;
    p.unlocked=p.master=true;collect(p);
    if(!p.owned.includes('aurora'))p.owned.push('aurora');
    return {type:'pass',already,cash:p.cash-cash,tools:p.wrenches-tools,car:!car};
  }
  const canRepair=p=>p.unlimitedWrenches||p.wrenches>0;
  function useWrench(p){if(!canRepair(p))return false;if(!p.unlimitedWrenches)p.wrenches--;return true;}
  const storyXP=job=>job.tag==='Gran cierre'?2000:800+job.level*100;
  const pack=p=>'UG6.'+btoa(JSON.stringify(p));
  function unpack(code,ids){
    if(!/^UG6\.[\w+/=]{1,8192}$/.test(code))return null;
    try{
      const d=JSON.parse(atob(code.slice(4))), p=fresh();
      if(!d||typeof d!=='object'||!Array.isArray(d.owned)||!Array.isArray(d.story?.completed))return null;
      const int=(n,min,max)=>Number.isInteger(n)?Math.min(max,Math.max(min,n)):min;
      for(const k of ['cash','xp','wrenches','freeDone'])p[k]=int(d[k],0,1e9);
      p.unlimitedWrenches=d.unlimitedWrenches===true;
      p.story.completed=[...new Set(d.story.completed.filter(id=>ids.has(id)))];
      if(p.story.completed.length<ids.size)p.story.completed=p.story.completed.filter(id=>id!=='union');
      p.story.won=p.story.completed.length===ids.size;
      p.story.gift=['p','m'].includes(d.story.gift)?d.story.gift:null;
      for(const k of ['p','m']){p.story.rep[k]=int(d.story.rep?.[k],0,25);p.story.trust[k]=int(d.story.trust?.[k],-2,4);}
      p.master=d.master===true;p.unlocked=d.unlocked===true||p.story.won||p.master;
      const validNotes=ls=>Array.isArray(ls)?[...new Set(ls.filter(id=>discoveries.byId.has(id)))]:[];
      p.discoveryClaims=validNotes(d.discoveryClaims);
      p.discoveries=[...new Set([...validNotes(d.discoveries),...p.discoveryClaims])];
      p.owned=[...new Set(['stock',...d.owned.filter(id=>Object.hasOwn(SHOP,id)&&id!=='aurora'&&!SHOP[id].field)])];
      for(const id of p.discoveryClaims){
        const prize=discoveries.byId.get(id).reward.car;
        if(prize&&!p.owned.includes(prize))p.owned.push(prize);
      }
      if(rank(p)===RANKS)p.owned.push('aurora');
      p.equipped=p.owned.includes(d.equipped)?d.equipped:'stock';
      p.claimed=int(d.claimed,0,rank(p));collect(p);
      return p;
    }catch{return null;}
  }
  window.UnitedProgress={fresh,SHOP,RANKS,XP_PER_RANK,rank,collect,earn,discover,redeem,rewardFor,storyXP,canRepair,useWrench,pack,unpack};
})();
