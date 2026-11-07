/* Supabase data boundary. No offline/demo fallback is provided: missing config or
   tables produce errors instead of silently showing or saving fabricated data. */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { LABTRACK_SUPABASE_URL, LABTRACK_SUPABASE_ANON_KEY } from './supabase-config.js';
const url = String(window.__LABTRACK_SUPABASE_URL__ || LABTRACK_SUPABASE_URL || '').replace(/\/$/, '');
const anonKey = window.__LABTRACK_SUPABASE_ANON_KEY__ || LABTRACK_SUPABASE_ANON_KEY || '';
export const supabaseConfig = { mode: 'supabase', url, configured: Boolean(url && anonKey) };
export const supabaseClient = supabaseConfig.configured ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
const client = () => { if (!supabaseClient) throw new Error('Supabase is not configured. Set the project URL and publishable anon key.'); return supabaseClient; };
const check = async (query) => { const result = await query; if (result.error) throw result.error; return result.data; };
const profileFor = async (user) => {
  if (!user) return null;
  const data = await check(client().from('profiles').select('*').eq('id', user.id).maybeSingle());
  if (!data) throw new Error('Your account exists, but no matching row was found in public.profiles. Check the auth.users profile trigger in Supabase.');
  return { id: user.id, email: data.email || user.email, name: data.display_name || user.user_metadata?.display_name || user.email, role: data.role || 'Student', department: data.department || '', studentId: data.student_id || '', requestedRole: data.requested_role || null, approvalStatus: data.approval_status || 'Not requested' };
};
const joinRequests = async (query) => {
  const rows = await check(query);
  if (!rows?.length) return [];
  const ids = rows.map((r) => r.id);
  const [items, profiles] = await Promise.all([
    check(client().from('request_items').select('*').in('request_id', ids)),
    check(client().from('profiles').select('id,display_name,role').in('id', [...new Set(rows.map((r) => r.requester_id).filter(Boolean))])),
  ]);
  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
  return rows.map((r) => { const p = profileMap.get(r.requester_id) || {}; return { id:r.id, requesterId:r.requester_id, requester:p.display_name || '', requesterRole:p.role || '', purpose:r.purpose || '', borrowDate:r.borrow_date, dueDate:r.due_date, status:r.status, submittedAt:r.created_at, reviewer:r.reviewer_name || null, rejectionReason:r.rejection_reason || null, releasedAt:r.released_at, releasedBy:r.released_by, returnedAt:r.returned_at, returnedCondition:r.returned_condition, items:(items||[]).filter(i=>i.request_id===r.id).map(i=>({equipmentId:i.equipment_id,quantity:Number(i.quantity)})) }; });
};
export const supabaseAdapter = {
  configured: supabaseConfig.configured, client: supabaseClient,
  async getSession(){ const {data,error}=await client().auth.getSession(); if(error) throw error; return {data:{...data,profile:await profileFor(data.session?.user)},error:null}; },
  async signIn({email,password}){ const result=await client().auth.signInWithPassword({email,password}); if(result.error)return result; return { ...result, data:{...result.data, profile:await profileFor(result.data.user)} }; },
  async signUp({email,password,metadata={}}){ const requestedRole=['Faculty','Laboratory Personnel'].includes(metadata.requested_role)?metadata.requested_role:null; const result=await client().auth.signUp({email,password,options:{data:{display_name:metadata.display_name||'',requested_role:requestedRole||''}}}); if(result.error)return result; let profile=null; if(result.data.session&&result.data.user){await check(client().from('profiles').upsert({id:result.data.user.id,display_name:metadata.display_name||'',email:result.data.user.email||email,role:'Student',requested_role:requestedRole,approval_status:requestedRole?'Pending':'Not requested'},{onConflict:'id',ignoreDuplicates:true}));profile=await profileFor(result.data.user);} return {...result,data:{...result.data,profile}}; },
  async signOut(){return client().auth.signOut();},
  async listRoleRequests(){return check(client().from('profiles').select('id,display_name,email,role,requested_role,approval_status,created_at').eq('approval_status','Pending').in('requested_role',['Faculty','Laboratory Personnel']).order('created_at',{ascending:true}));},
  async resolveRoleRequest(id,patch){return check(client().from('profiles').update(patch).eq('id',id).eq('approval_status','Pending').select().single());},
  async listEquipment(filters={}){let q=client().from('equipment').select('*').is('archived_at',null).order('name');if(filters.category&&filters.category!=='All categories')q=q.eq('category',filters.category);if(filters.status)q=q.eq('status',filters.status);if(filters.search)q=q.ilike('name',`%${filters.search}%`);return check(q);},
  async listRequests({userId,staff=false}={}){let q=client().from('borrow_requests').select('*').order('created_at',{ascending:false});if(!staff&&userId)q=q.eq('requester_id',userId);return joinRequests(q);},
  async createBorrowRequest({request,items}){return check(client().rpc('submit_borrow_request',{request_payload:request,items_payload:items}));},
  async updateBorrowRequest(id,patch){return check(client().from('borrow_requests').update(patch).eq('id',id).select().single());},
  async cancelBorrowRequest(id){return check(client().from('borrow_requests').update({status:'Cancelled'}).eq('id',id).eq('status','Pending').select().single());},
  async releaseBorrowRequest(id){return check(client().rpc('release_borrow_request',{request_uuid:id}));},
  async returnBorrowRequest({id,returnedAt,condition,note}){return check(client().rpc('return_borrow_request',{request_uuid:id,return_date:returnedAt,return_condition:condition,checkin_note:note||''}));},
  async updateEquipment(id,patch){return check(client().from('equipment').update(patch).eq('id',id).select().single());},
  async createEquipment(row){return check(client().from('equipment').insert(row).select().single());},
  async archiveEquipment(id){return check(client().from('equipment').update({archived_at:new Date().toISOString()}).eq('id',id).select().single());},
  async listConditionLogs(){return check(client().from('condition_logs').select('*,equipment(name),profiles(display_name)').order('created_at',{ascending:false}));},
  async listIncidents(){return check(client().from('incident_reports').select('*,equipment(name),profiles(display_name)').order('created_at',{ascending:false}));},
  async listNotifications(userId){return check(client().from('notifications').select('*').eq('user_id',userId).order('created_at',{ascending:false}));},
  async markNotificationsRead(userId){return check(client().from('notifications').update({read_at:new Date().toISOString()}).eq('user_id',userId).is('read_at',null));},
  async createIncident(row){return check(client().from('incident_reports').insert(row).select().single());},
  async createConditionLog(row){return check(client().from('condition_logs').insert(row).select().single());},
};
