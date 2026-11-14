// ════════════════════════════════════════════════════════════════════
//  FEATURE (a): CUSTOM WEEKLY QUESTIONS
//  v0.94: WiSe 2026/27 — Default-Zusatzfragen per importDefaultQuestions()
// ════════════════════════════════════════════════════════════════════

// Default-Fragenset WiSe 2026/27 (Dozent kann per Admin-Panel anpassen)
const DEFAULT_WISE_QUESTIONS = [
  // Woche 1 – Kickoff & Orientierung
  { week:1, target:'reflection', text:'Was hat dich bei der Teamgründung überrascht – positiv oder negativ?' },
  { week:1, target:'blog',       text:'Wie habt ihr eure erste große Entscheidung als Team getroffen?' },
  // Woche 2 – Erster Marktkontakt
  { week:2, target:'reflection', text:'Hast du heute etwas riskiert, das sich (nicht) gelohnt hat? Was würdest du anders machen?' },
  { week:2, target:'blog',       text:'Welche Annahme über eure Kunden hat sich als falsch herausgestellt?' },
  // Woche 3 – Pivot-Check
  { week:3, target:'both',       text:'Braucht ihr einen Pivot? Begründe anhand konkreter Daten oder Kundenfeedback.' },
  // Woche 4 – Team-Dynamik
  { week:4, target:'reflection', text:'Wie hat sich deine Rolle im Team verändert? Bist du damit zufrieden?' },
  { week:4, target:'blog',       text:'Was würdet ihr einem anderen Team in dieser Phase empfehlen?' },
  // Woche 5 – Skalierung & Nachhaltigkeit
  { week:5, target:'reflection', text:'Was hast du diese Woche konkret gelernt, das du sofort in der Praxis einsetzen kannst?' },
  { week:5, target:'blog',       text:'Wie skalierbar ist euer Geschäftsmodell – was wäre nötig, um 10× zu wachsen?' },
  // Woche 6 – Abschluss & Transfer
  { week:6, target:'reflection', text:'Was nimmst du aus diesem Semester mit in dein zukünftiges Berufsleben?' },
  { week:6, target:'blog',       text:'Was würdet ihr beim nächsten Mal anders machen – und warum?' },
];

function importDefaultQuestions(gameId){
  const game=GAMES.find(g=>g.id===gameId);if(!game) return;
  if(!game.customQuestions) game.customQuestions=[];
  let added=0;
  DEFAULT_WISE_QUESTIONS.forEach(q=>{
    // Avoid duplicates (same week+target+text prefix)
    const exists=game.customQuestions.some(cq=>cq.week===q.week&&cq.target===q.target&&cq.text.substring(0,30)===q.text.substring(0,30));
    if(!exists){
      game.customQuestions.push({id:'cq-wise'+Date.now()+'-'+Math.random().toString(36).substr(2,4), ...q});
      added++;
    }
  });
  saveData();
  renderCustomQuestionsAdmin();
  showToast('✅ '+added+' WiSe 2026/27-Fragen importiert','success');
  logEvent('default_questions_import',{gameId,added});
}

