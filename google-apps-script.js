/**
 * 5-Euro-Business Tracker – Google Apps Script Backend
 * ─────────────────────────────────────────────────────
 * Dieses Script empfängt Feedback-Einträge vom Tracker,
 * schreibt sie in ein Google Sheet und sendet eine
 * E-Mail-Benachrichtigung an den Dozenten.
 *
 * SETUP (einmalig, ca. 5 Minuten):
 * 1. Erstelle ein neues Google Sheet unter sheet.new
 *    → Benenne das erste Tabellenblatt: "Feedback"
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
const SHEET_ID    = '1cGWY2Orr1UngJUhuvbteuUdFbRA2cKBvNmJ8Sq7nkZY';
const NOTIFY_EMAIL = 'christian.neusser@me.com';
const SHEET_NAME  = 'Feedback';
// ──────────────────────────────────────────────────────────────────

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // ── Google Sheet beschreiben ──────────────────────────────────
    const ss    = SpreadsheetApp.openById(SHEET_ID);
    let sheet   = ss.getSheetByName(SHEET_NAME);

    // Header-Zeile anlegen falls Sheet leer
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Zeitstempel', 'Von', 'Team', 'Typ', 'Betreff',
        'Nachricht', 'Seite', 'Schritte', 'Datum'
      ]);
      sheet.getRange(1, 1, 1, 9).setFontWeight('bold')
           .setBackground('#1F3864').setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
    }

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

    // ── E-Mail-Benachrichtigung ────────────────────────────────────
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
      data.page  ? `\nSeite: ${data.page}`        : '',
      data.steps ? `\nSchritte: ${data.steps}`     : '',
      ``,
      `──────────────────────────────────────────`,
      `Google Sheet: https://docs.google.com/spreadsheets/d/${SHEET_ID}`,
    ].join('\n');

    MailApp.sendEmail({
      to:      NOTIFY_EMAIL,
      subject: subject,
      body:    body,
    });

    // ── Antwort ───────────────────────────────────────────────────
    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    console.error('doPost error:', err);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/** Testfunktion – im Apps Script Editor ausführen zum Testen */
function testDoPost() {
  const mock = {
    postData: {
      contents: JSON.stringify({
        from: 'Max Müller',
        team: 'CampusClips',
        type: 'bug',
        subject: 'Login-Button reagiert nicht',
        message: 'Beim Klick auf Login passiert nichts.',
        page: 'Login-Screen',
        steps: '1. Seite öffnen\n2. Code eingeben\n3. Enter drücken',
        date: new Date().toISOString(),
      })
    }
  };
  const result = doPost(mock);
  Logger.log(result.getContent());
}
