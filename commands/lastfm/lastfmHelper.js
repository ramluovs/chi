const BABY_BLUE = 0xaeefff;
const REQUIRED_ROLE_ID = '1340864854243803248';

const LASTFM_CONFIG = {
  USERNAME: 'lliami',          // Your default Last.fm username
  API_KEY: 'de43619e5650177cc7a1ddde70602cb3'   // Paste your Last.fm API Key here
};

const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

const TIME_PERIODS = {
  '1d': { label: 'últimas 24 horas', type: 'day' },
  '24h': { label: 'últimas 24 horas', type: 'day' },
  'day': { label: 'últimas 24 horas', type: 'day' },
  'd': { label: 'últimas 24 horas', type: 'day' },
  'hoy': { label: 'últimas 24 horas', type: 'day' },

  '7d': { label: 'últimos 7 días', period: '7day' },
  '1w': { label: 'últimos 7 días', period: '7day' },
  'w': { label: 'últimos 7 días', period: '7day' },
  'week': { label: 'últimos 7 días', period: '7day' },
  'semana': { label: 'últimos 7 días', period: '7day' },

  '1m': { label: 'último mes', period: '1month' },
  'month': { label: 'último mes', period: '1month' },
  'm': { label: 'último mes', period: '1month' },
  'mes': { label: 'último mes', period: '1month' },

  '3m': { label: 'últimos 3 meses', period: '3month' },
  '3months': { label: 'últimos 3 meses', period: '3month' },
  '3meses': { label: 'últimos 3 meses', period: '3month' },

  '6m': { label: 'últimos 6 meses', period: '6month' },
  '6months': { label: 'últimos 6 meses', period: '6month' },
  'halfyear': { label: 'últimos 6 meses', period: '6month' },

  '1y': { label: 'último año', period: '12month' },
  '12m': { label: 'último año', period: '12month' },
  'year': { label: 'último año', period: '12month' },
  'y': { label: 'último año', period: '12month' },
  'año': { label: 'último año', period: '12month' },

  'all': { label: 'todo el tiempo', period: 'overall' },
  'alltime': { label: 'todo el tiempo', period: 'overall' },
  'overall': { label: 'todo el tiempo', period: 'overall' },
  'siempre': { label: 'todo el tiempo', period: 'overall' }
};

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

// 1. Check if user has required role
function checkLastfmAuth(message) {
  if (!message.member || !message.member.roles) return false;
  return message.member.roles.cache.has(REQUIRED_ROLE_ID);
}

// 2. Get current playing track
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

// 3. Get artist stats (All-Time + metadata)
async function getArtistInfo(artistName, noRedirect = false, username = LASTFM_CONFIG.USERNAME) {
  const autocorrect = noRedirect ? '0' : '1';
  const url = `${BASE_URL}?method=artist.getinfo&artist=${encodeURIComponent(artistName)}&username=${encodeURIComponent(username)}&api_key=${LASTFM_CONFIG.API_KEY}&format=json&autocorrect=${autocorrect}`;
  const data = await safeFetch(url);
  const artist = data?.artist;
  if (!artist) return null;

  return {
    name: artist.name,
    url: artist.url,
    userPlaycount: parseInt(artist.stats?.userplaycount || 0, 10),
    globalPlaycount: parseInt(artist.stats?.playcount || 0, 10),
    globalListeners: parseInt(artist.stats?.listeners || 0, 10),
    tags: (artist.tags?.tag || []).map(t => t.name).slice(0, 3)
  };
}

// 4. Get artist scrobbles for a specific time period
async function getArtistPlaysInPeriod(artistName, periodConfig, username = LASTFM_CONFIG.USERNAME) {
  if (periodConfig.type === 'day') {
    const fromTimestamp = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
    const url = `${BASE_URL}?method=user.getrecenttracks&user=${encodeURIComponent(username)}&from=${fromTimestamp}&limit=200&api_key=${LASTFM_CONFIG.API_KEY}&format=json`;
    const data = await safeFetch(url);
    const tracks = data?.recenttracks?.track || [];
    const list = Array.isArray(tracks) ? tracks : [tracks];
    return list.filter(t => {
      const a = (t.artist?.['#text'] || t.artist?.name || '').toLowerCase();
      return a === artistName.toLowerCase();
    }).length;
  }

  if (periodConfig.period && periodConfig.period !== 'overall') {
    const url = `${BASE_URL}?method=user.gettopartists&user=${encodeURIComponent(username)}&period=${periodConfig.period}&limit=500&api_key=${LASTFM_CONFIG.API_KEY}&format=json`;
    const data = await safeFetch(url);
    const topList = data?.topartists?.artist || [];
    const artists = Array.isArray(topList) ? topList : [topList];
    const match = artists.find(a => a.name.toLowerCase() === artistName.toLowerCase());
    return match ? parseInt(match.playcount, 10) : 0;
  }

  return null;
}

module.exports = {
  BABY_BLUE,
  LASTFM_CONFIG,
  TIME_PERIODS,
  checkLastfmAuth,
  getCurrentlyPlaying,
  getArtistInfo,
  getArtistPlaysInPeriod
};
