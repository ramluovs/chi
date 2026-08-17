const { EmbedBuilder } = require('discord.js');
const { safeFetch, BABY_BLUE } = require('./robloxHelper');

function makeEmbed(description) {
  return new EmbedBuilder()
    .setColor(BABY_BLUE)
    .setDescription(description);
}

module.exports = {
  name: 'name',
  aliases: ['checkname', 'validar'],
  async execute(message, args) {
    const input = args[0];
    if (!input) {
      return message.reply({
        embeds: [makeEmbed('Debes escribir un nombre para verificar.\nUso: `chi name <nombre>`')]
      });
    }

    const birthday = '2000-01-01'; // Default validation date
    const res = await safeFetch(`https://auth.roblox.com/v1/usernames/validate?request.username=${encodeURIComponent(input)}&request.birthday=${birthday}&request.context=Signup`);

    if (!res || !res.ok) {
      return message.reply({
        embeds: [makeEmbed('No se pudo conectar con el validador de Roblox.')]
      });
    }

    const data = await res.json();
    let statusText = '';

    switch (data.code) {
      case 0:
        statusText = 'disponible';
        break;
      case 1:
        statusText = 'en uso';
        break;
      case 2:
        statusText = 'inapropiado';
        break;
      default:
        statusText = data.message ? data.message.toLowerCase() : 'no disponible';
        break;
    }

    const searchUrl = `https://www.roblox.com/search/users?keyword=${encodeURIComponent(input)}`;
    const description = `El nombre [${input}](${searchUrl}) está **\`${statusText}\`**`;

    return message.reply({ embeds: [makeEmbed(description)] });
  }
};
