const BABY_BLUE = 0xaeefff;
const REQUIRED_ROLE_ID = '1340864854243803248';

const LASTFM_CONFIG = {
  USERNAME: 'lliami',          // Your default Last.fm username
  API_KEY: 'de43619e5650177cc7a1ddde70602cb3' // Paste your Last.fm API Key here
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
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'CHI-Discord-Bot/1.0' }
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

// 1. Role verification check
function checkLastfmAuth(message) {
  if (!message.member || !message.member.roles) return false;
  return message.member.roles.cache.has(REQUIRED_ROLE_ID);
}

// 2. Get current scrobble info
// Get currently playing (or most recently scrobbled) track/artist/album
async function getCurrentlyPlaying(username = LASTFM_CONFIG.USERNAME) {
  if (!LASTFM_CONFIG.API_KEY || LASTFM_CONFIG.API_KEY === 'YOUR_API_KEY_HERE') {
    console.error('❌ Missing LASTFM API Key in lastfmHelper.js');
    return null;
  }

  const url = `${BASE_URL}?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${LASTFM_CONFIG.API_KEY}&format=json&limit=2`;
  const data = await safeFetch(url);
  
  const tracks = data?.recenttracks?.track;
  if (!tracks) return null;

  // Last.fm can return an array or a single object if there's only 1 track
  const trackList = Array.isArray(tracks) ? tracks : [tracks];
  if (trackList.length === 0) return null;

  // 1. Check if there is an active 'nowplaying' track
  const nowPlayingTrack = trackList.find(t => t['@attr']?.nowplaying === 'true') || trackList[0];

  const artistName = nowPlayingTrack.artist?.['#text'] || nowPlayingTrack.artist?.name || '';
  const trackName = nowPlayingTrack.name || '';
  const albumName = nowPlayingTrack.album?.['#text'] || '';
  const image = nowPlayingTrack.image?.[3]?.['#text'] || nowPlayingTrack.image?.[2]?.['#text'] || null;

  if (!artistName && !trackName) return null;

  return {
    artist: artistName,
    track: trackName,
    album: albumName,
    image: image,
    isPlayingNow: nowPlayingTrack['@attr']?.nowplaying === 'true'
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
  
  // If artist is known, query directly
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

  // Otherwise search for the album first
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

module.exports = {
  BABY_BLUE,
  LASTFM_CONFIG,
  TIME_PERIODS,
  checkLastfmAuth,
  getCurrentlyPlaying,
  getArtistInfo,
  getArtistPlaysInPeriod,
  getAlbumInfo,
  getAlbumPlaysInPeriod
};
