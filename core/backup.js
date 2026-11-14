// ═══════════════════════════════════════════════════════════════════════════
//  BACKUP SYSTEM (v0.94 — Versioning: last 5 dated snapshots)
// ═══════════════════════════════════════════════════════════════════════════
const BACKUP_KEY = '5euro_lastbackup';
const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const BACKUP_VERSIONS_KEY = '5euro_backupversions';
const MAX_BACKUP_VERSIONS = 5;

// ── Backup versioning helpers ────────────────────────────────────────────
function getBackupVersions(){
  try{ return JSON.parse(localStorage.getItem(BACKUP_VERSIONS_KEY)||'[]'); }
  catch(e){ return []; }
}
function saveBackupVersion(jsonStr){
  const versions = getBackupVersions();
  const entry = {
    date: new Date().toISOString(),
    label: new Date().toLocaleDateString('de-DE')+' '+new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),
    sizeKB: Math.round(jsonStr.length/1024),
    snapshot: jsonStr
  };
  versions.unshift(entry); // newest first
  while(versions.length > MAX_BACKUP_VERSIONS) versions.pop();
  try{
    localStorage.setItem(BACKUP_VERSIONS_KEY, JSON.stringify(versions));
  }catch(e){
    // If localStorage is full, drop oldest version and try again
    if(versions.length>1){ versions.pop(); try{localStorage.setItem(BACKUP_VERSIONS_KEY,JSON.stringify(versions));}catch(e2){} }
    console.warn('Backup versioning: localStorage full, oldest version dropped');
  }
}
function restoreBackupVersion(idx){
  const versions = getBackupVersions();
  if(!versions[idx]){showToast('Version nicht gefunden','error');return;}
  const entry = versions[idx];
  if(!confirm(`Backup vom ${entry.label} (${entry.sizeKB} KB) wiederherstellen?\n\nAlle aktuellen Daten werden ÜBERSCHRIEBEN!`)) return;
  try{
    const d = JSON.parse(entry.snapshot);
    if(!d.GAMES||!d.TEAMS){showToast('Ungültiges Backup','error');return;}
    const replace=(arr,data)=>{arr.length=0;(data||[]).forEach(x=>arr.push(x));};
    replace(UNIVERSITIES,d.UNIVERSITIES); replace(GAMES,d.GAMES);
    replace(TEAMS,d.TEAMS); replace(MEMBERS,d.MEMBERS);
    replace(BLOGS,d.BLOGS); replace(TRANSACTIONS,d.TRANSACTIONS);
    replace(REFLECTIONS,d.REFLECTIONS); replace(MESSAGES,d.MESSAGES||[]);
    replace(ADMINS,d.ADMINS); replace(FEEDBACKS,d.FEEDBACKS||[]);
    replace(SUPERADMINS,d.SUPERADMINS||[]); replace(FAQ_DOCS,d.FAQ_DOCS||[]);
    rebuildCodes(); saveData();
    showToast('✅ Backup vom '+entry.label+' wiederhergestellt!','success');
    logEvent('backup_version_restore',{date:entry.date,sizeKB:entry.sizeKB});
    location.reload();
  }catch(err){showToast('Fehler: '+err.message,'error');}
}
function renderBackupVersionsPanel(){
  const el=document.getElementById('backupVersionsPanel'); if(!el) return;
  const versions=getBackupVersions();
  if(versions.length===0){
    el.innerHTML='<div style="color:var(--gray-mid);font-size:12px;padding:4px 0;">Noch keine Versionen gespeichert (werden automatisch beim nächsten Backup angelegt).</div>';
    return;
  }
  el.innerHTML=`<table class="data-table" style="width:100%;font-size:12px;">
    <thead><tr><th>#</th><th>Datum</th><th>Größe</th><th>Aktion</th></tr></thead>
    <tbody>${versions.map((v,i)=>`<tr>
      <td style="color:var(--gray-mid);">${i===0?'🟢 Aktuell':'#'+(i+1)}</td>
      <td>${v.label}</td>
      <td>${v.sizeKB} KB</td>
      <td><button class="btn btn-outline btn-xs" onclick="restoreBackupVersion(${i})">↩️ Wiederherstellen</button>
          <button class="btn btn-outline btn-xs" onclick="_downloadVersionAsFile(${i})">⬇️</button></td>
    </tr>`).join('')}</tbody>
  </table>`;
}
function _downloadVersionAsFile(idx){
  const versions=getBackupVersions();
  if(!versions[idx]) return;
  const entry=versions[idx];
  const blob=new Blob([entry.snapshot],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download='5euro-backup-v'+( idx+1)+'-'+entry.date.split('T')[0]+'.json';
  a.click();
  URL.revokeObjectURL(url);
}

function exportDataJson(){
  const d = {UNIVERSITIES,GAMES,TEAMS,MEMBERS,BLOGS,TRANSACTIONS,REFLECTIONS,MESSAGES,ADMINS,FEEDBACKS,SUPERADMINS,FAQ_DOCS,ANNOUNCEMENTS,PASSWORDS};
  return JSON.stringify(d, null, 2);
}

function downloadBackup(){
  const json = exportDataJson();
  saveBackupVersion(json); // persist versioned snapshot
  const blob = new Blob([json], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '5euro-backup-' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
  URL.revokeObjectURL(url);
  logEvent('manual_backup', {size: json.length});
  renderBackupVersionsPanel();
}

function importBackup(){
  const input = document.createElement('input');
  input.type='file'; input.accept='.json';
  input.onchange = e => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const d = JSON.parse(ev.target.result);
        if(!d.GAMES || !d.TEAMS) { showToast('Ungültige Backup-Datei','error'); return; }
        if(!confirm('Backup wiederherstellen? Alle aktuellen Daten werden ÜBERSCHRIEBEN!')) return;
        const replace=(arr,data)=>{arr.length=0;(data||[]).forEach(x=>arr.push(x));};
        replace(UNIVERSITIES,d.UNIVERSITIES); replace(GAMES,d.GAMES);
        replace(TEAMS,d.TEAMS); replace(MEMBERS,d.MEMBERS);
        replace(BLOGS,d.BLOGS); replace(TRANSACTIONS,d.TRANSACTIONS);
        replace(REFLECTIONS,d.REFLECTIONS); replace(MESSAGES,d.MESSAGES||[]);
        replace(ADMINS,d.ADMINS);
        replace(FEEDBACKS,d.FEEDBACKS||[]); replace(SUPERADMINS,d.SUPERADMINS||[]);
        replace(FAQ_DOCS,d.FAQ_DOCS||[]);
        rebuildCodes(); saveData();
        showToast('✅ Backup wiederhergestellt!');
        logEvent('backup_restore', {date: file.name});
        location.reload();
      } catch(err) { showToast('Fehler beim Lesen der Datei: '+err.message,'error'); }
    };
    reader.readAsText(file);
  };
  input.click();
}

