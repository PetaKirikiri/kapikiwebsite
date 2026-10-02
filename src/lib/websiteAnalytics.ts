import { studentClient } from './studentPortal/client'
let installed = false
export function installWebsiteAnalytics() {
  if (installed || typeof window === 'undefined' || navigator.doNotTrack === '1') return
  installed=true
  let visitor: string=crypto.randomUUID(),session: string=crypto.randomUUID(),lastActivity=0,token: string | undefined
  try { visitor=localStorage.getItem('ka-piki-visitor') || visitor; localStorage.setItem('ka-piki-visitor',visitor) } catch { /* Memory-only visitor when storage is blocked. */ }
  let lastPath='',lastTime=0
  const track=() => {
    const hash=location.hash.split('?')[0]
    if (hash.includes('=') || !/^#[a-z0-9/_-]*$/i.test(hash || '#')) return
    const tab=new URLSearchParams(location.hash.split('?')[1]).get('tab')
    const path=location.pathname+hash+(tab && ['structures','vocabulary','stories','practice'].includes(tab)?`?tab=${tab}`:'')
    const now=Date.now()
    if(path===lastPath && now-lastTime<1000) return
    lastPath=path;lastTime=now
    try {
      const stored=JSON.parse(sessionStorage.getItem('ka-piki-visit-session') || 'null')
      if(stored && now-stored.at<1800000) session=stored.id
      else if(now-lastActivity>1800000) session=crypto.randomUUID()
      sessionStorage.setItem('ka-piki-visit-session',JSON.stringify({id:session,at:now}))
    } catch { if(now-lastActivity>1800000) session=crypto.randomUUID() }
    lastActivity=now
    let referrer='';try { if(document.referrer) referrer=new URL(document.referrer).origin } catch { /* No referrer. */ }
    const body=JSON.stringify({id:crypto.randomUUID(),visitor,session,path,referrer,device:innerWidth<600?'phone':innerWidth<1000?'tablet':'desktop'})
    void fetch('/__analytics',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body,keepalive:true}).catch(()=>{})
  }
  window.addEventListener('hashchange',track)
  window.addEventListener('popstate',track)
  if(studentClient) {
    studentClient.auth.onAuthStateChange((_event, session)=>{ token=session?.access_token })
    void studentClient.auth.getSession().then(({data})=>{token=data.session?.access_token;track()}).catch(track)
  } else track()
}
