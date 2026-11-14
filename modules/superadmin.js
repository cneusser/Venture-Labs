// ════════════════════════════════════════════════════════════════════
//  SUPERADMIN PAGE
// ════════════════════════════════════════════════════════════════════
function renderSuperPage(){
  const _su=state.currentUser;if(!_su||_su.role!=='superadmin'){navigateTo('dashboard');return;}
  updateStorageStatus();
  const activeTeams=TEAMS.filter(t=>t.status!=='pending'&&t.name&&t.name.trim());
  const totalRev=activeTeams.reduce((s,t)=>s+t.revenue,0);
  const totalP=activeTeams.reduce((s,t)=>s+(t.revenue-t.expenses),0);
  document.getElementById('superStats').innerHTML=`
    <div class="stat-card purple"><div class="stat-label">Aktive Spiele</div><div class="stat-value">${GAMES.filter(g=>g.status==='active').length}</div><div class="stat-sub">${GAMES.length} gesamt</div></div>
    <div class="stat-card"><div class="stat-label">Teams gesamt</div><div class="stat-value">${activeTeams.length}</div><div class="stat-sub">${UNIVERSITIES.length} Hochschulen</div></div>
    <div class="stat-card green"><div class="stat-label">Plattform-Umsatz</div><div class="stat-value">${fmtEur(totalRev)}</div><div class="stat-sub">${fmtEur(totalP)} Gewinn</div></div>
    <div class="stat-card orange"><div class="stat-label">Reflexionen</div><div class="stat-value">${REFLECTIONS.length}</div><div class="stat-sub">${BLOGS.filter(b=>b.status==='pending').length} Blogs pend.</div></div>
    <div class="stat-card gold"><div class="stat-label">Admins</div><div class="stat-value">${ADMINS.length}</div><div class="stat-sub">aktiv</div></div>`;
  renderLeaderboard('superLeaderboard',TEAMS.filter(t=>t.status!=='pending'&&t.name&&t.name.trim()));
  if(state.superChart) state.superChart.destroy();
  const ctx=document.getElementById('superGameChart')?.getContext('2d');
  if(ctx) state.superChart=new Chart(ctx,{type:'bar',data:{labels:GAMES.map(g=>g.name.substring(0,18)+'…'),datasets:[{label:'Teams',data:GAMES.map(g=>g.teamCount),backgroundColor:'#2E75B6'},{label:'Blogs',data:GAMES.map(g=>BLOGS.filter(b=>TEAMS.some(t=>t.id===b.teamId&&t.gameId===g.id)).length),backgroundColor:'#375623'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:11}}}},scales:{y:{beginAtZero:true},x:{grid:{display:false}}}}});
  // Games grid
  document.getElementById('superGamesGrid').innerHTML=GAMES.map(game=>`<div class="game-card">
    <div class="game-card-header"><h3>${game.name}</h3><div class="game-meta">${game.uni} · ${fmtDate(game.start)} – ${fmtDate(game.end)}</div></div>
    <div class="game-card-body">
      <div class="game-badges"><span class="game-badge ${game.status}">${game.status==='active'?'🟢 Aktiv':game.status==='closed'?'🔒 Abgeschlossen':'🟡 Setup'}</span><span class="game-badge ${game.mode==='multi'?'multi':'active'}">${game.mode==='multi'?'🌐 Multi':'🏫 Intern'}</span></div>
      <div class="game-stat-row">
        <div class="game-stat"><div class="game-stat-val">${game.teamCount}</div><div class="game-stat-lbl">Teams</div></div>
        <div class="game-stat"><div class="game-stat-val">${fmtEur(game.capital)}</div><div class="game-stat-lbl">Start</div></div>
      </div>
    </div>
    <div class="game-card-footer" style="gap:6px;flex-wrap:wrap;">
      <button class="btn btn-primary btn-sm" onclick="manageGameAsSuperAdmin('${game.id}')">⚙️ Verwalten</button>
      ${game.status==='closed'
        ? '<span class="tag" style="background:#fee2e2;color:#c00;padding:4px 8px;">🔒 Abgeschlossen</span>'
        : `<button class="btn btn-secondary btn-sm" onclick="closeGame('${game.id}')" style="background:var(--orange)!important;color:white!important;">🔒 Abschließen</button>`}
      <button class="btn btn-outline btn-sm" onclick="toggleGameArchive('${game.id}')" title="${game.archived?'Aus Archiv holen':'Spiel archivieren'}">${game.archived?'📤 De-archivieren':'📦 Archivieren'}</button>
      <button class="btn btn-danger btn-sm" onclick="deleteGame('${game.id}')" style="margin-left:auto;">🗑️ Löschen</button>
    </div>
  </div>`).join('');
  // Admins
  renderSuperAdminList();
  document.getElementById('adminListRows').innerHTML=ADMINS.map(a=>{const game=GAMES.find(g=>g.id===a.gameId);return `<div class="admin-list-row">
    <div><strong>${a.name}</strong><div style="font-size:10px;color:var(--gray-mid);">${a.email}</div></div>
    <div><span class="uni-badge">🏫 ${a.uni}</span></div><div style="font-size:11px;">${game?game.name:'—'}</div>
    <div><span class="blog-status status-approved">✅</span></div>
    <div style="display:flex;gap:3px;"><code style="font-size:10px;background:var(--blue-xlt);padding:2px 6px;border-radius:4px;font-weight:700;">${a.code}</code><button class="btn btn-outline btn-xs" onclick="copyCode('${a.code}')" title="Code kopieren">📋</button><button class="btn btn-secondary btn-xs" onclick="impersonateAdmin('${a.code}')" title="Als dieser Admin einloggen">&#128101; Login</button></div>
  </div>`;}).join('');
  // Universities
  document.getElementById('uniList').innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;">${UNIVERSITIES.map(u=>`<div class="card"><div class="card-body"><div style="font-size:28px;margin-bottom:6px;">🏫</div><div style="font-size:14px;font-weight:700;color:var(--blue-dark);margin-bottom:3px;">${u.name}</div><div style="font-size:12px;color:var(--gray-mid);margin-bottom:10px;">${u.city||'—'} · ${u.slug}</div><div style="display:flex;gap:8px;margin-bottom:10px;"><div class="game-stat" style="flex:1;"><div class="game-stat-val">${u.adminCount||0}</div><div class="game-stat-lbl">Admins</div></div><div class="game-stat" style="flex:1;"><div class="game-stat-val">${u.gameCount||0}</div><div class="game-stat-lbl">Spiele</div></div></div><div style="display:flex;gap:6px;flex-wrap:wrap;"><button class="btn btn-primary btn-sm" onclick="openModal('modalNewAdmin')" title="Neuen Admin anlegen">+ Admin</button><button class="btn btn-outline btn-sm" onclick="editUniversity('${u.id}')" title="Hochschule bearbeiten">✏️</button>${u.id!=='uni-default'?`<button class="btn btn-danger btn-sm" onclick="deleteUniversity('${u.id}')" title="Hochschule löschen">🗑️</button>`:''}</div></div></div>`).join('')}</div>`;
  // Super reflections
  document.getElementById('superReflectionsPanel').innerHTML=REFLECTIONS.length===0?'<div class="empty-state"><div class="empty-icon">💬</div><h3>Keine Reflexionen</h3></div>':
    REFLECTIONS.map(r=>{const m=MEMBERS.find(x=>x.id===r.memberId);const team=TEAMS.find(t=>t.id===r.teamId);
    return `<div class="card" style="margin-bottom:10px;"><div class="card-body"><div style="display:flex;gap:10px;align-items:center;margin-bottom:8px;"><div style="width:28px;height:28px;border-radius:50%;background:${team?.color};color:white;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;">${m?.name?.charAt(0)}</div><div><strong>${m?.name}</strong> <span style="color:var(--gray-mid);font-size:11px;">(${m?.role}) · ${team?.name}</span></div><span style="margin-left:auto;font-size:11px;color:var(--gray-mid);">Woche ${r.week} · ${'😩😟😐😊🚀'.charAt(r.mood-1)} ${r.mood}/5</span></div>
      ${r.experience?`<div style="font-size:12px;color:var(--gray-dark);margin-bottom:3px;">${r.experience}</div>`:''}
      ${r.liked?`<div style="font-size:11px;color:var(--green);margin-bottom:2px;">👍 ${r.liked}</div>`:''}
      ${r.improved?`<div style="font-size:11px;color:var(--orange);">💡 ${r.improved}</div>`:''}
    </div></div>`;}).join('');
}
// ── Game Archiving (v0.94) ────────────────────────────────────────────────
function toggleGameArchive(gameId){
  const game=GAMES.find(g=>g.id===gameId);if(!game) return;
  const willArchive=!game.archived;
  if(willArchive){
    if(!confirm(`Spiel "${game.name}" archivieren?\n\nArchivierte Spiele werden in der Übersicht ausgeblendet und als inaktiv markiert. Daten bleiben vollständig erhalten.`)) return;
    game.archived=true;
    game.archivedAt=new Date().toISOString();
    if(game.status==='active') game.status='closed';
    logEvent('game_archived',{gameId,name:game.name});
    showToast('📦 Spiel "'+game.name+'" archiviert','success');
  } else {
    game.archived=false;
    delete game.archivedAt;
    logEvent('game_unarchived',{gameId,name:game.name});
    showToast('📤 Spiel "'+game.name+'" aus dem Archiv geholt','info');
  }
  saveData();
  renderSuperPage();
}
function getArchivedGames(){ return GAMES.filter(g=>g.archived); }
function getActiveGames(){ return GAMES.filter(g=>!g.archived); }

