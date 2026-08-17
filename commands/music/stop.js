const { EmbedBuilder } = require('discord.js');
const { getSpotifyApiForUser, BABY_BLUE } = require('./spotifyHelper');
const { stopUserStream } = require('./stream');

function makeEmbed(title, description) {
  const embed = new EmbedBuilder().setColor(BABY_BLUE);
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

module.exports = {
  name: 'stop',
  aliases: ['pause', 'pausar'],
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
      await userRes.api.pause();
      if (typeof stopUserStream === 'function') {
        stopUserStream(userId);
      }

      return message.reply({
        embeds: [makeEmbed('✧ música pausada ♡', 'Se pausó tu reproducción en Spotify y se apagó el Modo Stream.')]
      });
    } catch {
      return message.reply({
        embeds: [makeEmbed('✧ error', 'No se pudo pausar. Asegúrate de tener Spotify activo en tu dispositivo.')]
      });
    }
  }
};
