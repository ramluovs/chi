const { EmbedBuilder } = require('discord.js');
const { 
  checkLastfmAuth, 
  getCurrentlyPlaying, 
  getAlbumInfo, 
  getAlbumPlaysInPeriod, 
  TIME_PERIODS, 
  BABY_BLUE, 
  LASTFM_CONFIG 
} = require('./lastfmHelper');

function makeEmbed(title, description, url = null) {
  const embed = new EmbedBuilder().setColor(BABY_BLUE);
  if (title) embed.setTitle(title);
  if (url) embed.setURL(url);
  if (description) embed.setDescription(description);
  return embed;
}

module.exports = {
  name: 'album',
  aliases: ['wa', 'whoalbum', 'al'],
  async execute(message, args) {
    // 1. Role lock check: strictly ignore if user lacks role
    if (!checkLastfmAuth(message)) return;

    let rawTokens = [...args];
    let noRedirect = false;
    let periodKey = null;

    // Check for 'nr' token
    const nrIdx = rawTokens.findIndex(t => t.toLowerCase() === 'nr');
    if (nrIdx !== -1) {
      noRedirect = true;
      rawTokens.splice(nrIdx, 1);
    }

    // Check for date/time period token at end
    if (rawTokens.length > 0) {
      const lastToken = rawTokens[rawTokens.length - 1].toLowerCase();
      if (TIME_PERIODS[lastToken]) {
        periodKey = lastToken;
        rawTokens.pop();
      }
    }

    let rawQuery = rawTokens.join(' ').trim();
    let albumQuery = '';
    let artistQuery = '';
    let currentData = null;

    // Support "Album Name | Artist Name" syntax if provided
    if (rawQuery.includes('|')) {
      const parts = rawQuery.split('|');
      albumQuery = parts[0].trim();
      artistQuery = parts[1].trim();
    } else {
      albumQuery = rawQuery;
    }

    // If no album was passed, check currently playing track/album
    if (!albumQuery) {
      currentData = await getCurrentlyPlaying();
      if (!currentData || !currentData.album) {
        return message.reply({
          embeds: [
            makeEmbed(
              '✧ album scrobbles',
              'You are not playing any album right now.\nUse: `chi wa <album> [timeframe] [nr]`'
            )
          ]
        });
      }
      albumQuery = currentData.album;
      artistQuery = currentData.artist;
    }

    const albumStats = await getAlbumInfo(albumQuery, artistQuery, noRedirect);
    if (!albumStats) {
      return message.reply({
        embeds: [
          makeEmbed('✧ error', `Could not find album **${albumQuery}** on Last.fm.`)
        ]
      });
    }

    const periodConfig = periodKey ? TIME_PERIODS[periodKey] : null;
    let playsToShow = albumStats.userPlaycount;
    let periodLabel = 'all time';

    if (periodConfig && periodConfig.period !== 'overall') {
      periodLabel = periodConfig.label;
      const periodPlays = await getAlbumPlaysInPeriod(albumStats.name, periodConfig);
      if (periodPlays !== null) {
        playsToShow = periodPlays;
      }
    }

    const userPlaysFormatted = playsToShow.toLocaleString();
    const globalPlays = albumStats.globalPlaycount.toLocaleString();
    const globalListeners = albumStats.globalListeners.toLocaleString();

    // Link directly to your library page for this specific album
    const userLibraryUrl = `https://www.last.fm/user/${LASTFM_CONFIG.USERNAME}/library/music/${encodeURIComponent(albumStats.artist)}/${encodeURIComponent(albumStats.name)}`;
    const artistUrl = `https://www.last.fm/music/${encodeURIComponent(albumStats.artist)}`;

    const titleText = `**${albumStats.name}**`;
    const description = [
      `You have **[${userPlaysFormatted} scrobbles](${userLibraryUrl})** on **[${albumStats.name}](${albumStats.url})** by **[${albumStats.artist}](${artistUrl})** (*${periodLabel}*)`,
      '',
      `**Global Listeners:** ${globalListeners} | **Total Plays:** ${globalPlays}`,
      albumStats.tracksCount > 0 ? `**Tracks:** ${albumStats.tracksCount}` : '',
      noRedirect ? '-# 🔒 No-redirect mode (nr) active' : ''
    ].filter(Boolean).join('\n');

    const thumbnailImage = albumStats.image || currentData?.image || null;

    const embed = makeEmbed(titleText, description, albumStats.url)
      .setThumbnail(thumbnailImage)
      .setFooter({ text: `last.fm stats for ${LASTFM_CONFIG.USERNAME} ♡` });

    return message.reply({ embeds: [embed] });
  }
};
