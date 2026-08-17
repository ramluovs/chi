const SpotifyWebApi = require('spotify-web-api-node');

const LOVABLE_API_URL = 'https://chidoris.lovable.app/api/public/spotify/token';
const tokenCache = new Map();

async function getSpotifyApiForUser(discordUserId, forceRefresh = false) {
  const now = Date.now();
  const cached = tokenCache.get(discordUserId);

  if (!forceRefresh && cached && cached.expiresAt > now) {
    const spotifyApi = new SpotifyWebApi();
    spotifyApi.setAccessToken(cached.token);
    return { api: spotifyApi };
  }

  try {
    const response = await fetch(`${LOVABLE_API_URL}?discord_user_id=${discordUserId}`);

    if (response.status === 404) {
      return { error: 'unlinked' };
    }

    if (!response.ok) {
      return { error: 'api_error' };
    }

    const data = await response.json();
    const token = data.access_token || data.accessToken;

    if (!token) {
      return { error: 'no_token' };
    }

    const expiresInMs = ((data.expires_in || 3600) - 600) * 1000;
    tokenCache.set(discordUserId, {
      token: token,
      expiresAt: now + expiresInMs
    });

    const spotifyApi = new SpotifyWebApi();
    spotifyApi.setAccessToken(token);
    return { api: spotifyApi };
  } catch (err) {
    console.error('[Spotify Helper Error]:', err);
    return { error: 'network_error' };
  }
}

function formatMs(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

module.exports = {
  getSpotifyApiForUser,
  formatMs,
  BABY_BLUE: 0xaeefff
};
