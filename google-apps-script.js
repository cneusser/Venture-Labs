/**
 * 5-Euro-Business Tracker – Google Apps Script Backend  v1.1
 * ─────────────────────────────────────────────────────────────
 * Dieses Script empfängt drei Arten von Anfragen:
 *
 *  type: 'feedback'  → Feedback-Eintrag → Sheet "Feedback" + E-Mail
 *  type: 'tracking'  → Session-Event-Batch → Sheet "Tracking"
 *  type: 'backup'    → Vollständiger Daten-Snapshot → Sheet "Backups"
 *
 * SETUP (einmalig, ca. 5 Minuten):
 * 1. Erstelle ein neues Google Sheet unter sheet.new
 *    → Das Script legt die Tabs "Feedback", "Tracking" und "Backups"
 *      automatisch an, falls sie noch nicht existieren.
 *    → Kopiere die Sheet-ID aus der URL (langer String zwischen /d/ und /edit)
 *    → Trage sie unten bei SHEET_ID ein
 *
 * 2. Öffne script.google.com → Neues Projekt
 *    → Füge diesen Code ein → Speichern
 *
 * 3. Klicke auf "Bereitstellen" → "Neue Bereitstellung"
 *    → Typ: Web-App
 *    → Ausführen als: Ich (deine Google-Adresse)
 *    → Zugriff: Jeder (auch anonym)
 *    → Klicke "Bereitstellen" → URL kopieren
 *
 * 4. Trage die Web-App-URL in index.html ein:
 *    CONFIG.FEEDBACK_ENDPOINT = 'https://script.google.com/macros/s/..../exec'
 *
 * 5. Committe index.html neu nach GitHub → fertig!
 */

// ─── KONFIGURATION ────────────────────────────────────────────────
const SHEET_ID     = '1cGWY2Orr1UngJUhuvbteuUdFbRA2cKBvNmJ8Sq7nkZY';
const NOTIFY_EMAIL = 'christian.neusser@googlemail.com';
// ──────────────────────────────────────────────────────────────────

