"""Composições dirigidas: plano editorial explícito, reutilizável e local."""
from pathlib import Path
import html
import json
import shutil


def composition(directory, meta, settings, sample, app):
    plan = json.loads((directory / 'edit/direcao.json').read_text(encoding='utf-8'))
    folder = directory / ('composicao/amostra' if sample else 'composicao/final')
    assets = folder / 'assets'
    assets.mkdir(parents=True, exist_ok=True)
    duration = min(5, plan['duration']) if sample else plan['duration']
    files = {
        'video.mp4': directory / 'edit/limpo.mp4',
        'gsap.js': app / 'node_modules/gsap/dist/gsap.min.js',
        'three.module.js': app / 'node_modules/three/build/three.module.js',
        'three.core.js': app / 'node_modules/three/build/three.core.js',
        'inter.woff2': app / 'node_modules/@fontsource/inter/files/inter-latin-800-normal.woff2',
        'syne.woff2': app / 'node_modules/@fontsource/syne/files/syne-latin-700-normal.woff2',
    }
    for name, source in files.items():
        shutil.copyfile(source, assets / name)
    captions = json.loads((directory / 'edit/legendas.json').read_text(encoding='utf-8'))
    clips = []
    if settings['captions']:
        for i, b in enumerate(captions['blocks']):
            if b['s'] >= duration:
                break
            spans = ' '.join(f'<span id="word{i}-{k}" data-at="{w["s"]}" class="word {"key" if k==b["key"] else ""}">{html.escape(w["w"])}</span>' for k,w in enumerate(b['words']))
            clips.append(f'<div id="caption{i}" class="clip caption" data-start="{b["s"]}" data-duration="{min(b["e"],duration)-b["s"]}" data-track-index="4">{spans}</div>')
    cards = []
    for i, card in enumerate(plan['cards']):
        if card['s'] >= duration:
            break
        cards.append(f'<div id="card{i}" class="clip card" data-start="{card["s"]}" data-duration="{min(card["e"],duration)-card["s"]}" data-track-index="3"><div class="eyebrow">{html.escape(card["label"])}</div><div class="card-title">{html.escape(card["title"])}</div><div class="card-line"></div></div>')
    closing = ''
    if duration > plan['closing_start']:
        closing = f'<div id="closing" class="clip closing" data-start="{plan["closing_start"]}" data-duration="{duration-plan["closing_start"]}" data-track-index="6"><div class="closing-label">{html.escape(plan["slots"]["brand"])}</div><h2>Conheça a rotina.<br><em>Escolha com informação.</em></h2><div class="closing-cta">{html.escape(plan["slots"]["cta"])}</div><div class="closing-note">Resumo da fala do vídeo original</div></div>'
    data = json.dumps({'cards':plan['cards'],'shots':plan['shots'],'duration':duration},ensure_ascii=False).replace('</','<\\/')
    doc = TEMPLATE.replace('__DURATION__',str(duration)).replace('__HEADLINE__',html.escape(settings['title'] or plan['headline'])).replace('__CAPTIONS__',''.join(clips)).replace('__CARDS__',''.join(cards)).replace('__CLOSING__',closing).replace('__PLAN__',data)
    (folder / 'index.html').write_text(doc,encoding='utf-8')
    (folder / 'hyperframes.json').write_text(json.dumps({'name':'TRTs — edição dirigida 30s','description':'Cortes editoriais, geometria 3D e legendas locais'}),encoding='utf-8')
    return folder


