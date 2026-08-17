const { EmbedBuilder } = require('discord.js');
const { safeFetch, BABY_BLUE } = require('./robloxHelper');

function makeEmbed(title, description) {
  const embed = new EmbedBuilder().setColor(BABY_BLUE);
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

module.exports = {
  name: 'name',
  aliases: ['checkname', 'validar'],
  async execute(message, args) {
    const input = args[0];
    if (!input) {
      return message.reply({
        embeds: [makeEmbed('✧ name — uso', 'Debes escribir un nombre para verificar.\nUso: `chi name <nombre>`')]
      });
    }

    const birthday = '2000-01-01'; // Default validation date
    const res = await safeFetch(`https://auth.roblox.com/v1/usernames/validate?request.username=${encodeURIComponent(input)}&request.birthday=${birthday}&request.context=Signup`);

    if (!res || !res.ok) {
      return message.reply({
        embeds: [makeEmbed('✧ error', 'No se pudo conectar con el validador de Roblox.')]
      });
    }

    const data = await res.json();
    // Code 0 = Valid / Available, Code 1 = Already in use, Code 2 = Inappropriate, etc.
    let statusText = '';
    let isAvailable = false;

    switch (data.code) {
      case 0:
        statusText = '✅ **¡Disponible!** Este nombre de usuario está libre para registrarse o cambiarse.';
        isAvailable = true;
        break;
      case 1:
        statusText = '❌ **En uso:** Este nombre de usuario ya le pertenece a otra cuenta.';
        break;
      case 2:
        statusText = '⚠️ **Inapropiado:** Este nombre no está permitido por los filtros de Roblox.';
        break;
      default:
        statusText = `❌ **No disponible:** ${data.message || 'Formato o caracteres no permitidos.'}`;
        break;
    }

    const embed = makeEmbed('✧ verificación de nombre ♡', `🔎 **Nombre consultado:** \`${input}\`\n\n${statusText}`)
      .setFooter({ text: isAvailable ? '¡Aprovecha y regístralo! ♡' : 'Intenta con otra combinación ♡' });

    return message.reply({ embeds: [embed] });
  }
};