function getGameCustomQuestions(gameId){
  const g=GAMES.find(x=>x.id===gameId);
  if(!g) return [];
  if(!g.customQuestions) g.customQuestions=[];
  return g.customQuestions;
}
function renderCustomQuestionsAdmin(){
  const wrap=document.getElementById('customQuestionsAdminWrap');
  if(!wrap) return;
  const u=state.currentUser;
  const effectiveGameId=state.managingGameId||u?.gameId;
  const game=GAMES.find(g=>g.id===effectiveGameId);
  if(!game) return;
  if(!game.customQuestions) game.customQuestions=[];
  const qs=game.customQuestions;
  wrap.innerHTML=`
    <div class="card" style="margin-top:18px;margin-bottom:16px;">
      <div class="card-header"><h3 style="font-size:13px;">&#128221; Zusatzfragen pro Woche</h3></div>
      <div class="card-body">
        <div class="info-box blue" style="margin-bottom:12px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
          <span><span class="info-box-icon">&#128161;</span>Zusatzfragen erscheinen in den Reflexions- bzw. Berichtsformularen der jeweiligen Woche zus&#228;tzlich zu den Standard-Fragen.</span>
          <button class="btn btn-outline btn-xs" onclick="importDefaultQuestions('${effectiveGameId}')" title="WiSe 2026/27 Standardfragen importieren" style="white-space:nowrap;">&#128229; WiSe 2026/27 Fragen</button>
        </div>
        <div class="form-row" style="align-items:flex-end;gap:8px;flex-wrap:wrap;">
          <div class="form-group" style="min-width:180px;flex:2"><label class="form-label">Frage</label>
            <input class="form-control" id="cqText" placeholder="z.B. Wie war die Kundenkommunikation?"></div>
          <div class="form-group"><label class="form-label">Woche</label>
            <select class="form-control" id="cqWeek">${[1,2,3,4,5,6,7,8].map(w=>`<option value="${w}">Woche ${w}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Ziel</label>
            <select class="form-control" id="cqTarget"><option value="reflection">Reflexion</option><option value="blog">Wochenbericht</option><option value="both">Beide</option></select></div>
          <div class="form-group" style="align-self:flex-end;">
            <button class="btn btn-primary btn-sm" onclick="addCustomQuestion('${effectiveGameId}')">+ Hinzuf&#252;gen</button>
          </div>
        </div>
        ${qs.length===0?'<div style="color:var(--gray-mid);font-size:12px;padding:8px 0;">Noch keine Zusatzfragen angelegt.</div>':''}
        <table class="data-table" style="width:100%;${qs.length===0?'display:none':''}">
          <thead><tr><th>Woche</th><th>Ziel</th><th>Frage</th><th>Aktion</th></tr></thead>
          <tbody>${qs.map(q=>`<tr>
            <td>W${q.week}</td>
            <td><span class="tag tag-blue">${q.target==='reflection'?'Reflexion':q.target==='blog'?'Bericht':'Beide'}</span></td>
            <td style="font-size:12px;">${q.text}</td>
            <td><button class="btn btn-danger btn-xs" onclick="deleteCustomQuestion('${effectiveGameId}','${q.id}')">&#128465;&#65039;</button></td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;
}
function addCustomQuestion(gameId){
  const text=document.getElementById('cqText')?.value.trim();
  if(!text){showToast('Bitte Fragetext eingeben','error');return;}
  const week=parseInt(document.getElementById('cqWeek')?.value||1);
  const target=document.getElementById('cqTarget')?.value||'reflection';
  const game=GAMES.find(g=>g.id===gameId);if(!game) return;
  if(!game.customQuestions) game.customQuestions=[];
  const q={id:'cq'+Date.now(),week,target,text};
  game.customQuestions.push(q);
  logEvent('custom_q_add',{gameId,week,target,text});
  saveData();renderCustomQuestionsAdmin();
  document.getElementById('cqText').value='';
  showToast('&#128221; Zusatzfrage hinzugef&#252;gt','success');
}
function deleteCustomQuestion(gameId,qId){
  const game=GAMES.find(g=>g.id===gameId);if(!game||!game.customQuestions) return;
  const idx=game.customQuestions.findIndex(q=>q.id===qId);
  if(idx<0) return;
  game.customQuestions.splice(idx,1);
  logEvent('custom_q_delete',{gameId,qId});
  saveData();renderCustomQuestionsAdmin();
  showToast('&#10005; Frage gel&#246;scht','info');
}
function populateCustomQuestionsModal(target,week){
  const team=getMyTeam();if(!team) return;
  const game=GAMES.find(g=>g.id===team.gameId);if(!game) return;
  const qs=(game.customQuestions||[]).filter(q=>q.week===week&&(q.target===target||q.target==='both'));
  const containerId=target==='reflection'?'refCustomQuestions':'blogCustomQuestions';
  const el=document.getElementById(containerId);if(!el) return;
  if(qs.length===0){el.innerHTML='';return;}
  el.innerHTML=`<div style="border-top:1px solid var(--border);padding-top:12px;margin-top:4px;">
    <div class="form-section-title">&#128221; Zusatzfragen Woche ${week}</div>
    ${qs.map(q=>`<div class="form-group">
      <label class="form-label">${q.text}</label>
      <textarea class="form-control" id="cqa_${q.id}" rows="2" data-cqid="${q.id}" placeholder="Deine Antwort..."></textarea>
    </div>`).join('')}
  </div>`;
}
function collectCustomAnswers(containerId){
  const el=document.getElementById(containerId);if(!el) return {};
  const ans={};
  el.querySelectorAll('[data-cqid]').forEach(inp=>{
    if(inp.value.trim()) ans[inp.dataset.cqid]=inp.value.trim();
  });
  return ans;
}

