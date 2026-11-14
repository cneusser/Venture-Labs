# VentureLab WiSe 2026/27 — Setup-Guide & Checklisten

> Erstellt: 2026-11-14 · Version v0.94  
> Zielgruppe: Superadmin (Dr. Christian Neusser)

---

## 🔴 ITEM 1: Firebase Security Rules v2 — Deployment-Anleitung

### Voraussetzungen

Bevor die Rules in `firebase_security_rules.v2.json` deployt werden können, müssen **Custom Claims** im Firebase Auth-Token für jeden Nutzer gesetzt werden.

| Claim | Typ | Wert (Beispiele) |
|-------|-----|------------------|
| `role` | string | `superadmin`, `admin`, `member` |
| `gameId` | string | `game-wise-2026` |
| `teamId` | string | `team-abc123` |
| `memberId` | string | `mbr-xyz789` |

### Option A: Cloud Function (empfohlen für Magic-Link-User)

Erstelle eine Firebase Cloud Function, die beim Erstellen oder Anmelden eines Nutzers die Claims setzt:

```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Trigger: Superadmin ruft diese Funktion per HTTP auf
exports.setUserClaims = functions.https.onCall(async (data, context) => {
  // Nur Superadmin darf Claims setzen
  if (!context.auth?.token?.role === 'superadmin') {
    throw new functions.https.HttpsError('permission-denied', 'Nur Superadmin erlaubt');
  }
  const { uid, role, gameId, teamId, memberId } = data;
  await admin.auth().setCustomUserClaims(uid, { role, gameId, teamId, memberId });
  return { success: true };
});
```

Aufruf aus der App:
```javascript
const setUserClaims = firebase.functions().httpsCallable('setUserClaims');
await setUserClaims({ uid, role, gameId, teamId, memberId });
```

### Option B: Interim-Lösung (ohne Custom Claims)

Die bestehenden **offenen Rules** (Stufe 1) lassen alle authentifizierten Nutzer lesen/schreiben. Das ist für ein geschlossenes Hochschulsystem mit Magic-Link-Auth ausreichend bis Custom Claims implementiert sind.

Aktuelle Stufe 1 Rules (Minimal-Security, auth required):
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

### Deployment-Schritte

```bash
# 1. Firebase CLI installieren (falls nicht vorhanden)
npm install -g firebase-tools

# 2. Einloggen
firebase login

# 3. Projekt auswählen
firebase use venturelab-f2dcf

# 4. Rules-Datei deployen (ERST nach Custom Claims Implementierung!)
firebase deploy --only database:rules \
  --rules firebase_security_rules.v2.json

# 5. Verifikation
firebase database:rules:get --project venturelab-f2dcf
```

### ⚠️ Wichtige Hinweise

- **NICHT deployen** bevor Custom Claims in allen Auth-Tokens gesetzt sind
- Code-basierte Login-User (anonyme Firebase-Session) bekommen KEINE Claims → würden ausgesperrt
- Magic-Link-User (echte Email-Auth) bekommen Claims über Cloud Function
- **Testlauf**: Erst in einem Entwicklungs-Projekt deployen und Magic-Link-Flow mit einem Testaccount durchspielen

---

## 🔴 ITEM 2: Neues Spiel WiSe 2026/27 anlegen

### Schritt-für-Schritt im Superadmin-Panel

1. **Login als Superadmin** (Code `SUPER-NEUSS` + Passwort)
2. **Superadmin-Panel** → Tab **"Spiele"**
3. **Button "🎮 Neues Spiel"** klicken
4. Folgende Daten eingeben:

| Feld | Wert |
|------|------|
| Name | `VentureLab WiSe 2026/27` |
| Hochschule | `HFT Stuttgart` (oder gewünschte HS) |
| Startdatum | `2026-10-15` (Semesterbeginn) |
| Enddatum | `2027-02-15` (Semesterende) |
| Startkapital | `5,00 €` |
| Modus | `Intern` |
| Max. Teams | `10` |
| Wochen | `6` |

5. **Admin anlegen**: Tab "Admins" → neuen Admin für WiSe-Spiel anlegen
6. **Setup-Codes bereitstellen**: Superadmin → Spiel verwalten → Setup-Codes an Kursteilnehmer verteilen
7. **WiSe-Zusatzfragen importieren**: Admin-Panel → Zusatzfragen → "📥 WiSe 2026/27 Fragen" (Button)

### SoSe 2026 archivieren

Um das abgelaufene Semester sauber zu verstecken:
1. Superadmin-Panel → Tab "Spiele"
2. Beim SoSe-2026-Spiel auf **"📦 Archivieren"** klicken
3. Das Spiel verschwindet aus der aktiven Ansicht, Daten bleiben erhalten

---

## 🔴 ITEM 3: Magic-Link-Flow — Testprotokoll WiSe 2026/27

### Checkliste vor Semesterstart

#### Technische Voraussetzungen
- [ ] Firebase Auth: Email-Link-Authentifizierung aktiviert (Firebase Console → Authentication → Sign-in methods)
- [ ] `CONFIG.FIREBASE_API_KEY`, `AUTH_DOMAIN`, `DATABASE_URL` in index.html korrekt gesetzt
- [ ] Google Apps Script-Endpoint (`CONFIG.FEEDBACK_ENDPOINT`) erreichbar und aktiv
- [ ] `CONFIG.EMAIL_LINK_DOMAIN` auf die korrekte Hosting-URL gesetzt

