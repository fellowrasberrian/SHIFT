import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import {PointerLockControls} from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/PointerLockControls.js";

const scene=new THREE.Scene();
scene.background=new THREE.Color("#0a1521");
scene.fog=new THREE.FogExp2("#0a1521",.025);

const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.1,100);
camera.position.set(0,1.7,8);

const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
renderer.shadowMap.enabled=true;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
document.querySelector("#scene").appendChild(renderer.domElement);

const controls=new PointerLockControls(camera,renderer.domElement);
const clock=new THREE.Clock();

const A=new THREE.Group(),B=new THREE.Group();
scene.add(A,B);

scene.add(new THREE.HemisphereLight("#b8dcf5","#172030",1.5));
const sun=new THREE.DirectionalLight("#b8dfff",2);
sun.position.set(-5,10,5);
sun.castShadow=true;
scene.add(sun);

const blue=new THREE.MeshStandardMaterial({color:"#263e50",roughness:.8});
const blueTrim=new THREE.MeshStandardMaterial({color:"#75b9e7",emissive:"#245879",emissiveIntensity:1});
const purple=new THREE.MeshStandardMaterial({color:"#382c42",roughness:.7});
const purpleTrim=new THREE.MeshStandardMaterial({color:"#c08bd9",emissive:"#663b78",emissiveIntensity:1});
const floorA=new THREE.MeshStandardMaterial({color:"#152737",roughness:.9});
const floorB=new THREE.MeshStandardMaterial({color:"#211d2b",roughness:.8});

function cube(parent,x,y,z,w,h,d,mat,solid=false){
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
 m.position.set(x,y,z);
 m.castShadow=true;
 m.receiveShadow=true;
 parent.add(m);
 if(solid)colliders.push({x,z,w,d});
 return m;
}

const colliders=[];

function buildRoom(group,wall,trim,floor){
 cube(group,0,-.25,0,20,.5,24,floor);
 cube(group,0,6,-12,20,12,.5,wall);
 cube(group,-10,3,0,.5,6,24,wall,true);
 cube(group,10,3,0,.5,6,24,wall,true);
 cube(group,-6,3,12,.5,6,24,wall);
 cube(group,6,3,12,.5,6,24,wall);
 cube(group,0,5,12,12,2,.5,wall);
 for(let x=-8;x<=8;x+=2){
  cube(group,x,.015,0,.025,.02,22,trim);
 }
 for(let z=-10;z<=10;z+=2){
  cube(group,0,.015,z,18,.02,.025,trim);
 }
 for(let x of [-8,-4,4,8]){
  cube(group,x,2.8,-5,.22,5.6,.22,wall,true);
  cube(group,x,5.6,-5,.5,.12,.5,trim);
 }
 cube(group,0,5.8,0,18,.15,.15,trim);
}
buildRoom(A,blue,blueTrim,floorA);
buildRoom(B,purple,purpleTrim,floorB);

// Objects that exist in only one reality.
const objectsA=new THREE.Group(),objectsB=new THREE.Group();
A.add(objectsA);B.add(objectsB);

cube(objectsA,-5,1.2,-5,2,2,2,blue,true);
cube(objectsA,5,1.2,-5,2,2,2,blue,true);
cube(objectsA,0,.8,1,2,1.6,2,blue,true);

cube(objectsB,0,1.2,-5,2,2,2,purple,true);
cube(objectsB,-5,1.2,0,2,2,2,purple,true);
cube(objectsB,5,1.2,0,2,2,2,purple,true);

const anchorPositions=[
 {x:-5,z:-5,phase:"A"},
 {x:5,z:-5,phase:"B"},
 {x:0,z:3,phase:"A"}
];
const anchors=[];

anchorPositions.forEach((p,i)=>{
 const g=new THREE.Group();
 const glow=new THREE.Mesh(
  new THREE.IcosahedronGeometry(.38,1),
  new THREE.MeshStandardMaterial({
   color:p.phase==="A"?"#9bdcff":"#d9a5ff",
   emissive:p.phase==="A"?"#397eaa":"#854caa",
   emissiveIntensity:2
  })
 );
 g.add(glow);
 const light=new THREE.PointLight(p.phase==="A"?"#69bdf0":"#bd83e5",4,5);
 g.add(light);
 g.position.set(p.x,1.4,p.z);
 (p.phase==="A"?A:B).add(g);
 anchors.push({group:g,phase:p.phase,mesh:glow,found:false});
});

