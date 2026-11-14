// ════════════════════════════════════════════════════════════════════
//  ANALYTICS DASHBOARD (v0.94) — für Dozenten und Admins
//  Zeigt: Team-Velocity, Reflexionstiefe, Stimmungsbarometer, Abgabe-Rate
// ════════════════════════════════════════════════════════════════════

function renderAnalyticsDashboard(containerId){
  const u=state.currentUser;
  const effectiveGameId=state.managingGameId||u?.gameId;
  if(!effectiveGameId){
    const el=document.getElementById(containerId);
    if(el) el.innerHTML='<div class="empty-state"><div class="empty-icon">📊</div><h3>Kein Spiel ausgewählt</h3></div>';
    return;
  }
  const game=GAMES.find(g=>g.id===effectiveGameId);
  const gameTeams=TEAMS.filter(t=>t.gameId===effectiveGameId&&t.status!=='pending'&&t.name&&t.name.trim());
  const allWeeks=[...new Set(REFLECTIONS.filter(r=>gameTeams.some(t=>t.id===r.teamId)).map(r=>r.week))].sort((a,b)=>a-b);
  if(allWeeks.length===0) allWeeks.push(...[1,2,3,4,5,6]);
  const maxWeek=Math.max(...allWeeks,1);

  // ── KPI Summary ──────────────────────────────────────────────────
  const totalMembers=gameTeams.reduce((s,t)=>s+MEMBERS.filter(m=>m.teamId===t.id).length,0);
  const totalRefs=REFLECTIONS.filter(r=>gameTeams.some(t=>t.id===r.teamId)).length;
  const expectedRefs=gameTeams.reduce((s,t)=>{
    const members=MEMBERS.filter(m=>m.teamId===t.id);
    return s+members.length*(t.currentWeek||1);
  },0);
  const complianceRate=expectedRefs>0?Math.round(totalRefs/expectedRefs*100):0;
  const totalBlogs=BLOGS.filter(b=>gameTeams.some(t=>t.id===b.teamId)&&b.status==='approved').length;
  const avgMood=_calcAvgMood(gameTeams);
  const avgRefDepth=_calcAvgRefDepth(gameTeams);

  const el=document.getElementById(containerId); if(!el) return;
  el.innerHTML=`
  <!-- KPI Row -->
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:20px;">
    ${_kpiCard('👥','Teilnehmer',totalMembers,'in '+gameTeams.length+' Teams','blue')}
    ${_kpiCard('📝','Reflexionen',totalRefs,complianceRate+'% Compliance','green')}
    ${_kpiCard('📋','Freigegebene Berichte',totalBlogs,'von '+gameTeams.length*maxWeek+' erwartet','purple')}
    ${_kpiCard('😊','Ø Stimmung',avgMood.toFixed(1)+'/5','über alle Teams','orange')}
    ${_kpiCard('🧠','Ø Reflexionstiefe',avgRefDepth.toFixed(0)+' W','Zeichen pro Eintrag','teal')}
  </div>

  <!-- Charts row -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
    <!-- Stimmungsbarometer -->
    <div class="card">
      <div class="card-header"><h3>😊 Stimmungsbarometer (Ø pro Woche)</h3></div>
      <div class="card-body" style="padding:12px;">
        <canvas id="analyticsChartMood" height="180"></canvas>
      </div>
    </div>
    <!-- Abgabe-Rate -->
    <div class="card">
      <div class="card-header"><h3>📈 Reflexions-Compliance (% pro Woche)</h3></div>
      <div class="card-body" style="padding:12px;">
        <canvas id="analyticsChartCompliance" height="180"></canvas>
      </div>
    </div>
  </div>

  <!-- Team Velocity -->
  <div class="card" style="margin-bottom:16px;">
    <div class="card-header"><h3>⚡ Team-Velocity (Stimmungsverlauf pro Team)</h3></div>
    <div class="card-body" style="padding:12px;">
      <canvas id="analyticsChartVelocity" height="200"></canvas>
    </div>
  </div>

  <!-- Reflexionstiefe Tabelle -->
  <div class="card" style="margin-bottom:16px;">
    <div class="card-header"><h3>🔬 Reflexionstiefe pro Team & Woche</h3></div>
    <div class="card-body" style="padding:0 12px 12px;">
      ${_renderDepthTable(gameTeams,allWeeks)}
    </div>
  </div>

  <!-- Team-Scorecard -->
  <div class="card">
    <div class="card-header" style="justify-content:space-between;">
      <h3>🏆 Team-Scorecard (Gesamtüberblick)</h3>
      <button class="btn btn-outline btn-xs" onclick="exportAnalyticsPDF('${effectiveGameId}')">📄 PDF Export</button>
    </div>
    <div class="card-body" style="padding:0 12px 12px;">
      ${_renderScorecardTable(gameTeams,allWeeks)}
    </div>
  </div>`;

  // ── Render Charts ──────────────────────────────────────────────
  setTimeout(()=>{
    _renderMoodChart(gameTeams, allWeeks);
    _renderComplianceChart(gameTeams, allWeeks);
    _renderVelocityChart(gameTeams, allWeeks);
  },100);
}

