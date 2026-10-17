import {Picture} from './modules/picture.js';
import {TypeLayers} from './modules/typeLayers.js';
import {Captions} from './modules/captions.js';
import {splitLayout} from './modules/split-layout.js';
import {clamp, cropFor} from './modules/engine.js';
import {applyFontTokens} from './modules/fonts.js';

const C = window.EDITORIAL_CONFIG, W=1080, H=1920;
const canvas = document.getElementById('picture');
const plane = document.getElementById('design-plane');
plane.style.transform = `scale(${C.width / W},${C.height / H})`;
plane.style.setProperty('--ink', C.ink); plane.style.setProperty('--accent', C.accent);
document.getElementById('brand').textContent = C.label;
document.getElementById('footer').textContent = C.footer;
applyFontTokens(plane);

window.editorialReady = (async () => {
  await Promise.all([
    document.fonts.load('48px EditorialSans'), document.fonts.load('48px EditorialSerif'),
    document.fonts.load('italic 48px EditorialSerif'), document.fonts.load('24px EditorialMono')
  ]);
  const images={};
  for (const s of C.scenes) for (const key of ['image','presenter']) if(s[key] && !images[s[key]]) {
    const img = new Image(); img.src=s[key]; await img.decode(); images[s[key]]=img;
  }
  const picture=new Picture(canvas), ctx=picture.ctx;
  const layers=[], chunks=[];
  let cursor=0;
  for (const [i,s] of C.scenes.entries()) {
    s.t0=cursor; s.t1=cursor+s.duration; cursor=s.t1;
    const dark=s.kind==='closing', color=dark?C.paper:C.ink;
    const split=s.kind==='split';
    layers.push({id:`eyebrow-${i}`,style:'credit',text:s.eyebrow,t0:s.t0,t1:s.t1,x:80,y:185,size:25,align:'left',color,enter:'soft',exit:'fade'});
    s.title.forEach((text,j)=>layers.push({id:`title-${i}-${j}`,style:'display_serif',text,t0:s.t0+(split?0.65:0.12)+j*0.11,t1:s.t1,
      x:split?590:80,y:(split?1040:dark?440:320)+j*(split?98:142),size:split?87:dark?132:136,align:'left',color,
      enter:'soft',exit:'fade',motion:{drift:[0,-0.009]},posterize:dark?{fps:12,from:s.t0,to:s.t1}:null}));
    if(s.caption.length) chunks.push({t0:s.t0+0.5,t1:s.t1-0.15,x:W/2,y:1675,maxW:900,
      lines:[s.caption.map((_,k)=>k)],words:s.caption.map((w,k)=>({w:w.w,t0:s.t0+w.at,t1:s.t1,accent:k===s.caption.length-1})),ink:!dark});
  }
  const type = new TypeLayers(document.getElementById('type-track'),layers,[W,H]);
  const captions = new Captions(document.getElementById('caption-track'),{size:43,chunks},W,H);

  function fill(r,color){ctx.fillStyle=color;ctx.fillRect(r.x,r.y,r.w,r.h);}
  function clip(r,draw){ctx.save();ctx.beginPath();ctx.rect(r.x,r.y,r.w,r.h);ctx.clip();draw();ctx.restore();}
  function photo(img,r,t){
    const crop=cropFor({w:r.w,h:r.h,zoom:1.03+0.025*Math.sin(t*0.3),fy:0.5,ax:0.5},[0,0.5,0.5],img.width,img.height);
    ctx.drawImage(img,crop.sx,crop.sy,crop.sw,crop.sh,r.x,r.y,r.w,r.h);
  }
  // Procedural study: a rotating stack of sculptural rings, entirely synthetic.
  function sculpture(r,t,dark=false){clip(r,()=>{
    fill(r,dark?'#23251f':'#d6cebc');
    const cx=r.x+r.w*0.5, cy=r.y+r.h*0.53, radius=Math.min(r.w*.37,r.h*.31);
    const light=ctx.createRadialGradient(cx-radius*.5,cy-radius,10,cx,cy,radius*2.3);
    light.addColorStop(0,dark?'#706b46':'#f7f0df');light.addColorStop(1,dark?'#23251f':'#bcb39f');
    ctx.fillStyle=light;ctx.fillRect(r.x,r.y,r.w,r.h);
    ctx.save();ctx.translate(cx,cy);ctx.rotate(-.26+Math.sin(t*.4)*.12);
    for(let i=0;i<24;i++){
      const a=i/23, y=(a-.5)*radius*1.9, rr=Math.sqrt(Math.max(.02,1-Math.pow(a*2-1,2)))*radius;
      const g=ctx.createLinearGradient(-rr,y,rr,y+25);g.addColorStop(0,'#472918');g.addColorStop(.22,C.accent);g.addColorStop(.53,'#edbe83');g.addColorStop(.78,C.accent);g.addColorStop(1,'#592d19');
      ctx.beginPath();ctx.ellipse(Math.sin(i*.22+t*.6)*9,y,rr,Math.max(5,rr*.20),0,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();
      ctx.strokeStyle='rgba(246,221,175,.4)';ctx.lineWidth=1;ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle=dark?'#e3dbbf':'#453e30';ctx.font='18px EditorialMono';ctx.fillText('ESTUDO DE FORMA / 001',r.x+30,r.y+r.h-35);
  });}
  function figure(r,t){clip(r,()=>{
    fill(r,'#a9aaa0');
    const x=r.x+r.w*.52+Math.sin(t*.4)*7,y=r.y+r.h*.4;
    const g=ctx.createLinearGradient(r.x,r.y,r.x+r.w,r.y+r.h);g.addColorStop(0,'#dbd9c9');g.addColorStop(1,'#70786c');ctx.fillStyle=g;ctx.fillRect(r.x,r.y,r.w,r.h);
    ctx.fillStyle='#414b40';ctx.beginPath();ctx.ellipse(x,y+r.h*.54,460*.46,r.h*.35,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#a2967e';ctx.fillRect(x-460*.09,y+r.h*.1,460*.18,r.h*.19);
    const head=ctx.createLinearGradient(x-460*.2,y,x+460*.2,y);head.addColorStop(0,'#d2c5a6');head.addColorStop(.65,'#b5a78d');head.addColorStop(1,'#726e5e');
    ctx.fillStyle=head;ctx.beginPath();ctx.ellipse(x,y,460*.20,r.h*.17,-.07,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#ece7d6';ctx.lineWidth=1;ctx.strokeRect(r.x+20,r.y+20,r.w-40,r.h-40);
    ctx.fillStyle='#f3eedf';ctx.font='18px EditorialMono';ctx.fillText('FIGURA SINTÉTICA',r.x+35,r.y+r.h-40);
  });}
  function renderAt(raw){
    const t=clamp(raw,0,cursor-0.00001), s=C.scenes.find(s=>t>=s.t0 && t<s.t1), lt=t-s.t0;
    const dark=s.kind==='closing';
    fill({x:0,y:0,w:W,h:H},dark?C.ink:C.paper);
    let grainRect=[0,0,1,1];
    if(s.kind==='split'){
      const box={x:80,y:390,w:920,h:1110};
      const layout=splitLayout({t0:s.t0,t1:s.t1,split:{dir:'h',at:.5,a:{kind:'presenter'},b:{kind:'insert'},entry:{duration:.65}}},t,box);
      clip(box,()=>{
        s.presenter?photo(images[s.presenter],layout.a,t):figure(layout.a,t);
        const b={x:layout.b.x,y:box.y,w:460,h:570};
        s.image?photo(images[s.image],b,t):sculpture(b,t);
      });
      grainRect=[.5,390/H,1000/W,960/H];
    }else{
      const r=dark?{x:80,y:870,w:920,h:660}:{x:80,y:830,w:920,h:710};
      s.image?photo(images[s.image],r,t):sculpture(r,t,dark);
      grainRect=[r.x/W,r.y/H,(r.x+r.w)/W,(r.y+r.h)/H];
    }
    picture.post(t,{grade:s.grade||'clean',grainIns:C.grain,grainOut:C.grain*.32,grainRect,film:.3,age:.12,bloom:C.bloom,halation:.3,vignette:0,grainColor:0.03},C.fps);
    plane.style.color=dark?C.paper:C.ink;
    type.update(t); captions.update(t);
    captions.el.style.color=dark?C.paper:C.ink;
    document.getElementById('counter').textContent=`${String(C.scenes.indexOf(s)+1).padStart(2,'0')} / ${String(C.scenes.length).padStart(2,'0')}`;
  }
  window.editorialRenderAt=renderAt;
  window.addEventListener('hf-seek',e=>renderAt(e.detail.time));
  renderAt(0);
})();
window.__hf=window.__hf||{};window.__hf.buildReady=window.__hf.buildReady||{};
window.__hf.buildReady['editorial-film']=window.editorialReady;
