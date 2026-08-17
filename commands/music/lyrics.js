const { EmbedBuilder } = require('discord.js');
const { getSpotifyApiForUser, BABY_BLUE } = require('./spotifyHelper');

function stripLrcTimestamps(text) {
  return text.replace(/^\[\d+:\d+(?:\.\d+)?\]\s*/gm, '');
}

function chunkLyrics(text, maxLen = 4000) {
  const lines = text.split('\n');
  const chunks = [];
  let current = '';

  for (const line of lines) {
    if ((current + line + '\n').length > maxLen) {
      chunks.push(current.trim());
      current = '';
    }
    current += line + '\n';
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text.slice(0, maxLen)];
}

async function fetchLyricsForTrack(track) {
  const artistName = track.artists?.[0]?.name || '';
  const albumName = track.album?.name || '';
  const durationSec = Math.round((track.duration_ms || 0) / 1000);
  const userAgent = 'chi-discord-bot/1.0';

  try {
    const getParams = new URLSearchParams({
      track_name: track.name,
      artist_name: artistName,
      album_name: albumName,
      duration: String(durationSec)
    });

    const res = await fetch(`https://lrclib.net/api/get?${getParams.toString()}`, {
      headers: { 'User-Agent': userAgent }
    });

    if (res.ok) {
      const data = await res.json();
      const text = data.plainLyrics || (data.syncedLyrics ? stripLrcTimestamps(data.syncedLyrics) : null);
      if (text) return { lyrics: text };
    }

    const searchParams = new URLSearchParams({ track_name: track.name, artist_name: artistName });
    const searchRes = await fetch(`https://lrclib.net/api/search?${searchParams.toString()}`, {
      headers: { 'User-Agent': userAgent }
    });

    if (!searchRes.ok) return { error: 'not_found' };
    const results = await searchRes.json();
    const match = results?.[0];

    const text = match?.plainLyrics || (match?.syncedLyrics ? stripLrcTimestamps(match.syncedLyrics) : null);
    if (!text) return { error: 'not_found' };

    return { lyrics: text };
  } catch {
    return { error: 'network_error' };
  }
}

module.exports = {
  name: 'lyrics',
  aliases: ['letra'],
  async execute(message) {
    const userId = message.author.id;
    const userRes = await getSpotifyApiForUser(userId);

    if (userRes.error === 'unlinked') {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(BABY_BLUE)
            .setTitle('✧ vincula spotify')
            .setDescription(`¡Hola <@${userId}>! Vincula tu cuenta en:\nhttps://chidoris.lovable.app`)
        ]
      });
    }

    if (userRes.error) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(BABY_BLUE)
            .setTitle('✧ error')
            .setDescription('No se pudo conectar con Spotify.')
        ]
      });
    }

    try {
      const playback = await userRes.api.getMyCurrentPlaybackState();
      if (!playback.body || !playback.body.item) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(BABY_BLUE)
              .setTitle('✧ sin reproducción')
              .setDescription('No hay ninguna canción reproduciéndose en Spotify.')
          ]
        });
      }

      const track = playback.body.item;
      const loadingMsg = await message.reply(`🔎 Buscando la letra de **${track.name}**...`);
      const result = await fetchLyricsForTrack(track);

      if (result.error) {
        return loadingMsg.edit({
          content: null,
          embeds: [
            new EmbedBuilder()
              .setColor(BABY_BLUE)
              .setTitle('✧ letra no disponible')
              .setDescription(`No se encontró la letra de **${track.name}** de **${track.artists[0]?.name}**.`)
          ]
        });
      }

      const chunks = chunkLyrics(result.lyrics);
      const firstEmbed = new EmbedBuilder()
        .setColor(BABY_BLUE)
        .setTitle(`🎤 ${track.name}`)
        .setDescription(chunks[0])
        .setThumbnail(track.album?.images[0]?.url || null)
        .setFooter({ text: `${track.artists[0]?.name || ''} · lrclib.net ♡` });

      await loadingMsg.edit({ content: null, embeds: [firstEmbed] });

      for (let i = 1; i < chunks.length; i++) {
        await message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(BABY_BLUE)
              .setDescription(chunks[i])
              .setFooter({ text: `Parte ${i + 1}/${chunks.length}` })
          ]
        });
      }
    } catch {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(BABY_BLUE)
            .setTitle('✧ error')
            .setDescription('Ocurrió un error al buscar la letra.')
        ]
      });
    }
  }
};
