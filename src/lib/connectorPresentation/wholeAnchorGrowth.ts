import type { ConnectorFacePlan } from './presentation'
import { germinatePlate } from './plateGermination'
import { platePaintArrival } from './platePaintArrival'

/** Approved-source-derived composition. Saved paths remain unchanged.
 * Rasterize once as one material, then grow through connected material only.
 * No body/arm timelines, source path deformation, or rectangular reveal.
 */
type Direction = readonly [number, number]

/** Thin the fused material itself, retaining its topology. No face samples,
 * shortest-path fan, or piece labels participate in this centreline. */
export function buildPlateTracks(alpha: Uint8ClampedArray, width: number, height: number) {
  const { seed, parents: materialParents, distances } = connectedDistances(alpha, width, height)
  const material = Uint8Array.from({ length: width * height }, (_, i) => alpha[i * 4 + 3] ? 1 : 0)
  const track = material.slice()
  const at = (x: number, y: number) => x<0||y<0||x>=width||y>=height ? 0 : track[y*width+x]
  let changed = true
  while (changed) {
    changed = false
    for (let pass=0;pass<2;pass++) {
      const remove: number[] = []
      for (let y=0;y<height;y++) for (let x=0;x<width;x++) {
        const i=y*width+x
        if (!track[i]) continue
        const p=[at(x,y-1),at(x+1,y-1),at(x+1,y),at(x+1,y+1),
          at(x,y+1),at(x-1,y+1),at(x-1,y),at(x-1,y-1)]
        const count=p.reduce((a,b)=>a+b,0)
        const transitions=p.reduce((a,v,j)=>a+(!v&&p[(j+1)%8]?1:0),0)
        if (count<2||count>6||transitions!==1) continue
        if (pass===0 ? (p[0]*p[2]*p[4] || p[2]*p[4]*p[6])
          : (p[0]*p[2]*p[6] || p[0]*p[4]*p[6])) continue
        remove.push(i)
      }
      if (remove.length) changed=true
      for (const i of remove) track[i]=0
    }
  }
  // Keep the principal continuous route; thinning can leave short dead-end
  // spokes toward rectangular corners, which are not useful growth tracks.
  const walk = (start: number) => {
    const queue=[start], parent=new Int32Array(track.length).fill(-1)
    parent[start]=start
    for(let head=0;head<queue.length;head++) {
      const i=queue[head],x=i%width,y=Math.floor(i/width)
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++) {
        const xx=x+dx,yy=y+dy,j=yy*width+xx
        if(xx<0||yy<0||xx>=width||yy>=height||!track[j]||parent[j]>=0)continue
        parent[j]=i;queue.push(j)
      }
    }
    return {end:queue[queue.length-1],parent}
  }
  const first=track.findIndex(on=>!!on)
  const end=walk(first).end, spine=walk(end)
  track.fill(0)
  for(let i=spine.end;;i=spine.parent[i]) {track[i]=1;if(i===end)break}
  // Only one entrance joins the bottom seed to the thinned plate.
  let entrance=-1, nearest=Infinity
  track.forEach((on,i)=>{if(on&&distances[i]<nearest){nearest=distances[i];entrance=i}})
  while(entrance>=0&&!track[seed]) {
    track[entrance]=1
    if(entrance===seed) break
    entrance=materialParents[entrance]
  }
  const parents=new Int32Array(track.length).fill(-1), queue=[seed]
  const seen=new Uint8Array(track.length);seen[seed]=1
  for(let head=0;head<queue.length;head++) {
    const i=queue[head],x=i%width,y=Math.floor(i/width)
    for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) {
      const xx=x+dx,yy=y+dy,j=yy*width+xx
      if(xx<0||yy<0||xx>=width||yy>=height||!track[j]||seen[j])continue
      seen[j]=1;parents[j]=i;queue.push(j)
    }
  }
  if(track.some((on,i)=>on&&!seen[i]))throw new Error('Plate centreline is disconnected.')
  return { width, height, material, seed, track, parents }
}
/** Travel along an arm is cheaper than cutting across it. Every arrival still
 * comes from a reached neighbour in the single composed silhouette.
 */
