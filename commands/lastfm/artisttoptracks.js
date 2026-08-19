const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType 
} = require('discord.js');
const { 
  checkLastfmAuth, 
  getCurrentlyPlaying, 
  getArtistInfo, 
  getArtistTopTracks, 
  getGlobalArtistTopTracks, 
  TIME_PERIODS, 
  BABY_BLUE, 
  LASTFM_CONFIG 
} = require('./lastfmHelper');

module.exports = {
  name: 'artisttoptracks',
  aliases: ['att', 'toptracks', 'attp'],
  async execute(message, args) {
    if (!checkLastfmAuth(message)) return;

    let rawTokens = [...args];
    let noRedirect = false;
    let periodKey = null;

    // 1. Check for 'nr'
    const nrIdx = rawTokens.findIndex(t => t.toLowerCase() === 'nr');
    if (nrIdx !== -1) {
      noRedirect = true;
      rawTokens.splice(nrIdx, 1);
    }

    // 2. Check for date/time period
    if (rawTokens.length > 0) {
      const lastToken = rawTokens[rawTokens.length - 1].toLowerCase();
      if (TIME_PERIODS[lastToken]) {
        periodKey = lastToken;
        rawTokens.pop();
      }
    }

    let artistQuery = rawTokens.join(' ').trim();
    let currentData = null;

    // 3. Fallback to currently playing artist if none provided
    if (!artistQuery) {
      currentData = await getCurrentlyPlaying();
      if (!currentData || !currentData.artist) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(BABY_BLUE)
              .setTitle('✧ artist top tracks')
              .setDescription('You are not playing any artist right now.\nUse: `chi att <artist> [timeframe] [nr]`')
          ]
        });
      }
      artistQuery = currentData.artist;
    }

    const artistInfo = await getArtistInfo(artistQuery, noRedirect);
    if (!artistInfo) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(BABY_BLUE)
            .setTitle('✧ error')
            .setDescription(`Could not find artist **${artistQuery}** on Last.fm.`)
        ]
      });
    }

    const periodConfig = periodKey ? TIME_PERIODS[periodKey] : null;
    const tracks = await getArtistTopTracks(artistInfo.name, periodConfig);

    if (!tracks || tracks.length === 0) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(BABY_BLUE)
            .setTitle('✧ no tracks found')
            .setDescription(`You don't have any scrobbles for **${artistInfo.name}**${periodConfig ? ` in the ${periodConfig.label}` : ''}.`)
        ]
      });
    }

    // Pagination configuration
    const PAGE_SIZE = 10;
    const totalPages = Math.ceil(tracks.length / PAGE_SIZE);
    let currentPage = 1;

    const userLibBaseUrl = `https://www.last.fm/user/${LASTFM_CONFIG.USERNAME}/library/music/${encodeURIComponent(artistInfo.name)}`;

    function buildEmbed(page) {
      const startIdx = (page - 1) * PAGE_SIZE;
      const currentTracks = tracks.slice(startIdx, startIdx + PAGE_SIZE);

      const trackListString = currentTracks.map((t, idx) => {
        const rank = startIdx + idx + 1;
        const songLibUrl = `${userLibBaseUrl}/_/${encodeURIComponent(t.name)}`;
        return `**${rank}.** [${t.name}](${songLibUrl}) — **${t.playcount.toLocaleString()}** plays`;
      }).join('\n');

      let timeText = periodConfig && periodConfig.period !== 'overall' ? ` in the ${periodConfig.label}` : '';
      const description = `### [Top Tracks](${userLibBaseUrl}) for [${artistInfo.name}](${artistInfo.url})${timeText}\n\n${trackListString}`;

      const genresText = artistInfo.tags.length > 0 ? artistInfo.tags.join(', ') : '';
      const footerParts = [];
      if (genresText) footerParts.push(genresText);
      footerParts.push(`pg. ${page}/${totalPages}`);

      return new EmbedBuilder()
        .setColor(BABY_BLUE)
        .setDescription(description)
        .setFooter({ text: footerParts.join(' | ') });
    }

    function buildButtons(page) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('att_first')
          .setLabel('⇤ First')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 1),
        new ButtonBuilder()
          .setCustomId('att_prev')
          .setLabel('◀ Back')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 1),
        new ButtonBuilder()
          .setCustomId('att_next')
          .setLabel('Next ▶')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === totalPages)
      );
      return [row];
    }

    const initialMessage = await message.reply({
      embeds: [buildEmbed(currentPage)],
      components: totalPages > 1 ? buildButtons(currentPage) : []
    });

    // 4. Button Interaction Collector (Pagination)
    if (totalPages > 1) {
      const collector = initialMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120000
      });

      collector.on('collect', async i => {
        if (i.user.id !== message.author.id) {
          return i.reply({ content: 'Only you can change the pages ♡', ephemeral: true });
        }

        if (i.customId === 'att_first') currentPage = 1;
        else if (i.customId === 'att_prev' && currentPage > 1) currentPage--;
        else if (i.customId === 'att_next' && currentPage < totalPages) currentPage++;

        await i.update({
          embeds: [buildEmbed(currentPage)],
          components: buildButtons(currentPage)
        });
      });

      collector.on('end', () => {
        initialMessage.edit({ components: [] }).catch(() => {});
      });
    }

    // 5. Global Reply Listener
    // If you reply "global" to this embed, CHI replies with the global top tracks for the artist
    const filter = m => m.author.id === message.author.id && 
                       m.reference?.messageId === initialMessage.id && 
                       m.content.trim().toLowerCase() === 'global';

    const replyCollector = message.channel.createMessageCollector({
      filter,
      time: 90000,
      max: 1
    });

    replyCollector.on('collect', async () => {
      const globalTracks = await getGlobalArtistTopTracks(artistInfo.name, noRedirect);
      if (!globalTracks || globalTracks.length === 0) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(BABY_BLUE)
              .setDescription(`Could not fetch global top tracks for **[${artistInfo.name}](${artistInfo.url})**.`)
          ]
        });
      }

      const globalList = globalTracks.slice(0, 10).map((t, idx) => {
        return `**${idx + 1}.** [${t.name}](${t.url}) — **${t.playcount.toLocaleString()}** global plays (${t.listeners.toLocaleString()} listeners)`;
      }).join('\n');

      const globalEmbed = new EmbedBuilder()
        .setColor(BABY_BLUE)
        .setDescription(`### Global Top Tracks for [${artistInfo.name}](${artistInfo.url})\n\n${globalList}`)
        .setFooter({ text: `${artistInfo.tags.slice(0, 3).join(', ')} | global ranking` });

      return message.reply({ embeds: [globalEmbed] });
    });
  }
};
