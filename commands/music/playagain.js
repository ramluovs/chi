const { EmbedBuilder } = require('discord.js');
const { getSpotifyApiForUser, BABY_BLUE } = require('./spotifyHelper');

function makeEmbed(title, description) {
  const embed = new EmbedBuilder().setColor(BABY_BLUE);
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

module.exports = {
  name: 'playagain',
  aliases: ['pa', 'prev', 'previous', 'anterior'],
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
        embeds: [makeEmbed('✧ error', 'No se pudo conectar con Spotify.')]
      });
    }

    try {
      await userRes.api.skipToPrevious();
      return message.reply({
        embeds: [makeEmbed('✧ repitiendo / anterior ♡', 'Regresando a la canción anterior en tu Spotify.')]
      });
    } catch {
      return message.reply({
        embeds: [makeEmbed('✧ error', 'No se pudo retroceder. Asegúrate de tener Spotify Premium y reproducción activa.')]
      });
    }
  }
};
