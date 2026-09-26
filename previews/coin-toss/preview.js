import * as THREE from '../../vendor/three/three.module.min.js';

// This self-contained preview never calls the reading API or modifies saved casts.
const $ = id => document.getElementById(id);
const stage = $('stage');
const canvas = $('coin-canvas');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const TAU = Math.PI * 2;
const REST_Y = .11;
const TOSS_MS = 2450;
const names = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
const types = {6:'老阴',7:'少阳',8:'少阴',9:'老阳'};
const restPositions = [new THREE.Vector3(-2.02, REST_Y, .2),new THREE.Vector3(0, REST_Y, -.13),new THREE.Vector3(2.02, REST_Y, .14)];
const restAngles = [-.22,.09,.23];
const state = {view:'motion',busy:false,lines:[],faces:[0,1,0],sound:false,animation:null,capture:false};
let renderer;
try {renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});}
catch(error){$('webgl-error').hidden=false;throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.18;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34,1,.1,60);
camera.position.set(0,7.5,7.2);
camera.lookAt(0,.35,0);

// Large soft studio reflections give the metal volume without glitter or glow.
const envScene = new THREE.Scene();
envScene.background = new THREE.Color(.16,.17,.15);
for(const [position,scale,color] of [
  [[-4,5,2],[4,5,1],[3.3,2.9,2.2]],
  [[4,3,-2],[2,4,1],[1.65,1.85,2.0]],
  [[0,6,0],[4,4,1],[2.1,1.9,1.55]],
  [[0,1,6],[6,2,1],[.35,.36,.32]]
]){
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(...scale.slice(0,2)),new THREE.MeshBasicMaterial({color:new THREE.Color(...color),side:THREE.DoubleSide}));
  panel.position.set(...position);panel.lookAt(0,0,0);envScene.add(panel);
}
const pmrem=new THREE.PMREMGenerator(renderer);
const envMap=pmrem.fromScene(envScene,.07).texture;
scene.environment=envMap;
pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xdad8ca,0x39362b,1.0));
const key=new THREE.DirectionalLight(0xffe7c1,3.5);
key.position.set(-3,8,4);key.castShadow=true;key.shadow.mapSize.set(2048,2048);
Object.assign(key.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:20});
key.shadow.bias=-.00035;key.shadow.normalBias=.02;key.shadow.radius=4;scene.add(key);
const fill=new THREE.DirectionalLight(0xc3d0d0,1.45);fill.position.set(4,4,-3);scene.add(fill);