export function connectedDistances(alpha: Uint8ClampedArray, width: number, height: number,
  directions?: readonly Direction[], gates?: Float64Array,
  origin = { x: (width - 1) / 2, y: height - 1 }) {
  const distances = new Float64Array(width * height).fill(Infinity)
  const parents = new Int32Array(width * height).fill(-1)
  const heap: { index: number; distance: number }[] = []
  const push = (item: typeof heap[number]) => {
    let i = heap.length
    heap.push(item)
    while (i > 0) {
      const p = (i - 1) >> 1
      if (heap[p].distance <= item.distance) break
      heap[i] = heap[p]; i = p
    }
    heap[i] = item
  }
  const pop = () => {
    const first = heap[0], last = heap.pop()!
    if (heap.length) {
      let i = 0
      while (i * 2 + 1 < heap.length) {
        let c = i * 2 + 1
        if (c + 1 < heap.length && heap[c + 1].distance < heap[c].distance) c++
        if (heap[c].distance >= last.distance) break
        heap[i] = heap[c]; i = c
      }
      heap[i] = last
    }
    return first
  }
  let seed = -1, nearest = Infinity, maximum = 0
  for (let i = 0; i < distances.length; i++) {
    if (!alpha[i * 4 + 3]) continue
    const d = (i % width - origin.x) ** 2 + (Math.floor(i / width) - origin.y) ** 2
    if (d < nearest) { nearest = d; seed = i }
  }
  if (seed < 0) throw new Error('The composed anchor is empty.')
  distances[seed] = 0; push({ index: seed, distance: 0 })
  const neighbours = [-1, 0, 1].flatMap(dy => [-1, 0, 1].filter(dx => dx || dy).map(dx => [dx, dy] as const))
  while (heap.length) {
    const item = pop(), i = item.index
    if (item.distance !== distances[i]) continue
    const x = i % width, y = Math.floor(i / width)
    for (const [dx, dy] of neighbours) {
      const xx = x + dx, yy = y + dy
      if (xx < 0 || xx >= width || yy < 0 || yy >= height) continue
      const next = yy * width + xx
      if (!alpha[next * 4 + 3]) continue
      if (dx && dy && (!alpha[(y * width + xx) * 4 + 3] || !alpha[(yy * width + x) * 4 + 3])) continue
      const length = Math.hypot(dx, dy)
      const direction = directions?.[i]
      const across = direction ? Math.abs(dx * direction[1] - dy * direction[0]) / length : 0
      const cost = length * (1 + 3 * across * across)
      const arrival = Math.max(item.distance + cost, gates?.[next] ?? 0)
      if (arrival >= distances[next]) continue
      distances[next] = arrival; parents[next] = i
      push({ index: next, distance: arrival })
    }
  }
  for (let i = 0; i < distances.length; i++) {
    if (alpha[i * 4 + 3] > 128 && !Number.isFinite(distances[i])) throw new Error('The saved anchor contains disconnected material.')
    if (Number.isFinite(distances[i])) maximum = Math.max(maximum, distances[i])
  }
  return { distances, maximum, seed, parents }
}

/** Construction memory only: stamp ordered paired-edge strips into a timing
 * field. The artwork is never split or redrawn. Earliest coverage wins where
 * the saved spiral overlaps itself. Pixel-centre tests avoid blended ID dust.
 */
