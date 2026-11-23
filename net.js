/* Two-player data channels. The server only introduces peers; the host runs the game. */
(() => {
  'use strict';
  const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789', version='ug-5', prefix='united-gangs-v5-';
  const valid=/^[A-HJ-NP-Z2-9]{8}$/;
  let peer=null, conn=null, loading, mode='', code='', timer=0, accepted=false, generation=0;
  const net={
    get hosting(){return mode==='host';}, get joining(){return mode==='guest';},
    get connected(){return accepted&&!!conn?.open;}, get code(){return code;},
    get busy(){return !!mode;}, valid,
    onStatus:()=>{}, onConnect:()=>{}, onData:()=>{}, onLost:()=>{},
    host(){return open('host');}, join(value){return open('guest',value);},
    send(data){
      if(!net.connected||conn.dataChannel?.bufferedAmount>200000)return;
      try{conn.send(data);}catch{}
    },
    close(){
      generation++;clearTimeout(timer);mode='';code='';accepted=false;
      const old=peer;peer=null;conn=null;old?.destroy();
    }
  };
  function loadPeer(){
    if(window.Peer)return Promise.resolve();
    if(!loading)loading=new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      const limit=setTimeout(()=>{loading=null;s.remove();reject(Error('timeout'));},8000);
      s.src='./vendor/peerjs.min.js';
      s.onload=()=>{clearTimeout(limit);resolve();};
      s.onerror=()=>{clearTimeout(limit);loading=null;s.remove();reject(Error('load'));};
      document.head.append(s);
    });
    return loading;
  }
  function failed(message){
    const linked=accepted;
    net.close();net.onStatus(message);
    if(linked)net.onLost(message);
  }
  function watch(c,token){
    if(token!==generation)return;
    if(conn||c.label!==version||c.metadata?.game!==version){
      c.on('open',()=>c.close());
      return;
    }
    conn=c;
    c.on('open',()=>{
      if(conn!==c||token!==generation)return;
      clearTimeout(timer);accepted=true;
      net.onStatus(mode==='host'?'Tu compañero se ha conectado.':'Conectado. El anfitrión elige el mapa.');
      net.onConnect();
    });
    c.on('error',()=>{
      if(conn!==c||token!==generation)return;
      if(mode==='host'&&!accepted){conn=null;c.close();return;}
      failed('No se pudo mantener la conexión con el otro jugador.');
    });
    c.on('close',()=>{
      if(conn!==c||token!==generation)return;
      if(mode==='host'&&!accepted){conn=null;return;}
      failed(accepted?'El otro jugador salió de la sala.':'La conexión no llegó a abrirse.');
    });
    c.on('data',data=>{if(conn===c&&net.connected&&data&&typeof data==='object')net.onData(data);});
  }
  async function open(role,value=''){
    if(net.busy)return;
    value=value.trim().toUpperCase();
    if(role==='guest'&&!valid.test(value)){net.onStatus('El código debe tener 8 letras o números.');return;}
    mode=role;
    const token=++generation;
    const generated=Array.from(crypto.getRandomValues(new Uint8Array(8)),n=>alphabet[n&31]).join('');
    net.onStatus(role==='host'?'Creando sala…':'Buscando sala…');
    try{await loadPeer();}catch{if(token===generation)failed('No se pudo cargar la conexión online. Prueba de nuevo.');return;}
    if(token!==generation)return;
    try{peer=role==='host'?new window.Peer(prefix+generated):new window.Peer();}
    catch{failed('Este navegador no pudo iniciar el modo online.');return;}
    timer=setTimeout(()=>{if(token===generation)failed('No se pudo conectar. Revisa el código o prueba otra red.');},15000);
    peer.on('error',e=>{
      if(token!==generation||accepted&&e.type==='network')return;
      const message=e.type==='peer-unavailable'?'No encontramos esa sala. Revisa el código y que siga abierta.'
        :e.type==='unavailable-id'?'Ese código ya está en uso. Crea otra sala.'
        :'No se pudo conectar al servicio online. Prueba de nuevo.';
      failed(message);
    });
    peer.on('disconnected',()=>{
      if(token===generation&&!accepted)failed('Se perdió el acceso al servicio online. Crea o busca la sala de nuevo.');
    });
    peer.on('connection',c=>{
      if(mode==='host')watch(c,token);else c.on('open',()=>c.close());
    });
    peer.on('open',()=>{
      if(token!==generation)return;
      if(mode==='host'){
        clearTimeout(timer);code=generated;
        net.onStatus('Sala abierta. Comparte el código y espera a tu compañero.');
      }else{
        code=value;
        watch(peer.connect(prefix+value,{label:version,metadata:{game:version},serialization:'json',reliable:true}),token);
      }
    });
  }
  window.UnitedNet=net;
})();
