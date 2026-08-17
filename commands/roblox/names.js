const { EmbedBuilder } = require('discord.js');
const { safeFetch, resolveRobloxUser, BABY_BLUE } = require('./robloxHelper');

function makeEmbed(title, description) {
  const embed = new EmbedBuilder().setColor(BABY_BLUE);
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

module.exports = {
  name: 'names',
  aliases: ['pastnames', 'historial'],
  async execute(message, args) {
    const input = args[0];
    if (!input) {
      return message.reply({
        embeds: [makeEmbed('✧ nombres — uso', 'Uso: `chi names <usuario/ID>`')]
      });
    }

    const target = await resolveRobloxUser(input);
    if (!target) {
      return message.reply({
        embeds: [makeEmbed('✧ error', `No se encontró al usuario **${input}** en Roblox.`)]
      });
    }

    const res = await safeFetch(`https://users.roblox.com/v1/users/${target.id}/username-history?limit=100&sortOrder=Desc`);
    
    if (!res || !res.ok) {
      return message.reply({
        embeds: [makeEmbed('✧ error', 'No se pudo consultar el historial de nombres.')]
      });
    }

    const data = await res.json();
    const history = data.data || [];

    if (history.length === 0) {
      return message.reply({
        embeds: [
          makeEmbed('✧ historial de nombres', `**${target.name}** no tiene nombres anteriores registrados (nunca se cambió el nombre).`)
        ]
      });
    }

    const list = history.map((item, i) => `\`${i + 1}.\` **${item.name}**`).join('\n');

    const embed = makeEmbed(
      `✧ nombres anteriores de ${target.name} ♡`,
      `**Nombre actual:** \`${target.name}\`\n\n📋 **Historial (${history.length}):**\n${list}`
    );

    return message.reply({ embeds: [embed] });
  }
};
