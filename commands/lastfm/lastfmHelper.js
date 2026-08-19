const BABY_BLUE = 0xaeefff;

// ==========================================
// ⚙️ YOUR CONFIGURATION (Change here anytime)
// ==========================================
const LASTFM_CONFIG = {
  USERNAME: 'lliami',          // Your default Last.fm username
  API_KEY: 'de43619e5650177cc7a1ddde70602cb3'   // Paste your Last.fm API Key here
};

const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

async function safeFetch(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'CHI-Discord-Bot/1.0' }
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    clearTimeout(timeout);
    return null;
  }
}

// 1. Get current track/artist from Last.fm recent tracks
async function getCurrentlyPlaying(username = LASTFM_CONFIG.USERNAME) {
  const url = `${BASE_URL}?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${LASTFM_CONFIG.API_KEY}&format=json&limit=1`;
  const data = await safeFetch(url);
  const track = data?.recenttracks?.track?.[0];
  if (!track) return null;

  return {
    artist: track.artist?.['#text'] || track.artist?.name || '',
    track: track.name || '',
    album: track.album?.['#text'] || '',
    image: track.image?.[3]?.['#text'] || track.image?.[2]?.['#text'] || null,
    isPlayingNow: track['@attr']?.nowplaying === 'true'
  };
}

// 2. Get artist stats & your personal playcount
async function getArtistStats(artistName, username = LASTFM_CONFIG.USERNAME) {
  const url = `${BASE_URL}?method=artist.getinfo&artist=${encodeURIComponent(artistName)}&username=${encodeURIComponent(username)}&api_key=${LASTFM_CONFIG.API_KEY}&format=json&autocorrect=1`;
  const data = await safeFetch(url);
  const artist = data?.artist;
  if (!artist) return null;

  return {
    name: artist.name,
    url: artist.url,
    userPlaycount: parseInt(artist.stats?.userplaycount || 0, 10),
    globalPlaycount: parseInt(artist.stats?.playcount || 0, 10),
    globalListeners: parseInt(artist.stats?.listeners || 0, 10),
    tags: (artist.tags?.tag || []).map(t => t.name).slice(0, 3),
    bio: artist.bio?.summary ? artist.bio.summary.split('<a href=')[0].trim() : ''
  };
}

module.exports = {
  BABY_BLUE,
  LASTFM_CONFIG,
  getCurrentlyPlaying,
  getArtistStats
};
