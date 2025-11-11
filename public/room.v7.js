
const API = location.origin + '/api';
const token = localStorage.getItem('token'); if(!token) location.href='/';
const user = JSON.parse(localStorage.getItem('user')||'{}');

const params = new URLSearchParams(location.search);
const roomId = +(params.get('id') || 0);

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('logout').onclick = ()=>{ localStorage.clear(); location.href='/'; };
  document.getElementById('who').textContent = `${user.name} · ${user.role}`;
  if(user.role==='admin') document.getElementById('adminLink').classList.remove('hidden');
  if(user.role==='tecnico'||user.role==='admin') document.getElementById('techLink').classList.remove('hidden');

  await loadRoom();
  await loadResources();
  await loadLoanSelectors();
  await loadDamages();
});


async function api(path, opts = {}) {
  const token = localStorage.getItem('token');
  const headers = opts.headers || {};
  const isForm = opts.body instanceof FormData;
  const cfg = {
    ...opts,
    headers: {
      'Authorization': 'Bearer ' + token,
      ...(isForm ? {} : {'Content-Type': 'application/json'}),
      ...headers
    }
  };
  const resp = await fetch('/api' + path, cfg);
  if (resp.status === 401) {
    localStorage.clear();
    if (typeof $toast === 'function') { $toast('Tu sesión expiró. Inicia sesión nuevamente.', 'warning'); }
    setTimeout(()=> location.href='/', 800);
    return null;
  }
  try { return await resp.json(); } catch { return null; }
}


async function loadRoom(){
  const rooms = await api('/rooms');
  const r = rooms.find(x=> x.id===roomId) || rooms[0];
  document.getElementById('room_id').value = r.id;
  document.getElementById('roomTitle').innerHTML = `<span class="inline-block w-3 h-3 rounded-full align-middle mr-2" style="background:${r.color}"></span> ${r.name}`;
  const meta = `${r.module} • <span class="${r.is_occupied?'text-red-400':'text-emerald-400'}">${r.is_occupied?'Ocupada':'Libre'}</span>` + (r.occupied_by_name? ` • Por: <b>${r.occupied_by_name}</b>`:'');
  document.getElementById('roomMeta').innerHTML = meta;

  const actions = document.getElementById('roomActions'); actions.innerHTML='';
  if(r.is_occupied){
    const hist=await api('/history'); const resv=(hist.reservations||[]).find(x=>x.room_id===r.id && x.status==='active');
    const btn = document.createElement('button'); btn.className='px-4 py-2 rounded-xl bg-slate-800'; btn.textContent='Liberar';
    btn.onclick = async ()=>{ const re = await api('/reservations/'+resv.id+'/release',{method:'PUT'}); if(re.error){$toast(re.error,'error');return;} $toast('Aula liberada','info'); loadRoom(); };
    actions.appendChild(btn);
  }else{
    const now=new Date(); const s=new Date(now.getTime()+5*60*1000); const e=new Date(s.getTime()+60*60*1000);
    const fmt=d=> new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
    const start = document.createElement('input'); start.type='datetime-local'; start.value=fmt(s); start.className='rounded-xl bg-slate-800 border border-slate-700 px-3 py-2';
    const end = document.createElement('input'); end.type='datetime-local'; end.value=fmt(e); end.className='rounded-xl bg-slate-800 border border-slate-700 px-3 py-2';
    const btn = document.createElement('button'); btn.className='px-4 py-2 rounded-xl bg-cyan-700'; btn.textContent='Reservar';
    btn.onclick = async ()=>{ const re = await api('/reservations',{method:'POST', body: JSON.stringify({room_id:r.id,start_time:start.value,end_time:end.value})}); if(re.error){$toast(re.error,'error');return;} $toast('Reserva creada','success'); loadRoom(); };
    actions.appendChild(start); actions.appendChild(end); actions.appendChild(btn);
  }
}

