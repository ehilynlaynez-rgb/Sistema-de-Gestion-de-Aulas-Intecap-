
(function(){
  const host=document.createElement('div');host.style.position='fixed';host.style.top='16px';host.style.right='16px';host.style.zIndex='9999';
  document.addEventListener('DOMContentLoaded',()=>document.body.appendChild(host));
  window.$toast=(msg,type='info')=>{const d=document.createElement('div');d.textContent=msg;const m={success:'bg-emerald-500/15 border-emerald-400/40 text-emerald-200',error:'bg-red-500/15 border-red-400/40 text-red-200',warning:'bg-amber-500/15 border-amber-400/40 text-amber-200',info:'bg-cyan-500/15 border-cyan-400/40 text-cyan-200'};d.className='px-4 py-3 mb-2 rounded-xl border shadow-lg '+(m[type]||m.info);host.appendChild(d);setTimeout(()=>{d.style.opacity='0';d.style.transform='translateY(-6px)';setTimeout(()=>host.removeChild(d),300)},2400);};
})();