function _kpiCard(icon,label,value,sub,color){
  const bg={blue:'#dbeafe',green:'#dcfce7',purple:'#f3e8ff',orange:'#ffedd5',teal:'#ccfbf1'};
  const col={blue:'#1d4ed8',green:'#15803d',purple:'#7e22ce',orange:'#c2410c',teal:'#0f766e'};
  return `<div style="background:${bg[color]||bg.blue};border-radius:10px;padding:14px;text-align:center;">
    <div style="font-size:22px;margin-bottom:4px;">${icon}</div>
    <div style="font-size:22px;font-weight:800;color:${col[color]||col.blue};">${value}</div>
    <div style="font-size:11px;font-weight:600;color:${col[color]||col.blue};margin-bottom:2px;">${label}</div>
    <div style="font-size:10px;color:#64748b;">${sub}</div>
  </div>`;
}

function _calcAvgMood(teams){
  const refs=REFLECTIONS.filter(r=>teams.some(t=>t.id===r.teamId)&&r.mood);
  if(!refs.length) return 0;
  return refs.reduce((s,r)=>s+(r.mood||0),0)/refs.length;
}

function _calcAvgRefDepth(teams){
  const refs=REFLECTIONS.filter(r=>teams.some(t=>t.id===r.teamId));
  if(!refs.length) return 0;
  return refs.reduce((s,r)=>s+(r.experience||'').length+(r.liked||'').length+(r.improved||'').length,0)/refs.length;
}

function _renderMoodChart(teams, weeks){
  const ctx=document.getElementById('analyticsChartMood')?.getContext('2d');if(!ctx) return;
  if(window._anlChartMood) window._anlChartMood.destroy();
  const data=weeks.map(w=>{
    const refs=REFLECTIONS.filter(r=>teams.some(t=>t.id===r.teamId)&&r.week===w&&r.mood);
    return refs.length?+(refs.reduce((s,r)=>s+r.mood,0)/refs.length).toFixed(2):null;
  });
  window._anlChartMood=new Chart(ctx,{
    type:'line',
    data:{labels:weeks.map(w=>'W'+w),datasets:[{
      label:'Ø Stimmung',data,borderColor:'#f59e0b',backgroundColor:'#fef3c722',
      tension:.3,fill:true,pointRadius:4,pointBackgroundColor:'#f59e0b'
    }]},
    options:{responsive:true,maintainAspectRatio:false,
      scales:{y:{min:1,max:5,ticks:{stepSize:1},grid:{color:'#f1f5f9'}},x:{grid:{display:false}}},
      plugins:{legend:{display:false}}}
  });
}

function _renderComplianceChart(teams, weeks){
  const ctx=document.getElementById('analyticsChartCompliance')?.getContext('2d');if(!ctx) return;
  if(window._anlChartComp) window._anlChartComp.destroy();
  const data=weeks.map(w=>{
    const expected=teams.reduce((s,t)=>{
      const members=MEMBERS.filter(m=>m.teamId===t.id);
      const reached=(t.currentWeek||1)>=w;
      return s+(reached?members.length:0);
    },0);
    const actual=REFLECTIONS.filter(r=>teams.some(t=>t.id===r.teamId)&&r.week===w).length;
    return expected>0?Math.round(actual/expected*100):null;
  });
  window._anlChartComp=new Chart(ctx,{
    type:'bar',
    data:{labels:weeks.map(w=>'W'+w),datasets:[{
      label:'% Abgaben',data,
      backgroundColor:data.map(v=>v===null?'#e2e8f0':v>=90?'#bbf7d0':v>=70?'#fef08a':'#fecaca'),
      borderRadius:4
    }]},
    options:{responsive:true,maintainAspectRatio:false,
      scales:{y:{min:0,max:100,ticks:{callback:v=>v+'%'},grid:{color:'#f1f5f9'}},x:{grid:{display:false}}},
      plugins:{legend:{display:false}}}
  });
}