function rememberTrack(path: string, offset: number, face: number, width: number,
  gates: Float64Array) {
  const points = [...path.split('Z')[0].matchAll(/[ML]\s*([+-]?[\d.]+)\s+([+-]?[\d.]+)/g)]
    .map(m => [offset + Number(m[1]) * face / 96, Number(m[2]) * face / 96] as const)
  const n = points.length / 2
  if (!Number.isInteger(n) || n < 4) throw new Error('Saved paired edges are unavailable.')
  type Point = readonly [number, number]
  const inside = (p: Point) => p[0] >= offset && p[0] <= offset + face && p[1] >= 0 && p[1] <= face
  const cross = (a: Point, b: Point, x: number, y: number) => (b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0])
  const triangle = (a: Point, b: Point, c: Point, arrival: number,
    stemStart: Point, stemEnd: Point) => {
    if (Math.abs(cross(a,b,c[0],c[1])) < 1e-8) return
    const minX = Math.max(offset, Math.floor(Math.min(a[0],b[0],c[0])))
    const maxX = Math.min(offset+face-1, Math.ceil(Math.max(a[0],b[0],c[0])))
    const minY = Math.max(0, Math.floor(Math.min(a[1],b[1],c[1])))
    const maxY = Math.min(face-1, Math.ceil(Math.max(a[1],b[1],c[1])))
    for(let y=minY;y<=maxY;y++) for(let x=minX;x<=maxX;x++) {
      const u=cross(a,b,x+.5,y+.5), v=cross(b,c,x+.5,y+.5), w=cross(c,a,x+.5,y+.5)
      if ((u>=0&&v>=0&&w>=0)||(u<=0&&v<=0&&w<=0)) {
        const index=y*width+x
        // A reached stem feeds outward, rather than releasing the entire
        // cross-section at once. The connected solver still requires an
        // earlier material neighbour, including around all negative space.
        const dx=stemEnd[0]-stemStart[0], dy=stemEnd[1]-stemStart[1]
        const lengthSquared=dx*dx+dy*dy
        const t=lengthSquared ? Math.max(0,Math.min(1,
          ((x+.5-stemStart[0])*dx+(y+.5-stemStart[1])*dy)/lengthSquared)) : 0
        const lateral=Math.hypot(x+.5-stemStart[0]-t*dx,y+.5-stemStart[1]-t*dy)
        gates[index]=Math.min(gates[index],arrival+lateral*2)
      }
    }
  }
  let travel=0
  for(let i=n-2;i>=0;i--) {
    const a=points[i+1], b=points[points.length-2-i]
    const c=points[i], d=points[points.length-1-i]
    if(inside(a)||inside(b)||inside(c)||inside(d)) {
      travel+=(Math.hypot(c[0]-a[0],c[1]-a[1])+Math.hypot(d[0]-b[0],d[1]-b[1]))/2
    }
    const stemStart: Point=[(a[0]+b[0])/2,(a[1]+b[1])/2]
    const stemEnd: Point=[(c[0]+d[0])/2,(c[1]+d[1])/2]
    triangle(a,b,c,travel*3,stemStart,stemEnd)
    triangle(b,d,c,travel*3,stemStart,stemEnd)
  }
}

/** Tangents come from the saved wave's paired contour, not screen coordinates. */
function waveRoute(path: string, offset: number, face: number) {
  const points = [...path.split('Z')[0].matchAll(/[ML]\s*([+-]?[\d.]+)\s+([+-]?[\d.]+)/g)]
    .map(m => [Number(m[1]), Number(m[2])] as const)
  const n = points.length / 2
  if (!Number.isInteger(n) || n < 4) throw new Error('Saved wave route is unavailable.')
  const route: { x: number; y: number; direction: Direction }[] = []
  const step = Math.max(1, Math.floor(n / 250))
  for (let i = n - 2; i > 0; i -= step) {
    const a = points[i], b = points[points.length - 1 - i]
    const aa = points[i - 1], bb = points[points.length - i]
    const x = (a[0] + b[0]) / 2, y = (a[1] + b[1]) / 2
    if (x < 0 || x > 96 || y < 0 || y > 96) continue
    const dx = aa[0] + bb[0] - a[0] - b[0], dy = aa[1] + bb[1] - a[1] - b[1]
    const length = Math.hypot(dx, dy)
    if (length) route.push({ x: offset + x * face / 96, y: y * face / 96, direction: [dx / length, dy / length] })
  }
  return route
}

