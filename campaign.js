/* United Gangs: authored stages, locations and visual direction. Coordinates address street junctions, not real roads. */
(() => {
  const worlds=[
    {
      name:'Puerto Umbral', subtitle:'El primer pacto', stamp:'PUERTO / 23:40', style:'port', seed:32121, w:3520,h:2340,
      x:[145,505,865,1225,1585,1945,2320,2680,3040,3340],
      y:[155,445,735,1025,1315,1550,1885,2200], coast:3425,
      block:'#686568', plaza:'#667472', park:'#385745', asphalt:'#333b48', roof:['#827f80','#756660','#65818e','#a49b8b','#627078'],
      lights:['255,184,122','106,208,223','239,112,166'], sky:'#53618a',
      districts:['Casco Viejo','Distrito del Taller','Viejo Muelle','Cinturón Industrial'],
      story:'Los Pistones y La Marea controlan extremos opuestos del puerto. Gánate su confianza: una fiesta enorme necesita que las dos bandas entren por la misma puerta.',
      jobs:[
        ['paquete','El primer encargo','Entrega',1,'Reúne tres cajas y llévalas al taller del puerto.',640,'Los Pistones necesitan el equipo de sonido en el taller.',[
          [2,1,'Pasa por la plaza del mercado.'],[3,0,'Recoge el cableado de la cabina norte.','action'],[5,1,'Recoge el equipo en la nave de los pescadores.','action'],[6,3,'Haz una parada en el almacén para cargar los altavoces.','stop'],[3,2,'Entrega el equipo en el taller de Los Pistones.','action']],{side:'p'}],
        ['vuelta','La vuelta rápida','Contrarreloj',2,'Cruza siete controles de costa a costa.',980,'Los Pistones han marcado siete controles. El tiempo empieza al subir al coche.',[
          [1,0,'Cruza el primer control al norte.'],[3,0,'Continúa por el bulevar.'],[6,1,'Pasa por la dársena.','heat1'],[8,3,'Busca el control de los contenedores.'],[7,5,'Entra en el cinturón industrial.'],[4,6,'Vuelve por la ronda sur.'],[3,2,'Termina en el taller.']],{side:'p',time:150}],
        ['turno','Turno de noche','Relevo',2,'Recoge el material del puerto y haz dos relevos bajo presión.',1050,'La Marea necesita sacar las cajas de la dársena antes del cierre.',[
          [6,2,'Reúnete con el encargado de la grúa.','action'],[9,3,'Recoge la caja en los muelles.','heat1'],[8,5,'Detente en el depósito para el primer relevo.','stop'],[5,7,'Cruza la ronda industrial.','heat2'],[3,5,'Llega al lugar del segundo relevo.','action'],[2,3,'Lleva el comprobante al garaje.','action']],{side:'m',start:[5,2]}],
        ['disputa','La furgoneta disputada','Decisión',2,'Recupera la furgoneta, completa la carga y elige a quién entregarla.',1500,'Las dos bandas quieren la misma furgoneta. Recógela, completa la carga y tú decides.',[
          [3,1,'Sube a la furgoneta rosa en el mercado.','van'],[5,0,'Recoge la lista en la estación, con la furgoneta.','action'],[7,2,'Carga las últimas cajas; no te bajes de la furgoneta.','stop'],[6,4,'Lleva la furgoneta hasta la zona de intercambio.'],[4,3,'Acércate al teléfono de P o M con la furgoneta.','choice']],{side:'x',start:[2,1]}],
        ['fuga','Fuga del puerto','Persecución',3,'Activa tres estrellas y cruza el mapa hasta la salida.',2100,'La persecución empieza cuando te subas al coche. Usa el GPS para salir del puerto.',[
          [1,3,'Sal del barrio por el cruce del sur.'],[3,5,'Cruza el arco de la zona industrial.'],[6,6,'Alcanza los depósitos del este.'],[8,5,'Rodea el control por la avenida sur.'],[9,7,'Pasa por el último control antes de la salida.'],[7,7,'Llega a la salida de mantenimiento.']],{time:170,alert:3,altStart:true}],
        ['sonido','El sonido del muelle','Producción',1,'Prepara el equipo de sonido antes de enviarlo a la playa.',2300,'Reúne los amplificadores, la mesa y las luces que viajarán a Miami.',[
          [2,0,'Recoge los amplificadores en el casco viejo.','action'],[4,2,'Carga la mesa de mezclas.','stop'],[5,3,'Pasa por la entrada del almacén.'],[7,3,'Recoge la acreditación en la dársena.','action'],[8,1,'Recoge las luces en el taller.','action'],[9,5,'Pasa por la avenida de los muelles.'],[8,6,'Monta el equipo junto a la salida de carga.','stop']],{side:'m'}],
      ]
    },
    {
      name:'Costa Candela', subtitle:'La noche del festival', stamp:'BAHÍA / 00:10', style:'coast', seed:141051,w:3690,h:2540,
      x:[152,470,790,1150,1460,1840,2210,2560,2910,3220,3450],
      y:[156,475,765,1110,1430,1760,2070,2390], coast:3535, canal:6, bridges:[1,4,6],
      block:'#9d828c',plaza:'#b39180',park:'#4a6960',asphalt:'#414054',roof:['#a67878','#8e719b','#bda995','#8d9fa8','#7d797e'],
      lights:['255,143,200','107,228,235','255,189,123'],sky:'#85639e',
      districts:['Mirador Candela','Avenida de los Clubes','Paseo del Faro','Marina del Festival'],
      story:'El festival arranca al otro lado del canal. Cruza sus tres puentes, monta el escenario y consigue que los equipos de ambas bandas trabajen juntos.',
      jobs:[
        ['pulseras','Pulseras para todos','Reparto',1,'Entrega acreditaciones en tres locales y en la entrada del festival.',1150,'Sin pulseras no entra nadie al festival. Pasa por cada local antes de ir a la costa.',[
          [2,0,'Recoge las pulseras en la imprenta.','action'],[4,1,'Reparte el primer lote en el mirador.','action'],[6,2,'Deja el segundo lote en la cabina oeste.','stop'],[8,1,'Cruza el puente norte y pasa por el paseo.'],[10,3,'Entrega el tercer lote al club del faro.','action'],[9,6,'Deja el resto en la entrada sur.','action']],{side:'m'}],
        ['velvet','Circuito Velvet','Carrera',2,'Completa una vuelta de ocho controles cruzando dos puentes.',1375,'El circuito ocupa ambos lados del canal. Sigue las balizas.',[
          [3,0,'Pasa por el arco de salida.'],[5,1,'Pasa junto al mirador.'],[8,1,'Cruza el puente norte.'],[10,2,'Enfila el paseo marítimo.'],[10,5,'Rodea el recinto del festival.'],[8,6,'Cruza por la marina.'],[5,6,'Vuelve al continente por el puente sur.'],[2,3,'Pasa la meta de Velvet.']],{time:170}],
        ['convoy','Convoy del escenario','Escolta',2,'Acompaña dos tramos del convoy y prepara el escenario.',1500,'La furgoneta del escenario solo avanza si te mantienes cerca. No la pierdas de vista.',[
          [3,3,'Reúnete con el equipo de montaje.','action'],[5,4,'Escolta el convoy hasta el puente central.','escort'],[6,4,'Detente en el punto de revisión.','stop'],[9,4,'Escolta la furgoneta hasta el otro lado del canal.','escort'],[10,5,'Reúne al equipo al final del paseo.','action'],[9,6,'Aparca en la zona del escenario.','stop']],{side:'p'}],
        ['corte','Antes del apagón','Reparación',2,'Recorre la red del festival y reactiva sus cuatro puntos.',1700,'Las luces de la bahía han empezado a fallar. Toca revisar los cuatro cuadros.',[
          [2,2,'Busca la llave del cuadro en el puesto técnico.','action'],[4,0,'Restablece la corriente en el mirador.','action'],[6,3,'Reinicia el cuadro de la ribera.','action'],[8,4,'Cruza el canal por el puente central.'],[9,5,'Enciende las luces del paseo.','action'],[7,7,'Arranca el generador de la marina.','stop'],[10,6,'Prueba la iluminación desde el festival.','action']],{}],
        ['candela','Última ronda','Persecución',3,'Cruza el canal dos veces con patrullas y cierra en el faro.',2250,'Te han visto salir con los focos. Cruza los puentes y aparca en la base del faro.',[
          [1,3,'Sal de la avenida principal.'],[5,5,'Pasa por el control de la estación.'],[8,6,'Cruza el puente de la marina.'],[9,3,'Bordea el paseo de los clubes.','heat3'],[5,1,'Vuelve por el puente norte.'],[6,4,'Regresa hacia el faro por el puente central.'],[10,1,'Detén el vehículo en la base del faro.','stop']],{time:185,alert:2,altStart:true}],
        ['deco','Gran Premio de la Bahía','Carrera',2,'Recorre las dos orillas en nueve controles.',2900,'Una vuelta por la marina, el paseo y los puentes del canal.',[
          [1,0,'Pasa por el arco del mirador.'],[4,0,'Sigue por la avenida norte.'],[8,1,'Cruza por el puente norte.'],[10,2,'Pasa por el paseo costero.'],[10,6,'Rodea la marina.'],[8,7,'Llega a la recta del sur.'],[5,6,'Cruza hacia el continente.'],[2,5,'Sube por la avenida de los clubes.','heat2'],[1,3,'Termina en la meta de la bahía.']],{side:'p',time:195}],
      ]
    },
    {
      name:'Sierra Eléctrica',subtitle:'La señal perdida',stamp:'ALTIPLANO / 01:25',style:'mesa',seed:74032,w:3730,h:2670,
      x:[156,532,890,1230,1710,1965,2250,2660,3030,3510],
      y:[145,435,810,1120,1490,1810,2130,2490],canal:4,bridges:[0,3,6],
      block:'#a08d79',plaza:'#ad8d72',park:'#716452',asphalt:'#41434f',roof:['#9a7868','#9c8b87','#ac957b','#787f8c','#b49d8d'],
      lights:['255,155,97','145,177,255','232,120,190'],sky:'#8a6470',
      districts:['Barrio de las Antenas','Cañón de Cobre','Central de Energía','Observatorio'],
      story:'La señal de radio se ha cortado en el altiplano. Recupera los repetidores y encuentra una salida por las carreteras del cañón.',
      jobs:[
        ['antenas','En la misma frecuencia','Radio',1,'Calibra tres repetidores y prueba la señal en el observatorio.',1400,'Para reunir a las bandas, primero tienen que oírse. Visita tres repetidores.',[
          [1,0,'Recoge el medidor de radio.','action'],[3,2,'Calibra la antena del pueblo.','action'],[5,3,'Cruza el viaducto central.'],[7,1,'Calibra el repetidor de la cresta.','action'],[9,3,'Ajusta la antena de la ladera.','action'],[8,6,'Valida la señal en el observatorio.','stop']],{side:'p'}],
        ['desfiladero','Vuelta al desfiladero','Contrarreloj',2,'Haz una vuelta larga por los tres viaductos del cañón.',1800,'Tienes una vuelta completa para medir la distancia entre bases.',[
          [1,3,'Entra en la carretera del cañón.'],[5,3,'Cruza el viaducto central.'],[8,1,'Ve hacia las antenas del norte.'],[4,0,'Vuelve por el viaducto norte.'],[2,4,'Rodea el pueblo.'],[5,6,'Cruza el paso sur.'],[8,7,'Entra en la recta del observatorio.'],[9,4,'Llega a la meta de la central.']],{time:180}],
        ['potencia','Carga de emergencia','Transporte',2,'Lleva baterías cruzando el cañón y haz dos paradas técnicas.',1900,'La central está sin batería. Recoge los módulos y no olvides las paradas de revisión.',[
          [3,1,'Sube a la furgoneta de baterías.','van'],[4,3,'Revisa la carga antes de cruzar.','stop'],[7,3,'Cruza el viaducto central con la furgoneta.'],[9,2,'Carga un módulo de repuesto.','action'],[7,5,'Haz la revisión de temperatura.','stop'],[8,7,'Entrega las baterías en la central.','action']],{side:'m'}],
        ['guia','El guía nocturno','Escolta',3,'Acompaña al equipo de radio a través de dos pasos.',2100,'El guía conoce el camino. Mantente cerca de su coche y no lo adelantes demasiado.',[
          [2,1,'Reúnete con el equipo en el punto de salida.','action'],[5,0,'Escolta al guía por el paso norte.','escort'],[7,2,'Deteneos para comprobar la señal.','stop'],[7,4,'Cruza por la carretera de la central.'],[9,6,'Escolta al guía hasta el aparcamiento del observatorio.','escort'],[8,7,'Cierra el viaje en el centro de control.','action']],{}],
        ['cobre','Polvo de cobre','Persecución',3,'Saca la grabación de la sierra mientras te siguen las patrullas.',2500,'La grabación prueba quién cortó la radio. Llévala al otro lado del cañón.',[
          [1,3,'Sal del pueblo por la carretera sur.'],[3,6,'Toma la recta del cañón.','heat3'],[6,6,'Cruza el viaducto sur.'],[8,4,'Rodea la central eléctrica.'],[7,1,'Pasa por la subida del repetidor.'],[3,0,'Vuelve al oeste por el paso norte.'],[1,2,'Detente en el taller oculto.','stop']],{time:185,alert:1,altStart:true}],
        ['dosorillas','A ambos lados del cañón','Escolta',3,'Acompaña a las dos bandas hasta el punto de encuentro.',3250,'Los dos equipos tienen que atravesar el cañón con el equipo de radio.',[
          [2,2,'Reúnete con Los Pistones.','action'],[4,3,'Escolta a Los Pistones hasta el viaducto.','escort'],[5,3,'Cruza el viaducto para enlazar con el otro equipo.','action'],[6,4,'Recoge al equipo de La Marea.','stop'],[8,6,'Escolta a La Marea hasta el observatorio.','escort'],[9,7,'Reúne a ambos equipos en el punto de encuentro.','action'],[7,6,'Aparca en el acceso a la central.','stop']],{}],
      ]
    },
    {
      name:'Ciudad Prisma',subtitle:'La última escala',stamp:'CENTRO / 02:45',style:'metro',seed:40123,w:3880,h:2760,
      x:[168,518,840,1180,1550,1880,2250,2540,2920,3330,3690],
      y:[164,490,775,1110,1415,1710,2030,2330,2630],parks:[12,24,44,67],
      block:'#687387',plaza:'#756e97',park:'#394d62',asphalt:'#303647',roof:['#7d7897','#687b96','#9e84a3','#646f80','#807c9e'],
      lights:['226,113,255','100,193,251','255,155,118'],sky:'#515a9e',
      districts:['Centro de Cristal','Plaza de los Murales','Distrito del Metro','Terminal Prisma'],
      story:'Un promotor reúne a todas las bandas en Miami, pero antes hay que sacar de Prisma el equipo, el personal y el plano del evento.',
      jobs:[
        ['carteles','La ciudad empapelada','Reparto',1,'Publica cuatro avisos y reúne al público en la plaza.',1700,'Haz que la noticia llegue hasta la terminal. Reparte los avisos de la última fiesta.',[
          [2,0,'Recoge los carteles de la fiesta.','action'],[4,1,'Entrega el primer lote en los cines.','action'],[7,1,'Reparte en las torres del norte.','action'],[9,3,'Lleva el siguiente lote al metro.','action'],[8,6,'Deja los carteles de la terminal.','action'],[4,7,'Avisa al equipo de prensa.','stop'],[2,4,'Termina en la plaza de los murales.','action']],{side:'m'}],
        ['cristal','Gran Premio Prisma','Carrera',2,'Recorre las avenidas de cristal en ocho controles.',2000,'Los Pistones han trazado una vuelta por las avenidas más largas.',[
          [1,0,'Pasa el arco de salida.'],[5,0,'Cruza la avenida de las torres.'],[9,1,'Entra en el anillo este.'],[10,4,'Baja al distrito del metro.','heat1'],[8,7,'Cruza el control de la terminal.'],[5,8,'Vuelve por la avenida sur.'],[2,6,'Rodea el estadio.'],[1,3,'Pasa la meta de la plaza.']],{side:'p',time:185}],
        ['patio','El vagón de madrugada','Escolta',2,'Escolta al equipo del metro y vigila dos transbordos.',2350,'Acompaña al equipo del metro. Su coche se detendrá si dejas que se aleje demasiado.',[
          [3,2,'Fichad juntos en el local de personal.','action'],[6,2,'Escolta al primer equipo por las torres.','escort'],[8,4,'Detente junto al acceso del metro.','stop'],[9,5,'Encuentra al segundo equipo.','action'],[8,7,'Escolta al segundo equipo hasta la terminal.','escort'],[5,8,'Aparca en el lugar del transbordo.','stop']],{}],
        ['maleta','La maleta del promotor','Recogida',2,'Sigue la pista del promotor, consigue el plano y llévalo a la terminal.',2500,'Un promotor ha dejado indicaciones por toda la ciudad. Reúne las tres antes de buscar la maleta.',[
          [2,2,'Pide las primeras indicaciones en la radio.','action'],[4,0,'Recoge la tarjeta del hotel.','action'],[6,3,'Encuentra la pista de la sala de baile.','action'],[8,2,'Localiza al mensajero de las torres.','stop'],[10,5,'Recoge la maleta del promotor.','heat2'],[8,8,'Pasa por los accesos de la terminal.'],[6,7,'Entrega el plano de Miami.','action']],{}],
        ['prisma','Salida en cadena','Persecución',3,'Rescata un vehículo de producción y sal por la terminal.',2950,'Necesitamos la furgoneta de producción. Sáquela de Prisma sin parar salvo en la revisión.',[
          [2,1,'Sube a la furgoneta de producción.','van'],[5,1,'Ve al primer control de la avenida.'],[8,2,'Cruza la zona de las torres.','heat3'],[10,5,'Rodea el acceso de la terminal.'],[7,7,'Pasa por el patio de mantenimiento.'],[5,8,'Detente para revisar la carga.','stop'],[8,8,'Entrega la furgoneta en el muelle de salida.','action']],{time:185}],
        ['amanecer','Antes del amanecer','Persecución',3,'Cruza Prisma con tres estrellas y llega a tiempo para el directo.',3600,'Llevas el último equipo para la transmisión. No pierdas de vista el GPS.',[
          [1,3,'Sal del centro por la avenida sur.'],[4,5,'Rodea los clubes.'],[8,6,'Cruza el patio de la terminal.'],[10,7,'Pasa por la ronda exterior.'],[9,3,'Sube por las torres.'],[6,0,'Vuelve por la avenida norte.'],[4,3,'Llega al punto de emisión.','stop'],[5,5,'Entra en el recinto del directo.','action']],{time:195,alert:3,altStart:true}],
      ]
    },
    {
      name:'Miami',subtitle:'Una sola noche',stamp:'MIAMI / 04:50',style:'miami',seed:55285,w:4040,h:2910,
      x:[164,488,850,1260,1610,1950,2275,2580,2940,3310,3650,3825],
      y:[163,470,800,1120,1450,1780,2110,2430,2730], coast:3910,canal:6,bridges:[0,3,6,8],
      block:'#b18da1',plaza:'#cbaca4',park:'#477d6c',asphalt:'#444457',roof:['#bb9bb8','#a1b4b4','#d2b7a2','#959abc','#b0a7bb'],
      lights:['255,129,200','104,245,228','255,183,123'],sky:'#9f77a6',
      districts:['Avenida de los Murales','Bahía Vizcaína','Distrito Art Déco','South Beach'],
      story:'Todas las rutas llegan a Miami. Cruza la bahía, enciende el paseo y reúne a Los Pistones y La Marea para la última noche.',
      jobs:[
        ['union','Bandas unidas','Gran cierre',3,'Sella el pacto con las dos bandas y abre la fiesta sobre la playa.',4750,'La noche es de todos. Reúne a las dos bandas y lleva la última pieza de sonido al escenario.',[
          [1,2,'Recoge el acuerdo en la oficina del festival.','action'],[4,1,'Visita a Los Pistones para cerrar el pacto.','action'],[5,3,'Sube a la furgoneta del festival.','van'],[8,3,'Cruza el puente central con el equipo.','heat2'],[10,2,'Visita a La Marea para cerrar el pacto.','action'],[11,4,'Haz la prueba de sonido en el paseo.','stop'],[10,6,'Entra en el recinto por el acceso de South Beach.'],[11,8,'Abre el festival desde el escenario.','action']],{}],
      ]
    }
  ];

  window.UnitedCampaign=worlds.map((world,n)=>{
    const loc=(xi,yi)=>({x:world.x[xi],y:world.y[yi]});
    const start=(xi,yi,down=false)=>{
      const {x,y}=loc(xi,yi);
      return down?[x-31,y+35,x-8,y+27,Math.PI/2]:[x+2,y+41,x+39,y+32,0];
    };
    const stages={action:{action:true},stop:{stop:2.4},escort:{escort:true},van:{van:true,alert:2},choice:{choice:true},heat1:{alert:1},heat2:{alert:2},heat3:{alert:3}};
    const jobs=Object.fromEntries(world.jobs.map(([id,name,tag,level,summary,pay,intro,parts,opt={}] )=>[
      id,{name,tag,level,summary,pay,intro:`Radio: «${intro}»`,side:opt.side||'f',time:opt.time,alert:opt.alert,
        spawn:start(...(opt.start||[1,1]),opt.altStart),
        steps:parts.map(([xi,yi,text,type])=>({...loc(xi,yi),text,...stages[type]}))}]));
    return {...world,number:n+1,spawn:start(1,1),jobs};
  });
})();
