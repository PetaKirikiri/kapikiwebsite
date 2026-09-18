import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { stationProgress } from './stationProgress'
import { fitKitchenCamera } from './cameraFraming'
import { KITCHEN_TIMING, returnedPlateCount, STATIONS, type Kitchen, type KitchenPlayer, type KitchenInteraction } from './engine.mjs'
export type SceneReach=KitchenInteraction&{began:number;seat:number}
export type KitchenFrame={kitchen:Kitchen;players:Record<number,KitchenPlayer>;seat:number;selected:string|null;now:number;clock:number;reaches:SceneReach[]}
import { CHEF_COLORS as COLORS } from './presentation'
const smooth=(x:number)=>{const t=THREE.MathUtils.clamp(x,0,1);return t*t*(3-2*t)}
export function createKitchenScene(canvas:HTMLCanvasElement,host:HTMLElement){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'})
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-8,8,5.5,-5.5,.1,80)
 camera.position.set(5.5,14,13.5);camera.lookAt(5.5,.25,3.4)
 scene.add(new THREE.HemisphereLight('#fff6dc','#6c96a1',1.7))
 const sun=new THREE.DirectionalLight('#fff0ce',2.7);sun.position.set(-3,11,4);sun.target.position.set(5,0,3);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:.1,far:35});sun.shadow.normalBias=.025;sun.shadow.bias=-.00015;sun.shadow.radius=3;scene.add(sun,sun.target)
 const fill=new THREE.DirectionalLight('#c6ebff',1.1);fill.position.set(13,6,-5);scene.add(fill)
 const geometries=new Map<string,THREE.BufferGeometry>(),materials=new Map<string,THREE.MeshStandardMaterial>()
 const mat=(color:string,metal=0)=>{const key=color+metal;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:metal?.32:.78,metalness:metal}));return materials.get(key)!}
 function mesh(parent:THREE.Object3D,geometry:THREE.BufferGeometry,color:string,x:number,y:number,z:number,metal=0){const m=new THREE.Mesh(geometry,mat(color,metal));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
 function geometry(key:string,create:()=>THREE.BufferGeometry){if(!geometries.has(key))geometries.set(key,create());return geometries.get(key)!}
 const sphere=geometry('sphere',()=>new THREE.SphereGeometry(1,24,16))
 function ball(parent:THREE.Object3D,color:string,x:number,y:number,z:number,sx:number,sy=sx,sz=sx){const m=mesh(parent,sphere,color,x,y,z);m.scale.set(sx,sy,sz);return m}
 function box(parent:THREE.Object3D,color:string,x:number,y:number,z:number,w:number,h:number,d:number,r=.04,metal=0){return mesh(parent,geometry(`b${w},${h},${d},${r}`,()=>new RoundedBoxGeometry(w,h,d,2,Math.min(r,h/2,d/2,w/2))),color,x,y,z,metal)}
 function cylinder(parent:THREE.Object3D,color:string,x:number,y:number,z:number,rt:number,rb:number,h:number,metal=0){return mesh(parent,geometry(`c${rt},${rb},${h}`,()=>new THREE.CylinderGeometry(rt,rb,h,24)),color,x,y,z,metal)}
 function tube(parent:THREE.Object3D,color:string,points:THREE.Vector3[],radius:number){const key=`t${points.map(p=>p.toArray().join()).join('/')}:${radius}`;return mesh(parent,geometry(key,()=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),16,radius,7,false)),color,0,0,0)}
 function ring(parent:THREE.Object3D,color:string,x:number,y:number,z:number,r:number,t:number,metal=0){const m=mesh(parent,geometry(`ring${r},${t}`,()=>new THREE.TorusGeometry(r,t,8,32)),color,x,y,z,metal);m.rotation.x=Math.PI/2;return m}
 function vessel(parent:THREE.Object3D,key:string,color:string,profile:number[][],y:number,metal=0){return mesh(parent,geometry(key,()=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),32)),color,0,y,0,metal)}
 function food(item:string){const g=new THREE.Group();const onion=item.includes('onion')
  if(item==='plate'||item==='dirty'||item.startsWith('soup:')){vessel(g,'dish','#fff9e9',[[0,0],[.2,0],[.29,.035],[.31,.065],[.30,.085],[.23,.045],[0,.035]],0);ring(g,'#6b9fab',0,.073,0,.282,.012);if(item.startsWith('soup:')){cylinder(g,'#fff8e9',0,.08,0,.23,.16,.15);cylinder(g,onion?'#e6ba56':'#d4542f',0,.16,0,.196,.196,.012);ball(g,'#70984e',.04,.18,0,.025,.009,.06)}else if(item==='dirty'){ball(g,'#a86940',.025,.048,.035,.14,.009,.10);ball(g,'#c58645',-.14,.058,-.07,.055,.008,.035);ball(g,'#638044',.095,.061,-.085,.027,.009,.045)}}
  else if(item.startsWith('chopped:')){
   // Broad overlapping cut faces stay recognisable at the game's camera distance.
   for(const [x,y,z,angle] of [[-.13,.035,-.1,-.3],[.14,.062,-.035,.3],[-.045,.09,.14,-.65]]){
    const slice=new THREE.Group();slice.position.set(x,y,z);slice.rotation.y=angle;g.add(slice)
    cylinder(slice,onion?'#95659e':'#ae3026',0,0,0,.205,.19,.065)
    cylinder(slice,onion?'#f6eada':'#eb5037',0,.036,0,.181,.181,.012)
    if(onion){
     ring(slice,'#b184b1',0,.045,0,.142,.012)
     ring(slice,'#c6a1bd',0,.047,0,.095,.009)
     ring(slice,'#d9bfce',0,.047,0,.049,.008)
    }else{
     for(let i=0;i<3;i++){const a=i*Math.PI*2/3;const pocket=ball(slice,'#bb3326',Math.sin(a)*.09,.047,Math.cos(a)*.09,.056,.008,.068);pocket.rotation.y=a
      for(const d of [-1,1]){const seed=ball(slice,'#ffe3a2',Math.sin(a)*.097+Math.cos(a)*d*.023,.057,Math.cos(a)*.097-Math.sin(a)*d*.023,.011,.006,.019);seed.rotation.y=a+d*.4}
     }
     ball(slice,'#ffd397',0,.048,0,.027,.007,.027)
    }
   }
  }
  else if(onion){ball(g,'#c18fc4',0,0,0,.19,.205,.19);cylinder(g,'#b89a68',0,.22,0,.025,.055,.11);for(let i=0;i<4;i++){const a=i*Math.PI/2;tube(g,'#e2b5dc',[new THREE.Vector3(Math.sin(a)*.04,.16,Math.cos(a)*.04),new THREE.Vector3(Math.sin(a)*.19,0,Math.cos(a)*.19),new THREE.Vector3(Math.sin(a)*.08,-.16,Math.cos(a)*.08)],.007)}}
  else{ball(g,'#ef5c3f',0,0,0,.2,.18,.2);for(let i=0;i<5;i++){const a=i*1.256;const leaf=ball(g,'#538044',Math.sin(a)*.07,.175,Math.cos(a)*.07,.045,.015,.095);leaf.rotation.y=a}cylinder(g,'#49663b',0,.21,0,.018,.025,.1)}
  return g
 }
 // The room is a single cutaway set. All counters and characters share real depth and light.
 box(scene,'#62949b',5.5,-.48,3.5,13.1,.8,9.1,.2)
 box(scene,'#c9a075',5.5,-.12,3.5,12.9,.3,8.9,.16)
 box(scene,'#e6d1ad',5.5,.015,3.5,12.1,.04,8.1,.04)
 for(let x=0;x<12;x++)for(let z=0;z<8;z++)box(scene,(x+z)%2?'#eee0c5':'#e5d4b7',x,.055,z,.984,.035,.984,.015)
 box(scene,'#f8e8c6',5.5,1.06,-.72,12.9,2.2,.3,.1)
 box(scene,'#569ca8',5.5,.51,-.51,12.7,1.04,.09,.015)
 for(let x=0;x<13;x++){box(scene,'#aad0cc',x-.5,.49,-.452,.015,.95,.012,.004);box(scene,'#aad0cc',5.5,.45,-.45,12.6,.015,.015,.004)}
 box(scene,'#fff5d8',5.5,2.18,-.72,13.05,.15,.48,.04)
 box(scene,'#f8e8c6',-.76,.64,3.5,.26,1.35,8.5,.08);box(scene,'#f8e8c6',11.76,.64,3.5,.26,1.35,8.5,.08)
 box(scene,'#fff5d8',-.76,1.33,3.5,.38,.12,8.55,.04);box(scene,'#fff5d8',11.76,1.33,3.5,.38,.12,8.55,.04)
 // Quiet infill separates usable stations without resembling extra equipment.
 for(const x of [0,3,6,9,10,11]){box(scene,'#c3c3b4',x,.46,0,.96,.84,.94,.06);box(scene,'#e5dfcc',x,.92,0,1,.17,1,.05)}
 // Station models and animated equipment.
 const meterResources:{texture:THREE.CanvasTexture;material:THREE.SpriteMaterial}[]=[]
 const meterMaterials=new Map<string,THREE.MeshBasicMaterial>()
 const meterMat=(color:string)=>{if(!meterMaterials.has(color))meterMaterials.set(color,new THREE.MeshBasicMaterial({color,depthTest:false,depthWrite:false}));return meterMaterials.get(color)!}
 function progressMeter(parent:THREE.Group){
  const root=new THREE.Group();root.position.set(0,1.96,0);root.quaternion.copy(camera.quaternion);parent.add(root)
  const frame:THREE.Mesh=box(root,'#fff6de',0,0,0,.94,.18,.035,.04),track:THREE.Mesh=box(root,'#263e49',0,0,.025,.84,.095,.018,.02),fill:THREE.Mesh=box(root,'#8dba69',0,0,.04,.82,.075,.015,.018)
  for(const [part,color] of [[frame,'#fff6de'],[track,'#263e49'],[fill,'#8dba69']] as const){part.material=meterMat(color);part.castShadow=false;part.receiveShadow=false;part.renderOrder=10}
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=80
  const context=canvas.getContext('2d')!,texture=new THREE.CanvasTexture(canvas),material=new THREE.SpriteMaterial({map:texture,depthTest:false,depthWrite:false});texture.colorSpace=THREE.SRGBColorSpace
  const text=new THREE.Sprite(material);text.position.set(0,.23,0);text.scale.set(.74,.23,1);text.renderOrder=11;root.add(text);meterResources.push({texture,material})
  return {root,fill,context,texture,label:''}
 }
 const stations=new Map<string,{root:THREE.Group;outline:THREE.Group;items:THREE.Group;key:string;knife?:THREE.Group;soup?:THREE.Mesh;burner?:THREE.Mesh;steam:THREE.Mesh[];meter:ReturnType<typeof progressMeter>}>()
 for(const s of STATIONS){const g=new THREE.Group();g.position.set(s.x,0,s.y);scene.add(g)
  const panel={source:'#669b69',chop:'#d6aa55',pot:'#c97660',counter:'#9388b1',plates:'#799aaa','plate-return':'#799aaa',sink:'#5f9fbb',trash:'#667078',serve:'#50978b'}[s.type]??'#9388b1'
   box(g,panel,0,s.type==='sink'?.39:.45,0,.94,s.type==='sink'?.69:.83,.94,.075);box(g,'#465762',0,.1,0,.84,.1,.82,.02)
   if(s.type!=='sink')box(g,s.type==='pot'?'#344653':'#f5efdc',0,.92,0,1,.17,1,.055)
   if(s.type!=='pot'){box(g,panel,0,.43,.481,.77,.55,.025,.025);box(g,'#f5ecd5',0,.64,.52,.23,.035,.05,.015)}
  const outline=new THREE.Group();g.add(outline);for(const d of [-1,1]){box(outline,'#ffd265',d*.51,1.025,0,.055,.035,1.075,.017);box(outline,'#ffd265',0,1.025,d*.51,1.075,.035,.055,.017)}outline.visible=false
  let knife:THREE.Group|undefined,soup:THREE.Mesh|undefined,burner:THREE.Mesh|undefined;const steam:THREE.Mesh[]=[]
  if(s.type==='source'){
   const accent=panel
   // One permanent ingredient emblem marks an unlimited supply drawer.
   box(g,'#e9d4aa',0,1.12,0,.84,.22,.82,.055)
   box(g,'#d6c4a1',0,1.242,0,.72,.035,.68,.04)
   box(g,'#f5e8c9',0,1.267,0,.61,.025,.57,.04)
   const emblem=food(`raw:${s.ingredient}`);emblem.position.set(0,1.39,0);emblem.scale.set(1.25,.65,1.25);g.add(emblem)
   box(g,accent,0,.45,.496,.77,.53,.04,.025)
   box(g,'#fff0cd',0,.62,.54,.32,.055,.075,.025)
  }
  if(s.type==='chop'){
   box(g,'#d4a16a',0,1.045,0,.79,.065,.69,.07)
   knife=new THREE.Group();knife.position.set(0,1.10,.17);knife.rotation.y=-.18;g.add(knife)
   // Rest on the broad face so the chef-knife silhouette reads from the game camera.
   const profile=new THREE.Shape();profile.moveTo(.055,.115);profile.lineTo(-.36,.115);profile.quadraticCurveTo(-.30,-.105,-.12,-.115);profile.lineTo(.055,-.115);profile.closePath()
   const blade=mesh(knife,geometry('chef-knife-blade',()=>new THREE.ExtrudeGeometry(profile,{depth:.025,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.006,bevelThickness:.004})),'#c8d9df',0,0,0,.55);blade.rotation.x=-Math.PI/2
   const edge=new THREE.Shape();edge.moveTo(-.36,.115);edge.quadraticCurveTo(-.30,-.105,-.12,-.115);edge.lineTo(.055,-.115);edge.lineTo(.055,-.075);edge.lineTo(-.12,-.075);edge.quadraticCurveTo(-.27,-.07,-.36,.115)
   const bevel=mesh(knife,geometry('chef-knife-edge',()=>new THREE.ShapeGeometry(edge)),'#f1f5ee',0,.031,0,.3);bevel.rotation.x=-Math.PI/2
   box(knife,'#9cabb0',.085,.014,0,.07,.046,.13,.012,.5)
   box(knife,'#283f4c',.225,.014,0,.24,.06,.105,.025)
   for(const x of [.17,.28])cylinder(knife,'#dce5dc',x,.047,0,.012,.012,.007,.4)
  }
  if(s.type==='pot'){
   // A complete range, with an oven face and exposed hob, separates cooking from prep.
   box(g,panel,0,.43,.475,.8,.62,.055,.035)
   box(g,'#31434e',0,.39,.512,.64,.35,.035,.04)
   box(g,'#4b6974',0,.39,.535,.51,.23,.015,.025,.25)
   box(g,'#d9e1da',0,.61,.55,.57,.045,.065,.02,.5)
   box(g,'#d1d9d3',0,.79,.493,.86,.15,.075,.025,.4)
   for(const x of [-.27,0,.27]){const knob=cylinder(g,'#34434d',x,.79,.552,.049,.049,.05,.2);knob.rotation.x=Math.PI/2;box(g,'#fff2cd',x,.811,.583,.011,.028,.01,.003)}
   box(g,'#253943',0,1.026,0,.9,.05,.89,.045)
   burner=cylinder(g,'#526773',0,1.065,0,.39,.39,.035,.3)
   cylinder(g,'#243540',0,1.09,0,.33,.33,.04)
   for(const d of [-1,1]){box(g,'#152c36',d*.37,1.105,0,.14,.065,.065,.015);box(g,'#152c36',0,1.105,d*.37,.065,.065,.14,.015)}
   vessel(g,'open-pot','#afbec1',[[0,0],[.265,0],[.315,.33],[.291,.33],[.248,.045],[0,.045]],1.12,.55)
   soup=cylinder(g,'#e7c367',0,1.38,0,.274,.274,.014);soup.visible=false
   const rim=mesh(g,geometry('pot-rim',()=>new THREE.TorusGeometry(.302,.024,8,32)),'#e4ede4',0,1.479,0,.65);rim.rotation.x=Math.PI/2
   for(const d of [-1,1]){box(g,'#859da3',d*.33,1.36,0,.09,.055,.1,.015,.5);box(g,'#2b434e',d*.405,1.36,0,.14,.085,.19,.035)}
   for(let i=0;i<3;i++){const puff=ball(g,'#fff2dc',(i-1)*.12,1.7,0,.065,.09,.065);puff.material=new THREE.MeshStandardMaterial({color:'#fff2dc',transparent:true,opacity:.28,depthWrite:false});puff.castShadow=false;steam.push(puff)}
  }
  if(s.type==='plates'){
   box(g,'#405c69',0,1.02,0,.82,.035,.8,.055)
   for(let i=0;i<5;i++){const f=food('plate');f.position.set(0,1.06+i*.075,0);f.scale.setScalar(1.15);g.add(f)}
  }
  if(s.type==='sink'){
   // A recessed steel bowl: surrounding worktop, deep floor, sloped sides and drain.
   for(const d of [-1,1]){box(g,'#e1e6df',d*.43,.94,0,.14,.13,1,.025,.3);box(g,'#e1e6df',0,.94,d*.42,.76,.13,.16,.025,.3)}
   box(g,'#6c8791',0,.77,0,.64,.035,.59,.07,.4)
   for(const d of [-1,1]){box(g,'#9dB2b6',d*.34,.855,0,.045,.17,.66,.012,.4);box(g,'#9db2b6',0,.855,d*.31,.69,.17,.045,.012,.4)}
   cylinder(g,'#344e5a',0,.793,0,.073,.073,.012);ring(g,'#dbe3dd',0,.801,0,.075,.011,.5)
   tube(g,'#d2dfd9',[new THREE.Vector3(0,1.01,-.4),new THREE.Vector3(0,1.5,-.4),new THREE.Vector3(0,1.51,-.05),new THREE.Vector3(0,1.32,-.05)],.045)
   for(const d of [-1,1])box(g,'#718d96',d*.21,1.015,-.4,.12,.045,.07,.02,.4)
  }
  if(s.type==='trash'){
   // Waste chute fitted into the same worktop and cabinet as the other stations.
   cylinder(g,'#263d46',0,1.011,0,.285,.285,.014)
   ring(g,'#aebbb8',0,1.025,0,.3,.032,.4)
   box(g,'#e4e6d8',0,.37,.507,.2,.22,.018,.016)
   box(g,'#e4e6d8',0,.505,.509,.26,.028,.022,.007)
   box(g,'#e4e6d8',0,.54,.509,.09,.035,.022,.007)
   for(const x of [-.05,.05])box(g,panel,x,.37,.521,.018,.15,.008,.004)
  }
  if(s.type==='serve'||s.type==='plate-return'){
   box(g,'#465d66',0,1.025,0,.82,.035,.77,.055)
   box(g,'#e6e8d8',0,1.053,0,.7,.025,.62,.04)
   const arrow=new THREE.Shape();arrow.moveTo(-.2,-.065);arrow.lineTo(.035,-.065);arrow.lineTo(.035,-.16);arrow.lineTo(.23,0);arrow.lineTo(.035,.16);arrow.lineTo(.035,.065);arrow.lineTo(-.2,.065);arrow.closePath()
   const mark=mesh(g,geometry('serve-arrow',()=>new THREE.ShapeGeometry(arrow)),panel,0,1.069,0);mark.rotation.x=-Math.PI/2;if(s.type==='plate-return')mark.rotation.z=Math.PI
  }
  const items=new THREE.Group();items.position.y=1.2;g.add(items)
  const meter=progressMeter(g);meter.root.visible=false
  stations.set(s.id,{root:g,outline,items,key:'',knife,soup,burner,steam,meter})
 }
 type Chef={root:THREE.Group;body:THREE.Group;hands:THREE.Mesh[];arms:THREE.Mesh[];feet:THREE.Mesh[];eyes:THREE.Mesh[];held:THREE.Group;heldKey:string;pointer:THREE.Mesh;angle:number}
 const chefs=new Map<number,Chef>(),transfers=new Map<number,{root:THREE.Group;key:string}>()
 function chef(seat:number){const root=new THREE.Group(),body=new THREE.Group();root.add(body);scene.add(root);const color=COLORS[seat%4],cream='#f2dcb1'
  const feet=[-.16,.16].map(x=>ball(body,'#344756',x,.12,.07,.14,.105,.22))
  ball(body,'#fff4db',0,.51,0,.34,.4,.29);box(body,color,0,.54,.265,.43,.51,.08,.06);box(body,'#fff0d2',0,.43,.314,.25,.13,.025,.035)
  cylinder(body,color,0,.86,0,.255,.23,.09)
  const headStart=body.children.length
  ball(body,cream,0,1.08,0,.36,.335,.335)
  // The face is a single rig. Eyes, brows, cheeks and mouth turn together.
  const eyes=[-.115,.115].map(x=>{const e=ball(body,'#253f50',x,1.13,.32,.049,.068,.025);ball(body,'#fffcef',x-.013,1.155,.345,.015);ball(body,'#e8a48b',x*1.8,1.015,.273,.055,.025,.015);tube(body,'#9a8260',[new THREE.Vector3(x-.05,1.25,.27),new THREE.Vector3(x,1.26,.286),new THREE.Vector3(x+.04,1.25,.27)],.012);return e})
  ball(body,'#e9c89c',0,1.04,.321,.047,.035,.04)
  tube(body,'#97624d',[new THREE.Vector3(-.065,.973,.292),new THREE.Vector3(0,.95,.31),new THREE.Vector3(.065,.973,.292)],.014)
  cylinder(body,color,0,1.36,0,.305,.305,.1)
  cylinder(body,'#fff8e8',0,1.49,0,.315,.3,.23)
  for(const [x,y,z,r] of [[-.18,1.62,0,.2],[.18,1.62,0,.2],[0,1.72,0,.225],[0,1.62,.15,.2],[0,1.62,-.15,.2]])ball(body,'#fff8e8',x,y,z,r,r*.86,r)
  const head=new THREE.Group();head.position.y=1.08;for(const part of body.children.slice(headStart)){part.position.y-=1.08;head.add(part)}head.rotation.x=-.16;body.add(head)
  const arms=[-1,1].map(d=>cylinder(body,'#fff4dd',d*.37,.68,0,.095,.105,.35)),hands=[-1,1].map(d=>ball(body,cream,d*.41,.53,.03,.11))
  const held=new THREE.Group();body.add(held)
  const pointer=mesh(root,geometry('pointer',()=>new THREE.ConeGeometry(.09,.17,3)),color,0,2.2,0);pointer.rotation.z=Math.PI;pointer.castShadow=false
  const model={root,body,hands,arms,feet,eyes,held,heldKey:'',pointer,angle:0};chefs.set(seat,model);return model
 }
 // Project the room envelope once; fit the camera, never rescale the game world.
 camera.updateMatrixWorld()
 const roomBounds={left:Infinity,right:-Infinity,top:-Infinity,bottom:Infinity}
 for(const x of [-1.05,12.05])for(const y of [-.88,2.3])for(const z of [-.95,8.05]){
  const p=new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse)
  roomBounds.left=Math.min(roomBounds.left,p.x);roomBounds.right=Math.max(roomBounds.right,p.x)
  roomBounds.top=Math.max(roomBounds.top,p.y);roomBounds.bottom=Math.min(roomBounds.bottom,p.y)
 }
 const resize=()=>{
  const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return
  renderer.setSize(w,h,false)
  const style=getComputedStyle(host),compact=style.getPropertyValue('--kitchen-landscape').trim()==='1'
  if(compact){
   const inset=(name:string)=>parseFloat(style.getPropertyValue(`--kitchen-camera-${name}`))||0
   const app=host.closest('.kitchen-app'),viewport=host.getBoundingClientRect()
   const stick=app?.querySelector('.kitchen-thumbstick')?.getBoundingClientRect()
   const actions=app?.querySelector('.kitchen-touch-actions')?.getBoundingClientRect()
   const hud=app?.querySelector('.kitchen-hud')?.getBoundingClientRect()
   Object.assign(camera,fitKitchenCamera(roomBounds,w,h,{
    left:Math.max(inset('left'),stick?stick.right-viewport.left+4:0),
    right:Math.max(inset('right'),actions?viewport.right-actions.left+4:0),
    top:Math.max(inset('top'),hud?hud.bottom-viewport.top+4:0),bottom:inset('bottom'),
   }))
  }else{
   const aspect=w/h,half=Math.max(5.4,7.4/aspect)
   camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half
  }
  camera.updateProjectionMatrix()
 }
 const observer=new ResizeObserver(resize);observer.observe(host);resize()
 let previous=0
 const update=(frame:KitchenFrame)=>{
  const dt=Math.min(.05,Math.max(.001,(frame.clock-previous)/1000));previous=frame.clock
  const reaches=new Map(frame.reaches.map(r=>[r.seat,r]))
  for(const s of STATIONS){const model=stations.get(s.id)!,state=frame.kitchen.stations[s.id]??{ingredients:[],item:null,readyAt:0},active=state.readyAt>frame.now,burnt=s.type==='pot'&&state.readyAt>0&&frame.now>=state.readyAt+KITCHEN_TIMING.burn
   model.outline.visible=frame.selected===s.id
   const hidden=frame.reaches.some(r=>r.station===s.id&&r.kind==='place'),key=s.type==='plate-return'?`returns:${returnedPlateCount(state,frame.now)}`:hidden?'':state.item??''
   model.items.position.y=(s.type==='chop'?1.08:s.type==='sink'?.91:1.012)+(key.startsWith('raw:')?(key.includes('onion')?.205:.18):0)
   if(key!==model.key){
    model.items.clear()
    if(s.type==='plate-return'){
     const count=returnedPlateCount(state,frame.now)
     for(let i=0;i<Math.min(count,12);i++){const plate=food('dirty');plate.position.set(i%2?.015:-.015,.069+i*.105,i%3*.012);plate.rotation.y=i*1.7;plate.scale.setScalar(1.15);model.items.add(plate)}
    }
    else if(key)model.items.add(food(key))
    model.key=key
   }
   if(s.type==='plate-return'){
    const last=Math.max(state.lastReturnAt??0,...(state.returnAt??[]).filter(at=>at<=frame.now)),elapsed=frame.now-last,top=model.items.children.at(-1)
    if(top){const i=model.items.children.length-1;top.position.y=.069+i*.105+(elapsed>=0&&elapsed<320?.12*(1-elapsed/320)**2:0)}
   }
   if(model.knife){
    const swing=Math.sin(frame.clock/95),blend=1-Math.exp(-dt*18)
    model.knife.rotation.x+=((active?1.15+swing*.13:0)-model.knife.rotation.x)*blend
    model.knife.position.y+=((active?1.18+Math.max(0,swing)*.17:1.10)-model.knife.position.y)*blend
    model.knife.position.z+=((active?.015:.17)-model.knife.position.z)*blend
   }
   if(model.soup){model.soup.visible=state.ingredients.length>0;model.soup.position.y=state.ingredients.length>1?1.38:1.25;model.soup.material=mat(burnt?'#4f4046':state.ingredients.includes('tomato')?'#e07d42':'#e7c367')}
   if(model.burner)model.burner.material=mat(active?'#f5a144':'#526773',active?0:.3)
   model.steam.forEach((p,i)=>{p.visible=active;const t=(frame.clock/1300+i*.33)%1;p.position.y=1.59+t*.7;p.scale.setScalar(.04+t*.07);(p.material as THREE.MeshStandardMaterial).opacity=.4*(1-t)})
   const progress=stationProgress(s.type,state,frame.now),meter=model.meter
   meter.root.visible=!!progress
   if(progress){
    const color=progress.phase==='paused'?'#9aa4a6':progress.phase==='burnt'?'#d84c3e':progress.phase==='warning'?'#ee9239':progress.phase==='ready'?'#72b855':s.type==='sink'?'#68bdd4':'#92c657'
    meter.fill.material=meterMat(color);meter.fill.scale.x=Math.max(.001,progress.value);meter.fill.position.x=-.41+.41*progress.value
    meter.root.scale.setScalar(progress.phase==='warning'?1+Math.sin(frame.clock/130)*.035:1)
    const label=progress.label+color
    if(label!==meter.label){const c=meter.context;c.clearRect(0,0,256,80);c.font='bold 58px sans-serif';c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.lineWidth=12;c.strokeStyle='#fff8e6';c.strokeText(progress.label,128,42);c.fillStyle=progress.phase==='warning'||progress.phase==='burnt'?'#b93e2e':'#284753';c.fillText(progress.label,128,42);meter.texture.needsUpdate=true;meter.label=label}
   }
  }
  for(const [key,p] of Object.entries(frame.players)){const seat=Number(key),m=chefs.get(seat)??chef(seat),f=p.facing??{x:0,y:1},target=Math.atan2(f.x,f.y);m.angle+=Math.atan2(Math.sin(target-m.angle),Math.cos(target-m.angle))*(1-Math.exp(-dt*22));m.root.position.set(p.x,0,p.y);m.body.rotation.y=m.angle;m.pointer.visible=seat===frame.seat;m.pointer.position.y=2.17+Math.sin(frame.clock/220)*.035
   const phase=frame.clock/95,step=p.walking?Math.sin(phase):0;m.body.position.y=p.walking?Math.abs(Math.sin(phase))* .035:Math.sin(frame.clock/550+seat)*.006
   m.feet.forEach((foot,i)=>{foot.position.z=.07+step*(i?-.11:.11);foot.position.y=.12+Math.max(0,step*(i?-1:1))*.055;foot.rotation.x=step*(i?-.2:.2)})
   m.eyes.forEach(eye=>eye.scale.y=(frame.clock+seat*719)%4100>3970?.01:.068)
   const reach=reaches.get(seat),heldKey=reach?'':p.held??''
   if(heldKey!==m.heldKey){m.held.clear();if(heldKey)m.held.add(food(heldKey));m.heldKey=heldKey}m.held.position.set(0,.75,.48)
   const handTarget=new THREE.Vector3(0,.75,.47)
   if(reach){const station=STATIONS.find(s=>s.id===reach.station)!,t=THREE.MathUtils.clamp((frame.clock-reach.began)/580,0,1),u=reach.kind==='pickup'?smooth((t-.22)/.65):smooth((t-.08)/.67)
    const surface=station.type==='chop'?1.08:station.type==='source'?1.39:station.type==='sink'?.91:1.012,foodHeight=reach.item.startsWith('raw:')&&station.type!=='source'?(reach.item.includes('onion')?.205:.18):0
    const start=new THREE.Vector3(station.x,surface+foodHeight,station.y),end=new THREE.Vector3(Math.sin(m.angle)*.48+p.x,.75,Math.cos(m.angle)*.48+p.y),blend=reach.kind==='pickup'?u:1-u,pos=start.clone().lerp(end,blend);pos.y+=Math.sin(u*Math.PI)*.18
    let transfer=transfers.get(seat);const k=reach.item+reach.id
    if(!transfer||transfer.key!==k){if(transfer)scene.remove(transfer.root);transfer={root:food(reach.item),key:k};transfers.set(seat,transfer);scene.add(transfer.root)}transfer.root.position.copy(pos);transfer.root.visible=true
    m.root.updateMatrixWorld(true)
    const contact=reach.kind==='pickup'&&t<.22?end.clone().lerp(start,smooth(t/.22)):reach.kind==='place'&&t>.75?end.clone().lerp(start,1-smooth((t-.75)/.25)):pos
    handTarget.copy(m.body.worldToLocal(contact.clone()))
   }else if(transfers.has(seat))transfers.get(seat)!.root.visible=false
   for(let i=0;i<2;i++){const d=i?1:-1,hand=m.hands[i],shoulder=new THREE.Vector3(d*.29,.78,0)
    if(reach||p.held)hand.position.set(handTarget.x+d*.19,handTarget.y,handTarget.z)
    else hand.position.set(d*.4,.56,step*d*.12)
    const delta=hand.position.clone().sub(shoulder),arm=m.arms[i];arm.position.copy(shoulder).addScaledVector(delta,.5);arm.scale.y=delta.length()/.35;arm.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize())
   }
  }
  for(const [seat,m] of chefs)m.root.visible=!!frame.players[seat]
  renderer.render(scene,camera)
 }
 return {update,dispose(){observer.disconnect();for(const g of geometries.values())g.dispose();for(const m of materials.values())m.dispose();for(const model of stations.values())for(const puff of model.steam)(puff.material as THREE.Material).dispose();for(const m of meterMaterials.values())m.dispose();for(const r of meterResources){r.texture.dispose();r.material.dispose()}renderer.dispose();renderer.forceContextLoss()}}
}
