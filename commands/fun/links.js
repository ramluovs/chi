const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const PASTEL_BLUE = 0xaeefff;

const DEFAULT_LINKS = {
  pages: [
    {
      image: 'https://cdn.discordapp.com/attachments/1376142899883806791/1388872154006950028/IMG_2015-1-1.gif?ex=69f6a33d&is=69f551bd&hm=e1f1f47dc49bb88585629e0d231345d7726317c729e4ae82fec1b49ff8cea7a6&',
      entries: [
        { name: 'Da Hood', link: 'https://www.roblox.com/share?code=748fd832bddcfe4b91a205cb35e154a9&type=Server', id: null },
        { name: 'Catalogo', link: 'https://www.roblox.com/share?code=f123c0c11dafde4d8ac69baa7b9279fd&type=Server', id: null },
        { name: 'Outfit Loader', link: 'https://www.roblox.com/share?code=7557cc3fd4134d4a879a7d55bc579195&type=Server', id: null },
        { name: 'Adopt Me!', link: 'https://www.roblox.com/share?code=101348493668e94e8d758fe4619cadec&type=Server', id: null },
        { name: 'Chidoris FG Grupo', link: 'https://www.roblox.com/es/communities/35678194/CHIDORis-FG#!/about', id: '35678194' },
        { name: 'Monsur', link: 'https://www.roblox.com/communities/112401601/monsur#!/about', id: '112401601' }
      ]
    },
    {
      image: 'https://media.discordapp.net/attachments/932235016795193404/1201185301641560174/Tumblr_l_764383497369405.gif?width=1440&height=178&ex=69f6bf3c&is=69f56dbc&hm=cef9297ad2ca6934ba78f53af0f51031701d081ff6ef059f594391e630d1dea6&',
      entries: [
        { name: 'Rami Item Buyer', link: 'https://www.roblox.com/share?code=764a0f5f8be0384a8e05f3e028ad1c8b&type=Server', id: null },
        { name: 'Luk Item Buyer', link: 'https://www.roblox.com/es/games/116815083533755/confetties', id: null },
        { name: 'Miel Item Buyer', link: 'https://www.roblox.com/es/games/refer?PlaceId=18939513307&PageType=GroupDetail&LocalTimestamp=%7BlocalTimestamp%7D', id: null }
      ]
    }
  ]
};

async function loadLinks() {
  try {
    const res = await fetch('https://chidoris.lovable.app/api/public/links');
    if (!res.ok) throw new Error('bad status');
    return await res.json();
  } catch {
    return DEFAULT_LINKS;
  }
}

function buildLinksEmbed(page, expiresAt) {
  const description = [
    page.entries.map(entry => {
      const entryLine = `[♡- ${entry.name}](${entry.link})`;
      return entry.id ? `${entryLine}\n-# ID: ${entry.id}` : entryLine;
    }).join('\n\n'),
    '',
    `-# Si quieres el link directo de alguno, responde a mi mensaje con el nombre. Si no queres abrir Discord, ve aca: https://chidoris.lovable.app/view-links . Este mensaje vence a las <t:${expiresAt}:T>`
  ].join('\n');

  return new EmbedBuilder()
    .setColor(PASTEL_BLUE)
    .setTitle('✧ links')
    .setDescription(description)
    .setImage(page.image);
}

function buildLinksButtons(currentPage, totalPages, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('links_prev')
      .setLabel('◀')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || currentPage === 0),
    new ButtonBuilder()
      .setCustomId('links_next')
      .setLabel('▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || currentPage === totalPages - 1)
  );
}

module.exports = {
  name: 'links',
  description: 'Muestra los links guardados del servidor.',
  async execute(message, args, client) {
    const linksData = await loadLinks();
    const expiresAt = Math.floor((Date.now() + 3 * 60 * 1000) / 1000);

    if (!linksData.pages?.length) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(PASTEL_BLUE).setTitle('error').setDescription('No hay links guardados.')]
      });
    }

    let currentPage = 0;
    const totalPages = linksData.pages.length;

    const buildState = (disabled = false) => ({
      embeds: [buildLinksEmbed(linksData.pages[currentPage], expiresAt)],
      components: [buildLinksButtons(currentPage, totalPages, disabled)]
    });

    const botReply = await message.reply(buildState());

    const buttonCollector = botReply.createMessageComponentCollector({
      filter: interaction => interaction.user.id === message.author.id,
      time: 3 * 60 * 1000
    });

    buttonCollector.on('collect', async interaction => {
      if (interaction.customId === 'links_prev' && currentPage > 0) currentPage--;
      if (interaction.customId === 'links_next' && currentPage < totalPages - 1) currentPage++;
      await interaction.update(buildState());
    });

    buttonCollector.on('end', async () => {
      await botReply.edit(buildState(true)).catch(() => {});
    });

    const replyCollector = message.channel.createMessageCollector({
      filter: r => r.reference?.messageId === botReply.id && r.author.id === message.author.id,
      time: 3 * 60 * 1000
    });

    replyCollector.on('collect', async response => {
      const normalizedName = response.content.trim().toLowerCase();
      const matchedEntry = (linksData.pages || [])
        .flatMap(page => page.entries || [])
        .find(entry => entry.name.toLowerCase() === normalizedName);

      if (!matchedEntry) return response.reply('No encontré ese link.');
      await response.reply(matchedEntry.link);
    });
  }
};
