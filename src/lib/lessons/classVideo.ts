type Publication = { sessionId: string; seat: number }
type MediaReply = { sessionId: string; sessionDescription: RTCSessionDescriptionInit; tracks: { mid: string; trackName: string }[]; publications: Publication[] }
async function mediaRequest(room: string, op: string, values: Record<string, unknown> = {}): Promise<MediaReply> {
  const response = await fetch('/__classroom', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'lesson-media', room, op, ...values }), signal: AbortSignal.timeout(30_000) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Could not connect. Rejoin the call.')
  return data
}
function waitFor(pc: RTCPeerConnection, event: 'icegatheringstatechange' | 'connectionstatechange', ready: () => boolean) {
  return new Promise<void>((resolve, reject) => {
    const finish = (error?: Error) => { clearTimeout(timer); pc.removeEventListener(event, check); if(error)reject(error);else resolve() }
    const check = () => {
      if (ready()) finish()
      else if (['failed','closed'].includes(pc.connectionState)) finish(new Error('Connection lost. Rejoin the call.'))
    }
    const timer = setTimeout(() => finish(new Error('Connection timed out. Rejoin the call.')), 15_000)
    pc.addEventListener(event, check); check()
  })
}
type Peer = { pc: RTCPeerConnection; sessionId?: string; seat?: number }
export class ClassVideo {
  private closed = false
  private publisher?: Peer
  private remote = new Map<string, Peer>()
  private timer?: ReturnType<typeof setTimeout>
  private room: string
  private stream: MediaStream
  private onStream: (seat: number, stream: MediaStream | null) => void
  private onError: (message: string) => void
  constructor(room: string, stream: MediaStream, onStream: (seat: number, stream: MediaStream | null) => void, onError: (message: string) => void) {this.room=room;this.stream=stream;this.onStream=onStream;this.onError=onError}
  private peer() { return new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }], bundlePolicy: 'max-bundle' }) }
  private async release(peer: Peer) {
    peer.pc.close()
    if (peer.sessionId) await mediaRequest(this.room,'leave',{ sessionId: peer.sessionId }).catch(()=>{})
  }
  async start() {
    const peer: Peer = { pc: this.peer() }; this.publisher = peer
    const transceivers = this.stream.getTracks().map(track => peer.pc.addTransceiver(track,{ direction:'sendonly' }))
    await peer.pc.setLocalDescription(await peer.pc.createOffer())
    await waitFor(peer.pc,'icegatheringstatechange',()=>peer.pc.iceGatheringState==='complete')
    if (this.closed) return
    const result = await mediaRequest(this.room,'publish',{
      sessionDescription: peer.pc.localDescription,
      tracks: transceivers.map(t=>({mid:t.mid,trackName:t.sender.track?.kind==='video'?'camera':'microphone'})),
    })
    peer.sessionId = result.sessionId
    if (this.closed) { await this.release(peer); return }
    await peer.pc.setRemoteDescription(result.sessionDescription)
    for (const t of transceivers) {
      const params = t.sender.getParameters()
      if (params.encodings.length) {
        params.encodings[0].maxBitrate = t.sender.track?.kind==='video'?650_000:32_000
        await t.sender.setParameters(params)
      }
    }
    await waitFor(peer.pc,'connectionstatechange',()=>peer.pc.connectionState==='connected')
    if (this.closed) return
    peer.pc.addEventListener('connectionstatechange',()=>{
      if (peer.pc.connectionState==='failed' && !this.closed) { this.onError('Connection lost. Rejoin the call.'); this.stop() }
    })
    void this.poll()
  }
  private async receive(publication: Publication) {
    const peer: Peer = { pc:this.peer(), seat:publication.seat }
    this.remote.set(publication.sessionId,peer)
    const stream = new MediaStream()
    peer.pc.ontrack = event => { stream.addTrack(event.track); if (!this.closed) this.onStream(publication.seat,stream) }
    try {
      const result = await mediaRequest(this.room,'subscribe',{publisherId:publication.sessionId})
      peer.sessionId=result.sessionId
      if (this.closed) { await this.release(peer); return }
      await peer.pc.setRemoteDescription(result.sessionDescription)
      await peer.pc.setLocalDescription(await peer.pc.createAnswer())
      await waitFor(peer.pc,'icegatheringstatechange',()=>peer.pc.iceGatheringState==='complete')
      await mediaRequest(this.room,'answer',{sessionId:peer.sessionId,sessionDescription:peer.pc.localDescription})
      await waitFor(peer.pc,'connectionstatechange',()=>peer.pc.connectionState==='connected')
    } catch (error) {
      await this.release(peer); this.remote.delete(publication.sessionId)
      if (!this.closed) { this.onStream(publication.seat,null); throw error }
    }
  }
  private async poll() {
    if (this.closed) return
    try {
      await mediaRequest(this.room,'heartbeat',{sessionId:this.publisher?.sessionId})
      const { publications } = await mediaRequest(this.room,'list')
      if (this.closed) return
      for (const [id,peer] of this.remote) {
        if (!publications.some(p=>p.sessionId===id) || ['failed','closed'].includes(peer.pc.connectionState)) {
          this.remote.delete(id); if(peer.seat!==undefined) this.onStream(peer.seat,null); await this.release(peer)
        }
      }
      await Promise.all(publications.filter(p=>!this.remote.has(p.sessionId)).map(p=>this.receive(p)))
    } catch (error) { if (!this.closed) this.onError(error instanceof Error ? error.message : 'Connection lost. Rejoin the call.') }
    if (!this.closed) this.timer=setTimeout(()=>void this.poll(),5000)
  }
  stop() {
    this.closed=true; clearTimeout(this.timer)
    this.stream.getTracks().forEach(t=>t.stop())
    if(this.publisher) void this.release(this.publisher)
    this.remote.forEach(peer=>{ if(peer.seat!==undefined)this.onStream(peer.seat,null); void this.release(peer) });this.remote.clear()
  }
}
