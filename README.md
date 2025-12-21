# Dolce Voce Narrante 🎙️

Un'applicazione web elegante per trasformare testi in narrazioni audio usando Google Gemini AI.

## ✨ Caratteristiche

- 📖 **Text-to-Speech** con voce italiana naturale (Google Gemini)
- 🎤 **Dettatura vocale** per inserire testi tramite microfono
- ⚡ **Velocità regolabile** (lenta, normale, veloce)
- 📚 **Biblioteca Personale** - Salva, modifica e riascolta le tue storie preferite
- 🏷️ **Organizzazione** - Aggiungi titoli e categorie alle tue storie
- 💾 **Database Cloud** - Le tue storie sincronizzate su tutti i dispositivi
- 📱 **Responsive** e ottimizzato per mobile
- 🔒 **Privacy-first**: le chiavi API sono criptate e sicure

## 🚀 Deploy su Vercel

### 1. Preparazione

1. Crea un account su [Vercel](https://vercel.com)
2. Installa Vercel CLI (opzionale):
   ```bash
   npm i -g vercel
   ```

### 2. Setup Database Vercel Postgres

1. Nel dashboard Vercel, vai su **Storage** → **Create Database**
2. Seleziona **Postgres**
3. Crea il database e copia le credenziali
4. Nella tab **Query**, esegui lo schema SQL:
   ```sql
   -- Copia e incolla il contenuto di db/schema.sql
   ```

### 3. Deploy

#### Opzione A: Deploy tramite GitHub

1. Pusha il codice su GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <tuo-repo-url>
   git push -u origin main
   ```

2. Su Vercel:
   - Click su **New Project**
   - Importa il repository GitHub
   - Vercel rileverà automaticamente Vite
   - Click su **Deploy**

#### Opzione B: Deploy tramite CLI

```bash
vercel
```

Segui le istruzioni interattive.

### 4. Configurazione Variabili d'Ambiente

Nel dashboard Vercel del progetto:

1. Vai su **Settings** → **Environment Variables**
2. Aggiungi (se necessario per sviluppo):
   - `POSTGRES_URL` (auto-configurato se usi Vercel Postgres)
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`

**Nota**: Le API key degli utenti vengono salvate nel database, non servono variabili d'ambiente per le chiavi Gemini.

## 🔧 Sviluppo Locale

### Prerequisiti

- Node.js 18+
- npm o yarn

### Installazione

```bash
npm install
```

### Avvio

```bash
npm run dev
```

L'app sarà disponibile su `http://localhost:5173`

### Build

```bash
npm run build
```

## 📱 Ottimizzazioni Mobile

L'applicazione è completamente responsive e include:

- **Touch-friendly UI**: pulsanti e controlli ottimizzati per touch
- **Viewport ottimizzato**: layout adattivo per schermi piccoli
- **Performance**: lazy loading e code splitting
- **PWA-ready**: può essere installata come app nativa

### Installazione come PWA (Progressive Web App)

Su mobile:
1. Apri l'app nel browser
2. Tocca il menu (⋮) 
3. Seleziona "Aggiungi a schermata Home"
4. L'app si aprirà come un'applicazione nativa

## 🔐 Gestione API Key

### Per gli Utenti

1. Click sull'icona ⚙️ in alto a destra
2. Inserisci la tua Google Gemini API Key
3. Click su "Salva Chiave API"

La chiave viene salvata:
- **Localmente** nel browser (localStorage)
- **Nel database cloud** (se disponibile su Vercel)

### Ottenere una API Key Gratuita

1. Vai su [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Accedi con il tuo account Google
3. Click su "Create API Key"
4. Copia la chiave (inizia con `AIza...`)

## 🏗️ Struttura del Progetto

```
Lettura-main/
├── api/
│   └── settings.ts          # API route per gestione chiavi
├── db/
│   └── schema.sql           # Schema database Postgres
├── services/
│   ├── geminiService.ts     # Integrazione Google Gemini
│   └── apiKeyService.ts     # Gestione chiavi API
├── utils/
│   └── audioUtils.ts        # Utility audio
├── App.tsx                  # Componente principale
├── index.css                # Stili globali
├── vercel.json              # Configurazione Vercel
└── package.json
```

## 🌐 Tecnologie Utilizzate

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Build Tool**: Vite
- **AI**: Google Gemini API (TTS + STT)
- **Database**: Vercel Postgres
- **Hosting**: Vercel Edge Functions

## 📝 Note Importanti

### Sicurezza

- Le API key sono salvate in modo sicuro nel database
- Ogni utente ha un ID univoco generato automaticamente
- Le chiavi non vengono mai esposte nel codice client

### Limiti API Gratuita

Google Gemini offre un tier gratuito con:
- 60 richieste al minuto
- 1500 richieste al giorno

Per uso intensivo, considera un piano a pagamento.

## 🐛 Troubleshooting

### L'audio non si riproduce

1. Verifica che la chiave API sia valida
2. Controlla la console del browser per errori
3. Assicurati di avere una connessione internet stabile

### Database non disponibile

L'app funziona anche senza database:
- Le chiavi vengono salvate solo in localStorage
- Funzionalità limitata a un singolo dispositivo

### Errori di build

```bash
# Pulisci cache e reinstalla
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📄 Licenza

MIT License - Sentiti libero di usare questo progetto per scopi personali o commerciali.

## 🤝 Contributi

I contributi sono benvenuti! Apri una issue o una pull request.

## 📧 Supporto

Per domande o problemi, apri una issue su GitHub.

---

**Fatto con ❤️ usando Google Gemini AI**