function seededRandom(seed){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function makeTexture(back=false){
  const size=1024;
  const color=document.createElement('canvas');color.width=color.height=size;
  const bump=document.createElement('canvas');bump.width=bump.height=size;
  const c=color.getContext('2d');const b=bump.getContext('2d');const rand=seededRandom(back?75331:18019);
  c.fillStyle='#80613f';c.fillRect(0,0,size,size);b.fillStyle='#777777';b.fillRect(0,0,size,size);
  for(let i=0;i<340;i++){
    const x=rand()*size,y=rand()*size,r=12+rand()*67;
    const gradient=c.createRadialGradient(x,y,0,x,y,r);
    gradient.addColorStop(0,i%4===0?'rgba(37,72,57,.15)':'rgba(44,35,20,.095)');gradient.addColorStop(1,'rgba(60,50,25,0)');
    c.fillStyle=gradient;c.fillRect(x-r,y-r,r*2,r*2);
  }
  for(let i=0;i<75000;i++){
    const x=rand()*size,y=rand()*size,r=.2+rand()*1.4;
    c.fillStyle=rand()>.5?'rgba(242,212,146,.09)':'rgba(15,25,19,.17)';c.fillRect(x,y,r,r);
    const level=Math.floor(83+rand()*86);b.fillStyle=`rgb(${level},${level},${level})`;b.fillRect(x,y,r,r);
  }
  c.lineWidth=.7;c.strokeStyle='rgba(229,205,163,.18)';
  for(let i=0;i<240;i++){
    const a=rand()*TAU,r=130+rand()*355,x=512+Math.cos(a)*r,y=512+Math.sin(a)*r;
    c.beginPath();c.moveTo(x,y);c.lineTo(x+rand()*26-13,y+rand()*22-11);c.stroke();
  }
  function ring(r,w){for(const ctx of [c,b]){ctx.beginPath();ctx.arc(512,512,r,0,TAU);ctx.lineWidth=w;ctx.strokeStyle=ctx===c?'#b19969':'#bcbcbc';ctx.stroke();}}
  ring(451,5);ring(435,2);ring(195,3);
  for(const ctx of [c,b]){
    ctx.lineWidth=9;ctx.strokeStyle=ctx===c?'#aa9265':'#b8b8b8';ctx.strokeRect(367,367,290,290);
  }
  if(!back){
    const glyphs=[['乾',512,263],['坤',512,778],['通',779,520],['寶',248,520]];
    for(const [glyph,x,y] of glyphs){
      c.font='bold 154px "STKaiti", "KaiTi", "SimSun", serif';c.textAlign='center';c.textBaseline='middle';
      c.shadowColor='#2e291d';c.shadowBlur=3;c.shadowOffsetX=3;c.shadowOffsetY=4;
      c.fillStyle='#b79b67';c.fillText(glyph,x,y);c.shadowBlur=0;c.shadowOffsetX=0;c.shadowOffsetY=0;
      b.font=c.font;b.textAlign='center';b.textBaseline='middle';b.fillStyle='#c2c2c2';b.fillText(glyph,x,y);
    }
  }else{
    for(const ctx of [c,b]){
      ctx.strokeStyle=ctx===c?'#aa9366':'#bdbdbd';ctx.lineWidth=11;ctx.lineCap='round';
      for(const s of [-1,1]){
        const x=512+s*267;ctx.beginPath();ctx.moveTo(x,356);ctx.bezierCurveTo(x-s*43,408,x+s*34,467,x,520);ctx.bezierCurveTo(x-s*30,574,x+s*36,618,x,671);ctx.stroke();
        for(let j=0;j<4;j++){const y=400+j*65;ctx.beginPath();ctx.moveTo(x-29,y);ctx.lineTo(x+28,y+17);ctx.stroke();}
      }
      for(const y of [250,775]){ctx.beginPath();ctx.arc(512,y,19,0,TAU);ctx.stroke();}
    }
  }
  const map=new THREE.CanvasTexture(color);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
  const bumpMap=new THREE.CanvasTexture(bump);bumpMap.anisotropy=map.anisotropy;
  return {map,bumpMap};
}
const frontTexture=makeTexture(false),backTexture=makeTexture(true);
const faceMaterials=[frontTexture,backTexture].map(texture=>new THREE.MeshPhysicalMaterial({map:texture.map,bumpMap:texture.bumpMap,bumpScale:.016,metalness:.72,roughness:.57,clearcoat:.06,clearcoatRoughness:.68,envMapIntensity:.72}));
const edgeMaterial=new THREE.MeshStandardMaterial({color:0x625039,metalness:.78,roughness:.48,envMapIntensity:.75});
const rimMaterial=new THREE.MeshStandardMaterial({color:0x91764e,metalness:.82,roughness:.44,envMapIntensity:.76});
const coinShape=new THREE.Shape();coinShape.absarc(0,0,.74,0,TAU,false);
const hole=new THREE.Path();hole.moveTo(-.205,-.205);hole.lineTo(-.205,.205);hole.lineTo(.205,.205);hole.lineTo(.205,-.205);hole.closePath();coinShape.holes.push(hole);
const geometry=new THREE.ExtrudeGeometry(coinShape,{depth:.13,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.012,bevelThickness:.012,curveSegments:96});
geometry.translate(0,0,-.065);
geometry.clearGroups();
const normals=geometry.attributes.normal,positions=geometry.attributes.position,uv=geometry.attributes.uv;
let previous=-1,start=0;
for(let i=0;i<positions.count;i+=3){
  const z=normals.getZ(i);const material=z>.7?0:z<-.7?1:2;
  if(material!==previous){if(previous!==-1)geometry.addGroup(start,i-start,previous);start=i;previous=material;}
  for(let j=0;j<3;j++)uv.setXY(i+j,.5+(material===1?-1:1)*positions.getX(i+j)/1.48,.5+positions.getY(i+j)/1.48);
}
geometry.addGroup(start,positions.count-start,previous);uv.needsUpdate=true;
const rimGeometry=new THREE.TorusGeometry(.704,.013,8,128);
const holeRimShape=new THREE.Shape();holeRimShape.moveTo(-.223,-.223);holeRimShape.lineTo(.223,-.223);holeRimShape.lineTo(.223,.223);holeRimShape.lineTo(-.223,.223);holeRimShape.closePath();
const innerHole=new THREE.Path();innerHole.moveTo(-.21,-.21);innerHole.lineTo(-.21,.21);innerHole.lineTo(.21,.21);innerHole.lineTo(.21,-.21);innerHole.closePath();holeRimShape.holes.push(innerHole);
const squareRimGeometry=new THREE.ExtrudeGeometry(holeRimShape,{depth:.006,bevelEnabled:true,bevelSize:.004,bevelThickness:.003,bevelSegments:2,steps:1});
function makeCoin(){
  const root=new THREE.Group(),body=new THREE.Group();body.rotation.x=-Math.PI/2;root.add(body);
  const coin=new THREE.Mesh(geometry,[...faceMaterials,edgeMaterial]);coin.castShadow=true;coin.receiveShadow=true;body.add(coin);
  for(const side of [-1,1]){
    const ring=new THREE.Mesh(rimGeometry,rimMaterial);ring.position.z=side*.08;ring.castShadow=true;body.add(ring);
    const square=new THREE.Mesh(squareRimGeometry,rimMaterial);square.position.z=side*.077;if(side<0)square.rotation.y=Math.PI;body.add(square);
  }
  scene.add(root);return root;
}
const coins=[makeCoin(),makeCoin(),makeCoin()];

const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.14}));floor.rotation.x=-Math.PI/2;floor.position.y=.008;floor.receiveShadow=true;scene.add(floor);
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;
const shadowContext=shadowCanvas.getContext('2d');const shadowGradient=shadowContext.createRadialGradient(64,64,0,64,64,64);shadowGradient.addColorStop(0,'rgba(0,0,0,.52)');shadowGradient.addColorStop(.45,'rgba(0,0,0,.2)');shadowGradient.addColorStop(1,'rgba(0,0,0,0)');shadowContext.fillStyle=shadowGradient;shadowContext.fillRect(0,0,128,128);
const shadows=coins.map(()=>{const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2.1,2.1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,opacity:.42}));mesh.rotation.x=-Math.PI/2;mesh.position.y=.012;scene.add(mesh);return mesh;});

