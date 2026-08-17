const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'banana',
  aliases: [],
  async execute(message) {
    const size = Math.floor(Math.random() * 30) + 1;
    const targetMember = message.mentions.members.first() || message.member;
    const displayName = targetMember?.displayName || targetMember?.user?.username || message.author.username;

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xFFE135)
          .setDescription(`La banana de **${displayName}** mide **${size} cm** <:right3:1499652025129111572>`)
          .setImage('https://cdn.discordapp.com/attachments/1340907464161497168/1500000254379036702/gradient-shaded-quirky-cartoon-banana-png.png?ex=69f6d799&is=69f58619&hm=84442edd898fe988a09c653db408817f772647abf98ae0b2b28a037d98a05777&')
      ]
    });
  }
};