TEMPLATE = r'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
@font-face{font-family:Inter;src:url(assets/inter.woff2);font-weight:800}
@font-face{font-family:Syne;src:url(assets/syne.woff2);font-weight:700}
*{box-sizing:border-box}body{margin:0;background:#161020;color:#f5f0ff}
#stage{position:relative;width:1080px;height:1920px;overflow:hidden;background:radial-gradient(ellipse at 90% 20%,#44286a 0%,#241934 42%,#161020 85%);perspective:1800px}
.clip{position:absolute}.headline{left:74px;top:195px;width:850px;font:700 78px/1.04 Syne;letter-spacing:-3px;white-space:pre-line;z-index:4}
.headline small{display:block;font:800 24px Inter;letter-spacing:5px;color:#c7a7ff;margin-bottom:22px}
.film-window{position:absolute;left:60px;top:405px;width:960px;height:775px;border-radius:36px;overflow:hidden;box-shadow:0 25px 80px #0008;transform-origin:center;z-index:2;border:2px solid #c7a7ff55}
#film{width:100%;height:100%;object-fit:cover}
.rail{position:absolute;left:60px;top:1198px;width:960px;height:3px;background:#c7a7ff25}.rail-fill{height:100%;width:100%;background:#9759ff;transform-origin:left}
.caption{left:85px;top:1236px;width:830px;text-align:center;font:800 72px/1.14 Inter;text-shadow:0 4px 18px #000b;z-index:6}
.word{display:inline-block;color:#f5f0ff;opacity:.55}.word.key{color:#f5a962}
.card{left:354px;top:1460px;width:580px;z-index:4;transform-style:preserve-3d}
.eyebrow{font:800 22px Inter;letter-spacing:3px;color:#c7a7ff;margin-bottom:18px}.card-title{font:700 48px/1.1 Syne;letter-spacing:-1px}.card-line{height:4px;width:80px;background:#f5a962;margin-top:24px}
#objects{position:absolute;left:42px;top:1380px;width:300px;height:300px;z-index:3}
.corner{position:absolute;left:74px;top:1670px;font:800 18px Inter;letter-spacing:3px;color:#a899c0}
.closing{inset:0;background:radial-gradient(ellipse at 50% 45%,#44286a,#241934 65%,#161020);z-index:20;padding:350px 92px;display:flex;flex-direction:column;justify-content:center}
.closing-label{font:800 26px Inter;letter-spacing:5px;color:#c7a7ff}.closing h2{font:700 102px/1.07 Syne;letter-spacing:-4px;margin:62px 0}.closing em{font-style:normal;color:#f5a962}.closing-cta{font:800 35px/1.3 Inter;color:#f5f0ff;border-top:3px solid #9759ff;padding-top:36px}.closing-note{font:800 18px Inter;letter-spacing:2px;color:#a899c0;margin-top:75px}
</style></head><body><div id="stage" data-composition-id="principal" data-width="1080" data-height="1920" data-start="0" data-duration="__DURATION__" data-fps="30">
<div id="headline" class="clip headline" data-start="0" data-duration="__DURATION__" data-track-index="2"><small>CARREIRA NOS TRIBUNAIS</small>__HEADLINE__</div>
<div id="window" class="film-window"><video id="film" class="clip" src="assets/video.mp4" data-start="0" data-duration="__DURATION__" data-track-index="0" data-has-audio="true" playsinline></video></div>
<div class="rail"><div id="railFill" class="rail-fill"></div></div>
<canvas id="objects" class="clip" data-start="0" data-duration="__DURATION__" data-track-index="1"></canvas>
__CAPTIONS____CARDS__
<div class="corner">TRTs · ROTINA &amp; CARREIRA</div>__CLOSING__
</div><script src="assets/gsap.js"></script><script type="module">
import * as THREE from './assets/three.module.js';
const P=__PLAN__;const scene=new THREE.Scene();
const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('#objects'),alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(300,300,false);renderer.setPixelRatio(2);renderer.setClearColor(0x000000,0);
const camera=new THREE.PerspectiveCamera(35,1,.1,100);camera.position.set(0,.6,7);camera.lookAt(0,0,0);
scene.add(new THREE.AmbientLight(0xffffff,2));const light=new THREE.DirectionalLight(0xfff0d9,4);light.position.set(-3,5,6);scene.add(light);const fill=new THREE.DirectionalLight(0x9759ff,3);fill.position.set(3,-1,1);scene.add(fill);
const purple=new THREE.MeshStandardMaterial({color:0x9759ff,metalness:.35,roughness:.28});const lilac=new THREE.MeshStandardMaterial({color:0xc7a7ff,metalness:.3,roughness:.3});const amber=new THREE.MeshStandardMaterial({color:0xf5a962,metalness:.45,roughness:.3});const dark=new THREE.MeshStandardMaterial({color:0x241934,metalness:.3,roughness:.3});
function box(g,w,h,d,x,y,z,mat=purple){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);g.add(m);return m;}
function group(){const g=new THREE.Group();scene.add(g);return g;}
const courthouse=group();box(courthouse,2.8,.22,1,0,-.85,0,lilac);box(courthouse,2.45,.18,.8,0,.78,0,lilac);for(let i=0;i<4;i++)box(courthouse,.25,1.5,.35,-.95+i*.63,0,0,purple);
const roof=new THREE.Mesh(new THREE.ConeGeometry(1.55,.65,3),amber);roof.rotation.y=Math.PI/2;roof.position.y=1.15;courthouse.add(roof);
const laptop=group();box(laptop,2.7,.17,1.6,0,-.7,.25,lilac);const display=box(laptop,2.5,1.7,.18,0,.25,-.45,purple);box(laptop,2.17,1.36,.025,0,.25,-.343,dark);for(let i=0;i<3;i++)box(laptop,1.45-i*.24,.075,.035,-.12,.57-i*.3,-.3,i===0?amber:lilac);
const clock=group();const dial=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.15,.27,48),lilac);dial.rotation.x=Math.PI/2;clock.add(dial);const face=new THREE.Mesh(new THREE.CircleGeometry(1.04,48),dark);face.position.z=.15;clock.add(face);for(let i=0;i<12;i++){const t=i*Math.PI/6;const mark=box(clock,.08,.2,.05,.87*Math.sin(t),.87*Math.cos(t),.19,amber);mark.rotation.z=-t;}const hand=box(clock,.1,.88,.08,0,.34,.23,purple);const hand2=box(clock,.72,.1,.08,.3,0,.26,purple);
const shield=group();const shape=new THREE.Shape();shape.moveTo(-.9,1);shape.lineTo(.9,1);shape.lineTo(.82,-.25);shape.quadraticCurveTo(.3,-1,-0,-1.15);shape.quadraticCurveTo(-.3,-1,-.82,-.25);shape.closePath();shield.add(new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.25,bevelEnabled:true,bevelSize:.08,bevelThickness:.08,bevelSegments:2,steps:1}),purple));const c1=box(shield,.65,.16,.1,-.22,-.05,.4,amber);c1.rotation.z=-.65;const c2=box(shield,1.1,.16,.1,.35,.21,.4,amber);c2.rotation.z=.75;
const growth=group();for(let i=0;i<3;i++){const h=.7+i*.55;box(growth,.55,h,.55,-.8+i*.8,-.8+h/2,0,i===2?amber:purple);}box(growth,2.6,.18,.9,0,-.88,0,lilac);
const models={courthouse,laptop,clock,shield,growth};Object.values(models).forEach(g=>g.visible=false);
const renderState={t:0};function draw(){const t=renderState.t;const card=P.cards.find(c=>t>=c.s&&t<c.e);Object.values(models).forEach(g=>g.visible=false);if(card){const g=models[card.model];g.visible=true;const enter=Math.min(1,Math.max(0,(t-card.s)/.35));g.scale.setScalar(.65+.35*(1-Math.pow(1-enter,3)));g.rotation.y=-.45+.15*Math.sin((t-card.s)*1.2);g.rotation.x=.08;g.position.y=.035*Math.sin((t-card.s)*1.5);if(card.model==='clock'){hand.rotation.z=-(t-card.s)*.3;}}renderer.render(scene,camera);}
const tl=gsap.timeline({paused:true,onUpdate:draw});tl.to(renderState,{t:P.duration,duration:P.duration,ease:'none'},0);
tl.from('#headline',{y:35,opacity:0,duration:.35,ease:'power3.out'},0);tl.fromTo('#railFill',{scaleX:0},{scaleX:1,duration:P.duration,ease:'none'},0);
P.shots.forEach((s,i)=>{if(s.s<P.duration){tl.set('#film',{scale:s.zoom},s.s);tl.to('#film',{scale:s.zoom+.025,duration:Math.min(s.e,P.duration)-s.s,ease:'none'},s.s);}});
document.querySelectorAll('.card').forEach(el=>{const t=Number(el.dataset.start);tl.from(el,{x:50,rotationY:-18,opacity:0,duration:.3,ease:'power3.out'},t);});
document.querySelectorAll('.caption').forEach(el=>{const t=Number(el.dataset.start);tl.from(el,{scale:.94,y:10,duration:.15,ease:'power3.out'},t);el.querySelectorAll('.word').forEach(w=>tl.to(w,{opacity:1,duration:.04},Number(w.dataset.at)));});
if(document.querySelector('#closing'))tl.from('#closing',{y:45,opacity:0,duration:.28,ease:'power3.out'},Number(document.querySelector('#closing').dataset.start));
draw();window.__timelines={principal:tl};
</script></body></html>'''
