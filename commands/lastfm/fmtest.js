const { EmbedBuilder } = require('discord.js');
const { checkLastfmAuth, getCurrentlyPlaying, BABY_BLUE, LASTFM_CONFIG } = require('./lastfmHelper');

module.exports = {
  name: 'fmtest',
  aliases: ['ftest'],
  async execute(message) {
    if (!checkLastfmAuth(message)) return;

    const data = await getCurrentlyPlaying();
    
    if (!data) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(BABY_BLUE)
            .setTitle('✧ Last.fm Debug Test')
            .setDescription(`❌ Failed to fetch recent tracks for \`${LASTFM_CONFIG.USERNAME}\`.\nCheck your Termux / Node terminal for the exact error code.`)
        ]
      });
    }

    const embed = new EmbedBuilder()
      .setColor(BABY_BLUE)
      .setTitle('✧ Last.fm Test Result')
      .setDescription([
        `**User:** \`${LASTFM_CONFIG.USERNAME}\``,
        `**Artist Detected:** ${data.artist || 'None'}`,
        `**Track Detected:** ${data.track || 'None'}`,
        `**Album Detected:** ${data.album || 'None'}`,
        `**Now Playing:** ${data.isPlayingNow ? 'Yes 🟢' : 'No (Recent Scrobble) ⚪'}`
      ].join('\n'))
      .setThumbnail(data.image || null);

    return message.reply({ embeds: [embed] });
  }
};