export function composeWholeAnchor(left: ConnectorFacePlan, right: ConnectorFacePlan, color: string, staticOnly = false, bodyWidth = 50) {
  if (left.status !== 'ready' || right.status !== 'ready') throw new Error('Approved anchor faces are unavailable.')
  const scale = 3, face = 40, body = bodyWidth, width = (face * 2 + body) * scale, height = face * scale
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.fillStyle = color
  ctx.fillRect(face, 0, body, face)
  for (const [plan, x] of [[left, 0], [right, face + body]] as const) {
    ctx.save()
    ctx.beginPath(); ctx.rect(x, 0, face, face); ctx.clip()
    if (plan.background === color) { ctx.fillStyle = color; ctx.fillRect(x, 0, face, face) }
    ctx.translate(x, 0)
    ctx.scale(face / 96, face / 96)
    ctx.globalCompositeOperation = plan.drawing.drawing.fill === color ? 'source-over' : 'destination-out'
    ctx.fillStyle = color
    ctx.fill(new Path2D(plan.drawing.path))
    ctx.restore()
  }
  const source = ctx.getImageData(0, 0, width, height)
  if (staticOnly) {
    // Inspection only: retain both original ribbon edges before overlapping
    // turns are flattened into the visible silhouette. These are source
    // coordinates, not a skeleton or a newly drawn centreline.
    const walls = document.createElement('canvas')
    walls.width = width; walls.height = height
    const wallContext = walls.getContext('2d')!
    wallContext.strokeStyle = '#922b65'
    wallContext.lineWidth = 1.8
    for (const [plan, offset] of [[left, 0], [right, (face + body) * scale]] as const) {
      const points = [...plan.drawing.path.split('Z')[0].matchAll(/[ML]\s*([+-]?[\d.]+)\s+([+-]?[\d.]+)/g)]
        .map(m => [offset + Number(m[1]) * face * scale / 96, Number(m[2]) * face * scale / 96] as const)
      const half = points.length / 2
      if (!Number.isInteger(half) || half < 4) throw new Error('Original pipe edges are unavailable.')
      wallContext.save()
      wallContext.beginPath(); wallContext.rect(offset, 0, face * scale, height); wallContext.clip()
      // The concave saved edge is the continuing pipe wall. The other edge
      // already belongs to the fused outside boundary; overlaying both adds
      // intersecting construction loops rather than a usable passage.
      const edge = points.slice(0, half).reverse()
      const filled = ([x,y]: readonly [number,number]) => {
        const xx=Math.floor(x), yy=Math.floor(y)
        return xx>=offset&&xx<offset+face*scale&&yy>=0&&yy<height&&source.data[(yy*width+xx)*4+3]>=128
      }
      let start=edge.length-1
      while(start>0&&filled(edge[start])) start--
      const retained: (readonly [number,number])[]=[]
      const travel: number[]=[]
      let length=0
      for(let i=start;i<edge.length;i++) {
        const p=edge[i], previous=retained.at(-1)
        if(previous) {
          const step=Math.hypot(p[0]-previous[0],p[1]-previous[1])
          if(step<.5)continue
          length+=step
          // Stop before a turn closes onto earlier pipe wall; leave the end
          // open into its terminal material instead of creating a sealed ring.
          if(retained.some((q,j)=>length-travel[j]>8&&Math.hypot(p[0]-q[0],p[1]-q[1])<2.5))break
        }
        retained.push(p);travel.push(length)
      }
      wallContext.beginPath()
      retained.forEach(([x,y],i) => i ? wallContext.lineTo(x,y) : wallContext.moveTo(x,y))
      wallContext.stroke()
      wallContext.restore()
    }
    const pipeWalls = wallContext.getImageData(0, 0, width, height)
    for (let i=0;i<width*height;i++) pipeWalls.data[i*4+3] *= source.data[i*4+3] / 255
    const liquid = new Uint8ClampedArray(source.data)
    for (let i=0;i<width*height;i++) liquid[i*4+3] =
      source.data[i*4+3]>=128 && pipeWalls.data[i*4+3]<64 ? 255 : 0
    let continuous = true
    const seen = new Uint8Array(width*height), components: number[][] = []
    for(let i=0;i<seen.length;i++) {
      if(seen[i]||!liquid[i*4+3])continue
      const cells=[i];seen[i]=1
      for(let head=0;head<cells.length;head++) {
        const p=cells[head],x=p%width,y=Math.floor(p/width)
        for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const xx=x+dx,yy=y+dy,j=yy*width+xx
          if(xx<0||xx>=width||yy<0||yy>=height||seen[j]||!liquid[j*4+3])continue
          seen[j]=1;cells.push(j)
        }
      }
      components.push(cells)
    }
    components.sort((a,b)=>b.length-a.length)
    // Stroke antialiasing can leave isolated liquid slivers smaller than one
    // displayed pixel. Seal those into the wall, not into independent pools.
    // Larger pockets remain a hard failure rather than being hidden.
    for(const pocket of components.slice(1)) {
      if(pocket.length>scale*scale)continue
      for(const i of pocket) {
        liquid[i*4+3]=0
        pipeWalls.data.set([146,43,101,255],i*4)
      }
    }
    continuous=components.slice(1).every(pocket=>pocket.length<=scale*scale)
    if (!continuous) throw new Error('Pipe wall leaves a detached pocket — not ready for filling.')
    // One colony in one allowed area. This propagation receives no source
    // faces, route labels, directional field, gates, or section timings.
    const growth = germinatePlate(liquid, width, height)
    const paint = platePaintArrival(source.data, width, height, growth.distances)
    const growing = new ImageData(new Uint8ClampedArray(source.data), width, height)
    const plate = {
      width, height,
      pipeWalls,
      continuous,
      fillable: Uint8Array.from({length:width*height},(_,i)=>liquid[i*4+3]?1:0),
      material: Uint8Array.from({ length: width * height }, (_, i) => source.data[i * 4 + 3] >= 128 ? 1 : 0),
    }
    return { width, height, seed: growth.seed, plate, frame: (progress: number) => {
      const reached = Math.max(0, Math.min(1, progress)) * (paint.maximum + 2)
      for(let i=0;i<width*height;i++) {
        const coverage = Math.max(0,Math.min(1,(reached-paint.distances[i])/2))
        growing.data[i*4+3] = source.data[i*4+3]*coverage
      }
      return growing
    } }
  }
  const routes = [...waveRoute(left.drawing.path, 0, face * scale),
    ...waveRoute(right.drawing.path, (face + body) * scale, face * scale)]
  const directions: Direction[] = Array.from({ length: width * height }, (_, i) => {
    const x = i % width, y = Math.floor(i / width)
    if (x >= face * scale && x < (face + body) * scale) {
      // Let the central front round out; directional guidance begins only
      // where the saved arm supplies an actual curve tangent.
      return [0, 0]
    }
    let nearest = Infinity, tangent: Direction = [0, -1]
    for (const point of routes) {
      const d = (point.x - x) ** 2 + (point.y - y) ** 2
      if (d < nearest) { nearest = d; tangent = point.direction }
    }
    return tangent
  })
  // Preserve the source-derived route as construction memory, fused into one
  // connected network inside the stamped silhouette. Rendering stays static.
  const gates = new Float64Array(width * height).fill(Infinity)
  rememberTrack(left.drawing.path, 0, face * scale, width, gates)
  rememberTrack(right.drawing.path, (face + body) * scale, face * scale, width, gates)
  for (let i=0;i<gates.length;i++) if (!Number.isFinite(gates[i])) gates[i]=0
  const { distances, maximum, seed } = connectedDistances(source.data, width, height, directions, gates)
  const output = new ImageData(new Uint8ClampedArray(source.data), width, height)
  return {
    width, height, seed,
    frame(progress: number) {
      const reached = progress * (maximum + 3)
      for (let i = 0; i < distances.length; i++) {
        const t = progress >= 1 ? 1 : progress <= 0 || distances[i] < 0 ? 0
          : Math.max(0, Math.min(1, (reached - distances[i]) / 3))
        output.data[i * 4 + 3] = source.data[i * 4 + 3] * t * t * (3 - 2 * t)
      }
      return output
    },
  }
}
