(function(){
 const cfg=window.RLS_SUPABASE_CONFIG;if(!cfg||!window.supabase)return;
 const db=window.RLS_SUPABASE_CLIENT||window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});window.RLS_SUPABASE_CLIENT=db;
 const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const num=v=>Number(v||0).toLocaleString('fa-IR'),date=v=>v?new Date(v).toLocaleString('fa-IR',{dateStyle:'medium',timeStyle:'short'}):'—';
 const fieldLabels={full_name:'نام کامل',display_name:'نام نمایشی',email:'ایمیل',category:'گروه عضویت',membership_status:'وضعیت عضویت',is_public:'نمایش عمومی',member_number:'شماره عضویت',reviewed_at:'زمان بررسی',review_note:'یادداشت بررسی',status:'وضعیت درخواست',reviewed_by:'بررسی‌کننده',institution:'دانشگاه/مؤسسه',country:'کشور',city:'شهر'};
 const states={approved:'تأییدشده',pending:'در انتظار بررسی',rejected:'ردشده',suspended:'تعلیق‌شده',completed:'ارسال کامل',partial:'ارسال ناقص',failed:'ناموفق',sending:'در حال ارسال',sent:'ارسال‌شده'};
 let histories=[],campaigns=[],overviewLoaded=false;
 async function admin(){try{const {data:{session}}=await db.auth.getSession();if(!session)return false;const {data,error}=await db.from('rls_user_roles').select('role').eq('user_id',session.user.id).maybeSingle();return !error&&data?.role==='admin';}catch(e){return false;}}
 async function count(table,column,value){let q=db.from(table).select('*',{count:'exact',head:true});if(column)q=q.eq(column,value);const {count:n,error}=await q;if(error)throw error;return n||0;}
 async function loadOverview(){
  if(!await admin())return;const message=$('admin-overview-message'),stats=$('admin-overview-stats');if(message)message.textContent='در حال دریافت آمار…';
  try{
   const [all,approved,pending,suspended,pendingApps,allApps,events,rows,recent]=await Promise.all([
    count('rls_profiles'),count('rls_profiles','membership_status','approved'),count('rls_profiles','membership_status','pending'),count('rls_profiles','membership_status','suspended'),
    count('rls_membership_applications','status','pending'),count('rls_membership_applications'),count('rls_events','status','approved'),
    db.from('rls_profiles').select('created_at').gte('created_at',new Date(Date.now()-183*86400000).toISOString()).order('created_at',{ascending:true}).limit(3000),
    db.from('rls_profiles').select('full_name,display_name,created_at,membership_status').order('created_at',{ascending:false}).limit(6)
   ]);
   if(rows.error)throw rows.error;if(recent.error)throw recent.error;
   const cards=[['کل پرونده‌های اعضا',all],['اعضای تأییدشده',approved],['در انتظار بررسی پروفایل',pending],['عضویت‌های تعلیق‌شده',suspended],['درخواست‌های مستقل در انتظار',pendingApps],['کل درخواست‌های مستقل',allApps],['رویدادهای منتشرشده',events]];
   if(stats)stats.innerHTML=cards.map(([l,v])=>'<div class="admin-stat-card"><span>'+esc(l)+'</span><strong>'+num(v)+'</strong></div>').join('');
   const months=[],now=new Date();for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push({key:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'),label:d.toLocaleDateString('fa-IR',{month:'short',year:'2-digit'}),count:0});}
   (rows.data||[]).forEach(r=>{if(!r.created_at)return;const d=new Date(r.created_at),m=months.find(x=>x.key===d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));if(m)m.count++;});
   const max=Math.max(1,...months.map(m=>m.count));if($('admin-signup-chart'))$('admin-signup-chart').innerHTML=months.map(m=>'<div class="admin-chart-row"><span>'+esc(m.label)+'</span><div class="admin-chart-track"><div class="admin-chart-fill" style="width:'+Math.round(m.count/max*100)+'%"></div></div><b>'+num(m.count)+'</b></div>').join('');
   if($('admin-recent-members'))$('admin-recent-members').innerHTML=(recent.data||[]).map(p=>'<div class="admin-recent-item"><div><strong>'+esc(p.full_name||p.display_name||'عضو انجمن')+'</strong><small>'+esc(states[p.membership_status]||p.membership_status||'')+'</small></div><small>'+esc(p.created_at?new Date(p.created_at).toLocaleDateString('fa-IR'):'—')+'</small></div>').join('')||'هنوز عضوی ثبت نشده است.';
   if(message)message.textContent='';overviewLoaded=true;
  }catch(e){console.error(e);if(message)message.textContent='دریافت آمار ناموفق بود: '+(e.message||'خطای نامشخص');}
 }
 function value(v){if(v===null||v===undefined||v==='')return '—';if(typeof v==='boolean')return v?'بله':'خیر';return states[String(v)]||String(v);}
 function renderHistory(){
  const box=$('admin-history-list');if(!box)return;const q=String($('admin-history-search')?.value||'').trim().toLocaleLowerCase('fa-IR');
  const list=histories.filter(r=>!q||[r.member_name,r.member_email,r.action,JSON.stringify(r.changed_fields),JSON.stringify(r.old_values),JSON.stringify(r.new_values)].join(' ').toLocaleLowerCase('fa-IR').includes(q));
  if(!list.length){box.textContent=histories.length?'موردی با این عبارت پیدا نشد.':'هنوز سابقه‌ای ثبت نشده است.';return;}
  box.innerHTML=list.map(r=>{
   const action=({existing_record:'ثبت اولیه در سامانه سوابق',member_created:'ایجاد پرونده عضو',application_submitted:'ثبت درخواست عضویت',membership_status_changed:'تغییر وضعیت عضویت',membership_number_changed:'تغییر شماره عضویت',application_status_changed:'تغییر وضعیت درخواست',application_updated:'ویرایش درخواست',profile_updated:'ویرایش اطلاعات عضو'})[r.action]||'ثبت تغییر';
   const fields=Array.isArray(r.changed_fields)?r.changed_fields:[],changes=fields.map(k=>'<span class="admin-history-change"><b>'+esc(fieldLabels[k]||k)+'</b>: '+esc(value(r.old_values?.[k]))+' ← '+esc(value(r.new_values?.[k]))+'</span>').join('');
   return '<article class="admin-history-item"><div class="admin-history-head"><strong>'+esc(r.member_name||'پرونده ثبت‌نام')+' · '+esc(action)+'</strong><span class="admin-history-meta">'+esc(date(r.occurred_at))+'</span></div><div class="admin-history-meta">'+esc(r.member_email||'بدون ایمیل')+' · '+(r.source_table==='rls_profiles'?'پرونده عضو':'درخواست عضویت')+' · '+(r.actor_id?'ثبت‌شده توسط مدیر':'ثبت سیستمی')+'</div>'+(changes?'<div class="admin-history-changes">'+changes+'</div>':'<div class="admin-history-meta">اطلاعات اولیه هنگام فعال‌سازی سوابق</div>')+'</article>';
  }).join('');
 }
 async function loadHistory(){const box=$('admin-history-list');if(!box)return;if(!await admin()){box.textContent='دسترسی مدیر لازم است.';return;}box.textContent='در حال دریافت سوابق…';
  const {data,error}=await db.from('rls_admin_member_history').select('id,target_user_id,source_table,source_record_id,member_name,member_email,actor_id,action,changed_fields,old_values,new_values,occurred_at').order('occurred_at',{ascending:false}).limit(500);
  if(error){box.textContent='دریافت سوابق ناموفق بود: '+error.message;return;}histories=data||[];renderHistory();
 }
 function renderCampaigns(){const box=$('admin-email-archive-list');if(!box)return;if(!campaigns.length){box.textContent='هنوز پیام همگانی‌ای از پنل ارسال نشده است.';return;}
  box.innerHTML=campaigns.map(c=>'<article class="admin-email-campaign" data-campaign-card="'+esc(c.id)+'"><div class="admin-campaign-head"><div><strong>'+esc(c.subject)+'</strong><div class="admin-campaign-meta">'+esc(date(c.created_at))+' · '+esc(states[c.status]||c.status)+'</div></div><div class="admin-campaign-meta">موفق: '+num(c.sent_count)+' / '+num(c.total_recipients)+' · ناموفق: '+num(c.failed_count)+'</div></div><div class="admin-campaign-meta">پیوست‌ها: '+esc(c.attachment_names?.length?c.attachment_names.join('، '):'ندارد')+'</div><div class="admin-campaign-actions"><button type="button" class="admin-campaign-toggle" data-campaign-id="'+esc(c.id)+'">مشاهده متن و گیرندگان</button></div><div class="admin-campaign-details" hidden></div></article>').join('');
 }
 async function loadArchive(){const box=$('admin-email-archive-list');if(!box)return;if(!await admin()){box.textContent='دسترسی مدیر لازم است.';return;}box.textContent='در حال دریافت آرشیو ایمیل‌ها…';
  const {data,error}=await db.from('rls_admin_email_campaigns').select('id,subject,message,attachment_names,total_recipients,sent_count,failed_count,status,created_at,completed_at').order('created_at',{ascending:false}).limit(100);
  if(error){box.textContent='دریافت آرشیو ناموفق بود: '+error.message;return;}campaigns=data||[];renderCampaigns();
 }
 async function showDetails(button){const card=button.closest('[data-campaign-card]'),details=card?.querySelector('.admin-campaign-details');if(!card||!details)return;if(!details.hidden){details.hidden=true;button.textContent='مشاهده متن و گیرندگان';return;}
  const campaign=campaigns.find(x=>x.id===button.dataset.campaignId);if(!campaign)return;button.disabled=true;button.textContent='در حال دریافت…';
  try{const {data,error}=await db.from('rls_admin_email_recipients').select('recipient_email,status,error_message,sent_at').eq('campaign_id',campaign.id).order('recipient_email').limit(2000);if(error)throw error;const recipients=data||[];
   details.innerHTML='<div class="admin-history-values"><b>متن پیام:</b><div style="white-space:pre-wrap">'+esc(campaign.message)+'</div></div><h4>فهرست گیرندگان ('+num(recipients.length)+')</h4>'+(recipients.length?'<div style="overflow-x:auto"><table class="admin-recipient-table"><thead><tr><th>ایمیل گیرنده</th><th>وضعیت</th><th>زمان ارسال</th><th>توضیح خطا</th></tr></thead><tbody>'+recipients.map(r=>'<tr><td dir="ltr">'+esc(r.recipient_email)+'</td><td><span class="admin-recipient-status '+esc(r.status)+'">'+esc(states[r.status]||r.status)+'</span></td><td>'+esc(date(r.sent_at))+'</td><td>'+esc(r.error_message||'—')+'</td></tr>').join('')+'</tbody></table></div>':'هنوز گیرنده‌ای ثبت نشده است.');
   details.hidden=false;button.textContent='بستن جزئیات';
  }catch(e){details.textContent='خطا در دریافت گیرندگان: '+(e.message||'خطای نامشخص');details.hidden=false;button.textContent='بستن جزئیات';}finally{button.disabled=false;}
 }
 document.addEventListener('click',e=>{const b=e.target.closest('.admin-campaign-toggle');if(b)showDetails(b);});
 $('admin-history-search')?.addEventListener('input',renderHistory);$('admin-history-refresh')?.addEventListener('click',loadHistory);$('admin-email-archive-refresh')?.addEventListener('click',loadArchive);
 window.addEventListener('rls-admin-section-change',e=>{const s=e.detail?.section;if(s==='overview'&&!overviewLoaded)loadOverview();if(s==='history')loadHistory();if(s==='email-archive')loadArchive();});
 window.addEventListener('rls-admin-broadcast-sent',()=>{if(!$('admin-email-archive-panel')?.hidden)loadArchive();});
 db.auth.onAuthStateChange(event=>{if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED')setTimeout(()=>{overviewLoaded=false;loadOverview();},0);if(event==='SIGNED_OUT'){overviewLoaded=false;histories=[];campaigns=[];}});
 checkAccess();async function checkAccess(){if(await admin())loadOverview();}
})();