// ─── SUPABASE AUTH ────────────────────────────────────────────────────────────
// Loaded on every page. Manages session, user state, and auth UI.

const SUPABASE_URL = '__SUPABASE_URL__'; // replaced at build or set manually
const SUPABASE_ANON = '__SUPABASE_ANON_KEY__';

// We load Supabase from CDN in each HTML page's <head>
// window.supabase is set by the CDN script

let _supabase = null;
let currentUser = null;
let currentSession = null;

function getSupabase() {
  if (_supabase) return _supabase;
  _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  return _supabase;
}

// ── SESSION INIT ──────────────────────────────────────────────────────────────
async function initAuth() {
  const sb = getSupabase();

  // Handle OAuth callback — Supabase puts tokens in the URL hash
  const hash = window.location.hash;
  if (hash.includes('access_token')) {
    const params = new URLSearchParams(hash.slice(1));
    const accessToken  = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (accessToken) {
      await sb.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  const { data: { session } } = await sb.auth.getSession();
  currentSession = session;
  currentUser = session?.user ?? null;

  // Store session in cookie for 7 days
  if (session) {
    document.cookie = `sr_session=${session.access_token}; path=/; max-age=${60*60*24*7}; SameSite=Lax`;
  }

  renderAuthUI();
  return currentUser;
}

// ── AUTH UI ───────────────────────────────────────────────────────────────────
function renderAuthUI() {
  const container = document.getElementById('auth-area');
  if (!container) return;

  if (currentUser) {
    const meta = currentUser.user_metadata;
    const avatar = meta?.avatar_url || '';
    const name   = meta?.full_name || meta?.name || 'User';
    container.innerHTML = `
      <div class="auth-user" onclick="toggleUserMenu()">
        <img class="auth-avatar" src="${avatar}" alt="">
        <span class="auth-name">${name}</span>
        <span class="auth-caret">▾</span>
      </div>
      <div class="auth-menu" id="auth-menu" style="display:none">
        <a href="/profile?user_id=${currentUser.id}" class="auth-menu-item">My Profile</a>
        <a href="/saved" class="auth-menu-item">Saved Ratings</a>
        <a href="/friends" class="auth-menu-item">Friends</a>
        <div class="auth-menu-divider"></div>
        <div class="auth-menu-item danger" onclick="signOut()">Sign Out</div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <button class="discord-btn" onclick="signInWithDiscord()">
        <svg width="16" height="12" viewBox="0 0 24 18" fill="currentColor">
          <path d="M20.317 1.492a19.82 19.82 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 1.492a.07.07 0 0 0-.032.027C.533 6.093-.32 10.555.099 14.961a.08.08 0 0 0 .031.055 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.026c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.442a.061.061 0 0 0-.031-.03z"/>
        </svg>
        Sign in with Discord
      </button>
    `;
  }
}

function toggleUserMenu() {
  const menu = document.getElementById('auth-menu');
  if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', function closeMenu(e) {
      if (!e.target.closest('.auth-user') && !e.target.closest('.auth-menu')) {
        if (menu) menu.style.display = 'none';
        document.removeEventListener('click', closeMenu);
      }
    });
  }, 0);
}

async function signInWithDiscord() {
  const sb = getSupabase();
  await sb.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });
}

async function signOut() {
  const sb = getSupabase();
  await sb.auth.signOut();
  document.cookie = 'sr_session=; path=/; max-age=0';
  currentUser = null;
  currentSession = null;
  window.location.href = '/';
}

// ── HELPER: get auth token for API calls ─────────────────────────────────────
function getAuthToken() {
  return currentSession?.access_token || null;
}

function authHeaders() {
  const token = getAuthToken();
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

// ── AUTO INIT ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initAuth);