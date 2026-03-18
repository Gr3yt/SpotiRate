// ─── TOKEN MANAGEMENT ────────────────────────────────────────────────────────
let spotifyToken = null;
let tokenExpiry = 0;

async function getToken() {
  if (spotifyToken && Date.now() < tokenExpiry) return spotifyToken;
  try {
    const res = await fetch('/.netlify/functions/spotify-token');
    if (!res.ok) throw new Error('Function error');
    const data = await res.json();
    spotifyToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    setStatus('CONNECTED', 'ok');
    return spotifyToken;
  } catch (e) {
    setStatus('NO TOKEN', 'err');
    return null;
  }
}

function setStatus(text, type) {
  const el = document.getElementById('token-status');
  el.textContent = text;
  el.className = type || '';
}

// ─── LIVE SEARCH (DEBOUNCED) ──────────────────────────────────────────────────
let currentAlbum = null;
let debounceTimer = null;

function debounceSearch() {
  const query = document.getElementById('search-input').value.trim();
  clearTimeout(debounceTimer);

  if (!query) {
    document.getElementById('results-list').style.display = 'none';
    document.getElementById('results-list').innerHTML = '';
    document.getElementById('status-msg').style.display = 'none';
    return;
  }

  if (query.length < 2) return;

  showMsg('<span class="spinner"></span>Searching...', 'var(--text-muted)');
  debounceTimer = setTimeout(() => searchAlbum(), 400);
}

function showMsg(msg, color) {
  const el = document.getElementById('status-msg');
  el.innerHTML = msg;
  el.style.color = color || 'var(--text-muted)';
  el.style.display = 'block';
}

async function searchAlbum() {
  const query = document.getElementById('search-input').value.trim();
  if (!query) return;

  const btn = document.getElementById('search-btn');
  btn.innerHTML = '<span class="spinner"></span>SEARCHING';
  btn.disabled = true;

  const token = await getToken();
  if (!token) {
    showMsg('⚠ Could not connect to Spotify. Check your Netlify env vars.', 'var(--red)');
    btn.innerHTML = 'SEARCH'; btn.disabled = false;
    return;
  }

  try {
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album&limit=6`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const data = await res.json();
    renderResults(data.albums?.items || []);
  } catch (e) {
    showMsg('⚠ Search failed.', 'var(--red)');
  }

  btn.innerHTML = 'SEARCH'; btn.disabled = false;
}

function renderResults(items) {
  const list = document.getElementById('results-list');
  list.innerHTML = '';
  list.style.display = 'flex';
  document.getElementById('status-msg').style.display = 'none';

  if (!items.length) {
    list.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;padding:0.5rem">No results found.</div>';
    return;
  }

  items.forEach(item => {
    const img = item.images?.[1]?.url || item.images?.[0]?.url || '';
    const div = document.createElement('div');
    div.className = 'result-item fade-in';
    div.innerHTML = `
      <img src="${img}" alt="">
      <div class="result-info">
        <div class="result-name">${item.name}</div>
        <div class="result-meta">${item.artists.map(a => a.name).join(', ')} · ${item.release_date?.slice(0, 4)}</div>
      </div>
      <span class="result-type">${item.album_type}</span>
    `;
    div.onclick = () => loadAlbum(item.id);
    list.appendChild(div);
  });
}

async function loadAlbum(id) {
  showMsg('<span class="spinner"></span>Loading tracks...', 'var(--text-muted)');
  document.getElementById('results-list').style.display = 'none';

  const token = await getToken();
  try {
    const res = await fetch(`https://api.spotify.com/v1/albums/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const album = await res.json();
    currentAlbum = album;
    renderRater(album);
  } catch (e) {
    showMsg('⚠ Failed to load album.', 'var(--red)');
  }
}