function showRest(faces=state.faces){
  coins.forEach((coin,i)=>{coin.visible=true;coin.position.copy(restPositions[i]);coin.rotation.set(faces[i]*Math.PI,restAngles[i],0);coin.scale.setScalar(1);});
}
function showMaterial(){
  coins[2].visible=false;
  coins[0].position.set(-1.29,.53,.13);coins[0].rotation.set(.44,-.22,-.16);coins[0].scale.setScalar(1.38);
  coins[1].position.set(1.3,.47,-.12);coins[1].rotation.set(Math.PI+.34,.15,.16);coins[1].scale.setScalar(1.38);
}
function positionLabels(){
  const layout=(container,items)=>{
    if(container.hidden)return;
    items.forEach((item,i)=>{const p=coins[i].position.clone().project(camera);item.style.left=`${(p.x*.5+.5)*stage.clientWidth}px`;});
  };
  layout($('coin-results'),[...$('coin-results').children]);
  layout($('material-labels'),[...$('material-labels').children]);
}
function updateShadows(){coins.forEach((coin,i)=>{const shadow=shadows[i];shadow.visible=coin.visible;shadow.position.x=coin.position.x;shadow.position.z=coin.position.z;const height=Math.max(0,coin.position.y-REST_Y);shadow.scale.setScalar(coin.scale.x*(1+height*.3));shadow.material.opacity=Math.max(.08,.46-height*.3);});positionLabels();}
function render(){updateShadows();renderer.render(scene,camera);}
function resize(){const width=stage.clientWidth,height=stage.clientHeight;renderer.setSize(width,height,false);camera.aspect=width/height;camera.fov=width<500?34:31;const targetHeight=Math.max(4.4,5.75/camera.aspect);const distance=targetHeight/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));camera.position.set(0,.62*distance+.58,.78*distance);camera.lookAt(0,.58,0);camera.updateProjectionMatrix();render();}
new ResizeObserver(resize).observe(stage);

