const BABY_BLUE = 0xaeefff;
const REQUIRED_ROLE_ID = '1340864854243803248';

const LASTFM_CONFIG = {
  USERNAME: 'lliami',
  API_KEY: 'de43619e5650177cc7a1ddde70602cb3'
};

const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

const TIME_PERIODS = {
  '1d': { label: 'past 24 hours', type: 'day' },
  '24h': { label: 'past 24 hours', type: 'day' },
  'day': { label: 'past 24 hours', type: 'day' },
  'd': { label: 'past 24 hours', type: 'day' },
  'today': { label: 'past 24 hours', type: 'day' },

  '7d': { label: 'past 7 days', period: '7day' },
  '1w': { label: 'past 7 days', period: '7day' },
  'w': { label: 'past 7 days', period: '7day' },
  'week': { label: 'past 7 days', period: '7day' },

  '1m': { label: 'past month', period: '1month' },
  'month': { label: 'past month', period: '1month' },
  'm': { label: 'past month', period: '1month' },

  '3m': { label: 'past 3 months', period: '3month' },
  '3months': { label: 'past 3 months', period: '3month' },

  '6m': { label: 'past 6 months', period: '6month' },
  '6months': { label: 'past 6 months', period: '6month' },
  'halfyear': { label: 'past 6 months', period: '6month' },

  '1y': { label: 'past year', period: '12month' },
  '12m': { label: 'past year', period: '12month' },
  'year': { label: 'past year', period: '12month' },
  'y': { label: 'past year', period: '12month' },

  'all': { label: 'all time', period: 'overall' },
  'alltime': { label: 'all time', period: 'overall' },
  'overall': { label: 'all time', period: 'overall' }
};

async function safeFetch(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'CHIBot/1.0 (lliami Lastfm Client)',
        'Accept': 'application/json'
      }
    });
    clearTimeout(timeout);

    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      console.error(`[Last.fm Raw Response ${res.status}]:`, text);
      return null;
    }

    if (json.error) {
      console.error(`[Last.fm Error ${json.error}]: ${json.message}`);
      return null;
    }

    return json;
  } catch (err) {
    clearTimeout(timeout);
    console.error('[Last.fm Fetch Failed]:', err.message);
    return null;
  }
}

// 1. Role verification check
function checkLastfmAuth(message) {
  if (!message.member || !message.member.roles) return false;
  return message.member.roles.cache.has(REQUIRED_ROLE_ID);
}

// 2. Get currently playing or latest scrobbled track
async function getCurrentlyPlaying(username = LASTFM_CONFIG.USERNAME) {
  const url = `${BASE_URL}?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${LASTFM_CONFIG.API_KEY}&format=json&limit=2`;
  const data = await safeFetch(url);
  
  const rawTracks = data?.recenttracks?.track;
  if (!rawTracks) return null;

  const trackList = Array.isArray(rawTracks) ? rawTracks : [rawTracks];
  if (trackList.length === 0) return null;

  const current = trackList.find(t => t?.['@attr']?.nowplaying === 'true') || trackList[0];

  const artistName = typeof current.artist === 'string' ? current.artist : (current.artist?.['#text'] || current.artist?.name || '');
  const trackName = current.name || '';
  const albumName = typeof current.album === 'string' ? current.album : (current.album?.['#text'] || '');
  const image = current.image?.[3]?.['#text'] || current.image?.[2]?.['#text'] || null;

  if (!artistName) return null;

  return {
    artist: artistName,
    track: trackName,
    album: albumName,
    image: image,
    isPlayingNow: current?.['@attr']?.nowplaying === 'true'
  };
}

// 3. Artist info
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

// 4. Artist plays in timeframe
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

// 5. Album info
async function getAlbumInfo(albumName, artistName = '', noRedirect = false, username = LASTFM_CONFIG.USERNAME) {
  const autocorrect = noRedirect ? '0' : '1';
  
  if (artistName) {
    const url = `${BASE_URL}?method=album.getinfo&album=${encodeURIComponent(albumName)}&artist=${encodeURIComponent(artistName)}&username=${encodeURIComponent(username)}&api_key=${LASTFM_CONFIG.API_KEY}&format=json&autocorrect=${autocorrect}`;
    const data = await safeFetch(url);
    if (data?.album) {
      const album = data.album;
      return {
        name: album.name,
        artist: album.artist,
        url: album.url,
        userPlaycount: parseInt(album.userplaycount || 0, 10),
        globalPlaycount: parseInt(album.playcount || 0, 10),
        globalListeners: parseInt(album.listeners || 0, 10),
        image: album.image?.[3]?.['#text'] || album.image?.[2]?.['#text'] || null,
        tracksCount: Array.isArray(album.tracks?.track) ? album.tracks.track.length : 0
      };
    }
  }

  const searchUrl = `${BASE_URL}?method=album.search&album=${encodeURIComponent(albumName)}&api_key=${LASTFM_CONFIG.API_KEY}&format=json&limit=1`;
  const searchData = await safeFetch(searchUrl);
  const match = searchData?.results?.albummatches?.album?.[0];
  if (!match) return null;

  return getAlbumInfo(match.name, match.artist, noRedirect, username);
}