function updateStorageStatus(){
  const u=state.currentUser;
  if(u.role!=='superadmin') return;
  const last=parseInt(localStorage.getItem(BACKUP_KEY)||'0');
  const lastBackupDate=last?new Date(last).toLocaleDateString('de-DE')+' '+new Date(last).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}):'Noch nie';
  const totalSize=(JSON.stringify(_buildPayload()).length/1024).toFixed(0);
  const versions=getBackupVersions();
  const fbState=_fbOK?'🟢 Firebase aktiv (Echtzeit-Sync)':'🔴 Kein Firebase – nur lokal';
  const msg=`${fbState} | Zuletzt gesichert: ${lastBackupDate} | Speicher: ${totalSize} KB (${TEAMS.length} Teams, ${TRANSACTIONS.length} Buchungen, ${BLOGS.length} Berichte) | 🗂 ${versions.length}/${MAX_BACKUP_VERSIONS} Versionen`;
  const el=document.getElementById('storageStatusText');
  if(el) el.textContent=msg;
  renderBackupVersionsPanel();
}

async function sendAutoBackup(){
  const last = parseInt(localStorage.getItem(BACKUP_KEY)||'0');
  if(Date.now() - last < BACKUP_INTERVAL_MS) return; // not yet
  if(!CONFIG.FEEDBACK_ENDPOINT || CONFIG.FEEDBACK_ENDPOINT.includes('DEINE')) return;
  const json = exportDataJson();
  try {
    await fetch(CONFIG.FEEDBACK_ENDPOINT, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({type:'backup', data: json, date: new Date().toISOString(), game: GAMES.map(g=>g.name).join(', ')})
    });
    localStorage.setItem(BACKUP_KEY, String(Date.now()));
    saveBackupVersion(json); // persist versioned snapshot
    console.log('Auto-backup sent:', new Date().toISOString());
  } catch(e){ console.warn('Auto-backup failed:', e); }
}

