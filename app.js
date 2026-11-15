(async function(){
  const tabsEl=document.getElementById('tabs'),content=document.getElementById('content'),search=document.getElementById('search'),updated=document.getElementById('updated');
  let data;
  try{ data=await (await fetch('files.json?t='+Date.now(),{cache:'no-store'})).json(); }
  catch(e){ content.innerHTML='<p class="empty">Could not load documents. Check your connection and refresh.</p>'; return; }
  const tops=(data.children||[]).filter(n=>n.type==='folder');
  let current=decodeURIComponent(location.hash.slice(1))||(tops[0]&&tops[0].name);
  if(data.updated) updated.textContent='Last updated '+new Date(data.updated).toLocaleString();
  const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const url=p=>'docs/'+p.split('/').map(encodeURIComponent).join('/');
  const size=b=>b<1024?b+' B':b<1048576?(b/1024).toFixed(0)+' KB':(b/1048576).toFixed(1)+' MB';
  const ext=n=>{const i=n.lastIndexOf('.');return i>0?n.slice(i+1).toLowerCase():'';};
  const title=n=>{const i=n.lastIndexOf('.');return i>0?n.slice(0,i):n;};
  function fileLi(f,showPath){const e=ext(f.name);return `<li><a href="${url(f.path)}" target="_blank" rel="noopener"><span class="ic ${e}">${esc(e.toUpperCase().slice(0,4)||'FILE')}</span><span class="name">${esc(title(f.name))}<div class="meta">${showPath?'<span class="path">'+esc(f.path.split('/').slice(0,-1).join(' › '))+'</span> · ':''}${size(f.size)} · ${new Date(f.modified).toLocaleDateString()}</div></span></a></li>`;}
  function folderHtml(node,open){
    const files=node.children.filter(c=>c.type==='file'),subs=node.children.filter(c=>c.type==='folder');
    let h='';
    if(files.length) h+=`<ul class="files">${files.map(f=>fileLi(f)).join('')}</ul>`;
    h+=subs.map(s=>`<details class="folder"${open?' open':''}><summary>${esc(s.name)}</summary>${folderHtml(s,false)}</details>`).join('');
    return h;
  }
  function renderTabs(){tabsEl.innerHTML=tops.map(t=>`<button role="tab" class="${t.name===current&&!search.value?'active':''}" data-n="${esc(t.name)}">${esc(t.name)}</button>`).join('');}
  function renderTab(){
    const t=tops.find(x=>x.name===current)||tops[0];
    if(!t){content.innerHTML='<p class="empty">No folders yet.</p>';return;}
    current=t.name;
    const files=t.children.filter(c=>c.type==='file'),subs=t.children.filter(c=>c.type==='folder');
    if(!files.length&&!subs.length){content.innerHTML='<p class="empty">No documents in '+esc(t.name)+' yet.</p>';return;}
    content.innerHTML=(files.length?`<div class="top"><ul class="files">${files.map(f=>fileLi(f)).join('')}</ul></div>`:'')+
      subs.map(s=>`<details class="folder"><summary>${esc(s.name)}</summary>${folderHtml(s,false)}</details>`).join('');
  }
  const all=[];(function walk(n){(n.children||[]).forEach(c=>c.type==='file'?all.push(c):walk(c));})(data);
  function renderSearch(q){
    const words=q.toLowerCase().split(/\s+/).filter(Boolean);
    const hits=all.filter(f=>words.every(w=>f.path.toLowerCase().includes(w)));
    content.innerHTML=hits.length?`<div class="top"><ul class="files">${hits.map(f=>fileLi(f,true)).join('')}</ul></div>`:'<p class="empty">No documents match “'+esc(q)+'”.</p>';
  }
  function render(){renderTabs();search.value.trim()?renderSearch(search.value.trim()):renderTab();}
  tabsEl.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;current=b.dataset.n;search.value='';history.replaceState(null,'','#'+encodeURIComponent(current));render();});
  search.addEventListener('input',render);
  render();
})();
