# Album Rater

Search any album or single on Spotify, rate each track 1–10, and generate a shareable image card.

---

## 🚀 Deploy to Netlify (free, ~5 minutes)

### Step 1 — Get your Spotify credentials

1. Go to https://developer.spotify.com/dashboard
2. Log in with your Spotify account
3. Click **Create App**
4. Fill in:
   - App name: `Album Rater` (anything works)
   - App description: anything
   - Redirect URI: `http://localhost` (required but not used)
5. Click **Save**
6. On your app page, copy your **Client ID** and **Client Secret**

---

### Step 2 — Deploy to Netlify

**Option A — Drag and drop (easiest)**

1. Go to https://netlify.com and sign up free
2. From your dashboard, drag the entire `album-rater` folder onto the page
3. Netlify will deploy it instantly and give you a URL like `https://your-site.netlify.app`

**Option B — GitHub (recommended for updates)**

1. Push this folder to a GitHub repo
2. Go to https://netlify.com → **Add new site** → **Import from Git**
3. Connect your GitHub and select the repo
4. Set build settings:
   - Build command: (leave empty)
   - Publish directory: `public`
5. Click **Deploy site**

---

### Step 3 — Add your Spotify secrets

This is the important step — your Client Secret stays hidden on Netlify's servers, never exposed to users.

1. In Netlify, go to your site → **Site configuration** → **Environment variables**
2. Click **Add a variable** and add:
   - Key: `SPOTIFY_CLIENT_ID` → Value: your Client ID from Step 1
   - Key: `SPOTIFY_CLIENT_SECRET` → Value: your Client Secret from Step 1
3. Click **Save**
4. Go to **Deploys** → **Trigger deploy** → **Deploy site**

Your site is now live! Tokens are fetched automatically and refresh every hour.

---

## 📁 Project structure

```
album-rater/
├── public/
│   └── index.html          ← The main app
├── netlify/
│   └── functions/
│       └── spotify-token.js ← Serverless function (hides your secret)
├── netlify.toml             ← Netlify config
└── README.md
```

---

## 🔒 Security

- Your `SPOTIFY_CLIENT_SECRET` is stored as a Netlify environment variable — it never appears in your HTML or JS
- The serverless function runs on Netlify's servers and returns only an access token to the browser
- Access tokens expire after 1 hour and are automatically refreshed

---

## 📱 Converting to APK (optional, later)

Once hosted, you can wrap the site into an Android APK using Capacitor:

```bash
npm install -g @capacitor/cli
npm init
npx cap init
npx cap add android
npx cap open android
```

Then build with Android Studio.
