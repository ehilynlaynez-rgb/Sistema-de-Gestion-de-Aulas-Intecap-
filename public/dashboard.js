
document.addEventListener('DOMContentLoaded', async () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if(!user || !user.rol){
    location.href = '/';
    return;
  }
  document.getElementById('who').textContent = user.nombre + " · " + user.rol;
  document.getElementById('logout').onclick = () => { localStorage.clear(); location.href = '/'; };

  const res = await fetch('/api/aulas');
  const aulas = await res.json();

  const container = document.getElementById('aulasContainer');
  container.innerHTML = aulas.map(a => `
    <div class="aula-card" data-id="${a.id}">
      <h3>${a.nombre}</h3>
      <p>${a.modulo}</p>
      <p class="${a.estado === 'Libre' ? 'libre':'ocupada'}">${a.estado}</p>
    </div>
  `).join('');

  container.querySelectorAll('.aula-card').forEach(el => {
    el.onclick = () => {
      const id = el.getAttribute('data-id');
      location.href = '/room.html?id=' + id;
    };
  });
});
