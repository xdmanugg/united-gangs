/* Original deterministic synth patterns plus a link to an external listening service. */
(() => {
  'use strict';
  const stations=[
    {id:'neon',name:'Neón FM',freq:'88.4',genre:'Synthwave',desc:'Bajos nocturnos y sintetizadores de neón.',color:'#ff9dcc',beat:.145,roots:[55,49,58.27,46.25],bass:[0,3,6,8,10,13],kick:[0,4,8,12],hat:[1,3,5,7,9,11,13,15],lead:[2,10],wave:'triangle',intervals:[4,6],drum:94},
    {id:'harbor',name:'Muelle Bass',freq:'94.6',genre:'Breakbeat',desc:'Ritmo quebrado, subgraves y percusión seca.',color:'#87f5d2',beat:.117,roots:[41.2,41.2,49,36.71],bass:[0,2,5,7,8,12,14],kick:[0,5,8,14],hat:[2,3,6,7,10,11,13,15],lead:[4,11],wave:'sine',intervals:[4,5.34],drum:118},
    {id:'coast',name:'Costa Groove',freq:'101.8',genre:'Funk electrónico',desc:'Síncopas rápidas para el paseo marítimo.',color:'#ffd38e',beat:.132,roots:[65.41,73.42,55,61.74],bass:[0,3,5,8,11,12,15],kick:[0,4,8,12],hat:[2,6,10,14],lead:[1,4,9,13],wave:'triangle',intervals:[4,5.04],drum:106},
    {id:'air',name:'Antena Lunar',freq:'107.2',genre:'Ambient',desc:'Un pulso lento con acordes flotantes.',color:'#b0aeff',beat:.195,roots:[48.99,43.65,51.91,58.27],bass:[0,8],kick:[0,12],hat:[5,14],lead:[1,8,13],wave:'sine',intervals:[4,5.99],drum:70,soft:true},
    {id:'off',name:'Solo efectos',freq:'···',genre:'Música apagada',desc:'Escucha únicamente el motor y los avisos.',color:'#c3bdd7'},
    {id:'spotify',name:'Tu playlist en Spotify',freq:'EXT',genre:'Reproductor externo',desc:'«MUSICA LIBRE DE DERECHOS DE AUTOR». Desactiva la música del juego.',color:'#90efab'}
  ];
  const playlist='https://open.spotify.com/playlist/7hx41p3X4fnJQosUj3T0Wr';
  window.UnitedRadio={stations,playlist};
})();
