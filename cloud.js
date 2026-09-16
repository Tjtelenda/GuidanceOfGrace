import { CLOUD_CONFIG } from './cloud-config.js';

const SESSION_KEY='guidance-of-grace-cloud-session';
const CAMPAIGN_KEY='guidance-of-grace-cloud-campaign';
const trimUrl=s=>(s||'').replace(/\/$/,'');
const configured=()=>Boolean(CLOUD_CONFIG.url&&CLOUD_CONFIG.anonKey);
let session=loadJson(SESSION_KEY);

function loadJson(key){try{return JSON.parse(localStorage.getItem(key))}catch{return null}}
function storeSession(value){session=value;if(value)localStorage.setItem(SESSION_KEY,JSON.stringify(value));else localStorage.removeItem(SESSION_KEY)}
function headers(auth=true){return {'apikey':CLOUD_CONFIG.anonKey,'Content-Type':'application/json',...(auth&&session?.access_token?{'Authorization':`Bearer ${session.access_token}`}:{})}}
async function request(path,options={}){
  if(!configured())throw new Error('Cloud sync is not configured yet.');
  const res=await fetch(`${trimUrl(CLOUD_CONFIG.url)}${path}`,{...options,headers:{...headers(options.auth!==false),...(options.headers||{})}});
  if(!res.ok){let detail='';try{detail=(await res.json()).message||''}catch{}throw new Error(detail||`Cloud request failed (${res.status}).`)}
  return res.status===204?null:res.json();
}

export function cloudStatus(){return {configured:configured(),signedIn:Boolean(session?.access_token),email:session?.user?.email||null,campaignId:localStorage.getItem(CAMPAIGN_KEY)}}

export function consumeAuthRedirect(){
  if(!location.hash.includes('access_token='))return false;
  const p=new URLSearchParams(location.hash.slice(1));
  const access_token=p.get('access_token'),refresh_token=p.get('refresh_token');
  if(!access_token)return false;
  storeSession({access_token,refresh_token,expires_at:Date.now()/1000+Number(p.get('expires_in')||3600),user:null});
  history.replaceState(null,'',location.pathname+location.search);
  return true;
}

export async function refreshSession(){
  if(!session?.refresh_token||!configured())return session;
  const data=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',auth:false,body:JSON.stringify({refresh_token:session.refresh_token})});
  storeSession({...data,expires_at:Date.now()/1000+(data.expires_in||3600)}); return session;
}

export async function loadUser(){
  if(!session?.access_token)return null;
  if(session.expires_at&&session.expires_at<Date.now()/1000+60&&session.refresh_token)await refreshSession();
  const user=await request('/auth/v1/user'); storeSession({...session,user}); return user;
}

export async function sendMagicLink(email){
  await request('/auth/v1/otp',{method:'POST',auth:false,body:JSON.stringify({email,create_user:true})});
}

export async function signOut(){try{if(session?.access_token&&configured())await request('/auth/v1/logout',{method:'POST'})}finally{storeSession(null);localStorage.removeItem(CAMPAIGN_KEY)}}

export async function createCampaign(name,displayName,role='explorer'){
  const user=await loadUser(); if(!user)throw new Error('Sign in first.');
  const rows=await request('/rest/v1/campaigns',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({name,created_by:user.id})});
  const campaign=rows[0];
  await request(`/rest/v1/campaign_members?campaign_id=eq.${campaign.id}&user_id=eq.${user.id}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({display_name:displayName,role})});
  localStorage.setItem(CAMPAIGN_KEY,campaign.id); return campaign;
}

export async function joinCampaign(inviteCode,displayName,role='guide'){
  const rows=await request('/rest/v1/rpc/join_campaign',{method:'POST',body:JSON.stringify({p_invite_code:inviteCode.trim().toUpperCase(),p_display_name:displayName,p_role:role})});
  const id=typeof rows==='string'?rows:rows?.id||rows; if(!id)throw new Error('Campaign join did not return an ID.');
  localStorage.setItem(CAMPAIGN_KEY,id); return id;
}

export async function listCampaigns(){
  const members=await request('/rest/v1/campaign_members?select=campaign_id,role,display_name,campaigns(id,name,invite_code)&order=joined_at.asc');
  return members;
}

export function setCampaign(id){id?localStorage.setItem(CAMPAIGN_KEY,id):localStorage.removeItem(CAMPAIGN_KEY)}

export async function pushProfile(profile,campaignId=localStorage.getItem(CAMPAIGN_KEY)){
  const user=await loadUser(); if(!user||!campaignId)throw new Error('Choose a campaign first.');
  const body={campaign_id:campaignId,user_id:user.id,profile,updated_at:new Date().toISOString()};
  await request('/rest/v1/player_states?on_conflict=campaign_id,user_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(body)});
}

export async function fetchCampaign(campaignId=localStorage.getItem(CAMPAIGN_KEY)){
  if(!campaignId)return [];
  const [states,members]=await Promise.all([
    request(`/rest/v1/player_states?campaign_id=eq.${campaignId}&select=user_id,profile,updated_at`),
    request(`/rest/v1/campaign_members?campaign_id=eq.${campaignId}&select=user_id,display_name,role`),
  ]);
  const byUser=new Map(members.map(m=>[m.user_id,m]));
  return states.map(s=>({...s,...byUser.get(s.user_id)}));
}