// ─── RATER ───────────────────────────────────────────────────────────────────
function renderRater(album) {
  document.getElementById('status-msg').style.display = 'none';
  document.getElementById('setup-panel').style.display = 'none';
  document.getElementById('card-wrapper').style.display = 'none';

  const img    = album.images?.[0]?.url || '';
  const artist = album.artists.map(a => a.name).join(', ');
  const year   = album.release_date?.slice(0, 4);
  const count  = album.tracks.total;

  document.getElementById('album-header').innerHTML = `
    <img class="album-cover" src="${img}" alt="">
    <div class="album-meta">
      <div class="type-tag">${album.album_type.toUpperCase()}</div>
      <h2>${album.name}</h2>
      <p>${artist} · ${year} · ${count} track${count !== 1 ? 's' : ''}</p>
    </div>
  `;

  resetExtras();

  const trackList = document.getElementById('track-list');
  trackList.innerHTML = '';

  album.tracks.items.forEach((track, i) => {
    const row = document.createElement('div');
    row.className = 'track-row';
    row.innerHTML = `
      <span class="track-num">${i + 1}</span>
      <span class="track-name">${track.name}</span>
      <div class="rating-group">
        <input type="range" class="rating-input" min="1" max="10" value="5"
          data-track="${i}" oninput="updateRating(this)">
        <span class="rating-val" id="rval-${i}">5</span>
      </div>
    `;
    trackList.appendChild(row);
  });

  document.getElementById('rater-panel').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateRating(input) {
  const i   = input.dataset.track;
  const val = parseInt(input.value);
  const label = document.getElementById(`rval-${i}`);
  label.textContent = val;
  label.style.color = val <= 3 ? 'var(--red)' : val <= 6 ? 'var(--yellow)' : 'var(--accent)';
}

// ─── EXTRAS PANEL ────────────────────────────────────────────────────────────
function toggleExtras(btn) {
  btn.classList.toggle('open');
  document.getElementById('extras-body').classList.toggle('open');
}

function resetExtras() {
  document.getElementById('extra-name').value = '';
  const reviewInput = document.getElementById('review-input');
  const reviewCount = document.getElementById('review-count');
  reviewInput.value = '';
  reviewCount.textContent = '0 / 300';
  reviewInput.oninput = () => {
    reviewCount.textContent = `${reviewInput.value.length} / 300`;
  };
  document.getElementById('extra-track-length').checked = false;
  // ── RESET NEW EXTRAS HERE ──
}

function getExtras() {
  return {
    name:        document.getElementById('extra-name').value.trim(),
    review:      document.getElementById('review-input').value.trim(),
    trackLength: document.getElementById('extra-track-length').checked,
    // ── ADD NEW EXTRAS HERE ──
    // newFeature: document.getElementById('extra-new-feature').checked,
  };
}

// ─── CARD THEMES ─────────────────────────────────────────────────────────────
let currentTheme = 'dark';

const themeAccents = {
  dark:     '#1DB954',
  green:    '#1DB954',
  midnight: '#9999ff',
  warm:     '#e08030',
  albumart: '#ffffff',
};

const bgMap = {
  dark:     '#0f0f0f',
  green:    '#081a0f',
  midnight: '#0a0a1a',
  warm:     '#1a0f08',
  albumart: '#000000',
};

function setTheme(theme, btn) {
  currentTheme = theme;
  document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const card = document.getElementById('export-card');
  if (card.innerHTML) generateCard();
}

// ─── CARD GENERATION ─────────────────────────────────────────────────────────
function generateCard() {
  const album   = currentAlbum;
  const inputs  = document.querySelectorAll('.rating-input');
  const ratings = Array.from(inputs).map(i => parseInt(i.value));
  const tracks  = album.tracks.items;
  const img     = album.images?.[0]?.url || '';
  const artist  = album.artists.map(a => a.name).join(', ');
  const year    = album.release_date?.slice(0, 4);
  const avg     = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
  const accent  = themeAccents[currentTheme];
  const extras  = getExtras();

  function formatMs(ms) {
    if (!ms) return '';
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  const trackRows = tracks.map((t, i) => {
    const r     = ratings[i];
    const barW  = (r / 10) * 100;
    const color = r <= 3 ? '#e05c5c' : r <= 6 ? '#e0b95c' : accent;
    const duration = extras.trackLength && t.duration_ms
      ? `<span class="ct-duration">${formatMs(t.duration_ms)}</span>`
      : '';
    return `
      <div class="card-track">
        <span class="ct-num">${i + 1}</span>
        <span class="ct-name">${t.name}</span>
        ${duration}
        <div class="ct-bar-wrap"><div class="ct-bar" style="width:${barW}%;background:${color}"></div></div>
        <span class="ct-score" style="color:${color}">${r}</span>
      </div>
    `;
  }).join('');

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const reviewHtml = extras.review
    ? `<div class="card-review">"${extras.review}"</div>`
    : '';

  const nameHtml = extras.name
    ? `<span class="card-footer-name">rated by ${extras.name}</span>`
    : '';

  const card = document.getElementById('export-card');
  card.style.setProperty('--album-art', `url('${img}')`);
  card.className = `theme-${currentTheme}`;
  card.innerHTML = `
    <div class="card-header">
      <img class="card-cover" src="${img}" alt="" crossorigin="anonymous">
      <div class="card-info">
        <div class="card-type-tag">${album.album_type.toUpperCase()}</div>
        <div class="card-title">${album.name}</div>
        <div class="card-artist">${artist} · ${year}</div>
        <div class="card-overall">
          <span class="card-overall-num">${avg}</span>
          <span class="card-overall-label">/ 10 overall</span>
        </div>
      </div>
    </div>
    ${reviewHtml}
    <div class="card-divider"></div>
    <div class="card-tracks">${trackRows}</div>
    <div class="card-footer">
      <span class="card-footer-brand">SPOTIRATE</span>
      ${nameHtml}
      <span class="card-footer-date">${today}</span>
    </div>
  `;

  document.getElementById('card-wrapper').style.display = 'block';
  document.getElementById('card-wrapper').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── DOWNLOAD ────────────────────────────────────────────────────────────────
async function downloadCard(e) {
  const btn = e.target;
  btn.innerHTML = '<span class="spinner"></span>RENDERING';
  btn.disabled = true;

  const bg = bgMap[currentTheme] || '#0f0f0f';

  try {
    const canvas = await html2canvas(document.getElementById('export-card'), {
      backgroundColor: bg,
      scale: 2,
      useCORS: true,
      logging: false,
    });
    const link = document.createElement('a');
    link.download = `${currentAlbum?.name || 'album'}-spotirate.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    alert('Download failed — try screenshotting the card instead.');
  }

  btn.innerHTML = 'DOWNLOAD IMAGE'; btn.disabled = false;
}

// ─── RESET ───────────────────────────────────────────────────────────────────
function resetAll() {
  document.getElementById('rater-panel').style.display = 'none';
  document.getElementById('card-wrapper').style.display = 'none';
  document.getElementById('setup-panel').style.display = 'block';
  document.getElementById('results-list').style.display = 'none';
  document.getElementById('results-list').innerHTML = '';
  document.getElementById('status-msg').style.display = 'none';
  document.getElementById('search-input').value = '';
  currentAlbum = null;
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
getToken();