const exitGlow=new THREE.PointLight("#9edaff",0,8);
exitGlow.position.set(0,2,-11);
scene.add(exitGlow);

let reality="A",started=false,ended=false,collected=0;
const keys={};

function notify(t){
 const el=document.querySelector("#message");
 el.textContent=t;
 clearTimeout(notify.timer);
 notify.timer=setTimeout(()=>el.textContent="",1800);
}

function updateReality(){
 A.visible=reality==="A";
 B.visible=reality==="B";
 document.querySelector("#reality").textContent="REALITY "+reality;
 document.querySelector("#objective").textContent=
 collected===3?"REACH THE EXIT":"FIND THE THREE ANCHORS";
 document.querySelector("#hud").style.opacity=1;
 const flash=document.createElement("div");
 flash.style.cssText="position:absolute;inset:0;background:#b5e5ff;opacity:.3;pointer-events:none;transition:opacity .35s";
 document.body.appendChild(flash);
 requestAnimationFrame(()=>flash.style.opacity=0);
 setTimeout(()=>flash.remove(),400);
}

function switchReality(){
 reality=reality==="A"?"B":"A";
 updateReality();
}

document.querySelector("#start").addEventListener("click",()=>{
 document.querySelector("#intro").classList.add("hidden");
 document.querySelector("#hud").classList.remove("hidden");
 controls.lock();
 started=true;
});

controls.addEventListener("unlock",()=>{
 if(started&&!ended)notify("CLICK TO RESUME");
});

document.addEventListener("keydown",e=>{
 keys[e.code]=true;
 if(!started||ended)return;
 if(e.code==="ShiftLeft"||e.code==="ShiftRight"){
  if(!e.repeat)switchReality();
 }
 if(e.code==="KeyE")interact();
});
document.addEventListener("keyup",e=>keys[e.code]=false);

function collides(x,z){
 for(const c of colliders){
  if(x>c.x-c.w/2-.35&&x<c.x+c.w/2+.35&&z>c.z-c.d/2-.35&&z<c.z+c.d/2+.35)return true;
 }
 return false;
}

function interact(){
 const p=camera.position;
 let nearest=null,dist=2.2;
 for(const a of anchors){
  if(a.found||a.phase!==reality)continue;
  const d=p.distanceTo(a.group.position);
  if(d<dist){nearest=a;dist=d;}
 }
 if(nearest){
  nearest.found=true;
  nearest.group.visible=false;
  collected++;
  document.querySelector("#count").textContent=String(collected).padStart(2,"0")+" / 03";
  notify("ANCHOR RECOVERED");
  if(collected===3){
   exitGlow.intensity=5;
   notify("EXIT UNLOCKED — FIND THE DOOR");
  }
  return;
 }
 if(collected===3&&p.z<-9&&Math.abs(p.x)<2.5){
  finish();
  return;
 }
 notify("NOTHING TO INTERACT WITH");
}

function finish(){
 ended=true;
 controls.unlock();
 document.querySelector("#hud").classList.add("hidden");
 document.querySelector("#ending").classList.remove("hidden");
}

function animate(){
 requestAnimationFrame(animate);
 const dt=Math.min(clock.getDelta(),.04);
 if(started&&controls.isLocked&&!ended){
  const speed=4.2*dt;
  const forward=new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y=0;forward.normalize();
  const right=new THREE.Vector3().crossVectors(forward,camera.up).normalize();
  const old=camera.position.clone();
  if(keys.KeyW)camera.position.addScaledVector(forward,speed);
  if(keys.KeyS)camera.position.addScaledVector(forward,-speed);
  if(keys.KeyA)camera.position.addScaledVector(right,speed);
  if(keys.KeyD)camera.position.addScaledVector(right,-speed);
  camera.position.y=1.7;
  if(collides(camera.position.x,camera.position.z)){
   camera.position.x=old.x;
   camera.position.z=old.z;
  }
  for(const a of anchors){
   if(!a.found&&a.phase===reality){
    a.mesh.rotation.x+=dt*.5;
    a.mesh.rotation.y+=dt*.8;
    a.group.position.y=1.4+Math.sin(performance.now()*.0015)*.13;
   }
  }
  if(collected===3&&camera.position.z<-9&&Math.abs(camera.position.x)<2.5){
   notify("PRESS E TO EXIT");
  }
 }
 renderer.render(scene,camera);
}
animate();

addEventListener("resize",()=>{
 camera.aspect=innerWidth/innerHeight;
 camera.updateProjectionMatrix();
 renderer.setSize(innerWidth,innerHeight);
});
