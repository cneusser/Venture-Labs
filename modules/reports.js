// ════════════════════════════════════════════════════════════════════
//  FEATURE (d): EXPORT / REPORTING
// ════════════════════════════════════════════════════════════════════
function renderAdminBlogsPanel(){
  const u=state.currentUser;
  const effectiveGameId=state.managingGameId||u?.gameId;
  const gameTeams=TEAMS.filter(t=>t.gameId===effectiveGameId&&t.status!=='pending'&&t.name&&t.name.trim());
  const tSel=document.getElementById('adminBlogTeamFilter');
  if(tSel){
    const prev=tSel.value;
    while(tSel.options.length>1) tSel.remove(1);
    gameTeams.forEach(t=>{const o=new Option(t.logo+' '+t.name,t.id);tSel.appendChild(o);});
    if(prev&&prev!=='all'&&gameTeams.some(t=>t.id===prev)) tSel.value=prev;
  }
  const tf=document.getElementById('adminBlogTeamFilter')?.value||'all';
  const wf=document.getElementById('adminBlogWeekFilter')?.value||'all';
  let blogs=BLOGS.filter(b=>{
    const teamOk=gameTeams.some(t=>t.id===b.teamId);
    const fT=tf==='all'||b.teamId===tf;
    const fW=wf==='all'||b.week==wf;
    return teamOk&&fT&&fW;
  }).sort((a,b)=>b.week-a.week||(a.teamId>b.teamId?1:-1));
  const el=document.getElementById('adminBlogsPanel');
  if(!el) return;
  if(blogs.length===0){el.innerHTML='<div class="empty-state"><div class="empty-icon">📖</div><h3>Keine Berichte</h3><p>Noch keine Wochenberichte für dieses Spiel.</p></div>';return;}
  const statusLabel=s=>s==='approved'?'<span class="tag" style="background:#dcfce7;color:#16a34a;">✅ Freigegeben</span>':s==='pending'?'<span class="tag" style="background:#fef9c3;color:#a16207;">⏳ Ausstehend</span>':'<span class="tag" style="background:#f1f5f9;color:#64748b;">📄 Entwurf</span>';
  // Build blog status grid
  const allBlogWeeks=[...new Set(BLOGS.filter(b=>gameTeams.some(t=>t.id===b.teamId)).map(b=>b.week))].sort((a,b)=>a-b);
  const blogStatusGrid=allBlogWeeks.length===0?'':
    `<div class="card" style="margin-bottom:16px;"><div class="card-header"><h3>📊 Abgabe-Status Wochenberichte</h3></div><div class="card-body" style="padding:12px;">
      ${allBlogWeeks.map(w=>`
        <div style="margin-bottom:10px;">
          <div style="font-weight:700;font-size:12px;color:var(--gray-mid);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px;">Woche ${w}</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;">
            ${gameTeams.map(team=>{
              const blog=BLOGS.find(b=>b.teamId===team.id&&b.week===w);
              const bg=blog?blog.status==='approved'?team.color+'22':'#fef9c3':blog===undefined&&w<=(team.currentWeek||1)?'#fee2e2':'#F3F4F6';
              const col=blog?blog.status==='approved'?team.color:blog.status==='pending'?'#a16207':'#64748b':w<=(team.currentWeek||1)?'#b91c1c':'#9CA3AF';
              const border=blog?blog.status==='approved'?team.color+'55':blog.status==='pending'?'#fbbf24':'#cbd5e1':'#E5E7EB';
              const lbl=blog?blog.status==='approved'?'✅':blog.status==='pending'?'⏳':'📄':'✗';
              const cursor=blog?'pointer':'default';
              const onclick=blog?`onclick="var el=document.getElementById('blogcard-${blog.id}');el&&(el.scrollIntoView({behavior:'smooth',block:'center'}),el.style.outline='3px solid ${team.color}',setTimeout(function(){el.style.outline=''},1800))"` :'';
              return `<span style="padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;cursor:${cursor};background:${bg};color:${col};border:1px solid ${border};white-space:nowrap;" title="${blog?blog.status==='approved'?'Freigegeben':blog.status==='pending'?'Ausstehend':'Entwurf':'Kein Bericht'}" ${onclick}>${team.logo} ${team.name} ${lbl}</span>`;
            }).join('')}
          </div>
        </div>
      `).join('')}
    </div></div>`;
  el.innerHTML=blogStatusGrid+blogs.map(b=>{
    const team=TEAMS.find(t=>t.id===b.teamId);
    const moodEmoji=['','😩','😟','😐','😊','🚀'][b.mood]||'';
    const refsForWeek=REFLECTIONS.filter(r=>r.teamId===b.teamId&&r.week===b.week);
    const teamMembersAll=MEMBERS.filter(m=>m.teamId===b.teamId);
    const teamMembers=_deduplicateMembers(teamMembersAll,[]);
    const refStatus=teamMembers.map(m=>{const covered=_isMemberRefCovered(m,refsForWeek,teamMembersAll);return `<span class="tag" style="background:${covered?'#dcfce7':'#fee2e2'};color:${covered?'#15803d':'#b91c1c'};">${m.name.split(' ')[0]} ${covered?'✓':'✗'}</span>`;}).join(' ');
    return `<div class="card" id="blogcard-${b.id}" style="margin-bottom:12px;">
      <div class="card-header" style="flex-wrap:wrap;gap:6px;">
        <div>
          <span style="font-size:20px;margin-right:8px;">${team?.logo||'📋'}</span>
          <strong>${team?.name||b.teamId}</strong> · Woche ${b.week} · ${fmtDate(b.date)}
        </div>
        <div style="display:flex;gap:6px;align-items:center;">${statusLabel(b.status)} ${moodEmoji?`<span title="Stimmung">${moodEmoji} ${b.mood}/5</span>`:''}</div>
      </div>
      <div class="card-body">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:8px;">${b.title}</h3>
        ${b.highlight?`<div style="background:var(--green-lt);color:var(--green);padding:6px 10px;border-radius:6px;font-size:12px;font-weight:600;margin-bottom:8px;">⭐ ${b.highlight}</div>`:''}
        <p style="font-size:13px;color:var(--gray-dark);margin-bottom:4px;">${(b.body||'').substring(0,300)}${b.body&&b.body.length>300?'…':''}</p>
        ${b.body&&b.body.length>300?`<button class="btn btn-outline btn-xs" style="margin-bottom:8px;" onclick="openBlogDetailAdmin('${b.id}')">📖 Vollständig lesen</button>`:''}
        ${b.challenges?`<div style="font-size:12px;color:var(--orange);margin-bottom:4px;">⚠️ <strong>Herausforderungen:</strong> ${b.challenges}</div>`:''}
        ${b.nextSteps?`<div style="font-size:12px;color:var(--blue);margin-bottom:8px;">▶️ <strong>Nächste Schritte:</strong> ${b.nextSteps}</div>`:''}
        ${b.adminFeedback?`<div class="info-box blue" style="margin-top:8px;padding:8px 12px;font-size:12px;"><strong>💬 Feedback:</strong> ${b.adminFeedback}</div>`:''}
        <div style="margin-top:10px;border-top:1px solid var(--border);padding-top:8px;">
          <div style="font-size:11px;font-weight:600;color:var(--gray-mid);margin-bottom:4px;">📝 Reflexionen W${b.week}:</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;">${refStatus}</div>
        </div>
        ${b.status==='pending'?`<div style="display:flex;gap:8px;margin-top:10px;">
          <button class="btn btn-success btn-sm" onclick="quickApprove('${b.id}');renderAdminBlogsPanel()">✅ Freigeben</button>
          <button class="btn btn-outline btn-sm" onclick="rejectBlog('${b.id}');renderAdminBlogsPanel()">🔄 Überarbeitung</button>
          <button class="btn btn-outline btn-xs" onclick="openBlogDetailAdmin('${b.id}')">📖 Vollständig lesen</button>
        </div>`:`<div style="margin-top:8px;"><button class="btn btn-outline btn-xs" onclick="openBlogDetailAdmin('${b.id}')">📖 Vollständig lesen</button></div>`}
      </div>
    </div>`;}).join('');
}
function openBlogDetailAdmin(blogId){
  const b=BLOGS.find(x=>x.id===blogId);if(!b) return;
  const team=TEAMS.find(t=>t.id===b.teamId);
  const game=GAMES.find(g=>g.id===(state.managingGameId||(state.currentUser?.gameId)));
  const moodEmoji=['','😩','😟','😐','😊','🚀'];
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>${team?.name||''} – Wochenbericht W${b.week}</title>
  <style>
    body{font-family:Arial,sans-serif;max-width:800px;margin:30px auto;padding:0 20px;color:#1a1a2e;font-size:14px;line-height:1.6;}
    h1{font-size:22px;margin-bottom:4px;}
    .meta{color:#666;font-size:12px;margin-bottom:20px;}
    .section{margin-bottom:16px;}
    .section-title{font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#555;margin-bottom:4px;}
    .highlight{background:#fef3c7;border-left:3px solid #f59e0b;padding:8px 12px;border-radius:4px;font-weight:600;}
    .challenges{background:#fff7ed;border-left:3px solid #f97316;padding:8px 12px;border-radius:4px;}
    .nextsteps{background:#eff6ff;border-left:3px solid #3b82f6;padding:8px 12px;border-radius:4px;}
    .feedback{background:#f0fdf4;border-left:3px solid #22c55e;padding:8px 12px;border-radius:4px;}
    .body-text{white-space:pre-wrap;background:#f9fafb;padding:14px;border-radius:6px;border:1px solid #e5e7eb;}
    @media print{.no-print{display:none}}
  </style></head><body>
  <button class="no-print" onclick="window.print()" style="background:#2E75B6;color:white;border:none;padding:8px 18px;border-radius:6px;cursor:pointer;margin-bottom:20px;font-size:14px;">🖨️ Drucken / PDF speichern</button>
  <h1>${team?.logo||'📋'} ${team?.name||''} – Wochenbericht Woche ${b.week}</h1>
  <div class="meta">${b.date||'—'} · Status: ${b.status==='approved'?'✅ Freigegeben':b.status==='pending'?'⏳ Ausstehend':'📄 Entwurf'} · Stimmung: ${moodEmoji[b.mood]||''} ${b.mood}/5 · Spiel: ${game?.name||''}</div>
  <div class="section"><div class="section-title">📰 Titel</div><div style="font-size:16px;font-weight:700;">${b.title||'—'}</div></div>
  ${b.highlight?`<div class="section"><div class="section-title">⭐ Highlight der Woche</div><div class="highlight">${b.highlight}</div></div>`:''}
  <div class="section"><div class="section-title">📝 Wochenbericht</div><div class="body-text">${(b.body||'—').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div></div>
  ${b.challenges?`<div class="section"><div class="section-title">⚠️ Herausforderungen</div><div class="challenges">${b.challenges}</div></div>`:''}
  ${b.nextSteps?`<div class="section"><div class="section-title">▶️ Nächste Schritte</div><div class="nextsteps">${b.nextSteps}</div></div>`:''}
  ${b.adminFeedback?`<div class="section"><div class="section-title">💬 Dozenten-Feedback</div><div class="feedback">${b.adminFeedback}</div></div>`:''}
  </body></html>`;
  const w=window.open('','_blank');
  if(w){w.document.write(html);w.document.close();}
  else{showToast('Bitte Popup-Blocker deaktivieren','error');}
}
function exportBlogsCSV(){
  const u=state.currentUser;
  const effectiveGameId=state.managingGameId||u?.gameId;
  if(!effectiveGameId){showToast('Kein Spiel ausgewählt','error');return;}
  const gameTeams=TEAMS.filter(t=>t.gameId===effectiveGameId&&t.status!=='pending');
  const tf=document.getElementById('adminBlogTeamFilter')?.value||'all';
  const wf=document.getElementById('adminBlogWeekFilter')?.value||'all';
  let blogs=BLOGS.filter(b=>{
    const teamOk=gameTeams.some(t=>t.id===b.teamId);
    const fT=tf==='all'||b.teamId===tf;
    const fW=wf==='all'||String(b.week)===String(wf);
    return teamOk&&fT&&fW;
  });
  if(blogs.length===0){showToast('Keine Berichte für die aktuellen Filter gefunden','info');return;}
  const esc=v=>('"'+(String(v||'')).replace(/"/g,"''").replace(/\n/g,' ')+'"');
  const header='Woche,Datum,Team,Titel,Status,Stimmung,Volltext Wochenbericht,Highlight,Herausforderungen,Naechste Schritte,Feedback,Spiel';
  const rows=blogs.map(b=>{
    const team=TEAMS.find(t=>t.id===b.teamId);
    const game=GAMES.find(g=>g.id===effectiveGameId);
    return [b.week||'',b.date||'',team?.name||'',b.title||'',b.status||'',b.mood||'',b.body||'',b.highlight||'',b.challenges||'',b.nextSteps||'',b.adminFeedback||'',game?.name||''].map(esc).join(',');
  }).join('\n');
  _downloadCSV(header+'\n'+rows,'venturelab_berichte_'+new Date().toISOString().split('T')[0]+'.csv');
  showToast('&#128229; '+blogs.length+' Berichte exportiert','success');
}
// v0.8.5: Admin blog creation / restore tool
function openAdminCreateBlog(){
  const u=state.currentUser;
  const effectiveGameId=state.managingGameId||u?.gameId;
  const gameTeams=TEAMS.filter(t=>t.gameId===effectiveGameId&&t.status!=='pending'&&t.name&&t.name.trim());
  const sel=document.getElementById('acbTeam');
  if(sel){
    sel.innerHTML='<option value="">— Team auswählen —</option>';
    gameTeams.forEach(t=>{
      const opt=document.createElement('option');
      opt.value=t.id;
      opt.textContent=(t.logo||'')+'  '+t.name;
      sel.appendChild(opt);
    });
  }
  const dateEl=document.getElementById('acbDate');
  if(dateEl) dateEl.value=new Date().toISOString().split('T')[0];
  openModal('modalAdminCreateBlog');
}
function adminCreateBlog(){
  const teamId=document.getElementById('acbTeam').value;
  const week=parseInt(document.getElementById('acbWeek').value)||1;
  const title=document.getElementById('acbTitle').value.trim();
  if(!teamId){showToast('Bitte ein Team auswählen','error');return;}
  if(!title){showToast('Bitte einen Titel eingeben','error');return;}
  const team=TEAMS.find(t=>t.id===teamId);
  if(!team){showToast('Team nicht gefunden','error');return;}
  // Check if a blog for this team+week already exists
  const existing=BLOGS.find(b=>b.teamId===teamId&&b.week===week);
  if(existing){
    if(!confirm('Für '+team.name+' Woche '+week+' existiert bereits ein Bericht. Trotzdem einen neuen anlegen?')) return;
  }
  const blog={
    id:'b'+Date.now(),
    teamId,
    week,
    title,
    body:document.getElementById('acbBody').value||'',
    highlight:document.getElementById('acbHighlight').value||'',
    challenges:document.getElementById('acbChallenges').value||'',
    nextSteps:document.getElementById('acbNextSteps').value||'',
    adminFeedback:document.getElementById('acbFeedback').value||'',
    mood:parseInt(document.getElementById('acbMood').value)||3,
    tags:[],
    date:document.getElementById('acbDate').value||new Date().toISOString().split('T')[0],
    status:'approved',
    _restoredByAdmin:true,
  };
  BLOGS.push(blog);
  saveData();
  closeModal('modalAdminCreateBlog');
  renderAdminBlogsPanel();
  showToast('✅ Bericht für '+team.name+' Woche '+week+' gespeichert','success');
  // Log activity
  if(typeof logActivity==='function') logActivity('admin_blog_create','Bericht angelegt: '+team.name+' W'+week+' – '+title);
}
function exportBlogsPDF(){
  const u=state.currentUser;
  const effectiveGameId=state.managingGameId||u?.gameId;
  if(!effectiveGameId){showToast('Kein Spiel ausgewählt','error');return;}
  const gameTeams=TEAMS.filter(t=>t.gameId===effectiveGameId&&t.status!=='pending');
  const tf=document.getElementById('adminBlogTeamFilter')?.value||'all';
  const wf=document.getElementById('adminBlogWeekFilter')?.value||'all';
  let blogs=BLOGS.filter(b=>{
    const teamOk=gameTeams.some(t=>t.id===b.teamId);
    const fT=tf==='all'||b.teamId===tf;
    const fW=wf==='all'||String(b.week)===String(wf);
    return teamOk&&fT&&fW;
  }).sort((a,b)=>b.week-a.week||(a.teamId>b.teamId?1:-1));
  if(blogs.length===0){showToast('Keine Berichte für die aktuellen Filter gefunden','info');return;}
  const game=GAMES.find(g=>g.id===effectiveGameId);
  const moodEmoji=['','😩','😟','😐','😊','🚀'];
  const cards=blogs.map(b=>{
    const team=TEAMS.find(t=>t.id===b.teamId);
    return `<div style="page-break-inside:avoid;border:1px solid #ddd;border-radius:6px;padding:16px;margin-bottom:18px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;flex-wrap:wrap;gap:6px;">
        <div><span style="font-size:20px;">${team?.logo||'📋'}</span> <strong style="font-size:15px;">${team?.name||''}</strong> · Woche ${b.week}</div>
        <div style="font-size:12px;color:#555;">${b.date||''} · ${moodEmoji[b.mood]||''} ${b.mood}/5 · ${b.status==='approved'?'✅ Freigegeben':b.status==='pending'?'⏳ Ausstehend':'📄 Entwurf'}</div>
      </div>
      <div style="font-size:15px;font-weight:700;margin-bottom:8px;">${b.title||''}</div>
      ${b.highlight?`<div style="background:#fef3c7;border-left:3px solid #f59e0b;padding:6px 10px;border-radius:4px;font-size:12px;font-weight:600;margin-bottom:8px;">⭐ ${b.highlight}</div>`:''}
      <div style="font-size:12px;color:#333;white-space:pre-wrap;background:#f9fafb;padding:10px;border-radius:4px;margin-bottom:8px;">${(b.body||'').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
      ${b.challenges?`<div style="font-size:12px;color:#c2410c;margin-bottom:4px;">⚠️ <strong>Herausforderungen:</strong> ${b.challenges}</div>`:''}
      ${b.nextSteps?`<div style="font-size:12px;color:#1d4ed8;margin-bottom:4px;">▶️ <strong>Nächste Schritte:</strong> ${b.nextSteps}</div>`:''}
      ${b.adminFeedback?`<div style="font-size:12px;color:#15803d;margin-top:6px;background:#f0fdf4;padding:6px 10px;border-radius:4px;">💬 <strong>Feedback:</strong> ${b.adminFeedback}</div>`:''}
    </div>`;
  }).join('');
  const filterLabel=(tf!=='all'?(TEAMS.find(t=>t.id===tf)?.name||tf):'Alle Teams')+' · '+(wf!=='all'?'Woche '+wf:'Alle Wochen');
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Wochenberichte – ${game?.name||''}</title>
  <style>body{font-family:Arial,sans-serif;margin:20px;font-size:13px;color:#222;}h1{font-size:18px;margin-bottom:4px;}h2{font-size:13px;color:#666;font-weight:normal;margin-bottom:20px;}@media print{.no-print{display:none}}</style>
  </head><body>
  <button class="no-print" onclick="window.print()" style="background:#2E75B6;color:white;border:none;padding:8px 18px;border-radius:6px;cursor:pointer;margin-bottom:16px;font-size:14px;">🖨️ Drucken / PDF speichern</button>
  <h1>📋 Wochenberichte – ${game?.name||effectiveGameId}</h1>
  <h2>${filterLabel} · ${blogs.length} Berichte · Exportiert am ${new Date().toLocaleDateString('de-DE')}</h2>
  ${cards}
  </body></html>`;
  const w=window.open('','_blank');
  if(w){w.document.write(html);w.document.close();}
  else{showToast('Bitte Popup-Blocker deaktivieren','error');}
}
function exportReflectionsCSV(){
  const u=state.currentUser;
  const effectiveGameId=state.managingGameId||u?.gameId;
  if(!effectiveGameId){showToast('Kein Spiel ausgewählt','error');return;}
  const gameTeams=TEAMS.filter(t=>t.gameId===effectiveGameId&&t.status!=='pending');
  const tf=document.getElementById('adminRefTeamFilter')?.value||'all';
  const wf=document.getElementById('adminRefWeekFilter')?.value||'all';
  let refs=REFLECTIONS.filter(r=>{
    const teamOk=gameTeams.some(t=>t.id===r.teamId);
    const fT=tf==='all'||r.teamId===tf;
    const fW=wf==='all'||String(r.week)===String(wf);
    return teamOk&&fT&&fW;
  });
  if(refs.length===0){showToast('Keine Reflexionen für die aktuellen Filter gefunden','info');return;}
  const esc=v=>('"'+(String(v||'')).replace(/"/g,"''").replace(/\n/g,' ')+'"');
  const header='Datum,Woche,Name,Rolle,Team,Stimmung,Erfahrungen,Was war gut,Verbesserungen,Eigene Rolle,MVP-Vote';
  const rows=refs.map(r=>{
    const m=MEMBERS.find(x=>x.id===r.memberId);
    const team=TEAMS.find(t=>t.id===r.teamId);
    return [r.date||'',r.week||'',m?.name||'',m?.role||'',team?.name||'',r.mood||'',r.experience||'',r.liked||'',r.improved||'',r.role||'',MEMBERS.find(x=>x.id===r.mvpVote)?.name||''].map(esc).join(',');
  }).join('\n');
  _downloadCSV(header+'\n'+rows,'venturelab_reflexionen_'+new Date().toISOString().split('T')[0]+'.csv');
  showToast('&#128229; '+refs.length+' Reflexionen exportiert','success');
}
function exportReflectionsPDF(){
  const u=state.currentUser;
  const effectiveGameId=state.managingGameId||u?.gameId;
  if(!effectiveGameId){showToast('Kein Spiel ausgewählt','error');return;}
  const gameTeams=TEAMS.filter(t=>t.gameId===effectiveGameId&&t.status!=='pending');
  const tf=document.getElementById('adminRefTeamFilter')?.value||'all';
  const wf=document.getElementById('adminRefWeekFilter')?.value||'all';
  let refs=REFLECTIONS.filter(r=>{
    const teamOk=gameTeams.some(t=>t.id===r.teamId);
    const fT=tf==='all'||r.teamId===tf;
    const fW=wf==='all'||String(r.week)===String(wf);
    return teamOk&&fT&&fW;
  });
  if(refs.length===0){showToast('Keine Reflexionen für die aktuellen Filter gefunden','info');return;}
  const game=GAMES.find(g=>g.id===effectiveGameId);
  const moodEmoji=['','😩','😟','😐','😊','🚀'];
  const cards=refs.map(r=>{
    const m=MEMBERS.find(x=>x.id===r.memberId);
    const team=TEAMS.find(t=>t.id===r.teamId);
    return `<div style="page-break-inside:avoid;border:1px solid #ddd;border-radius:6px;padding:14px;margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <div><strong>${m?.name||'—'}</strong> <span style="color:#666;font-size:12px;">(${m?.role||'—'})</span> · <span style="color:#666;font-size:12px;">${team?.logo||''} ${team?.name||'—'}</span></div>
        <div style="font-size:12px;color:#555;">${moodEmoji[r.mood]||''} ${r.mood}/5 · Woche ${r.week}${r.date?' · '+r.date:''}</div>
      </div>
      ${r.experience?`<div style="font-size:12px;margin-bottom:4px;"><strong>Erfahrungen:</strong> ${r.experience}</div>`:''}
      ${r.liked?`<div style="font-size:12px;color:#16a34a;margin-bottom:4px;">👍 Was war gut: ${r.liked}</div>`:''}
      ${r.improved?`<div style="font-size:12px;color:#d97706;margin-bottom:4px;">💡 Verbesserungen: ${r.improved}</div>`:''}
      ${r.role?`<div style="font-size:12px;margin-bottom:4px;"><strong>Eigene Rolle:</strong> ${r.role}</div>`:''}
      ${r.mvpVote?`<div style="font-size:11px;color:#7c3aed;">⭐ MVP-Vote: ${MEMBERS.find(x=>x.id===r.mvpVote)?.name||'—'}</div>`:''}
    </div>`;
  }).join('');
  const filterLabel=(tf!=='all'?(TEAMS.find(t=>t.id===tf)?.name||tf):'Alle Teams')+' · '+(wf!=='all'?'Woche '+wf:'Alle Wochen');
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reflexionen – ${game?.name||''}</title>
  <style>body{font-family:Arial,sans-serif;margin:20px;font-size:13px;color:#222;}h1{font-size:18px;margin-bottom:4px;}h2{font-size:13px;color:#666;font-weight:normal;margin-bottom:20px;}@media print{.no-print{display:none}}</style>
  </head><body>
  <button class="no-print" onclick="window.print()" style="background:#2E75B6;color:white;border:none;padding:8px 18px;border-radius:6px;cursor:pointer;margin-bottom:16px;font-size:14px;">🖨️ Drucken / PDF speichern</button>
  <h1>📝 Reflexionen – ${game?.name||effectiveGameId}</h1>
  <h2>${filterLabel} · ${refs.length} Einträge · Exportiert am ${new Date().toLocaleDateString('de-DE')}</h2>
  ${cards}
  </body></html>`;
  const w=window.open('','_blank');
  if(w){w.document.write(html);w.document.close();}
  else{showToast('Bitte Popup-Blocker deaktivieren','error');}
}
// ════════════════════════════════════════════════════════════════════
//  ITEM 8 (v0.94): Semester-PDF-Export pro Team
// ════════════════════════════════════════════════════════════════════
function exportTeamSemesterPDF(teamId){
  const team=TEAMS.find(t=>t.id===teamId);
  if(!team){showToast('Team nicht gefunden','error');return;}
  const game=GAMES.find(g=>g.id===team.gameId);
  const members=MEMBERS.filter(m=>m.teamId===teamId);
  const blogs=BLOGS.filter(b=>b.teamId===teamId).sort((a,b)=>a.week-b.week);
  const refs=REFLECTIONS.filter(r=>r.teamId===teamId).sort((a,b)=>a.week-b.week||(a.memberId>b.memberId?1:-1));
  const txs=TRANSACTIONS.filter(tx=>tx.teamId===teamId).sort((a,b)=>a.date>b.date?1:-1);
  const moodEmoji=['','😩','😟','😐','😊','🚀'];

  // ── KPIs ─────────────────────────────────────────────────────────
  const totalRev=txs.filter(tx=>tx.type==='income').reduce((s,tx)=>s+(tx.amount||0),0);
  const totalExp=txs.filter(tx=>tx.type==='expense').reduce((s,tx)=>s+(tx.amount||0),0);
  const profit=totalRev-totalExp;
  const avgMood=refs.filter(r=>r.mood).length?+(refs.reduce((s,r)=>s+(r.mood||0),0)/refs.filter(r=>r.mood).length).toFixed(1):0;
  const compRate=members.length*(team.currentWeek||1)>0?Math.round(refs.length/(members.length*(team.currentWeek||1))*100):0;

  // ── Blog sections ─────────────────────────────────────────────────
  const blogHtml=blogs.length===0?'<p style="color:#888;">Keine Wochenberichte vorhanden.</p>':
    blogs.map(b=>`
    <div style="page-break-inside:avoid;border:1px solid #ddd;border-radius:6px;padding:14px;margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <strong>Woche ${b.week} · ${b.date||''}</strong>
        <span style="font-size:12px;color:#555;">${moodEmoji[b.mood]||''} ${b.mood}/5 · ${b.status==='approved'?'✅ Freigegeben':'⏳ Ausstehend'}</span>
      </div>
      <div style="font-size:15px;font-weight:700;margin-bottom:6px;">${b.title||'—'}</div>
      ${b.highlight?`<div style="background:#fef3c7;border-left:3px solid #f59e0b;padding:6px 10px;border-radius:4px;font-size:12px;font-weight:600;margin-bottom:8px;">⭐ ${b.highlight}</div>`:''}
      <div style="font-size:12px;color:#333;white-space:pre-wrap;background:#f9fafb;padding:10px;border-radius:4px;margin-bottom:8px;">${(b.body||'—').replace(/</g,'&lt;')}</div>
      ${b.challenges?`<p style="font-size:12px;color:#c2410c;">⚠️ <strong>Herausforderungen:</strong> ${b.challenges}</p>`:''}
      ${b.nextSteps?`<p style="font-size:12px;color:#1d4ed8;">▶️ <strong>Nächste Schritte:</strong> ${b.nextSteps}</p>`:''}
      ${b.adminFeedback?`<div style="background:#f0fdf4;border-left:3px solid #22c55e;padding:6px 10px;border-radius:4px;font-size:12px;">💬 <strong>Dozenten-Feedback:</strong> ${b.adminFeedback}</div>`:''}
    </div>`).join('');

  // ── Reflections by member ─────────────────────────────────────────
  const refHtml=refs.length===0?'<p style="color:#888;">Keine Reflexionen vorhanden.</p>':
    refs.map(r=>{
      const m=MEMBERS.find(x=>x.id===r.memberId);
      return `<div style="page-break-inside:avoid;border:1px solid #e5e7eb;border-radius:6px;padding:12px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <strong>${m?.name||'—'}</strong> <span style="color:#555;font-size:11px;">(${m?.role||'—'}) · Woche ${r.week}${r.date?' · '+r.date:''}</span>
          <span style="font-size:12px;">${moodEmoji[r.mood]||''} ${r.mood}/5</span>
        </div>
        ${r.experience?`<p style="font-size:12px;margin-bottom:4px;"><strong>Erfahrungen:</strong> ${r.experience}</p>`:''}
        ${r.liked?`<p style="font-size:12px;color:#16a34a;margin-bottom:4px;">👍 Was war gut: ${r.liked}</p>`:''}
        ${r.improved?`<p style="font-size:12px;color:#d97706;margin-bottom:4px;">💡 Verbesserungen: ${r.improved}</p>`:''}
        ${r.role?`<p style="font-size:12px;margin-bottom:4px;"><strong>Eigene Rolle:</strong> ${r.role}</p>`:''}
      </div>`;
    }).join('');

  // ── Transactions table ────────────────────────────────────────────
  const txHtml=txs.length===0?'<p style="color:#888;">Keine Buchungen vorhanden.</p>':
    `<table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead><tr style="background:#1A2C5A;color:white;">
        <th style="padding:7px 10px;text-align:left;">Datum</th>
        <th style="padding:7px 10px;text-align:left;">Beschreibung</th>
        <th style="padding:7px 10px;text-align:left;">Kategorie</th>
        <th style="padding:7px 10px;text-align:right;">Betrag</th>
      </tr></thead>
      <tbody>${txs.map((tx,i)=>`<tr style="background:${i%2===0?'#fff':'#f9fafb'};">
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${tx.date||''}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${tx.desc||''}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${tx.cat||''}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;color:${tx.type==='income'?'#15803d':'#b91c1c'};font-weight:600;">${tx.type==='income'?'+':'-'}${(tx.amount||0).toFixed(2)} €</td>
      </tr>`).join('')}
      <tr style="background:#f1f5f9;font-weight:700;">
        <td colspan="3" style="padding:8px 10px;">Ergebnis</td>
        <td style="padding:8px 10px;text-align:right;color:${profit>=0?'#15803d':'#b91c1c'};">${profit>=0?'+':''}${profit.toFixed(2)} €</td>
      </tr></tbody>
    </table>`;

  // ── Assemble full HTML ────────────────────────────────────────────
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Semesterbericht – ${team.logo||''} ${team.name}</title>
  <style>
    body{font-family:Arial,sans-serif;max-width:860px;margin:30px auto;padding:0 24px;font-size:13px;color:#1a1a2e;line-height:1.6;}
    h1{font-size:22px;margin-bottom:4px;}h2{font-size:12px;color:#555;font-weight:normal;margin-bottom:24px;}
    h3{font-size:15px;font-weight:700;border-bottom:2px solid #1A2C5A;padding-bottom:6px;margin:28px 0 14px;}
    .kpi-row{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:28px;}
    .kpi{background:#f1f5f9;border-radius:8px;padding:10px;text-align:center;}
    .kpi-val{font-size:20px;font-weight:800;color:#1A2C5A;}.kpi-lbl{font-size:10px;color:#64748b;}
    .member-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;}
    .member-chip{background:#dbeafe;color:#1d4ed8;border-radius:20px;padding:4px 12px;font-size:12px;font-weight:600;}
    @media print{.no-print{display:none;}body{margin:10px;}}
  </style></head><body>
  <button class="no-print" onclick="window.print()" style="background:#1A2C5A;color:white;border:none;padding:8px 18px;border-radius:6px;cursor:pointer;margin-bottom:20px;font-size:14px;">🖨️ Drucken / PDF speichern</button>

  <h1>${team.logo||'📋'} ${team.name} — Semesterbericht</h1>
  <h2>${game?.name||''} · ${new Date().toLocaleDateString('de-DE')} · ${members.length} Mitglieder · ${team.currentWeek||1} Wochen</h2>

  <!-- Team members -->
  <div class="member-row">
    ${members.map(m=>`<span class="member-chip">${m.name} (${m.role})</span>`).join('')}
  </div>

  <!-- KPIs -->
  <div class="kpi-row">
    <div class="kpi"><div class="kpi-val">${refs.length}</div><div class="kpi-lbl">Reflexionen</div></div>
    <div class="kpi"><div class="kpi-val">${compRate}%</div><div class="kpi-lbl">Compliance</div></div>
    <div class="kpi"><div class="kpi-val">${avgMood}/5</div><div class="kpi-lbl">Ø Stimmung</div></div>
    <div class="kpi"><div class="kpi-val">${blogs.filter(b=>b.status==='approved').length}</div><div class="kpi-lbl">Berichte ✅</div></div>
    <div class="kpi"><div class="kpi-val" style="color:${profit>=0?'#15803d':'#b91c1c'};">${profit>=0?'+':''}${profit.toFixed(2)} €</div><div class="kpi-lbl">Ergebnis</div></div>
  </div>

  <!-- Wochenberichte -->
  <h3>📋 Wochenberichte (${blogs.length})</h3>
  ${blogHtml}

  <!-- Reflexionen -->
  <h3>📝 Reflexionen (${refs.length})</h3>
  ${refHtml}

  <!-- Finanzen -->
  <h3>💳 Buchungen (${txs.length})</h3>
  ${txHtml}

  </body></html>`;

  const w=window.open('','_blank');
  if(w){w.document.write(html);w.document.close();}
  else showToast('Bitte Popup-Blocker deaktivieren','error');
  logEvent('team_semester_pdf',{teamId,teamName:team.name});
}

function exportTransactionsCSV(){
  const u=state.currentUser;
  const effectiveGameId=state.managingGameId||u?.gameId;
  const gameTeams=TEAMS.filter(t=>t.gameId===effectiveGameId);
  const tf=document.getElementById('adminTxTeamFilter2')?.value||'all';
  let txs=TRANSACTIONS.filter(tx=>{
    const teamOk=gameTeams.some(t=>t.id===tx.teamId);
    const fT=tf==='all'||tx.teamId===tf;
    return teamOk&&fT;
  });
  if(txs.length===0){showToast('Keine Buchungen vorhanden','info');return;}
  const esc=v=>('"'+(v||'').replace(/"/g,"''")+'"');
  const header='Datum,Team,Beschreibung,Kategorie,Typ,Betrag';
  const rows=txs.map(tx=>{
    const team=TEAMS.find(t=>t.id===tx.teamId);
    return [tx.date,team?.name,tx.desc,tx.cat,tx.type,tx.amount].map(esc).join(',');
  }).join('\n');
  _downloadCSV(header+'\n'+rows,'venturelab_buchungen_'+new Date().toISOString().split('T')[0]+'.csv');
  showToast('&#128229; Buchungen exportiert','success');
}
function _downloadCSV(csvContent,filename){
  const blob=new Blob(['\ufeff'+csvContent],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename;
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
}