function _renderVelocityChart(teams, weeks){
  const ctx=document.getElementById('analyticsChartVelocity')?.getContext('2d');if(!ctx) return;
  if(window._anlChartVel) window._anlChartVel.destroy();
  const colors=['#2E75B6','#375623','#C55A11','#7030A0','#C00000','#1F7391'];
  const datasets=teams.map((team,i)=>{
    const data=weeks.map(w=>{
      const refs=REFLECTIONS.filter(r=>r.teamId===team.id&&r.week===w&&r.mood);
      return refs.length?+(refs.reduce((s,r)=>s+r.mood,0)/refs.length).toFixed(2):null;
    });
    return {label:(team.logo||'')+'  '+team.name,data,borderColor:team.color||colors[i%colors.length],
      backgroundColor:'transparent',tension:.3,pointRadius:4,pointBackgroundColor:team.color||colors[i%colors.length]};
  });
  window._anlChartVel=new Chart(ctx,{
    type:'line',
    data:{labels:weeks.map(w=>'W'+w),datasets},
    options:{responsive:true,maintainAspectRatio:false,
      scales:{y:{min:1,max:5,ticks:{stepSize:1},grid:{color:'#f1f5f9'}},x:{grid:{display:false}}},
      plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:11}}}}}
  });
}

function _renderDepthTable(teams, weeks){
  if(!teams.length) return '<div style="color:var(--gray-mid);font-size:12px;padding:8px 0;">Noch keine Daten</div>';
  const rows=teams.map(team=>{
    const cells=weeks.map(w=>{
      const refs=REFLECTIONS.filter(r=>r.teamId===team.id&&r.week===w);
      if(!refs.length) return '<td style="color:var(--gray-mid);text-align:center;">—</td>';
      const avg=refs.reduce((s,r)=>s+(r.experience||'').length+(r.liked||'').length+(r.improved||'').length,0)/refs.length;
      const bg=avg>300?'#bbf7d0':avg>150?'#fef08a':'#fecaca';
      return `<td style="text-align:center;background:${bg};border-radius:4px;font-weight:600;">${Math.round(avg)} W</td>`;
    });
    return `<tr><td><span style="font-size:16px;">${team.logo||'📋'}</span> ${team.name}</td>${cells.join('')}</tr>`;
  });
  return `<table class="data-table" style="width:100%;font-size:12px;margin-top:12px;">
    <thead><tr><th>Team</th>${weeks.map(w=>`<th style="text-align:center;">W${w}</th>`).join('')}</tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table>
  <div style="font-size:10px;color:var(--gray-mid);margin-top:6px;">W = Zeichen (Wörter × ~5). 🟢 &gt;300 tief · 🟡 150–300 mittel · 🔴 &lt;150 oberflächlich</div>`;
}

function _renderScorecardTable(teams, weeks){
  if(!teams.length) return '<div style="color:var(--gray-mid);font-size:12px;padding:8px 0;">Noch keine Daten</div>';
  const rows=teams.map(team=>{
    const members=MEMBERS.filter(m=>m.teamId===team.id);
    const refs=REFLECTIONS.filter(r=>r.teamId===team.id);
    const blogs=BLOGS.filter(b=>b.teamId===team.id&&b.status==='approved');
    const avgMoodTeam=refs.filter(r=>r.mood).length?+(refs.reduce((s,r)=>s+(r.mood||0),0)/refs.filter(r=>r.mood).length).toFixed(1):0;
    const compRate=members.length*(team.currentWeek||1)>0?Math.round(refs.length/(members.length*(team.currentWeek||1))*100):0;
    const depth=refs.length?Math.round(refs.reduce((s,r)=>s+(r.experience||'').length+(r.liked||'').length+(r.improved||'').length,0)/refs.length):0;
    const trend=_calcTrend(refs, weeks);
    const trendIcon=trend>0?'📈':trend<0?'📉':'➡️';
    return `<tr>
      <td><span style="font-size:16px;">${team.logo||'📋'}</span> <strong>${team.name}</strong></td>
      <td style="text-align:center;">${members.length}</td>
      <td style="text-align:center;">${refs.length}/${members.length*(team.currentWeek||1)}</td>
      <td style="text-align:center;font-weight:700;color:${compRate>=90?'var(--green)':compRate>=70?'var(--orange)':'var(--red)'};">${compRate}%</td>
      <td style="text-align:center;">${'⬛'.repeat(0)}${'⭐'.repeat(Math.round(avgMoodTeam))} ${avgMoodTeam}/5</td>
      <td style="text-align:center;">${depth} W</td>
      <td style="text-align:center;">${blogs.length}</td>
      <td style="text-align:center;font-size:16px;" title="${trend>0?'Stimmung steigend':trend<0?'Stimmung fallend':'Stimmung stabil'}">${trendIcon}</td>
    </tr>`;
  });
  return `<table class="data-table" style="width:100%;font-size:12px;margin-top:12px;">
    <thead><tr>
      <th>Team</th><th style="text-align:center;">Mitglieder</th>
      <th style="text-align:center;">Reflexionen</th><th style="text-align:center;">Compliance</th>
      <th style="text-align:center;">Ø Stimmung</th><th style="text-align:center;">Ø Tiefe</th>
      <th style="text-align:center;">Berichte</th><th style="text-align:center;">Trend</th>
    </tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table>`;
}

