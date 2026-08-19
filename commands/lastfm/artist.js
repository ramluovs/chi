const { EmbedBuilder } = require('discord.js');
const { 
  checkLastfmAuth, 
  getCurrentlyPlaying, 
  getArtistInfo, 
  getArtistPlaysInPeriod, 
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
  name: 'artist',
  aliases: ['w', 'plays', 'whoknows', 'artista'],
  async execute(message, args) {
    // 1. Role lock check: strictly ignore if user lacks role
    if (!checkLastfmAuth(message)) return;

    let rawTokens = [...args];
    let noRedirect = false;
    let periodKey = null;

    // Check for 'nr' at the end or anywhere in arguments
    const nrIdx = rawTokens.findIndex(t => t.toLowerCase() === 'nr');
    if (nrIdx !== -1) {
      noRedirect = true;
      rawTokens.splice(nrIdx, 1);
    }

    // Check for date/time period keyword
    if (rawTokens.length > 0) {
      const lastToken = rawTokens[rawTokens.length - 1].toLowerCase();
      if (TIME_PERIODS[lastToken]) {
        periodKey = lastToken;
        rawTokens.pop();
      }
    }

    let artistQuery = rawTokens.join(' ').trim();
    let currentData = null;

    // If no artist name is given, grab currently playing artist
    if (!artistQuery) {
      currentData = await getCurrentlyPlaying();
      if (!currentData || !currentData.artist) {
        return message.reply({
          embeds: [
            makeEmbed(
              '✧ scrobbles de artista',
              'No estás escuchando música ahora mismo.\nEscribe un artista: `chi w <artista> [fecha] [nr]`'
            )
          ]
        });
      }
      artistQuery = currentData.artist;
    }

    const artistStats = await getArtistInfo(artistQuery, noRedirect);
    if (!artistStats) {
      return message.reply({
        embeds: [
          makeEmbed('✧ error', `No se encontró al artista **${artistQuery}** en Last.fm.`)
        ]
      });
    }

    const periodConfig = periodKey ? TIME_PERIODS[periodKey] : null;
    let playsToShow = artistStats.userPlaycount;
    let periodLabel = 'todo el tiempo';

    if (periodConfig && periodConfig.period !== 'overall') {
      periodLabel = periodConfig.label;
      const periodPlays = await getArtistPlaysInPeriod(artistStats.name, periodConfig);
      if (periodPlays !== null) {
        playsToShow = periodPlays;
      }
    }

    const userPlaysFormatted = playsToShow.toLocaleString();
    const globalPlays = artistStats.globalPlaycount.toLocaleString();
    const globalListeners = artistStats.globalListeners.toLocaleString();

    const titleText = `**${artistStats.name}**`;
    const userUrl = `https://www.last.fm/user/${LASTFM_CONFIG.USERNAME}/library/music/${encodeURIComponent(artistStats.name)}`;

    const description = [
      `Tienes **[${userPlaysFormatted} scrobbles](${userUrl})** de **[${artistStats.name}](${artistStats.url})** (*${periodLabel}*)`,
      '',
      `**Oyentes Globales:** ${globalListeners} | **Plays Totales:** ${globalPlays}`,
      artistStats.tags.length ? `**Géneros:** ${artistStats.tags.join(', ')}` : '',
      noRedirect ? '-# 🔒 Modo sin redirección (nr) activo' : ''
    ].filter(Boolean).join('\n');

    const embed = makeEmbed(titleText, description, artistStats.url)
      .setThumbnail(currentData?.image || null)
      .setFooter({ text: `last.fm stats de ${LASTFM_CONFIG.USERNAME} ♡` });

    return message.reply({ embeds: [embed] });
  }
};