// 6. Album plays in timeframe
async function getAlbumPlaysInPeriod(albumName, periodConfig, username = LASTFM_CONFIG.USERNAME) {
  if (periodConfig.type === 'day') {
    const fromTimestamp = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
    const url = `${BASE_URL}?method=user.getrecenttracks&user=${encodeURIComponent(username)}&from=${fromTimestamp}&limit=200&api_key=${LASTFM_CONFIG.API_KEY}&format=json`;
    const data = await safeFetch(url);
    const tracks = data?.recenttracks?.track || [];
    const list = Array.isArray(tracks) ? tracks : [tracks];
    return list.filter(t => {
      const alb = (t.album?.['#text'] || '').toLowerCase();
      return alb === albumName.toLowerCase();
    }).length;
  }

  if (periodConfig.period && periodConfig.period !== 'overall') {
    const url = `${BASE_URL}?method=user.gettopalbums&user=${encodeURIComponent(username)}&period=${periodConfig.period}&limit=500&api_key=${LASTFM_CONFIG.API_KEY}&format=json`;
    const data = await safeFetch(url);
    const topList = data?.topalbums?.album || [];
    const albums = Array.isArray(topList) ? topList : [topList];
    const match = albums.find(a => a.name.toLowerCase() === albumName.toLowerCase());
    return match ? parseInt(match.playcount, 10) : 0;
  }

  return null;
}

// Add this function inside commands/lastfm/lastfmHelper.js

async function getArtistTopTracks(artistName, periodConfig = null, username = LASTFM_CONFIG.USERNAME) {
  // If a time period (like 7d, 1m, 1y) or 24h is given
  if (periodConfig) {
    if (periodConfig.type === 'day') {
      const fromTimestamp = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
      const url = `${BASE_URL}?method=user.getrecenttracks&user=${encodeURIComponent(username)}&from=${fromTimestamp}&limit=200&api_key=${LASTFM_CONFIG.API_KEY}&format=json`;
      const data = await safeFetch(url);
      const raw = data?.recenttracks?.track || [];
      const list = Array.isArray(raw) ? raw : [raw];
      
      const counts = {};
      list.forEach(t => {
        const art = t.artist?.['#text'] || t.artist?.name || '';
        if (art.toLowerCase() === artistName.toLowerCase()) {
          const title = t.name;
          counts[title] = (counts[title] || 0) + 1;
        }
      });

      return Object.entries(counts)
        .map(([name, playcount]) => ({ name, playcount }))
        .sort((a, b) => b.playcount - a.playcount);
    }

    if (periodConfig.period && periodConfig.period !== 'overall') {
      const url = `${BASE_URL}?method=user.gettoptracks&user=${encodeURIComponent(username)}&period=${periodConfig.period}&limit=500&api_key=${LASTFM_CONFIG.API_KEY}&format=json`;
      const data = await safeFetch(url);
      const raw = data?.toptracks?.track || [];
      const list = Array.isArray(raw) ? raw : [raw];
      return list
        .filter(t => (t.artist?.name || '').toLowerCase() === artistName.toLowerCase())
        .map(t => ({
          name: t.name,
          playcount: parseInt(t.playcount, 10),
          url: t.url
        }));
    }
  }

  // All-time top tracks for user by artist
  // Last.fm doesn't have a direct user.getArtistTracks with counts, so we aggregate user recent top scrobbles
  const url = `${BASE_URL}?method=user.gettoptracks&user=${encodeURIComponent(username)}&period=overall&limit=1000&api_key=${LASTFM_CONFIG.API_KEY}&format=json`;
  const data = await safeFetch(url);
  const raw = data?.toptracks?.track || [];
  const list = Array.isArray(raw) ? raw : [raw];
  
  return list
    .filter(t => (t.artist?.name || '').toLowerCase() === artistName.toLowerCase())
    .map(t => ({
      name: t.name,
      playcount: parseInt(t.playcount, 10),
      url: t.url
    }));
}

// Function to fetch Global Top Tracks when user replies "global"
async function getGlobalArtistTopTracks(artistName, noRedirect = false) {
  const autocorrect = noRedirect ? '0' : '1';
  const url = `${BASE_URL}?method=artist.gettoptracks&artist=${encodeURIComponent(artistName)}&api_key=${LASTFM_CONFIG.API_KEY}&format=json&autocorrect=${autocorrect}&limit=50`;
  const data = await safeFetch(url);
  const raw = data?.toptracks?.track || [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map(t => ({
    name: t.name,
    playcount: parseInt(t.playcount, 10),
    listeners: parseInt(t.listeners, 10),
    url: t.url
  }));
}

module.exports = {
  BABY_BLUE,
  LASTFM_CONFIG,
  TIME_PERIODS,
  checkLastfmAuth,
  getCurrentlyPlaying,
  getArtistInfo,
  getArtistPlaysInPeriod,
  getAlbumInfo,
  getAlbumPlaysInPeriod,
  getArtistTopTracks,
  getGlobalArtistTopTracks
};
