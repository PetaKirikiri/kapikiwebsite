import { beforeEach, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { loadAccountInvitation, saveAccountInvitation, INVALID_SETUP_LINK } from './accountInvitation'

const token='a'.repeat(64)
const invitation={name:'A learner',email:'learner@example.com',userId:'student-1',tokenType:'invite',selectedLevel:2,registeredLevels:[2,3],departmentGroup:''}
const values={...invitation,name:'Updated learner',departmentGroup:'Policy',selectedLevel:3,password:'test-only-password'}
const rpc=vi.fn(),getUser=vi.fn(),verifyOtp=vi.fn(),updateUser=vi.fn(),refreshSession=vi.fn()
const client={rpc,auth:{getUser,verifyOtp,updateUser,refreshSession}} as unknown as SupabaseClient
const user={id:invitation.userId,email:invitation.email}
beforeEach(()=>{
  vi.resetAllMocks()
  rpc.mockImplementation(async name=>({data:name==='kp_account_invitation_details'?invitation:null,error:null}))
  getUser.mockResolvedValue({data:{user:null},error:null})
  verifyOtp.mockResolvedValue({data:{user},error:null})
  updateUser.mockResolvedValue({data:{user},error:null})
  refreshSession.mockResolvedValue({data:{user},error:null})
})
it('opens saved details without consuming the Auth token or changing a password',async()=>{
  expect(await loadAccountInvitation(client,token)).toEqual(invitation)
  expect(verifyOtp).not.toHaveBeenCalled();expect(updateUser).not.toHaveBeenCalled()
})
it('uses the verified recipient identity and keeps the password out of the details RPC',async()=>{
  await saveAccountInvitation(client,token,{...values,email:'tampered@example.com',userId:'wrong'} as typeof values)
  expect(verifyOtp).toHaveBeenCalledWith({token_hash:token,type:'invite'})
  expect(updateUser).toHaveBeenCalledWith({password:'test-only-password'})
  expect(rpc).toHaveBeenLastCalledWith('kp_complete_account_invitation',{setup_token:token,student_name:'Updated learner',department_group:'Policy',chosen_level:3})
  expect(JSON.stringify(rpc.mock.calls)).not.toContain('test-only-password')
  expect(refreshSession).toHaveBeenCalled()
})
it.each([null,{...invitation,tokenType:'recovery'}])('rejects missing or invalid invitations',async data=>{
  rpc.mockResolvedValue({data,error:null})
  await expect(saveAccountInvitation(client,token,values)).rejects.toThrow(INVALID_SETUP_LINK)
  expect(updateUser).not.toHaveBeenCalled()
})
it('rejects another level before touching Auth',async()=>{
  await expect(saveAccountInvitation(client,token,{...values,selectedLevel:6})).rejects.toThrow('registered levels')
  expect(verifyOtp).not.toHaveBeenCalled()
})
it('never uses an unrelated current account to set the password',async()=>{
  getUser.mockResolvedValue({data:{user:{id:'other',email:'other@example.com'}}})
  verifyOtp.mockResolvedValue({data:{user:null},error:{message:'Expired'}})
  await expect(saveAccountInvitation(client,token,values)).rejects.toThrow(INVALID_SETUP_LINK)
  expect(updateUser).not.toHaveBeenCalled()
})
it('rejects a verified identity mismatch',async()=>{
  verifyOtp.mockResolvedValue({data:{user:{id:'other',email:'other@example.com'}},error:null})
  await expect(saveAccountInvitation(client,token,values)).rejects.toThrow('does not match')
  expect(updateUser).not.toHaveBeenCalled()
})
it('allows a password retry in the already verified recipient session without reusing the OTP',async()=>{
  getUser.mockResolvedValue({data:{user},error:null})
  await saveAccountInvitation(client,token,values)
  expect(verifyOtp).not.toHaveBeenCalled();expect(updateUser).toHaveBeenCalled()
})
it('does not complete an invitation when Auth refuses the password',async()=>{
  updateUser.mockResolvedValue({error:new Error('Password too weak')})
  await expect(saveAccountInvitation(client,token,values)).rejects.toThrow('Password too weak')
  expect(rpc).not.toHaveBeenCalledWith('kp_complete_account_invitation',expect.anything())
})
it('reports a partial save honestly and does not mark it complete locally',async()=>{
  rpc.mockImplementation(async name=>name==='kp_account_invitation_details'?{data:invitation,error:null}:{data:null,error:{message:'Unavailable'}})
  await expect(saveAccountInvitation(client,token,values)).rejects.toThrow('Your password is saved, but your details could not be saved')
  expect(refreshSession).not.toHaveBeenCalled()
})
it('finishes a partial-save retry when Auth confirms the same password is already saved',async()=>{
  let completionAttempts=0
  rpc.mockImplementation(async name=>name==='kp_account_invitation_details'
    ?{data:invitation,error:null}
    :name==='kp_complete_account_invitation'?{data:null,error:++completionAttempts===1?{message:'Unavailable'}:null}
    :{data:false,error:null})
  await expect(saveAccountInvitation(client,token,values)).rejects.toThrow('Your password is saved')
  getUser.mockResolvedValue({data:{user},error:null})
  updateUser.mockResolvedValue({data:{user:null},error:{code:'same_password',message:'New password should be different from the old password.'}})
  await expect(saveAccountInvitation(client,token,values)).resolves.toBeUndefined()
  expect(completionAttempts).toBe(2)
  expect(verifyOtp).toHaveBeenCalledTimes(1)
  expect(refreshSession).toHaveBeenCalledTimes(1)
})
it('does not ignore an unclassified password failure with similar wording',async()=>{
  updateUser.mockResolvedValue({error:new Error('same_password: unexpected provider failure')})
  await expect(saveAccountInvitation(client,token,values)).rejects.toThrow('unexpected provider failure')
  expect(rpc).not.toHaveBeenCalledWith('kp_complete_account_invitation',expect.anything())
})
it('recovers when completion committed but the response was lost',async()=>{
  rpc.mockImplementation(async name=>name==='kp_account_invitation_details'?{data:invitation,error:null}
    :name==='kp_complete_account_invitation'?{data:null,error:{message:'Connection lost'}}
    :{data:true,error:null})
  await expect(saveAccountInvitation(client,token,values)).resolves.toBeUndefined()
  expect(updateUser).toHaveBeenCalledTimes(1)
  expect(rpc).toHaveBeenLastCalledWith('kp_account_invitation_completed',{setup_token:token})
  expect(refreshSession).toHaveBeenCalledTimes(1)
})
it('checks the saved result when the completion request throws a network error',async()=>{
  rpc.mockImplementation(async name=>{
    if(name==='kp_complete_account_invitation') throw new Error('Connection lost')
    return {data:name==='kp_account_invitation_details'?invitation:true,error:null}
  })
  await expect(saveAccountInvitation(client,token,values)).resolves.toBeUndefined()
  expect(refreshSession).toHaveBeenCalledTimes(1)
})
it('recognizes an already completed owner invitation without changing details or password again',async()=>{
  rpc.mockImplementation(async name=>({data:name==='kp_account_invitation_completed'?true:null,error:null}))
  await expect(saveAccountInvitation(client,token,values)).resolves.toBeUndefined()
  expect(updateUser).not.toHaveBeenCalled();expect(verifyOtp).not.toHaveBeenCalled()
  expect(rpc).not.toHaveBeenCalledWith('kp_complete_account_invitation',expect.anything())
  expect(refreshSession).toHaveBeenCalledTimes(1)
})
it.each([{data:false,error:null},{data:null,error:{message:'Permission denied'}}])('does not accept completion without an owner-confirmed result: %o',async result=>{
  rpc.mockImplementation(async name=>name==='kp_account_invitation_completed'?result:{data:null,error:null})
  await expect(saveAccountInvitation(client,token,values)).rejects.toThrow(INVALID_SETUP_LINK)
  expect(updateUser).not.toHaveBeenCalled();expect(refreshSession).not.toHaveBeenCalled()
})
it('keeps a confirmed save successful if refreshing the local session fails',async()=>{
  refreshSession.mockRejectedValue(new Error('Connection lost'))
  await expect(saveAccountInvitation(client,token,values)).resolves.toBeUndefined()
})
it('exchanges a long-lived invitation only when submitting, using the server-bound token',async()=>{
  rpc.mockImplementation(async name=>({data:name==='kp_account_invitation_details'?{...invitation,tokenType:'setup'}:null,error:null}))
  const exchange=vi.fn().mockResolvedValue({tokenHash:'fresh-provider-token',type:'magiclink'})
  await loadAccountInvitation(client,token)
  expect(exchange).not.toHaveBeenCalled()
  await saveAccountInvitation(client,token,values,exchange)
  expect(exchange).toHaveBeenCalledExactlyOnceWith(token)
  expect(verifyOtp).toHaveBeenCalledWith({token_hash:'fresh-provider-token',type:'magiclink'})
  expect(JSON.stringify(exchange.mock.calls)).not.toContain(values.password)
})
it('does not change a password if invitation exchange fails',async()=>{
  rpc.mockResolvedValue({data:{...invitation,tokenType:'setup'},error:null})
  const exchange=vi.fn().mockRejectedValue(new Error('Please try again shortly.'))
  await expect(saveAccountInvitation(client,token,values,exchange)).rejects.toThrow('Please try again shortly.')
  expect(updateUser).not.toHaveBeenCalled()
})
