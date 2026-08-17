const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { safeFetch, resolveRobloxUser, BABY_BLUE } = require('./robloxHelper');

const PAGE_SIZE = 25;

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
      .setCustomId('names_prev')
      .setLabel('◀')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page === 0),
    new ButtonBuilder()
      .setCustomId('names_next')
      .setLabel('▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page === totalPages - 1)
  );
}

module.exports = {
  name: 'names',
  aliases: ['pastnames', 'historial'],
  async execute(message, args) {
    const input = args[0];
    if (!input) {
      return message.reply({
        embeds: [makeEmbed('✧ nombres — uso', 'Debes escribir un nombre o ID de Roblox.\nUso: `chi names <usuario/ID>`')]
      });
    }

    const target = await resolveRobloxUser(input);
    if (!target) {
      return message.reply({
        embeds: [makeEmbed('✧ error', `No se encontró al usuario ${input} en Roblox.`)]
      });
    }

    // Fetch username history (Asc sort so the very first name comes first)
    const res = await safeFetch(`https://users.roblox.com/v1/users/${target.id}/username-history?limit=100&sortOrder=Asc`);
    
    if (!res || !res.ok) {
      return message.reply({
        embeds: [makeEmbed('✧ error', 'No se pudo consultar el historial de nombres.')]
      });
    }

    const data = await res.json();
    const history = data.data || [];
    const profileUrl = `https://www.roblox.com/users/${target.id}/profile`;
    const titleText = `${target.name} (${history.length}) — nombres pasados `;

    if (history.length === 0) {
      return message.reply({
        embeds: [
          makeEmbed(titleText, '*Este usuario nunca se ha cambiado el nombre.*', profileUrl)
            .setFooter({ text: 'página 1/1' })
        ]
      });
    }

    const totalPages = Math.ceil(history.length / PAGE_SIZE);
    let currentPage = 0;

    const buildState = (page, disabled = false) => {
      const start = page * PAGE_SIZE;
      const pageEntries = history.slice(start, start + PAGE_SIZE);
      const description = pageEntries.map(item => item.name).join('\n');

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
      if (interaction.customId === 'names_prev' && currentPage > 0) currentPage--;
      if (interaction.customId === 'names_next' && currentPage < totalPages - 1) currentPage++;
      await interaction.update(buildState(currentPage));
    });

    collector.on('end', () => {
      replyMsg.edit(buildState(currentPage, true)).catch(() => {});
    });
  }
};
