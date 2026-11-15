(async function(){
  const content=document.getElementById('content'),search=document.getElementById('search'),updated=document.getElementById('updated');
  let data;
  try{ data=await (await fetch('files.json?t='+Date.now(),{cache:'no-store'})).json(); }
  catch(e){ content.innerHTML='<p class="empty">Could not load documents. Check your connection and refresh.</p>'; return; }
  if(data.updated) updated.textContent='Last updated '+new Date(data.updated).toLocaleString();
  const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const url=p=>'docs/'+p.split('/').map(encodeURIComponent).join('/');
  const size=b=>b<1024?b+' B':b<1048576?(b/1024).toFixed(0)+' KB':(b/1048576).toFixed(1)+' MB';
  const ext=n=>{const i=n.lastIndexOf('.');return i>0?n.slice(i+1).toLowerCase():'';};
  const title=n=>{const i=n.lastIndexOf('.');return i>0?n.slice(0,i):n;};
  const countFiles=n=>(n.children||[]).reduce((a,c)=>a+(c.type==='file'?1:countFiles(c)),0);
  function fileLi(f,showPath){const e=ext(f.name);return `<li><a href="${url(f.path)}" target="_blank" rel="noopener"><span class="ic ${e}">${esc(e.toUpperCase().slice(0,4)||'FILE')}</span><span class="name">${esc(title(f.name))}<div class="meta">${showPath?'<span class="path">'+esc(f.path.split('/').slice(0,-1).join(' › '))+'</span> · ':''}${size(f.size)} · ${new Date(f.modified).toLocaleDateString()}</div></span></a></li>`;}
  function body(node){
    const files=node.children.filter(c=>c.type==='file'),subs=node.children.filter(c=>c.type==='folder');
    if(!files.length&&!subs.length) return '<p class="none">No documents yet.</p>';
    return (files.length?`<ul class="files">${files.map(f=>fileLi(f)).join('')}</ul>`:'')+subs.map(s=>folder(s,'')).join('');
  }
  function folder(n,cls){const c=countFiles(n);return `<details class="folder ${cls}" data-p="${esc(n.name)}"><summary><span class="lbl">${esc(n.name)}</span><span class="count">${c} ${c===1?'doc':'docs'}</span></summary>${body(n)}</details>`;}
  const all=[];(function walk(n){(n.children||[]).forEach(c=>c.type==='file'?all.push(c):walk(c));})(data);
  let sectionsHtml=null;
  function render(){
    const q=search.value.trim();
    if(q){
      const words=q.toLowerCase().split(/\s+/).filter(Boolean);
      const hits=all.filter(f=>words.every(w=>f.path.toLowerCase().includes(w)));
      content.innerHTML=hits.length?`<div class="top"><ul class="files">${hits.map(f=>fileLi(f,true)).join('')}</ul></div>`:'<p class="empty">No documents match “'+esc(q)+'”.</p>';
      return;
    }
    const tops=(data.children||[]).filter(n=>n.type==='folder'),loose=(data.children||[]).filter(n=>n.type==='file');
    if(!tops.length&&!loose.length){content.innerHTML='<p class="empty">No documents yet.</p>';return;}
    content.innerHTML=(loose.length?`<div class="top"><ul class="files">${loose.map(f=>fileLi(f)).join('')}</ul></div>`:'')+tops.map(t=>folder(t,'section')).join('');
  }
  search.addEventListener('input',render);
  render();
})();
