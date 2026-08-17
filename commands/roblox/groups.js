const { EmbedBuilder } = require('discord.js');
const { safeFetch, resolveRobloxUser, BABY_BLUE } = require('./robloxHelper');

function makeEmbed(title, description) {
  const embed = new EmbedBuilder().setColor(BABY_BLUE);
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

module.exports = {
  name: 'groups',
  aliases: ['rgroups'],
  async execute(message, args) {
    const input = args[0];
    if (!input) {
      return message.reply({
        embeds: [makeEmbed('✧ groups — uso', 'Debes escribir un nombre o ID de Roblox.\nUso: `chi groups <usuario/ID>`')]
      });
    }

    const target = await resolveRobloxUser(input);
    if (!target) {
      return message.reply({
        embeds: [makeEmbed('✧ error', `No se encontró al usuario **${input}** en Roblox.`)]
      });
    }

    const res = await safeFetch(`https://groups.roblox.com/v2/users/${target.id}/groups/roles`);
    if (!res || !res.ok) {
      return message.reply({
        embeds: [makeEmbed('✧ error', 'No se pudieron consultar los grupos de este usuario.')]
      });
    }

    const data = await res.json();
    const groupsList = data.data || [];

    if (groupsList.length === 0) {
      return message.reply({
        embeds: [makeEmbed('✧ grupos de roblox', `**${target.name}** no pertenece a ningún grupo público.`)]
      });
    }

    // Take top 15 groups to prevent reaching Discord embed limits
    const topGroups = groupsList.slice(0, 15);
    const lines = topGroups.map((entry, i) => {
      const g = entry.group;
      const role = entry.role;
      return `\`${i + 1}.\` [**${g.name}**](https://www.roblox.com/groups/${g.id}) — *${role.name}* (\`${g.memberCount?.toLocaleString() || 0} miembros\`)`;
    });

    const embed = makeEmbed(
      `✧ grupos de ${target.name} ♡`,
      `Mostrando **${topGroups.length}** de **${groupsList.length}** grupos:\n\n${lines.join('\n\n')}`
    ).setFooter({ text: `Total de grupos: ${groupsList.length} ♡` });

    return message.reply({ embeds: [embed] });
  }
};
