const { EmbedBuilder } = require('discord.js');
const { getSpotifyApiForUser, BABY_BLUE } = require('./spotifyHelper');

function makeEmbed(title, description) {
  const embed = new EmbedBuilder().setColor(BABY_BLUE);
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

module.exports = {
  name: 'queue',
  aliases: ['q', 'cola'],
  async execute(message) {
    const userId = message.author.id;
    const userRes = await getSpotifyApiForUser(userId);

    if (userRes.error === 'unlinked') {
      return message.reply({
        embeds: [makeEmbed('✧ vincula spotify', `¡Hola <@${userId}>! Primero vincula tu cuenta en:\nhttps://chidoris.lovable.app`)]
      });
    }

    if (userRes.error) {
      return message.reply({
        embeds: [makeEmbed('✧ error', 'No se pudo conectar con Spotify en este momento.')]
      });
    }

    const spotifyApi = userRes.api;

    try {
      // Fetch queue from Spotify Web API endpoint
      const queueRes = await spotifyApi.getGeneric('https://api.spotify.com/v1/me/player/queue').catch(async (err) => {
        if (err.statusCode === 401) {
          const fresh = await getSpotifyApiForUser(userId, true);
          if (fresh.api) return fresh.api.getGeneric('https://api.spotify.com/v1/me/player/queue');
        }
        throw err;
      });

      const body = queueRes?.body;
      const currentlyPlaying = body?.currently_playing;
      const queueList = body?.queue || [];

      if (!currentlyPlaying && queueList.length === 0) {
        return message.reply({
          embeds: [makeEmbed('✧ cola vacía', 'No hay canciones sonando ni en espera en tu Spotify.')]
        });
      }

      let description = '';

      if (currentlyPlaying) {
        const artist = currentlyPlaying.artists?.[0]?.name || 'Desconocido';
        const artistUrl = currentlyPlaying.artists?.[0]?.external_urls?.spotify || currentlyPlaying.external_urls?.spotify;
        const trackUrl = currentlyPlaying.external_urls?.spotify;

        description += `🎶 **Sonando ahora:**\n[**${currentlyPlaying.name}**](${trackUrl}) — [${artist}](${artistUrl})\n\n`;
      }

      description += `📋 **Próximas en cola:**\n`;

      if (queueList.length === 0) {
        description += '*(No hay más canciones en la cola)*';
      } else {
        const next10 = queueList.slice(0, 10);
        next10.forEach((track, i) => {
          const trackName = track.name;
          const trackUrl = track.external_urls?.spotify;
          const artistName = track.artists?.[0]?.name || 'Desconocido';
          const artistUrl = track.artists?.[0]?.external_urls?.spotify || trackUrl;

          description += `\`${i + 1}.\` [${trackName}](${trackUrl}) de [${artistName}](${artistUrl})\n`;
        });
      }

      const embed = makeEmbed('✧ cola de reproducción ♡', description)
        .setThumbnail(currentlyPlaying?.album?.images?.[0]?.url || null);

      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Queue Command Error:', err);
      return message.reply({
        embeds: [makeEmbed('✧ error', 'Asegúrate de que Spotify esté abierto y reproduciendo música.')]
      });
    }
  }
};
