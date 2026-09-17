let context:AudioContext|null=null
export function kitchenSound(kind:'pickup'|'place'|'error'|'serve',muted:boolean){
 if(muted)return
 try{
  context??=new AudioContext()
  void context.resume()
  const notes=kind==='serve'?[523,659,784]:kind==='error'?[180,140]:kind==='pickup'?[660,880]:[330]
  notes.forEach((frequency,i)=>{
   const oscillator=context!.createOscillator(),gain=context!.createGain(),start=context!.currentTime+i*.065
   oscillator.type=kind==='error'?'sine':'triangle';oscillator.frequency.setValueAtTime(frequency,start)
   gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.035,start+.008);gain.gain.exponentialRampToValueAtTime(.001,start+.12)
   oscillator.connect(gain);gain.connect(context!.destination);oscillator.start(start);oscillator.stop(start+.14)
  })
 }catch{/* Audio is optional when a device cannot create an output context. */}
}