async function loadResources(){
  const list = await api('/rooms/'+roomId+'/resources');
  const box = document.getElementById('resList'); box.innerHTML='';
  const damageSel = document.getElementById('damageResource'); damageSel.innerHTML='<option value="">Selecciona recurso (opcional)</option>';
  (list||[]).forEach(x=>{
    const row=document.createElement('div');
    row.className='flex items-center justify-between bg-slate-900/70 border border-slate-800 rounded-xl p-3 text-sm';
    const badge = `<span class="inline-block w-2.5 h-2.5 rounded-full" style="background:${x.origin_color||'#94a3b8'}"></span>`;
    const loanTag = x.origin==='loan' ? `<span class="ml-2 text-amber-400">prestado</span>` : '';
    row.innerHTML = `<div>${badge} <b>${x.type||x.name}</b> <span class="text-slate-400">${x.code||''}</span>${loanTag}</div>
    <div class="flex gap-2">
      ${x.origin==='loan' ? `<button data-loan="${x.loan_id}" class="px-3 py-1 bg-slate-800 rounded">Devolver</button>` : ''}
      <button data-resid="${x.id}" class="px-3 py-1 bg-rose-800 rounded">Reportar daño</button>
    </div>`;
    box.appendChild(row);
    const opt = document.createElement('option'); opt.value=x.id; opt.textContent = `${x.type||x.name} ${x.code||''}`; damageSel.appendChild(opt);
  });
  box.querySelectorAll('button[data-loan]').forEach(b=> b.onclick = async ()=>{
    const r = await api('/loans/'+b.dataset.loan+'/return',{method:'PUT'});
    if(r.error){ $toast(r.error,'error'); return; } $toast('Recurso devuelto','success'); loadResources();
  });
  box.querySelectorAll('button[data-resid]').forEach(b=> b.onclick = ()=>{ document.getElementById('damageResource').value = b.dataset.resid; window.scrollTo({top:document.body.scrollHeight, behavior:'smooth'}); });
}

async function loadLoanSelectors(){
  const resources = await api('/resources/with-origin');
  const rooms = await api('/rooms');
  // Fill selects
  const selRes=document.getElementById('loanResource'); const selFrom=document.getElementById('loanFromRoom');
  selRes.innerHTML=resources.map(r=>`<option value="${r.id}" data-origin="${r.origin_room_id}">${r.type||r.name} ${r.code||''} · Origen: ${r.origin_room_name}</option>`).join('');
  selFrom.innerHTML=rooms.map(r=>`<option value="${r.id}">${r.name}</option>`).join('');
  // preselect from-room according to chosen resource's origin
  selRes.onchange = ()=>{ selFrom.value = selRes.options[selRes.selectedIndex].dataset.origin; };
  if(selRes.options.length){ selFrom.value = selRes.options[selRes.selectedIndex].dataset.origin; }
  // set due_time to current active reservation end if exists
  const hist=await api('/history'); const active=(hist.reservations||[]).find(x=> x.room_id===roomId && x.status==='active' && x.user_id===user.id);
  if(active){ document.getElementById('loanDue').value = new Date(new Date(active.end_time).getTime()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16); }
  document.getElementById('loanForm').onsubmit = async (e)=>{
    e.preventDefault();
    const resource_id=+selRes.value; const from_room_id=+selFrom.value; const to_room_id=roomId;
    let due = document.getElementById('loanDue').value;
    if(!due && active) due = active.end_time;
    if(!due){ $toast('Define hora de devolución','warning'); return; }
    const r = await api('/loans',{method:'POST', body: JSON.stringify({resource_id, from_room_id, to_room_id, due_time: due})});
    document.getElementById('loanMsg').textContent = r.error? r.error : 'Préstamo creado ✅';
    if(!r.error){ loadResources(); $toast('Recurso prestado, recuerda devolverlo','info'); }
  };
}

document.getElementById('damageForm').onsubmit = async (e)=>{
  e.preventDefault();
  const fd = new FormData();
  fd.append('room_id', roomId);
  const rid=document.getElementById('damageResource').value; if(rid) fd.append('resource_id', rid);
  fd.append('description', document.getElementById('description').value);
  const file=document.getElementById('image').files[0]; if(file) fd.append('image', file);
  const r = await fetch(API+'/damages', { method:'POST', headers:{ 'Authorization':'Bearer '+token }, body: fd});
  const d = await r.json();
  if(d.error){ $toast(d.error,'error'); } else { $toast('Reporte enviado','success'); loadDamages(); }
};

async function loadDamages(){
  const list=document.getElementById('damageList'); list.innerHTML='';
  const r=await api('/damages');
  (r||[]).filter(x=> !roomId || x.room_id==roomId).forEach(d=>{
    const row=document.createElement('div');
    row.className='flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-sm';
    row.innerHTML=`<div><b>#${d.id}</b> · Aula ${d.room_id||'-'} · Recurso ${d.resource_id||'-'}<div class="text-slate-400">${d.description||''}</div></div>
    <div class="flex items-center gap-2">
      ${d.image_path? `<a class="px-3 py-1 bg-slate-800 rounded" href="${d.image_path}" target="_blank">Foto</a>`:''}
      ${(user.role==='tecnico'||user.role==='admin') && d.status!=='reparado' ? `<button data-id="${d.id}" class="px-3 py-1 bg-emerald-700 rounded">Marcar reparado</button>`:`<span class="text-slate-400">${d.status}</span>`}
    </div>`;
    list.appendChild(row);
  });
  list.querySelectorAll('button[data-id]').forEach(b=> b.onclick = async ()=>{
    const r = await api('/damages/'+b.dataset.id+'/repair', { method:'PUT' });
    if(r.error){ $toast(r.error,'error'); return; } $toast('Marcado como reparado','success'); loadDamages();
  });
}
