
const API = location.origin + '/api';
const token = localStorage.getItem('token'); if(!token) location.href='/';


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

  };
  const resp = await fetch('/api' + path, config);
  if (resp.status === 401) {
    localStorage.clear();
    $toast('Tu sesión expiró. Por favor vuelve a iniciar sesión.', 'warning');
    setTimeout(()=> location.href = '/', 1200);
    return;
  }
  try { return await resp.json(); } catch { return null; }
}){
  const r = await fetch(API+path, { ...opts, headers:{ 'Authorization':'Bearer '+token, 'Content-Type':'application/json', ...(opts.headers||{}) }});
  return r.json();
}
async function loadRooms(){
  const rooms=await api('/rooms'); const el=document.getElementById('roomList'); el.innerHTML='';
  rooms.forEach(r=>{
    const row=document.createElement('div');
    row.className='flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-xl p-3';
    row.innerHTML=`<div class="text-sm flex items-center gap-2"><span class="inline-block w-3 h-3 rounded-full" style="background:${r.color}"></span><b>${r.name}</b> · ${r.module}</div>
    <div class="flex gap-2">
      <button data-id="${r.id}" data-name="${r.name}" data-module="${r.module}" data-color="${r.color}" class="px-3 py-1 bg-slate-800 rounded">Editar</button>
      <button data-id="${r.id}" class="px-3 py-1 bg-red-800 rounded">Eliminar</button>
    </div>`;
    el.appendChild(row);
  });
  el.querySelectorAll('button.bg-red-800').forEach(b=> b.onclick=async()=>{ if(!confirm('¿Eliminar aula?'))return; const r=await api('/rooms/'+b.dataset.id,{method:'DELETE'}); if(r.error){$toast(r.error,'error');return;} $toast('Aula eliminada','warning'); loadRooms(); });
  el.querySelectorAll('button.bg-slate-800').forEach(b=> b.onclick=async()=>{
    const id=b.dataset.id; const name=prompt('Nuevo nombre',b.dataset.name); const module=prompt('Nuevo módulo',b.dataset.module); const color=prompt('Color',b.dataset.color);
    if(!name||!module||!color) return; const r=await api('/rooms/'+id,{method:'PUT',body:JSON.stringify({name,module,color})}); if(r.error){$toast(r.error,'error');return;} $toast('Aula actualizada','success'); loadRooms();
  });
}
document.getElementById('roomForm').onsubmit=async(e)=>{
  e.preventDefault(); const name=roomName.value, module=roomModule.value, color=roomColor.value;
  const r=await api('/rooms',{method:'POST',body:JSON.stringify({name,module,color})}); if(r.error){$toast(r.error,'error');return;} $toast('Aula creada','success'); e.target.reset(); loadRooms();
};

document.getElementById('resForm').onsubmit=async(e)=>{
  e.preventDefault(); const name=resName.value, code=resCode.value, type=resType.value;
  const r=await api('/resources',{method:'POST',body:JSON.stringify({name,code,type})}); if(r.error){$toast(r.error,'error');return;} $toast('Recurso registrado','success'); e.target.reset(); loadResources();
};
async function loadResources(){
  const out=document.getElementById('resList'); out.innerHTML=''; const resources=await api('/resources'); const rooms=await api('/rooms');
  resources.forEach(x=>{
    const row=document.createElement('div'); row.className='grid grid-cols-5 gap-2 items-center bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-sm';
    row.innerHTML=`<div class="col-span-2"><b>${x.name}</b> <span class="text-slate-400">${x.code||''}</span></div>
    <div>${x.type||''}</div><select class="px-2 py-1 rounded bg-slate-800 border border-slate-700">${rooms.map(r=>`<option value="${r.id}">${r.name}</option>`).join('')}</select>
    <button class="px-3 py-1 bg-cyan-700 rounded">Asignar</button>`;
    out.appendChild(row);
    const sel=row.querySelector('select'); const btn=row.querySelector('button'); btn.onclick=async()=>{ const r=await api(`/rooms/${sel.value}/resources/${x.id}`,{method:'POST'}); if(r.error){$toast(r.error,'error');return;} $toast('Recurso asignado','success'); };
  });
}
loadRooms(); loadResources();