function switchSuperTab(tabId){
  document.querySelectorAll('#page-superadmin .admin-tab').forEach(t=>t.classList.remove('active'));
  event.currentTarget.classList.add('active');
  document.querySelectorAll('#page-superadmin .admin-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('superPanel-'+tabId)?.classList.add('active');
  if(tabId==='guest-admins') renderGuestAdminList();
  if(tabId==='blogs-super') renderSuperBlogsPanel();
}
function renderSuperBlogsPanel(){
  const gameFilter=document.getElementById('superBlogGameFilter');
  if(gameFilter&&gameFilter.options.length<=1){
    GAMES.forEach(g=>{const o=document.createElement('option');o.value=g.id;o.textContent=g.name||g.id;gameFilter.appendChild(o);});
  }
  const filterVal=gameFilter?.value||'all';
  let blogs=BLOGS.slice();
  if(filterVal!=='all') blogs=blogs.filter(b=>{const t=TEAMS.find(x=>x.id===b.teamId);return t&&t.gameId===filterVal;});
  blogs.sort((a,b)=>(b.week||0)-(a.week||0)||(a.teamId||'').localeCompare(b.teamId||''));
  const el=document.getElementById('superBlogsPanel');
  if(!el) return;
  if(blogs.length===0){el.innerHTML='<div class="empty-state"><div class="empty-icon">📖</div><h3>Keine Wochenberichte</h3></div>';return;}
  el.innerHTML=blogs.map(b=>{
    const team=TEAMS.find(t=>t.id===b.teamId);
    const game=GAMES.find(g=>g.id===team?.gameId);
    const statusLabel=b.status==='approved'?'<span class="tag" style="background:#dcfce7;color:#16a34a;">✅ Freigegeben</span>':b.status==='pending'?'<span class="tag" style="background:#fef9c3;color:#a16207;">⏳ Ausstehend</span>':'<span class="tag" style="background:#f1f5f9;color:#64748b;">📄 Entwurf</span>';
    const moodEmoji=['','😩','😟','😐','😊','🚀'][b.mood]||'';
    return `<div class="card" style="margin-bottom:12px;"><div class="card-body">
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px;flex-wrap:wrap;">
        <span style="font-size:20px;">${team?.logo||'📋'}</span>
        <div><strong>${team?.name||b.teamId}</strong> <span style="color:var(--gray-mid);font-size:11px;">${game?.name||''}</span></div>
        <div style="margin-left:auto;display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
          <span style="font-size:11px;color:var(--gray-mid);">Woche ${b.week} ${moodEmoji}</span>
          ${statusLabel}
        </div>
      </div>
      ${b.summary?`<div style="font-size:13px;font-weight:600;margin-bottom:4px;">${b.summary}</div>`:''}
      ${b.content?`<div style="font-size:12px;color:var(--gray-dark);margin-bottom:6px;white-space:pre-wrap;">${b.content}</div>`:''}
      ${b.challenge?`<div style="font-size:11px;color:var(--orange);margin-bottom:2px;">⚡ Herausforderung: ${b.challenge}</div>`:''}
      ${b.nextWeek?`<div style="font-size:11px;color:var(--blue-dark);">🎯 Nächste Woche: ${b.nextWeek}</div>`:''}
    </div></div>`;
  }).join('');
}
function exportSuperBlogsCSV(){
  const filterVal=document.getElementById('superBlogGameFilter')?.value||'all';
  let blogs=BLOGS.slice();
  if(filterVal!=='all') blogs=blogs.filter(b=>{const t=TEAMS.find(x=>x.id===b.teamId);return t&&t.gameId===filterVal;});
  blogs.sort((a,b)=>(b.week||0)-(a.week||0));
  const rows=[['Spiel','Team','Woche','Status','Stimmung','Zusammenfassung','Inhalt','Herausforderung','Nächste Woche']];
  blogs.forEach(b=>{
    const team=TEAMS.find(t=>t.id===b.teamId);
    const game=GAMES.find(g=>g.id===team?.gameId);
    rows.push([game?.name||'',team?.name||b.teamId,b.week||'',b.status||'',b.mood||'',b.summary||'',b.content||'',b.challenge||'',b.nextWeek||'']);
  });
  const csv=rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
  const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent('\uFEFF'+csv);a.download='wochenberichte_super.csv';a.click();
}
function exportSuperBlogsPDF(){
  const filterVal=document.getElementById('superBlogGameFilter')?.value||'all';
  let blogs=BLOGS.slice();
  if(filterVal!=='all') blogs=blogs.filter(b=>{const t=TEAMS.find(x=>x.id===b.teamId);return t&&t.gameId===filterVal;});
  blogs.sort((a,b)=>(b.week||0)-(a.week||0));
  let html='<html><head><meta charset="UTF-8"><style>body{font-family:sans-serif;font-size:12px;margin:20px;}h1{font-size:16px;}h2{font-size:13px;margin-top:16px;border-bottom:1px solid #ccc;padding-bottom:4px;}p{margin:4px 0;}.tag{display:inline-block;padding:1px 6px;border-radius:4px;font-size:10px;}</style></head><body><h1>📋 Alle Wochenberichte (Plattform-Export)</h1>';
  blogs.forEach(b=>{
    const team=TEAMS.find(t=>t.id===b.teamId);
    const game=GAMES.find(g=>g.id===team?.gameId);
    const statusLabel=b.status==='approved'?'✅ Freigegeben':b.status==='pending'?'⏳ Ausstehend':'📄 Entwurf';
    html+=`<h2>${team?.logo||''} ${team?.name||b.teamId} – Woche ${b.week} [${statusLabel}] <span style="color:#888;font-size:10px;">${game?.name||''}</span></h2>`;
    if(b.summary) html+=`<p><strong>${b.summary}</strong></p>`;
    if(b.content) html+=`<p>${(b.content||'').replace(/\n/g,'<br>')}</p>`;
    if(b.challenge) html+=`<p>⚡ <strong>Herausforderung:</strong> ${b.challenge}</p>`;
    if(b.nextWeek) html+=`<p>🎯 <strong>Nächste Woche:</strong> ${b.nextWeek}</p>`;
  });
  html+='</body></html>';
  const w=window.open('','_blank');w.document.write(html);w.document.close();setTimeout(()=>w.print(),400);
}

