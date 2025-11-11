
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if(!id){ location.href='/dashboard.html'; return; }

  const aulaRes = await fetch('/api/aulas');
  const aulas = await aulaRes.json();
  const aula = aulas.find(a => a.id == id);
  document.getElementById('roomTitle').textContent = aula ? aula.nombre : 'Aula';

  const res = await fetch('/api/aulas/' + id + '/recursos');
  const recursos = await res.json();

  const list = document.getElementById('recursosList');
  list.innerHTML = recursos.length ? recursos.map(r => `
    <div class="p-2 border-b border-slate-700 flex justify-between">
      <span>${r.tipo}</span><span>${r.codigo}</span><span>${r.estado}</span>
    </div>
  `).join('') : '<div class="text-slate-500 p-4">Sin recursos</div>';
});