function renderLines(){
  $('yao-list').innerHTML=names.map((name,i)=>{
    const result=state.lines[i];const solid=result?result.sum%2===1:false;
    return `<li class="yao-row" data-filled="${!!result}" data-active="${i===state.lines.length}" data-moving="${result?.sum===6||result?.sum===9}"><span class="yao-name">${name}</span><span class="yao-symbol" aria-label="${result?types[result.sum]:'待摇'}"><i></i>${solid?'':'<i></i>'}</span><span class="yao-state">${result?types[result.sum]:i===state.lines.length?'待摇':'—'}</span></li>`;
  }).join('');
  $('progress-count').textContent=`${state.lines.length} / 6`;
}
function syncControls(){
  $('toss-button').disabled=state.busy||state.lines.length===6;
  $('quick-cast').disabled=state.busy||state.lines.length===6;
  $('reset-button').disabled=state.busy;
  $('material-view').disabled=state.busy;
  $('motion-view').disabled=state.busy;
  stage.dataset.active=String(state.busy);
  $('round-label').textContent=state.lines.length===6?'六爻已成':`准备起${names[state.lines.length]}`;
  $('toss-button').querySelector('span').textContent=state.view==='material'?'体验摇卦':state.busy?'铜钱落定中':state.lines.length===6?'六爻已成':state.lines.length?'继续摇卦':'摇一次';
  if(state.view==='material')$('toss-button').disabled=false;
}
function setView(view){
  if(state.busy)return;state.view=view;document.body.dataset.view=view;
  $('motion-view').setAttribute('aria-pressed',String(view==='motion'));
  $('material-view').setAttribute('aria-pressed',String(view==='material'));
  $('coin-results').hidden=view==='material';$('material-labels').hidden=view!=='material';
  $('stage-status').textContent=view==='material'?'旧铜色 · 微磨损表面':'铜钱已就位';
  if(view==='material')showMaterial();else showRest();syncControls();render();
}
function newResult(){const values=crypto.getRandomValues(new Uint8Array(3));const faces=Array.from(values,v=>v&1);return{faces,sum:faces.reduce((sum,face)=>sum+2+face,0)};}
function record(result){
  state.faces=result.faces;state.lines.push(result);renderLines();
  $('coin-results').innerHTML=result.faces.map(face=>`<span>${face?'背面':'字面'}</span>`).join('');
  $('outcome-text').textContent=`${names[state.lines.length-1]} · ${types[result.sum]}`;
  $('outcome-detail').textContent=`${result.faces.map(face=>face?'背':'字').join(' · ')}${result.sum===6||result.sum===9?'　动爻':''}`;
  $('round-hint').textContent=state.lines.length===6?'六次结果已记录，可重新体验。':'这一爻已记下，继续摇下一次。';
}
const easeOut=u=>1-Math.pow(1-u,3);
const mix=(a,b,u)=>a+(b-a)*u;
function animateToss(ms,fromFaces,toFaces){
  const t=ms/1000;
  coins.forEach((coin,i)=>{
    coin.visible=true;coin.scale.setScalar(1);
    const home=restPositions[i],packed=new THREE.Vector3((i-1)*.06,.42+i*.19,(i-1)*.05);
    const fromX=fromFaces[i]*Math.PI,targetX=toFaces[i]*Math.PI;
    if(t<.3){
      const u=easeOut(Math.max(0,t/.3));coin.position.lerpVectors(home,packed,u);coin.rotation.set(fromX,restAngles[i],0);
    }else if(t<.67+i*.035){
      const u=t-.3,wave=Math.sin(u*48),tilt=Math.sin(u*39)*.07;
      coin.position.copy(packed).add(new THREE.Vector3(wave*.105,Math.cos(u*48)*.035,Math.sin(u*39)*.05));coin.rotation.set(fromX+tilt,restAngles[i],tilt*.45);
    }else{
      const u=(t-.67-i*.035)/(1.02+i*.04);
      if(u<1){
        const flight=Math.max(0,u);const spread=1-Math.pow(1-flight,3);coin.position.set(mix(packed.x,home.x,spread),mix(packed.y,home.y,flight),mix(packed.z,home.z,spread));
        coin.position.y+=4*(1.24+i*.08)*flight*(1-flight);
        coin.position.z+=Math.sin(flight*Math.PI)*(i-1)*.12;
        coin.rotation.set(mix(fromX,TAU*2+targetX,flight),restAngles[i]+TAU*flight,Math.sin(flight*Math.PI)*(i===1?-.48:.35));
      }else{
        const after=(t-(.67+i*.035+1.02+i*.04));const decay=Math.exp(-after*8);
        coin.position.copy(home);coin.position.y+=Math.abs(Math.sin(after*19))*.22*decay;
        coin.rotation.set(targetX+Math.sin(after*24)*.24*decay,restAngles[i]+Math.sin(after*15)*.06*decay,Math.sin(after*21)*.19*decay);
        if(t>=2.4){coin.position.copy(home);coin.rotation.set(targetX,restAngles[i],0);}
      }
    }
  });
}
let audioContext;
function metalClick(coinIndex){
  if(!state.sound)return;
  audioContext??=new (window.AudioContext||window.webkitAudioContext)();
  if(audioContext.state==='suspended')audioContext.resume();
  const time=audioContext.currentTime;
  for(const [freq,amp,tail] of [[1680,.035,.1],[2840,.018,.065],[4280,.012,.045]]){
    const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type='sine';osc.frequency.value=freq*(1+coinIndex*.07);
    gain.gain.setValueAtTime(amp,time);gain.gain.exponentialRampToValueAtTime(.0001,time+tail);
    osc.connect(gain);gain.connect(audioContext.destination);osc.start(time);osc.stop(time+tail+.02);
  }
}
function toss(){
  if(state.view==='material')setView('motion');
  if(state.busy||state.lines.length>=6)return;
  const result=newResult();const from=[...state.faces];state.busy=true;syncControls();
  $('stage-status').textContent='聚拢，轻摇';
  if(reducedMotion.matches){showRest(result.faces);record(result);state.busy=false;syncControls();$('stage-status').textContent='本轮已落定';render();return;}
  const started=performance.now();let sounded=0;
  state.animation={started,result,from};
  function frame(now){
    const elapsed=now-started;animateToss(elapsed,from,result.faces);
    if(elapsed>670&&elapsed<1650)$('stage-status').textContent='三钱翻转';
    if(elapsed>=1650)$('stage-status').textContent='落定成爻';
    while(sounded<3&&elapsed>1690+sounded*75){metalClick(sounded);sounded++;}
    render();
    if(elapsed<TOSS_MS){requestAnimationFrame(frame);return;}
    showRest(result.faces);record(result);state.busy=false;state.animation=null;syncControls();$('stage-status').textContent=state.lines.length===6?'六爻已成':'本轮已落定';render();
  }
  requestAnimationFrame(frame);
}
function quickCast(){
  if(state.busy||state.lines.length>=6)return;
  state.busy=true;syncControls();$('stage-status').textContent='依次亮出六轮结果';
  const next=()=>{const result=newResult();showRest(result.faces);record(result);render();if(state.lines.length<6){setTimeout(next,reducedMotion.matches?0:260);}else{state.busy=false;syncControls();$('stage-status').textContent='六爻已成';}};
  next();
}
function reset(){if(state.busy)return;state.lines=[];state.faces=[0,1,0];$('outcome-text').textContent='等待第一枚卦爻';$('outcome-detail').textContent='三枚铜钱的结果会记录在这里。';$('round-hint').textContent='摇一次，三枚铜钱落定成一爻。';$('coin-results').innerHTML='<span>字面</span><span>背面</span><span>字面</span>';renderLines();setView(state.view);}
$('toss-button').addEventListener('click',toss);$('quick-cast').addEventListener('click',quickCast);$('reset-button').addEventListener('click',reset);
$('motion-view').addEventListener('click',()=>setView('motion'));$('material-view').addEventListener('click',()=>setView('material'));
$('sound-toggle').addEventListener('click',()=>{state.sound=!state.sound;$('sound-toggle').setAttribute('aria-pressed',String(state.sound));$('sound-toggle').textContent=`声音 · ${state.sound?'开':'关'}`;if(state.sound){audioContext??=new (window.AudioContext||window.webkitAudioContext)();audioContext.resume();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&audioContext)audioContext.suspend();});
window.coinPreview={
  ready:true,
  setView,
  getState:()=>({view:state.view,busy:state.busy,faces:[...state.faces],lines:structuredClone(state.lines),coinPositions:coins.map(c=>c.position.toArray())}),
  seek(ms){
    state.capture=true;state.view='motion';document.body.dataset.view='motion';$('coin-results').hidden=false;$('material-labels').hidden=true;
    const start=350,end=start+TOSS_MS;
    if(ms<start){showRest([1,0,1]);stage.dataset.active='false';$('stage-status').textContent='铜钱已就位';$('coin-results').innerHTML='<span>背面</span><span>字面</span><span>背面</span>';}
    else if(ms<end){animateToss(ms-start,[1,0,1],[1,0,1]);stage.dataset.active='true';$('stage-status').textContent=ms-start<670?'聚拢，轻摇':ms-start<1650?'三钱翻转':'落定成爻';}
    else{showRest([1,0,1]);stage.dataset.active='false';$('stage-status').textContent='本轮已落定';$('coin-results').innerHTML='<span>背面</span><span>字面</span><span>背面</span>';}
    render();
  }
};
showRest();renderLines();syncControls();resize();
