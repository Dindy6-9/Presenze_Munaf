# 📋 PRESENZE MUNAF — Guida all'installazione

---

## STRUTTURA DEI FILE

```
presenze-munaf/
├── index.html          ← File principale (apri questo)
├── style.css           ← Stili
├── app.js              ← Logica principale
├── manifest.json       ← Configurazione PWA
├── sw.js               ← Service Worker (offline)
├── js/
│   ├── storage.js      ← Database locale (IndexedDB)
│   ├── calculations.js ← Calcoli ore e ticket
│   └── export.js       ← Export CSV e PDF
└── assets/
    ├── icon-192.svg    ← Icona app
    └── icon-512.svg    ← Icona app grande
```

---

## INSTALLAZIONE

### OPZIONE A — Su PC (Windows/Mac/Linux) con Google Chrome

Questa è la via più semplice e consigliata.

1. Estrai lo ZIP in una cartella sul tuo computer (es. `Documenti/presenze-munaf/`)
2. Apri **Google Chrome**
3. Trascina il file `index.html` nella finestra del browser
   — oppure premi `Ctrl+O` e seleziona `index.html`
4. In alto a destra nella barra degli indirizzi apparirà un'icona
   con un computer e una freccetta ↓  
   Clicca → "Installa Presenze MUNAF"
5. L'app si apre in una finestra dedicata, senza la barra del browser
6. D'ora in poi trovi l'icona sul Desktop e nel menu Start

> ⚠️ Tieni la cartella `presenze-munaf/` sempre nello stesso posto sul PC.
> Se la sposti, dovrai reinstallare.

---

### OPZIONE B — Su iPhone/iPad (Safari)

1. **Invia la cartella** (o lo ZIP estratto) su Google Drive o iCloud Drive
2. Su iPhone, apri Safari e vai al file `index.html`
   - Da Google Drive: apri l'app Drive → tieni premuto `index.html` → "Apri in" → Safari
   - Da iCloud: apri il file dall'app File
3. In Safari, tocca l'icona **Condividi** (quadrato con freccia su)
4. Scorri e tocca **"Aggiungi alla schermata Home"**
5. Conferma il nome "Presenze MUNAF" → **Aggiungi**
6. L'icona appare sulla schermata Home

> ⚠️ Su iPhone il funzionamento offline completo dipende da Safari.
> I dati sono salvati nel browser — non cancellare la cache di Safari.

---

### OPZIONE C — Su Android (Chrome)

1. Copia la cartella estratta sul telefono (via USB o Google Drive)
2. Apri Chrome sul telefono
3. Nella barra degli indirizzi scrivi: `file:///sdcard/Download/presenze-munaf/index.html`
   (adatta il percorso a dove hai messo la cartella)
4. Chrome mostrerà un banner in basso: **"Aggiungi alla schermata Home"**
   → Tocca e conferma
5. L'icona appare nella home del telefono

---

## PRIMA CONFIGURAZIONE

Al primo avvio l'app mostra la schermata di setup:

1. **Nome e Cognome** — inserisci il tuo nome
2. **Ore da contratto** — di solito 7 o 7.5
3. **Pausa predefinita** — 30 o 60 minuti
4. **Tema** — scegli il colore che preferisci (puoi cambiarlo dopo)
5. **PIN** — opzionale, puoi saltarlo
6. Premi **"Inizia a usare l'app →"**

---

## UTILIZZO QUOTIDIANO

### Registrare una giornata

- Tocca il **➕** nella barra in basso, oppure "Nuova giornata" dalla home
- Inserisci orario di entrata e uscita
- Le **ore lavorate**, **ticket** e **differenza** si calcolano automaticamente
- Aggiungi eventuale malattia, ferie, trasferta, note
- Premi **Salva giornata**

### Calcolo ticket
- Se ore lavorate ≥ 6 → 1 ticket
- Altrimenti → 0 ticket

### Differenza ore
- Mostra quanto hai lavorato in più o in meno rispetto al contratto
- Es: contratto 7h, lavorate 8.5h → **+1:30**
- Sei tu a decidere se attribuirla a straordinario, recupero, ecc.

---

## EXPORT

### PDF Mensile
- Vai su **Report** → seleziona mese e anno → **Esporta PDF**
- Si scarica un file PDF con tabella completa, totali e colonna firma

### CSV (Excel)
- Vai su **Report** → seleziona mese e anno → **Esporta CSV**
- Apri il file con Excel: usa `Dati → Da testo/CSV` e scegli separatore `;`

### Backup
- Vai su **Impostazioni** → **Esporta backup**
- Salva il file `.json` in un posto sicuro (Google Drive, email a te stesso)
- Per ripristinare: **Importa backup** → seleziona il file

---

## PROBLEMI FREQUENTI

**L'app non si apre / pagina bianca**
→ Assicurati di aprire `index.html` con Chrome o Safari (non Edge o Firefox su mobile)

**I dati sono spariti**
→ Hai cancellato la cache del browser? Ripristina da backup JSON

**Il PDF non si genera**
→ Controlla di avere connessione internet la prima volta (scarica la libreria jsPDF)
→ Dalla seconda volta funziona anche offline

**Non trovo l'icona per installare su Chrome**
→ Cerca in alto a destra nella barra URL un'icona con monitor+freccia
→ Oppure menu ⋮ → "Installa Presenze MUNAF"

---

## NOTE IMPORTANTI

- I dati sono salvati **solo sul dispositivo** dove usi l'app
- Ogni persona installa la propria copia — **non c'è sincronizzazione**
- Fai regolarmente il **backup JSON** per non perdere i dati
- L'app funziona **completamente offline** dopo il primo caricamento

---

*Presenze MUNAF v1.0 — Uso interno*
