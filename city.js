/* Static orthographic artwork, baked once per map. Vehicles, people and navigation remain live 2D layers. */
(() => {
  const tau=Math.PI*2;
  const box=(c,x,y,w,h,fill)=>{if(w<=0||h<=0)return;c.fillStyle=fill;c.fillRect(x,y,w,h);};
  const ellipse=(c,x,y,w,h,fill)=>{c.fillStyle=fill;c.beginPath();c.ellipse(x,y,w,h,0,0,tau);c.fill();};
  const color=(c,x,y,X,Y,stops)=>{const g=c.createLinearGradient(x,y,X,Y);for(const [t,v] of stops)g.addColorStop(t,v);return g;};
  const glow=(c,x,y,r,rgb,alpha)=>{
    const g=c.createRadialGradient(x,y,1,x,y,r);
    g.addColorStop(0,`rgba(${rgb},${alpha})`);g.addColorStop(.38,`rgba(${rgb},${alpha*.48})`);g.addColorStop(1,`rgba(${rgb},0)`);
    box(c,x-r,y-r,r*2,r*2,g);
  };
  const rng=seed=>()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/4294967296);
  const cross=(c,x,y,a,b,fill,w=1)=>{c.beginPath();c.moveTo(x,y);c.lineTo(a,b);c.lineWidth=w;c.strokeStyle=fill;c.stroke();};
  function atlas(c,img){
    if(!img?.naturalWidth)return [];
    const size=Math.floor(img.naturalWidth/3),s=Math.max(8,Math.floor(size*.035));
    return Array.from({length:9},(_,i)=>{
      const tile=document.createElement('canvas');tile.width=tile.height=135;
      tile.getContext('2d').drawImage(img,(i%3)*size+s,Math.floor(i/3)*size+s,size-s*2,size-s*2,0,0,135,135);
      return c.createPattern(tile,'repeat');
    });
  }
  window.UnitedCity=(c,m,art,{alley,dock})=>{
    const {x:X,y:Y,w:W,h:H,style,canal,bridges}=m,r=rng(m.seed),textures=atlas(c,art),solids=[],blocks=[];
    const tropical=style==='miami'||style==='coast', mesa=style==='mesa',metro=style==='metro',port=style==='port';
    const shore=m.coast??W, beach=style==='miami'?50:tropical?31:0;
    const water=(!mesa&&canal!=null)?[X[canal]+54,X[canal+1]-54]:null;
    const gap=canal!=null?[X[canal]+53,X[canal+1]-53]:null;
    const texture=(i,x,y,w,h,a)=>{
      if(!textures[i])return;
      c.save();c.globalAlpha=a;box(c,x,y,w,h,textures[i]);c.restore();
    };
    function waterStrip(x,w){
      if(w<=0)return;
      box(c,x,0,w,H,color(c,x,0,x+w,0,[[0,'#357a80'],[.34,'#22576a'],[.75,'#1d5269'],[1,'#428e8f']]));
      texture(8,x,0,w,H,.24);
      c.save();c.beginPath();c.rect(x,0,w,H);c.clip();
      for(let i=0;i<Math.round(w*H/750);i++){
        const px=x+r()*w,py=r()*H,len=3+r()*35;
        cross(c,px,py,px+len,py+r()*2,r()<.42?'#acffe23d':'#0b32483e',r()>.86?2:1);
      }
      for(const y of Y){
        const rgb=m.lights[Math.floor(r()*3)];
        for(let j=0;j<65;j++){
          const dx=r()*Math.min(83,w*.55),dy=(r()-.5)*125;
          box(c,x+dx,y+dy,4+r()*22,1+r(),`rgba(${rgb},${.36*(1-dx/83)*(1-Math.abs(dy)/66)})`);
        }
      }
      c.restore();
    }
    function palm(x,y,l){
      ellipse(c,x+7,y+9,l*.66,l*.32,'#171e2d77');
      cross(c,x,y+2,x-1,y-l/3,'#a88961',2.4);
      const ox=x-1,oy=y-l/3;
      for(let k=0;k<8;k++){
        const a=k*tau/8+r()*.3,len=l*(.65+r()*.43);
        c.beginPath();c.moveTo(ox,oy);c.quadraticCurveTo(ox+Math.cos(a-.45)*len*.7,oy+Math.sin(a-.45)*len*.7,ox+Math.cos(a)*len,oy+Math.sin(a)*len);
        c.quadraticCurveTo(ox+Math.cos(a+.12)*len*.28,oy+Math.sin(a+.12)*len*.28,ox,oy);c.fillStyle=['#427965','#75a577','#386e5f','#557b59'][k%4];c.fill();
        cross(c,ox,oy,ox+Math.cos(a)*len*.77,oy+Math.sin(a)*len*.77,'#aec08855');
      }
      ellipse(c,ox,oy,2.3,2,'#b6ad79');
    }
    function tree(x,y,l){
      if(tropical){palm(x,y,l);return;}
      ellipse(c,x+5,y+9,l*1.1,l*.73,'#211c2a78');
      for(let i=0;i<17;i++){
        const a=r()*tau,d=r()*l*.65,rad=l*(.24+r()*.45);
        ellipse(c,x+Math.cos(a)*d,y+Math.sin(a)*d,rad,.82*rad,(mesa?['#606244','#7d7655','#736e54','#928061']:['#395958','#557462','#6c8365','#7b926a'])[i%4]);
      }
    }
    function hatch(x,y,w,h){
      box(c,x+3,y+4,w,h,'#1a263052');box(c,x,y,w,h,'#777c87');
      box(c,x+1,y+1,w-2,2,'#d0d0d0a0');
      for(let j=4;j<h-1;j+=2.7)box(c,x+2,y+j,w-4,.8,'#3b4554');
    }
    function structure(x,y,w,h,id,industrial=false){
      if(w<16||h<15)return;
      const hi=industrial?7+id%6:9+id%18+(metro?7:0),tile=industrial?4:(mesa&&id%3===0?3:id%2?5:2);
      const base=m.roof[((id%m.roof.length)+m.roof.length)%m.roof.length],accent=m.lights[id%3];
      solids.push({x,y,w,h});
      c.save();
      for(let j=5;j>0;j--)box(c,x+hi*.5+j,y+hi*.61+j,w+hi*.64,h+hi*.60,`rgba(12,17,30,${.042+(5-j)*.022})`);
      box(c,x+hi*.52,y+hi*.70,w,h,'#1e213076');
      box(c,x+w,y+3,hi*.29,h+7,'#332f4b');box(c,x+3,y+h,w+hi*.29,hi*.42,'#4a414f');
      box(c,x,y,w,h,'#252637');box(c,x+3,y+3,w-6,h-6,base);texture(tile,x+4,y+4,w-8,h-8,.38);
      box(c,x+4,y+4,w-8,h-8,color(c,x,y,x+w*.56,y+h,[[0,'#fff0ed46'],[.43,'#a4a7e200'],[1,'#302a4d5e']]));
      box(c,x+2,y+2,w-4,2.2,'#e5d2d5ba');box(c,x+2,y+3,2,h-5,'#ceb9b897');
      box(c,x+3,y+h-4,w-7,1,'#eeccca70');box(c,x+w-4,y+4,1,h-8,'#bba8b663');
      if(industrial){
        for(let j=9;j<w-6;j+=11){box(c,x+j,y+6,1,h-12,'#1b27395e');box(c,x+j+1,y+6,1,h-12,'#c0c9d83c');}
        for(let j=17;j<w-24;j+=41){box(c,x+j,y+h*.46,23,6,'#303d55');box(c,x+j+1,y+h*.46+1,21,3,'#a4bcc77c');}
      }else if(h>42&&w>48){
        hatch(x+w*.16,y+h*.19,Math.min(w*.28,30),Math.min(h*.25,22));
        if(id%4!==2)hatch(x+w*.57,y+h*.52,Math.min(w*.26,28),Math.min(h*.28,22));
        if(id%3===0){
          box(c,x+w*.41,y+h*.13,w*.36,h*.20,'#343e5b');
          for(let j=0;j<5;j++)box(c,x+w*.42+j*w*.062,y+h*.145,1,h*.16,'#a4bbd87d');
        }
        if(id%5===2){ellipse(c,x+w*.72,y+h*.72,11,8,'#c1bbc3');ellipse(c,x+w*.72,y+h*.72,8,6,'#656a7d');cross(c,x+w*.68,y+h*.74,x+w*.77,y+h*.68,'#b9b9c5');}
      }
      if(tropical&&id%4<2){
        for(let j=4;j<w-6;j+=10)box(c,x+j,y+h-1,5,2,j%3?'#ffddb4c0':'#9eeede9d');
        glow(c,x+w*.48,y+h+1,Math.min(59,w*.6),accent,.24);
        box(c,x+4,y+h-2,w-8,1.6,`rgba(${accent},.91)`);box(c,x+w-3,y+5,1.6,h*.48,`rgba(${accent},.54)`);
      }else{
        for(let j=8;j<w-8;j+=11)if((j+id)%5!==0)box(c,x+j,y+h+1,6,2,(j+id)%4?'#ffd3a778':'#a9d9e890');
      }
      c.restore();
    }
    function parking(x,y,w,h,angle=0){
      if(w<22||h<22)return;
      c.save();c.translate(x,y);if(angle)c.rotate(angle);
      box(c,0,0,w,h,'#454755');texture(0,0,0,w,h,.21);
      for(let i=5;i<w-5;i+=14){cross(c,i,2,i-2,15,'#e9d5c39d');cross(c,i,h-14,i-2,h-2,'#e9d5c39d');}
      box(c,1,2,w-3,.8,'#d9c4b485');box(c,1,h-3,w-3,.8,'#d9c4b485');c.restore();
    }
    function plaza(x,y,w,h,id,park){
      box(c,x+8,y+8,w-16,h-16,park?m.park:m.plaza);
      texture(park?7:1,x+8,y+8,w-16,h-16,park?.13:.33);
      const px=x+w*.5,py=y+h*.55;
      box(c,px-9,y+8,18,h-16,'#b7a897');box(c,x+8,py-7,w-16,14,'#b7a897');
      for(let j=0;j<24;j++){
        const a=x+25+r()*(w-50),b=y+25+r()*(h-50);
        if(Math.abs(a-px)>25&&Math.abs(b-py)>24)tree(a,b,7+r()*10);
      }
      if(tropical||metro){
        ellipse(c,px,py,Math.min(22,w*.2),Math.min(15,h*.22),'#c2b4ad');
        ellipse(c,px,py,Math.min(18,w*.17),Math.min(11,h*.18),'#4d9caa');
        glow(c,px,py,42,m.lights[id%3],.37);ellipse(c,px-2,py-2,2.5,2.5,'#eafcff');
      }
    }
    function openAir(x,y,w,h,id){
      const sx=x+w*.22,sy=y+h*.16,sw=w*.56,sh=h*.23;
      box(c,x+6,y+6,w-12,h-12,'#856f86');texture(1,x+6,y+6,w-12,h-12,.35);
      structure(sx,sy,sw,sh,id,true);
      box(c,sx+3,sy+sh*.47,sw-6,sh*.47,'#46304d');
      box(c,sx+3,sy+sh*.88,sw-6,3,'#ffb3ea');
      glow(c,x+w*.50,sy+sh,Math.min(96,w*.55),m.lights[0],.65);
      glow(c,x+w*.5,y+h*.59,Math.min(80,w*.45),m.lights[1],.50);
      for(let j=0;j<6;j++){
        for(const side of [.18,.82]){
          const tx=x+w*side,ty=y+h*(.47+j*.071);
          ellipse(c,tx+3,ty+4,6.5,5.3,'#2922449b');
          ellipse(c,tx,ty,5,4.5,j%2?'#79d7cd':'#e3a1be');
        }
      }
      for(const f of [.12,.87])palm(x+w*f,y+h*.90,12);
    }
    function observatory(x,y,w,h,id){
      plaza(x,y,w,h,id,true);
      const a=x+w*.48,b=y+h*.49,r=Math.min(w,h)*.24;
      solids.push({x:a-r*.68,y:b-r*.65,w:r*1.36,h:r*1.3});
      ellipse(c,a+7,b+10,r*1.02,r*.83,'#23233d8e');
      ellipse(c,a,b,r+2,r*.86,'#676077');
      ellipse(c,a,b-2,r-2,r*.80,color(c,a-r,b-r,a+r,b+r,[[0,'#f6cfb7'],[.5,'#b3a9ba'],[1,'#676680']]));
      for(let i=-2;i<=2;i++)cross(c,a+i*r*.26,b-r*.59,a+i*r*.36,b+r*.58,'#f0d9d068',1.1);
      box(c,a-r*.13,b-r*.67,r*.27,r*1.25,'#44445e');
      box(c,a-r*.10,b-r*.63,r*.20,r*.44,'#79728f');
      glow(c,a,b-2,r*.55,m.lights[1],.40);
    }
    box(c,0,0,W,H,m.block);
    if(m.coast){
      if(beach){
        box(c,shore,0,beach,H,color(c,shore,0,shore+beach,0,[[0,'#947c83'],[.32,'#c2a99f'],[.84,'#d8c4ac'],[1,'#a5b3a4']]));
        texture(7,shore,0,beach,H,.31);
        box(c,shore-2,0,4,H,'#c9c7c2');
        for(let y=45;y<H;y+=71){
          palm(shore+14+r()*8,y,11+r()*7);
          if(style==='miami'&&r()>.48){ellipse(c,shore+35,y+17,5.5,4.5,r()>.5?'#ed81bd':'#80e6d6');ellipse(c,shore+34,y+16,1.4,1.4,'#fff0e9');}
        }
      }
      waterStrip(shore+beach,W-shore-beach);
      if(!beach){
        for(let y=370;y<H-120;y+=505){
          box(c,shore-13,y,81,42,'#6c655f');texture(1,shore-13,y,81,42,.42);box(c,shore-13,y,81,2,'#e8c5a7');
          for(let j=5;j<36;j+=8)cross(c,shore-10,y+j,shore+65,y+j,'#493e3878');
          glow(c,shore+48,y+22,49,m.lights[0],.34);
        }
      }
    }
    if(water)waterStrip(water[0],water[1]-water[0]);
    if(mesa){
      const [a,b]=gap;box(c,a,0,b-a,H,color(c,a,0,b,0,[[0,'#ac876d'],[.16,'#775c64'],[.35,'#564350'],[.62,'#392d42'],[1,'#99795e']]));
      texture(7,a,0,b-a,H,.35);
      for(let i=0;i<42;i++){
        const x=a+5+r()*(b-a-10),y=r()*H,span=9+r()*29;
        c.beginPath();c.moveTo(x,y);c.lineTo(x-span*.5,y+span*.7);c.lineTo(x+span*.2,y+span*1.3);c.lineWidth=2;c.strokeStyle=i%2?'#604558a8':'#d9ac7b8d';c.stroke();
      }
    }
    const xc=[-43,...X,shore+48],yc=[-46,...Y,H+33];
    for(let i=0;i<yc.length-1;i++)for(let j=0;j<xc.length-1;j++){
      if(canal!=null&&j===canal+1)continue;
      const x=xc[j]+53,y=yc[i]+53,w=Math.min(xc[j+1]-53,shore-8)-x,h=Math.min(yc[i+1]-53,H-8)-y;
      if(w<23||h<23)continue;
      const id=i*13+j, park=m.parks?.includes(id)||(!m.parks&&id%9===2), industrial=port&&i+j>9||mesa&&i>5;
      blocks.push({x,y,w,h,id,park});
      box(c,x-4,y-3,w+8,h+6,'#232b3c65');box(c,x,y,w,h,m.block);texture(1,x,y,w,h,.56);
      box(c,x+2,y+2,w-4,3,'#ead7c28e');box(c,x+2,y+h-4,w-4,2,'#dbc7c385');box(c,x+w-4,y+3,2,h-6,'#d5c8c17d');
      for(let t=7;t<w-5;t+=10){box(c,x+t,y+2,.8,4,'#35303e70');box(c,x+t,y+h-6,.8,4,'#41343d65');}
      if((style==='miami'&&i===8&&j===10||style==='coast'&&i===6&&j===10)&&w>80&&h>95){
        openAir(x,y,w,h,id);
      }else if(mesa&&i===7&&j===8&&w>95&&h>95){
        observatory(x,y,w,h,id);
      }else if(alley&&i===1&&j===1){
        const lanes=[x+11,alley.x+29];
        for(const xx of lanes){
          structure(xx,y+14,61,67,id+2);structure(xx,y+102,62,58,id+13);tree(xx+30,y+91,10);
        }
        box(c,alley.x-22,y-6,44,h+12,'#514c58');texture(1,alley.x-22,y,44,h,.42);
        for(let t=6;t<h-8;t+=8)box(c,alley.x-21,y+t,42,1,'#77747d8b');
      }else if(dock&&i===4&&j===5){
        structure(x+12,y+10,w*.42,51,id,true);structure(x+w*.54,y+13,w*.4,49,id+1,true);
        structure(x+12,y+h-61,w*.39,44,id+4,true);structure(x+w*.5,y+h-59,w*.44,45,id+2,true);
        box(c,x,dock.y-26,w,52,'#41424e');texture(0,x,dock.y-26,w,52,.4);
        box(c,x,dock.y-26,w,2,'#a492a0');box(c,x,dock.y+24,w,2,'#a492a0');
      }else if(park&&w>100&&h>95)plaza(x,y,w,h,id,park);
      else if(industrial&&w>125&&h>90){
        structure(x+10,y+11,w*.60,h*.50,id,true);parking(x+12,y+h*.58,w*.56,h*.33);
        for(let k=0;k<Math.min(5,h/31);k++)structure(x+w*.69,y+11+k*24,w*.23,15,id+k,true);
      }else if(w>135&&h>105){
        const sw=w*(.34+r()*.15),sh=h*(.33+r()*.14);
        structure(x+12,y+11,sw,sh,id);
        structure(x+sw+28,y+12,w-sw-43,h*(.39+r()*.15),id+3);
        if(id%5===0&&h>160)plaza(x+5,y+sh+18,sw+15,h-sh-23,id,false);
        else structure(x+13,y+sh+23,sw*.9,h-sh-38,id+5);
        if(id%4===1)parking(x+w*.57,y+h*.65,w*.35,h*.27);
        else structure(x+w*.60,y+h*.68,w*.30,h*.23,id+7);
        for(let k=0;k<(tropical?4:2);k++)tree(x+19+k*(w-36)/(tropical?3:1),y+h-10,7+r()*4);
      }else{
        structure(x+8,y+9,w-19,h-20,id,industrial);
        if(tropical&&w>36)tree(x+w*.68,y+h-6,8);
      }
    }
    const surf=(x,y,w,h)=>{box(c,x,y,w,h,m.asphalt);texture(tropical?6:0,x,y,w,h,.27);};
    for(const x of X)surf(x-52,0,104,H);
    for(let i=0;i<Y.length;i++){
      const y=Y[i],crosses=canal==null||bridges.includes(i);
      if(crosses)surf(0,y-52,shore,104);
      else{surf(0,y-52,gap[0]-2,104);surf(gap[1]+2,y-52,shore-gap[1]-2,104);}
      if(gap&&crosses){
        box(c,gap[0]-10,y+50,gap[1]-gap[0]+20,8,'#191a31a5');
        for(const sy of [-49,48]){
          box(c,gap[0]-11,y+sy,gap[1]-gap[0]+22,3,'#c3adbb');
          for(let k=gap[0];k<gap[1];k+=21)box(c,k,y+sy-3,3,8,'#83d5dabb');
        }
      }else if(gap){
        for(const xx of [gap[0],gap[1]]){
          box(c,xx-1,y-49,3,98,mesa?'#d59882':'#a7c5bd');
          for(let t=-40;t<=40;t+=11)box(c,xx-4,y+t,5,3,'#f7c4a2a2');
        }
      }
    }
    if(m.exitBridge!=null&&shore<W){
      const y=m.exitBridge;
      box(c,shore-5,y-49,W-shore+5,98,'#292538');
      surf(shore-5,y-44,W-shore+5,88);
      for(const side of [-1,1]){
        box(c,shore-5,y+side*45,W-shore+5,3,'#9ac5d6');
        for(let x=shore;x<W;x+=24)box(c,x,y+side*45-2,4,7,'#d5ecf6');
      }
      for(let x=shore+5;x<W;x+=29)box(c,x,y,13,1.5,'#edc9a9ac');
    }
    for(const x of X)for(let j=0;j<H;j+=29){
      if(Y.some(y=>Math.abs(y-j)<65))continue;
      box(c,x-2,j,1.3,13,'#ead0a78b');box(c,x+1,j,1.3,13,'#ead0a775');
      box(c,x-42,j,1,19,'#ddd3d673');box(c,x+41,j,1,19,'#ddd3d673');
    }
    for(let yi=0;yi<Y.length;yi++)for(let j=0;j<shore;j+=29){
      const y=Y[yi];
      if(X.some(x=>Math.abs(x-j)<65)||gap&&j>=gap[0]-9&&j<=gap[1]+9&&!bridges.includes(yi))continue;
      box(c,j,y-2,13,1.2,'#edc9a988');box(c,j,y+1,13,1.2,'#edc9a970');
      box(c,j,y-42,19,1,'#ddd3d67f');box(c,j,y+41,19,1,'#ddd3d67f');
    }
    for(let yi=0;yi<Y.length;yi++)for(let xi=0;xi<X.length;xi++){
      const x=X[xi],y=Y[yi],rgb=m.lights[(xi+yi*2)%3];
      for(let k=-32;k<=32;k+=9){
        box(c,x+k,y-60,4.6,12,'#e7d8caa1');box(c,x+k,y+49,4.6,12,'#e7d8caa1');
        if(!(gap&&xi===canal+1&&!bridges.includes(yi)))box(c,x-61,y+k,12,4.6,'#e7d8caa1');
        if(!(gap&&xi===canal&&!bridges.includes(yi)))box(c,x+49,y+k,12,4.6,'#e7d8caa1');
      }
      glow(c,x+42,y-38,tropical?89:72,rgb,tropical?.39:.29);
      glow(c,x-42,y+40,60,m.lights[(xi+yi+1)%3],.25);
      if(!mesa)for(let i=0;i<29;i++){
        const tx=x+8+r()*78,ty=y-40+r()*43;
        box(c,tx,ty,2+r()*24,i%5===0?2:1,`rgba(${rgb},${.05+r()*.16})`);
      }
      for(const [dx,dy] of [[-53,-52],[52,51],[-53,51],[52,-52]]){
        box(c,x+dx-1,y+dy+1,5,7,'#1c1b2c98');box(c,x+dx,y+dy,2,5,'#48465b');
        box(c,x+dx-1,y+dy-2,4,2,`rgba(${rgb},.98)`);
      }
    }
    if(alley){
      box(c,alley.x-20,alley.from+47,40,10,'#484653');
      box(c,alley.x-20,alley.to-57,40,10,'#484653');
    }
    for(let i=0;i<3600;i++){
      const x=r()*shore,y=r()*H;
      if(X.some(a=>Math.abs(x-a)<44)||Y.some((a,j)=>Math.abs(y-a)<44&&(!gap||x<gap[0]||x>gap[1]||bridges.includes(j))))box(c,x,y,1+r()*3,1,i%2?'#21233722':'#e2dce62d');
    }
    c.textBaseline='middle';c.font='700 14px sans-serif';
    for(const [i,loc] of [[0,[1,1]],[1,[3,4]],[2,[X.length-3,2]],[3,[X.length-2,Y.length-2]]]){
      const x=X[loc[0]]+11,y=Y[loc[1]]-20;
      c.fillStyle='#e9cad397';c.fillText(m.districts[i].toUpperCase(),x,y);
    }
    return {solids,blocks};
  };
})();
