import * as pc from 'playcanvas'

export function createHouseScene(canvas: HTMLCanvasElement, inspect: (label: string) => void) {
  const app = new pc.Application(canvas, { graphicsDeviceOptions: { antialias: true, alpha: false } })
  app.setCanvasResolution(pc.RESOLUTION_AUTO)
  app.graphicsDevice.maxPixelRatio = Math.min(devicePixelRatio, 2)
  app.scene.ambientLight = new pc.Color(.68, .72, .73)
  const materials: pc.StandardMaterial[] = []
  const material = (hex: string) => {
    const m = new pc.StandardMaterial(); m.diffuse = new pc.Color().fromString(hex); m.gloss = 15; m.update(); materials.push(m); return m
  }
  const cream = material('#e9e3d4'), wood = material('#bb8960'), dark = material('#263d47'), white = material('#faf5e8'), teal = material('#447f79'), pink = material('#bf7584'), blue = material('#5293b6'), gold = material('#dca94e'), skin = material('#c68e67'), hair = material('#45342e'), glass = material('#a4d9db'), leaf = material('#61844a')
  function shape(parent: pc.Entity, type: 'box'|'sphere'|'cylinder'|'capsule', mat: pc.StandardMaterial, x:number,y:number,z:number,sx:number,sy:number,sz:number) {
    const e = new pc.Entity(); e.addComponent('render', { type, material: mat, castShadows:true, receiveShadows:true }); e.setLocalPosition(x,y,z); e.setLocalScale(sx,sy,sz); parent.addChild(e); return e
  }
  const root = app.root
  shape(root,'box',wood,0,-.18,0,12,.35,9)
  for(let i=0;i<15;i++) shape(root,'box',cream,0,.003,-4.3+i*.6,11.9,.015,.018)
  shape(root,'box',cream,0,1.6,-4.5,12,3.2,.2)
  shape(root,'box',cream,-6,1.6,0,.2,3.2,9)
  shape(root,'box',white,0,.14,-4.32,12,.24,.09)
  shape(root,'box',white,-5.86,.14,0,.09,.24,9)
  // Window and framed artwork.
  shape(root,'box',white,-2,2.05,-4.33,2.8,1.65,.1)
  shape(root,'box',glass,-2,2.05,-4.25,2.56,1.41,.06)
  shape(root,'box',white,-2,2.05,-4.18,.07,1.5,.08)
  shape(root,'box',white,-2,2.05,-4.18,2.6,.07,.08)
  shape(root,'box',wood,2.1,2.12,-4.28,1.2,1.5,.08)
  shape(root,'box',pink,2.1,2.12,-4.21,1.04,1.34,.06)
  shape(root,'sphere',gold,2.1,2.25,-4.13,.57,.57,.035)
  // Living room rug and sofa.
  shape(root,'box',teal,-2,.035,1.8,4.6,.04,3.1)
  shape(root,'box',pink,-3.5,.45,2.6,2.8,.7,1)
  shape(root,'box',pink,-3.5,.95,3,2.8,1.2,.25)
  for(const x of [-4.9,-2.1]) shape(root,'box',pink,x,.7,2.6,.25,1,1.2)
  shape(root,'box',white,-3.5,.83,2.55,1,.15,.8)
  shape(root,'box',wood,-1.1,.55,2.1,1.15,.13,1.3)
  shape(root,'cylinder',white,-1.1,.7,2.1,.23,.25,.23)
  // Desk and computer.
  shape(root,'box',wood,-3.7,1,-2.8,2.7,.16,1.2)
  for(const x of [-4.8,-2.6])for(const z of [-3.2,-2.4])shape(root,'box',dark,x,.5,z,.12,1,.12)
  shape(root,'box',dark,-3.7,1.65,-3,1.3,.86,.1)
  shape(root,'box',glass,-3.7,1.65,-2.93,1.15,.7,.03)
  shape(root,'box',dark,-3.7,1.2,-3,.1,.35,.12)
  shape(root,'box',white,-3.7,1.1,-2.43,1,.05,.35)
  for(let i=0;i<6;i++)shape(root,'box',teal,-4.15+i*.17,1.13,-2.43,.08,.015,.22)
  // Kitchen bench, sink, dishes.
  shape(root,'box',teal,3.6,.65,-3.65,4.2,1.3,1.2)
  shape(root,'box',white,3.6,1.35,-3.65,4.4,.14,1.4)
  for(const x of [2.4,3.6,4.8]){shape(root,'box',cream,x,.68,-3.025,1.05,1.05,.04);shape(root,'box',dark,x,.95,-2.98,.35,.05,.05)}
  shape(root,'box',dark,3.1,1.44,-3.5,1.1,.04,.65)
  shape(root,'box',glass,3.1,1.47,-3.5,.88,.025,.5)
  shape(root,'cylinder',dark,3.1,1.72,-3.88,.06,.55,.06)
  shape(root,'box',dark,3.1,1.97,-3.7,.06,.06,.4)
  for(let i=0;i<3;i++)shape(root,'cylinder',white,4.5,1.47+i*.06,-3.55,.62,.045,.62)
  // Bathroom corner, mirror and basin.
  shape(root,'box',white,4,.04,2.15,3.3,.08,3.3)
  shape(root,'box',cream,5.65,1.5,2.15,.15,3,3.3)
  shape(root,'box',teal,5.3,.65,2.4,.65,1.3,1.6)
  shape(root,'box',white,5.2,1.34,2.4,1,.14,1.75)
  shape(root,'box',glass,5.07,1.43,2.4,.65,.04,1)
  shape(root,'box',dark,5.54,2.1,2.4,.08,1.15,1.45)
  shape(root,'box',glass,5.47,2.1,2.4,.035,1,1.3)
  // Plants.
  for(const [x,z] of [[-.5,-3.8],[-5,0],[5,4]]){shape(root,'cylinder',cream,x,.3,z,.5,.6,.5);shape(root,'cylinder',wood,x,.75,z,.06,.8,.06);for(let i=0;i<4;i++)shape(root,'sphere',leaf,x+Math.sin(i*2)*.2,1+i*.12,z+Math.cos(i*2)*.2,.55,.35,.45)}
  const actors: { root:pc.Entity; head:pc.Entity; arms:pc.Entity[]; legs:pc.Entity[]; name:string }[]=[]
  function person(x:number,z:number,color:pc.StandardMaterial,angle:number,name:string) {
    const p=new pc.Entity(name);root.addChild(p);p.setPosition(x,0,z);p.setEulerAngles(0,angle,0)
    shape(p,'capsule',color,0,1.1,0,.62,.8,.38)
    const head=new pc.Entity();p.addChild(head);head.setLocalPosition(0,1.77,0)
    shape(head,'sphere',skin,0,0,0,.48,.53,.44);shape(head,'sphere',hair,0,.15,.035,.5,.3,.45)
    for(const x of [-.105,.105]) shape(head,'sphere',dark,x,.015,-.215,.045,.045,.03)
    shape(head,'sphere',skin,0,-.055,-.25,.08,.09,.07)
    const arms=[-.4,.4].map(x=>{const a=new pc.Entity();p.addChild(a);a.setLocalPosition(x,1.39,0);shape(a,'capsule',color,0,-.2,0,.2,.48,.22);shape(a,'capsule',skin,0,-.48,-.04,.16,.3,.17);return a})
    const legs=[-.17,.17].map(x=>{const a=new pc.Entity();p.addChild(a);a.setLocalPosition(x,.8,0);shape(a,'capsule',dark,0,-.3,0,.23,.65,.24);shape(a,'box',white,0,-.69,-.065,.24,.14,.4);return a})
    const actor={root:p,head,arms,legs,name};actors.push(actor);return actor
  }
  const typing=person(-3.7,-1.95,blue,0,'Typing')
  const reading=person(-3.5,1.85,gold,180,'Reading')
  const washing=person(3.1,-2.35,teal,0,'Washing dishes')
  const brushing=person(4.05,2.4,pink,-90,'Brushing teeth')
  // Props move with the character, with distinct hand poses for each action.
  const book=shape(reading.root,'box',teal,0,1.25,-.58,.65,.08,.43);book.setLocalEulerAngles(-25,0,0)
  shape(reading.root,'box',white,0,1.29,-.58,.57,.025,.39)
  const plate=shape(washing.root,'cylinder',white,0,1.3,-.65,.5,.04,.5);plate.setLocalEulerAngles(60,0,0)
  const brush=shape(brushing.root,'box',blue,.12,1.68,-.34,.05,.05,.37)
  shape(brushing.root,'box',white,.12,1.7,-.51,.07,.07,.1)
  const camera=new pc.Entity();camera.addComponent('camera',{clearColor:new pc.Color().fromString('#e5ebe7'),projection:pc.PROJECTION_ORTHOGRAPHIC,orthoHeight:7.2,nearClip:.1,farClip:100});root.addChild(camera)
  let orbit=.68,elapsed=0,paused=false,selected=-1
  const setCamera=()=>{camera.setPosition(Math.sin(orbit)*15,13,Math.cos(orbit)*15);camera.lookAt(0,.6,0)};setCamera()
  const light=new pc.Entity();light.addComponent('light',{type:'directional',color:new pc.Color(1,.94,.83),intensity:1.5,castShadows:true,shadowDistance:35,shadowResolution:2048,normalOffsetBias:.04});light.setEulerAngles(45,35,0);root.addChild(light)
  const resize=()=>{app.resizeCanvas(canvas.clientWidth,canvas.clientHeight);camera.camera!.orthoHeight=Math.max(5.8,8/(canvas.clientWidth/canvas.clientHeight))};const observer=new ResizeObserver(resize);observer.observe(canvas)
  app.on('update',(dt:number)=>{
    if(paused)return;elapsed+=Math.min(dt,.05);const t=elapsed
    actors.forEach((a,i)=>{a.head.setLocalEulerAngles(i===1?18:Math.sin(t*1.2+i)*3,Math.sin(t*.8+i)*5,0);a.root.setLocalPosition(a.root.getLocalPosition().x,Math.sin(t*2+i)*.012,a.root.getLocalPosition().z)})
    typing.arms.forEach((a,i)=>a.setLocalEulerAngles(62+Math.sin(t*12+i*2)*7,0,i?8:-8))
    reading.arms.forEach((a,i)=>a.setLocalEulerAngles(65+Math.sin(t*1.3)*2,0,i?24:-24))
    washing.arms.forEach((a,i)=>a.setLocalEulerAngles(68+Math.sin(t*5+i)*13,Math.sin(t*4)*12,i?15:-15))
    plate.setLocalEulerAngles(60+Math.sin(t*4)*12,0,Math.sin(t*3)*10)
    brushing.arms[0].setLocalEulerAngles(12,0,-8);brushing.arms[1].setLocalEulerAngles(145,0,25+Math.sin(t*15)*8)
    brush.setLocalPosition(.12+Math.sin(t*15)*.045,1.68,-.34)
  })
  const click=(event:PointerEvent)=>{
    const rect=canvas.getBoundingClientRect();let best=-1,distance=70
    actors.forEach((a,i)=>{const pos=camera.camera!.worldToScreen(a.root.getPosition().clone().add(new pc.Vec3(0,1,0)));const d=Math.hypot(pos.x-(event.clientX-rect.left),pos.y-(event.clientY-rect.top));if(d<distance){distance=d;best=i}})
    if(best>=0){selected=best;inspect(actors[best].name)}
  };canvas.addEventListener('pointerup',click)
  app.start();resize()
  return { rotate:(direction:number)=>{orbit+=direction*.25;setCamera()},pause:(value:boolean)=>{paused=value},select:(index:number)=>{selected=index;inspect(actors[selected].name)},destroy:()=>{observer.disconnect();canvas.removeEventListener('pointerup',click);app.destroy();materials.forEach(m=>m.destroy())} }
}