function _calcTrend(refs, weeks){
  if(weeks.length<2) return 0;
  const lastTwo=weeks.slice(-2);
  const getMood=w=>{
    const wr=refs.filter(r=>r.week===w&&r.mood);
    return wr.length?wr.reduce((s,r)=>s+r.mood,0)/wr.length:null;
  };
  const m1=getMood(lastTwo[0]);
  const m2=getMood(lastTwo[1]);
  if(m1===null||m2===null) return 0;
  if(m2-m1>0.2) return 1;
  if(m1-m2>0.2) return -1;
  return 0;
}

function exportAnalyticsPDF(gameId){
  const game=GAMES.find(g=>g.id===gameId);
  const gameTeams=TEAMS.filter(t=>t.gameId===gameId&&t.status!=='pending'&&t.name&&t.name.trim());
  const allWeeks=[...new Set(REFLECTIONS.filter(r=>gameTeams.some(t=>t.id===r.teamId)).map(r=>r.week))].sort((a,b)=>a-b);
  if(!allWeeks.length) allWeeks.push(1);

  const rows=gameTeams.map(team=>{
    const members=MEMBERS.filter(m=>m.teamId===team.id);
    const refs=REFLECTIONS.filter(r=>r.teamId===team.id);
    const blogs=BLOGS.filter(b=>b.teamId===team.id&&b.status==='approved');
    const avgMood=refs.filter(r=>r.mood).length?+(refs.reduce((s,r)=>s+(r.mood||0),0)/refs.filter(r=>r.mood).length).toFixed(1):0;
    const compRate=members.length*(team.currentWeek||1)>0?Math.round(refs.length/(members.length*(team.currentWeek||1))*100):0;
    const depth=refs.length?Math.round(refs.reduce((s,r)=>s+(r.experience||'').length+(r.liked||'').length+(r.improved||'').length,0)/refs.length):0;
    return `<tr>
      <td>${team.logo||''} <strong>${team.name}</strong></td>
      <td style="text-align:center;">${members.length}</td>
      <td style="text-align:center;">${refs.length}/${members.length*(team.currentWeek||1)}</td>
      <td style="text-align:center;color:${compRate>=90?'#15803d':compRate>=70?'#a16207':'#b91c1c'};font-weight:700;">${compRate}%</td>
      <td style="text-align:center;">${avgMood}/5</td>
      <td style="text-align:center;">${depth} W</td>
      <td style="text-align:center;">${blogs.length}</td>
    </tr>`;
  }).join('');

  const html=`<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Analytics Dashboard – ${game?.name||gameId}</title>
  <style>body{font-family:Arial,sans-serif;max-width:900px;margin:30px auto;padding:0 20px;font-size:13px;color:#1a1a2e;}
  h1{font-size:20px;margin-bottom:4px;}h2{font-size:13px;color:#555;font-weight:normal;margin-bottom:20px;}
  table{width:100%;border-collapse:collapse;margin-bottom:20px;}
  th{background:#1A2C5A;color:white;padding:8px 10px;text-align:left;font-size:12px;}
  td{padding:7px 10px;border-bottom:1px solid #e5e7eb;}tr:nth-child(even){background:#f9fafb;}
  .kpi-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:24px;}
  .kpi{background:#f1f5f9;border-radius:8px;padding:12px;text-align:center;}
  .kpi-val{font-size:24px;font-weight:800;color:#1A2C5A;}.kpi-lbl{font-size:11px;color:#64748b;}
  @media print{.no-print{display:none}}</style>
  </head><body>
  <button class="no-print" onclick="window.print()" style="background:#1A2C5A;color:white;border:none;padding:8px 18px;border-radius:6px;cursor:pointer;margin-bottom:16px;">🖨️ Drucken / PDF</button>
  <h1>📊 Analytics Dashboard – ${game?.name||gameId}</h1>
  <h2>Exportiert am ${new Date().toLocaleDateString('de-DE')} · ${gameTeams.length} Teams · Wochen: ${allWeeks.join(', ')}</h2>
  <table>
    <thead><tr><th>Team</th><th style="text-align:center;">Mitglieder</th><th style="text-align:center;">Reflexionen</th>
    <th style="text-align:center;">Compliance</th><th style="text-align:center;">Ø Stimmung</th>
    <th style="text-align:center;">Ø Tiefe</th><th style="text-align:center;">Berichte ✅</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="font-size:11px;color:#64748b;">Tiefe = Ø Zeichenanzahl pro Reflexionseintrag (Erfahrungen + Positives + Verbesserungen)</div>
  </body></html>`;
  const w=window.open('','_blank');
  if(w){w.document.write(html);w.document.close();}
  else showToast('Bitte Popup-Blocker deaktivieren','error');
}