#### Testlauf (mit eigenem Test-Email-Account)

1. **Magic-Link anfordern**
   - [ ] Login-Screen öffnen
   - [ ] Email eingeben und "Magic Link senden" klicken
   - [ ] Email-Eingang prüfen (auch Spam-Ordner)
   - [ ] Link-Ablaufzeit: Standardmäßig 24h

2. **Link klicken**
   - [ ] Link aus Email öffnen (gleiches Gerät / gleicher Browser empfohlen)
   - [ ] App erkennt Magic-Link und loggt automatisch ein
   - [ ] Profil-Completion-Step erscheint (Name, Rolle auswählen)

3. **Nach Login**
   - [ ] Korrektes Dashboard für Rolle wird angezeigt
   - [ ] Session-Persistenz: Tab schließen und neu öffnen → immer noch eingeloggt
   - [ ] Logout funktioniert (Firebase Auth signOut)

4. **Code-basierter Login (Fallback)**
   - [ ] Mitglied-Code (z.B. `MBR-XY-1`) + Passwort funktioniert parallel
   - [ ] Passwort-Reset per Email funktioniert

#### Edge Cases
- [ ] Magic-Link auf anderem Gerät öffnen → Fehlermeldung oder Cross-Device-Flow
- [ ] Abgelaufener Link → Klare Fehlermeldung mit "Neu anfordern" Option
- [ ] Gleicher Link zweimal klicken → Zweite Nutzung korrekt abgelehnt

#### Rollout-Plan
1. **1 Woche vor Semesterbeginn**: Testlauf mit eigenem Account
2. **3 Tage vor Semesterbeginn**: Setup-Codes an Admin-Team senden
3. **Semesterbeginn**: Setup-Codes an Studierende verteilen (Kickoff-Session)
4. **Woche 1, Tag 3**: Check ob alle Teams registriert sind

---

## 🟡 ITEM 4: Automatische Erinnerungen (bereits aktiv ✅)

`checkAutoReminders()` wird in `core/init.js` bereits via `setTimeout(checkAutoReminders, 3000)` aufgerufen.

**Erinnerungslogik:**
- **Freitag**: Reflexions-Reminder für alle Mitglieder die noch nicht eingereicht haben
- **Samstag**: Blog-Reminder (CEO) + Buchungs-Reminder (CFO) für offene Einreichungen
- Einmal pro Tag (gespeichert in localStorage `_vl_autoremind_YYYY-MM-DD`)
- In-App + Email (falls `notif.emailReminders !== false`)

---

## 🟡 ITEM 5: SoSe 2026 archivieren (neues Feature ✅)

Superadmin-Panel → Spiele-Tab → Button **"📦 Archivieren"** beim SoSe-2026-Eintrag.

Archivierte Spiele:
- Werden als `archived: true` markiert (kein Löschen!)
- Bleiben vollständig im localStorage / Firebase erhalten
- Können jederzeit mit "📤 De-archivieren" reaktiviert werden
- Superadmin-Stats zeigen nur nicht-archivierte Spiele in der Zählung

---

## 🟡 ITEM 6: Reflexionsprompts WiSe 2026/27 (neues Feature ✅)

Neue Funktion `importDefaultQuestions(gameId)` in `modules/weekly-questions.js`:
- 11 fertig formulierte Zusatzfragen für Wochen 1–6
- Import via Button "📥 WiSe 2026/27 Fragen" im Admin-Panel → Zusatzfragen
- Duplikate werden automatisch übersprungen
- Fragen können danach einzeln gelöscht oder ergänzt werden

---

## 🟢 ITEMS 7–9: Neue Features (implementiert ✅)

| Item | Datei | Funktion |
|------|-------|---------|
| 7: Analytics-Dashboard | `modules/analytics.js` | `renderAnalyticsDashboard(containerId)` |
| 8: Team-Semester-PDF | `modules/reports.js` | `exportTeamSemesterPDF(teamId)` |
| 9: Backup-Versionierung | `core/backup.js` | Auto: bis zu 5 Versionen in localStorage |

### Analytics-Dashboard einbinden (Item 7)
Füge in das Admin-HTML-Panel einen Container und Button ein:
```html
<!-- Im Admin-Panel oder Superadmin-Tab -->
<div id="analyticsDashboard"></div>
<script>renderAnalyticsDashboard('analyticsDashboard');</script>
```

### Team-PDF-Button einbinden (Item 8)
```html
<!-- Im Admin Blog-Panel oder Team-Übersicht -->
<button onclick="exportTeamSemesterPDF('TEAM_ID')">📄 Semesterbericht PDF</button>
```

### Backup-Versionen anzeigen (Item 9)
Füge in das Superadmin-Backup-Panel hinzu:
```html
<div id="backupVersionsPanel"></div>
<!-- Panel wird automatisch befüllt via renderBackupVersionsPanel() -->
```

---

## Versionierung

| Version | Datum | Änderungen |
|---------|-------|------------|
| v0.94 | 2026-11-14 | Analytics Dashboard, Team-PDF, Backup-Versioning, Archivierung, WiSe-Fragen |
| v0.93 | 2026-10-xx | Modular refactoring, 37 Module |
| v0.92 | 2026-xx-xx | Passwort-Reset implementiert |
