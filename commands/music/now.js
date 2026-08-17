const { EmbedBuilder } = require('discord.js');
const { getSpotifyApiForUser, formatMs, BABY_BLUE } = require('./spotifyHelper');

function makeEmbed(title, description) {
  const embed = new EmbedBuilder().setColor(BABY_BLUE);
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

module.exports = {
  name: 'now',
  aliases: ['n', 'ya', 'np'],
  async execute(message) {
    const userId = message.author.id;
    let userRes = await getSpotifyApiForUser(userId);

    if (userRes.error === 'unlinked') {
      return message.reply({
        embeds: [makeEmbed('✧ vincula spotify', `¡Hola <@${userId}>! Para ver lo que estás escuchando, vincula tu cuenta en:\nhttps://chidoris.lovable.app`)]
      });
    }

    if (userRes.error) {
      return message.reply({
        embeds: [makeEmbed('✧ error', 'No se pudo conectar con tu cuenta de Spotify.')]
      });
    }

    let spotifyApi = userRes.api;

    try {
      let playback;
      try {
        playback = await spotifyApi.getMyCurrentPlaybackState();
      } catch (apiErr) {
        if (apiErr.statusCode === 401 || (apiErr.message && apiErr.message.includes('Access token'))) {
          userRes = await getSpotifyApiForUser(userId, true);
          if (userRes.error) throw apiErr;
          spotifyApi = userRes.api;
          playback = await spotifyApi.getMyCurrentPlaybackState();
        } else {
          throw apiErr;
        }
      }

      if (!playback.body || !playback.body.is_playing || !playback.body.item) {
        return message.reply({
          embeds: [makeEmbed('✧ nada en reproducción', 'No estás escuchando ninguna canción en Spotify en este momento.')]
        });
      }

      const track = playback.body.item;
      const progressMs = playback.body.progress_ms;
      const durationMs = track.duration_ms;

      // Stream criteria: 50% of song + 3s
      const targetMs = (durationMs * 0.50) + 3000;
      const isStreamValid = progressMs >= targetMs;

      const trackUrl = track.external_urls?.spotify || 'https://open.spotify.com';
      const artist = track.artists?.[0];
      const artistUrl = artist?.external_urls?.spotify || trackUrl;
      const album = track.album;
      const albumUrl = album?.external_urls?.spotify || trackUrl;

      let description = `🎵 **Canción:** [${track.name}](${trackUrl})\n` +
                        `👤 **Artista:** [${artist?.name || 'Desconocido'}](${artistUrl})\n` +
                        `💿 **Álbum:** [${album?.name || 'Sencillo'}](${albumUrl})\n\n`;

      if (isStreamValid) {
        description += `✨ **Estado:** ✅ **Stream Válido** *(¡Ya puedes saltarla!)*`;
      } else {
        const remainingMs = targetMs - progressMs;
        const remainingSec = Math.ceil(remainingMs / 1000);
        description += `⏳ **Estado:** ❌ **En progreso** *(Faltan ${remainingSec}s para contar como stream)*`;
      }

      const embed = makeEmbed('✧ sonando ahora ♡', description)
        .setThumbnail(album?.images?.[0]?.url || null)
        .addFields(
          { name: 'Progreso', value: `\`${formatMs(progressMs)}\` / \`${formatMs(durationMs)}\``, inline: true },
          { name: 'Meta Stream (50%+3s)', value: `\`${formatMs(targetMs)}\``, inline: true }
        );

      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Now Command Error:', err);
      return message.reply({
        embeds: [makeEmbed('✧ error', 'Ocurrió un error al consultar tu reproducción de Spotify.')]
      });
    }
  }
};
