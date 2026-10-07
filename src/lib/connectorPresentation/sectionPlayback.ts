import type { presentSentence } from './engine'
import { compileSentenceMaterial } from './sentenceMaterialGrowth'
import { germinatePlate } from './plateGermination'
import { germinateSavedTracks } from './markerGermination'
import { followSavedRibbon } from './savedRibbonArrival'
import { connectionSeed } from './leftWordGermination'
import { CONNECTOR_RAIL_LAYOUT } from './layout'

/** Preserve each material boundary: completing a frond unlocks its receiver. */
export function compileSectionPlayback(sentence: Pick<ReturnType<typeof presentSentence>, 'words' | 'groups'>) {
  const scale = 4, face = CONNECTOR_RAIL_LAYOUT.connectionWidth
  let clock = 0
  const groups = sentence.groups.map(indices => {
    let advance = 0
    const positions = indices.map(index => {
      const word = sentence.words[index], x = advance
      advance += word.layout.slotWidth + word.layout.gapAfter
      return { index, word, x, material: compileSentenceMaterial(word) }
    })
    const width = Math.ceil((advance - positions.at(-1)!.word.layout.gapAfter + face) * scale)
    const height = CONNECTOR_RAIL_LAYOUT.storyHeight * scale
    const pieces = positions.map(({word,x,material}, position) => {
      const {artwork,width:tileWidth,height:tileHeight}=material
      const mask=new Uint8ClampedArray(artwork.data)
      for(let i=3;i<mask.length;i+=4)mask[i]=mask[i]>=128?255:0
      const seen=new Uint8Array(tileWidth*tileHeight), islands:number[][]=[]
      for(let first=0;first<seen.length;first++) {
        if(seen[first]||!mask[first*4+3])continue
        const cells=[first];seen[first]=1
        for(let head=0;head<cells.length;head++) {
          const i=cells[head],xx=i%tileWidth,yy=Math.floor(i/tileWidth)
          for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            const nx=xx+dx,ny=yy+dy,j=ny*tileWidth+nx
            if(nx<0||nx>=tileWidth||ny<0||ny>=tileHeight||seen[j]||!mask[j*4+3])continue
            seen[j]=1;cells.push(j)
          }
        }
        islands.push(cells)
      }
      islands.sort((a,b)=>b.length-a.length)
      for(const island of islands.slice(1)) {
        if(island.length>9)throw new Error(`The ${word.text} material has a detached region (${island.length}).`)
        for(const i of island)mask[i*4+3]=0
      }
      let seed:number
      if(position===0) {
        seed=germinatePlate(mask,tileWidth,tileHeight,{x:face/2*scale,y:tileHeight-1}).seed
      } else {
        const previous=positions[position-1]
        const contact=new Uint8Array(tileWidth*tileHeight)
        const offset=Math.round((x-previous.x)*scale)
        for(let yy=0;yy<tileHeight;yy++)for(let xx=0;xx<tileWidth;xx++) {
          const i=yy*tileWidth+xx
          if(!mask[i*4+3])continue
          contact[i]=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>{
            const px=xx+offset+dx,py=yy+dy
            return px>=0&&px<previous.material.width&&py>=0&&py<previous.material.height&&previous.material.artwork.data[(py*previous.material.width+px)*4+3]>=128
          })?1:0
        }
        seed=connectionSeed(mask,tileWidth,tileHeight,contact,{x:tileWidth-face*scale/2-1,y:(tileHeight-1)/2})
      }
      const p=word.presentation
      const tracks=[]
      for(const [piece,center] of [[p.incomingJoin,word.layout.leftConnectorCenter],[p.face,word.layout.connectorCenter],[p.internalMaterial?.face,word.layout.blockWidth*(p.internalMaterial?.fraction??0)]] as const) {
        if(!piece||piece.status!=='ready'||!['fat-wave','skinny-wave'].includes(piece.blueprintId))continue
        const [vx,vy,vw]=piece.drawing.viewBox.split(/\s+/).map(Number)
        tracks.push({path:piece.drawing.path,scale:face*scale/vw,minX:vx*face*scale/vw-center*scale,minY:vy*face*scale/vw,ribbon:piece.drawing.drawing.fill===p.materialColor,left:center*scale,right:(center+face)*scale})
      }
      const flow=(()=>{try{return germinateSavedTracks(artwork.data,tileWidth,tileHeight,seed,tracks)}catch(e){throw new Error(`${word.text}: ${e instanceof Error?e.message:String(e)}`)}})()
      for(const track of tracks)if(track.ribbon)followSavedRibbon(artwork.data,tileWidth,tileHeight,flow,track)
      // Constant traversal speed, with enough time to read a short frond.
      const duration=Math.max(2400,(flow.maximum+2)/scale*45)
      const start=clock;clock+=duration
      return {x,word,artwork,width:tileWidth,height:tileHeight,flow,start,duration}
    })
    return {indices,width,height,pieces}
  })
  return {groups:groups.map(({indices,width,height})=>({indices,width,height})),durationMs:clock,
    frame(elapsed:number,reduced=false,empty=false) {
      return {complete:reduced||empty||elapsed>=clock,groups:groups.map(g=>{
        const image=new ImageData(new Uint8ClampedArray(g.width*g.height*4),g.width,g.height)
        const reveals=g.pieces.map(piece=>{
          const progress=empty||reduced?1:Math.max(0,Math.min(1,(elapsed-piece.start)/piece.duration))
          const reached=progress*(piece.flow.maximum+2)
          const offset=Math.round(piece.x*scale)
          for(let y=0;y<piece.height;y++)for(let x=0;x<piece.width;x++){
            const i=y*piece.width+x,j=y*g.width+x+offset
            const alpha=piece.artwork.data[i*4+3]*(progress>=1?1:Math.max(0,Math.min(1,(reached-piece.flow.distances[i])/2)))*(empty?.13:1)
            if(!alpha)continue
            const a=alpha/255,b=image.data[j*4+3]/255,out=a+b*(1-a)
            for(let c=0;c<3;c++)image.data[j*4+c]=(piece.artwork.data[i*4+c]*a+image.data[j*4+c]*b*(1-a))/out
            image.data[j*4+3]=out*255
          }
          if(progress>=1)return 1
          let reachedX=0
          const start=Math.round(face/2*scale),end=Math.min(piece.width,Math.round((face/2+piece.word.layout.slotWidth)*scale))
          for(let x=start;x<end;x++)if(piece.flow.distances[(piece.height-1)*piece.width+x]+2<=reached)reachedX=x-start+1
          return reachedX/Math.max(1,end-start)
        })
        return {image,reveals}
      })}
    }
  }
}
