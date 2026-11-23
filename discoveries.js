/* Exploration loot. These field notes are separate from private profile codes. */
(() => {
  'use strict';
  const entries=[
    ['estiba',   'ESTIBA37',  'Placa de la grúa',         0, 0,  7, 5,  1, {cash:1400}],
    ['salitre',  'SALITRE21', 'Taquilla del paseo',      1, 0,  8, 6, -1, {tools:3}],
    ['eco',      'ECO84',     'Caja del repetidor',      0, 1,  7, 6,  1, {xp:1250}],
    ['estacion', 'ANDEN12',   'Archivador de estación',  0,-1,  8, 4, -1, {cash:1900}],
    ['hotel',    'MARQUESINA','Buzón del hotel',        -1, 0,  9, 7,  1, {tools:4,xp:500}],
    ['bahia',    'MAREA46',   'Cuaderno de embarque',   -1, 1,  2, 6,  1, {cash:2400}],
    ['vinilo',   'VINILO73',  'Funda del último disco',  1, 1,  6, 3, -1, {cash:1200,xp:750}],
    ['frecuencia','DIAL29',   'Caja de frecuencias',    -2, 0,  8, 5,  1, {xp:1750}],
    ['filon',    'FILON18',   'Registro del cañón',      2, 0,  3, 5, -1, {cash:2300,tools:2}],
    ['espuma',   'ESPUMA09',  'Sobre lacrado',          0, 2,  5, 3,  1, {cash:2000}],
    ['prisma',   'REFLEJO62', 'Registro de iluminación',0,-2,  7, 2, -1, {xp:1500,tools:3}],
    ['nacar',    'NACAR58',   'Llave del garaje nácar',  1,-1,  4, 7, -1, {car:'nacre'}],
    ['asfalto',  'BREA05',    'Funda de herramientas', -1,-1,  8, 3,  1, {tools:6}],
    ['rotonda',  'ROTONDA96', 'Parte de mantenimiento', 2, 1,  3, 5,  1, {cash:2600,xp:1000}],
    ['cobre',    'COBRE64',   'Llave del almacén',      -2,-1,  8, 6, -1, {car:'copper'}]
  ].map(([id,code,name,sx,sy,col,row,side,reward])=>({id,code,name,sx,sy,col,row,side,reward}));
  const byId=new Map(entries.map(entry=>[entry.id,entry]));
  const byCode=new Map(entries.map(entry=>[entry.code,entry]));
  const local=sector=>sector?entries.filter(e=>e.sx===sector.x&&e.sy===sector.y):[];
  window.UnitedDiscoveries={byId,byCode,local};
})();