// ── Hilfsfunktion: Sheet holen oder anlegen ────────────────────────
function getOrCreateSheet(ss, name, headers, headerColor) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
         .setFontWeight('bold')
         .setBackground(headerColor || '#1F3864')
         .setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ── Haupt-Handler ─────────────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss   = SpreadsheetApp.openById(SHEET_ID);

    // ── TRACKING: Session-Event-Batch ────────────────────────────
    if (data.type === 'tracking') {
      return handleTracking(ss, data);
    }

    // ── BACKUP: Vollständiger Daten-Snapshot ─────────────────────
    if (data.type === 'backup') {
      return handleBackup(ss, data);
    }

    // ── ADMIN MESSAGE: Direkte Nachricht an Mitglieder ───────────
    if (data.type === 'admin_message') {
      return handleAdminMessage(ss, data);
    }

    // ── FEEDBACK (Standard) ──────────────────────────────────────
    return handleFeedback(ss, data);

  } catch (err) {
    console.error('doPost error:', err);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─────────────────────────────────────────────────────────────────
// TRACKING
// Erwartet: { type:'tracking', sessionId, events: [...] }
// Jedes Event: { ts, sessionId, userCode, userName, userRole,
//                teamId, teamName, gameId, gameName, action, data }
// ─────────────────────────────────────────────────────────────────
function handleTracking(ss, payload) {
  const sheet = getOrCreateSheet(ss, 'Tracking',
    ['Zeitstempel', 'Session-ID', 'Nutzer-Code', 'Name', 'Rolle',
     'Team-ID', 'Team', 'Spiel-ID', 'Spiel', 'Aktion', 'Daten'],
    '#0D3B1E'
  );

  const events = payload.events || [];
  events.forEach(ev => {
    sheet.appendRow([
      new Date(ev.ts || Date.now()),
      ev.sessionId  || '—',
      ev.userCode   || '—',
      ev.userName   || '—',
      ev.userRole   || '—',
      ev.teamId     || '—',
      ev.teamName   || '—',
      ev.gameId     || '—',
      ev.gameName   || '—',
      ev.action     || '—',
      typeof ev.data === 'object' ? JSON.stringify(ev.data) : (ev.data || ''),
    ]);
  });

  return ContentService
    .createTextOutput(JSON.stringify({ success: true, written: events.length }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─────────────────────────────────────────────────────────────────
// BACKUP
// Erwartet: { type:'backup', gameId, gameName, size, snapshot }
// snapshot ist der komplette JSON-String der App-Daten
// ─────────────────────────────────────────────────────────────────
function handleBackup(ss, payload) {
  const sheet = getOrCreateSheet(ss, 'Backups',
    ['Zeitstempel', 'Spiel-ID', 'Spiel', 'Datengröße (Bytes)', 'JSON-Snapshot'],
    '#3B1F0D'
  );

  sheet.appendRow([
    new Date(),
    payload.gameId   || '—',
    payload.gameName || '—',
    payload.size     || 0,
    payload.snapshot || '',
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─────────────────────────────────────────────────────────────────
// ADMIN MESSAGE
// Erwartet: { type:'admin_message', from, noreplyDomain, gameName,
//             subject, body, recipients: [email, ...] }
// Schreibt in "Nachrichten"-Sheet und sendet E-Mails an alle
// ─────────────────────────────────────────────────────────────────
function handleAdminMessage(ss, payload) {
  const sheet = getOrCreateSheet(ss, 'Nachrichten',
    ['Zeitstempel', 'Von', 'Spiel', 'Betreff', 'Empfänger (Anzahl)', 'Empfänger-Liste'],
    '#1A3A2F'
  );

  const recipients = payload.recipients || [];
  sheet.appendRow([
    new Date(),
    payload.from     || '—',
    payload.gameName || '—',
    payload.subject  || '—',
    recipients.length,
    recipients.join(', '),
  ]);

  // Sende E-Mail an jeden Empfänger
  const noreply   = payload.noreplyDomain || '5euro-business.de';
  const fromLabel = `${payload.gameName || '5-Euro-Business'} (${payload.from || 'Admin'})`;

  let sent = 0;
  recipients.forEach(email => {
    try {
      MailApp.sendEmail({
        to:      email,
        replyTo: `noreply@${noreply}`,
        name:    fromLabel,
        subject: payload.subject,
        body:    payload.body + '\n\n──────────\nDiese Nachricht wurde über die 5-Euro-Business Plattform versendet.',
      });
      sent++;
    } catch (e) {
      console.warn('Mail failed to ' + email + ':', e.message);
    }
  });

  return ContentService
    .createTextOutput(JSON.stringify({ success: true, sent }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─────────────────────────────────────────────────────────────────
// FEEDBACK
// ─────────────────────────────────────────────────────────────────
function handleFeedback(ss, data) {
  const sheet = getOrCreateSheet(ss, 'Feedback',
    ['Zeitstempel', 'Von', 'Team', 'Typ', 'Betreff',
     'Nachricht', 'Seite', 'Schritte', 'Datum'],
    '#1F3864'
  );

  sheet.appendRow([
    new Date(),
    data.from    || '—',
    data.team    || '—',
    data.type    || 'general',
    data.subject || '—',
    data.message || '',
    data.page    || '',
    data.steps   || '',
    data.date    || new Date().toISOString(),
  ]);

  // E-Mail-Benachrichtigung
  const typeLabels = {
    info:        'ℹ️ Info-Anfrage',
    improvement: '💡 Verbesserungsvorschlag',
    bug:         '🐛 Bugreport',
    other:       '📧 Sonstiges',
    general:     '📬 Feedback',
  };
  const label = typeLabels[data.type] || '📬 Feedback';

  const subject = `[5-Euro-Tracker] ${label}: ${data.subject}`;
  const body = [
    `Neues Feedback im 5-Euro-Business Tracker`,
    `─────────────────────────────────────────`,
    `Von:     ${data.from}`,
    `Team:    ${data.team}`,
    `Typ:     ${label}`,
    `Betreff: ${data.subject}`,
    `Datum:   ${new Date(data.date).toLocaleString('de-DE')}`,
    ``,
    `Nachricht:`,
    data.message,
    data.page  ? `\nSeite: ${data.page}`    : '',
    data.steps ? `\nSchritte: ${data.steps}` : '',
    ``,
    `──────────────────────────────────────────`,
    `Google Sheet: https://docs.google.com/spreadsheets/d/${SHEET_ID}`,
  ].join('\n');

  // Send to hardcoded notify email AND to the game's admin email if different
  const targets = new Set([NOTIFY_EMAIL]);
  if (data.adminEmail && data.adminEmail !== NOTIFY_EMAIL) targets.add(data.adminEmail);
  targets.forEach(addr => {
    try { MailApp.sendEmail({ to: addr, subject: subject, body: body }); } catch(e) { console.warn('Mail failed to '+addr, e); }
  });

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─────────────────────────────────────────────────────────────────
// GET-Handler (z. B. für Erreichbarkeits-Ping)
// ─────────────────────────────────────────────────────────────────
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', version: '1.1' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─────────────────────────────────────────────────────────────────
// TESTFUNKTIONEN – im Apps Script Editor ausführen
// ─────────────────────────────────────────────────────────────────
function testFeedback() {
  const mock = {
    postData: {
      contents: JSON.stringify({
        type: 'bug',
        from: 'Max Müller',
        team: 'CampusClips',
        subject: 'Login-Button reagiert nicht',
        message: 'Beim Klick auf Login passiert nichts.',
        page: 'Login-Screen',
        steps: '1. Seite öffnen\n2. Code eingeben\n3. Enter drücken',
        date: new Date().toISOString(),
      })
    }
  };
  Logger.log(doPost(mock).getContent());
}

function testTracking() {
  const mock = {
    postData: {
      contents: JSON.stringify({
        type: 'tracking',
        sessionId: 'S-TEST-001',
        events: [
          { ts: new Date().toISOString(), sessionId: 'S-TEST-001',
            userCode: 'ADM-DEMO', userName: 'Demo Admin', userRole: 'admin',
            teamId: 't1', teamName: 'CampusClips', gameId: 'g1', gameName: 'SoSe 2025',
            action: 'page_view', data: { page: 'dashboard' } },
          { ts: new Date().toISOString(), sessionId: 'S-TEST-001',
            userCode: 'ADM-DEMO', userName: 'Demo Admin', userRole: 'admin',
            teamId: 't1', teamName: 'CampusClips', gameId: 'g1', gameName: 'SoSe 2025',
            action: 'admin_week_advance', data: { teamId: 't1', week: 3 } },
        ]
      })
    }
  };
  Logger.log(doPost(mock).getContent());
}

function testBackup() {
  const mock = {
    postData: {
      contents: JSON.stringify({
        type: 'backup',
        gameId: 'g1',
        gameName: 'SoSe 2025',
        size: 4096,
        snapshot: JSON.stringify({ GAMES: [], TEAMS: [], MEMBERS: [] }),
      })
    }
  };
  Logger.log(doPost(mock).getContent());
}
