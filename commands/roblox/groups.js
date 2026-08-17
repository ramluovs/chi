const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { safeFetch, resolveRobloxUser, BABY_BLUE } = require('./robloxHelper');

const PAGE_SIZE = 20;

function makeEmbed(title, description, url = null) {
  const embed = new EmbedBuilder().setColor(BABY_BLUE);
  if (title) embed.setTitle(title);
  if (url) embed.setURL(url);
  if (description) embed.setDescription(description);
  return embed;
}

function buildNavButtons(page, totalPages, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('groups_prev')
      .setLabel('◀')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page === 0),
    new ButtonBuilder()
      .setCustomId('groups_next')
      .setLabel('▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page === totalPages - 1)
  );
}

module.exports = {
  name: 'groups',
  aliases: ['rgroups'],
  async execute(message, args) {
    const input = args[0];
    if (!input) {
      return message.reply({
        embeds: [makeEmbed('✧ grupos — uso', 'Debes escribir un nombre o ID de Roblox.\nUso: `chi groups <usuario/ID>`')]
      });
    }

    const target = await resolveRobloxUser(input);
    if (!target) {
      return message.reply({
        embeds: [makeEmbed('✧ error', `No se encontró al usuario ${input} en Roblox.`)]
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
    const profileUrl = `https://www.roblox.com/users/${target.id}/profile`;

    const displayName = target.displayName || target.name;
    const titleText = `**${displayName} (@${target.name}) — grupos (${groupsList.length})**`;

    if (groupsList.length === 0) {
      return message.reply({
        embeds: [
          makeEmbed(titleText, '*Este usuario no pertenece a ningún grupo público.*', profileUrl)
            .setFooter({ text: 'página 1/1' })
        ]
      });
    }

    const totalPages = Math.ceil(groupsList.length / PAGE_SIZE);
    let currentPage = 0;

    const buildState = (page, disabled = false) => {
      const start = page * PAGE_SIZE;
      const pageEntries = groupsList.slice(start, start + PAGE_SIZE);
      const description = pageEntries.map(entry => {
        const g = entry.group;
        const role = entry.role;
        return `[**${g.name}**](https://www.roblox.com/groups/${g.id}) — *${role.name}* (\`${g.memberCount?.toLocaleString() || 0} miembros\`)`;
      }).join('\n');

      const embed = makeEmbed(titleText, description, profileUrl)
        .setFooter({ text: `página ${page + 1}/${totalPages}` });

      const components = totalPages > 1 ? [buildNavButtons(page, totalPages, disabled)] : [];
      return { embeds: [embed], components };
    };

    const replyMsg = await message.reply(buildState(currentPage));
    if (totalPages <= 1) return;

    const collector = replyMsg.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time: 2 * 60 * 1000
    });

    collector.on('collect', async interaction => {
      if (interaction.customId === 'groups_prev' && currentPage > 0) currentPage--;
      if (interaction.customId === 'groups_next' && currentPage < totalPages - 1) currentPage++;
      await interaction.update(buildState(currentPage));
    });

    collector.on('end', () => {
      replyMsg.edit(buildState(currentPage, true)).catch(() => {});
    });
  }
};
