const { EmbedBuilder } = require('discord.js');

const BABY_BLUE = 0xaeefff;
const VERIFY_CHANNEL_ID = '1340866826044702801';

function makeEmbed(title, description) {
  const embed = new EmbedBuilder().setColor(BABY_BLUE);
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

module.exports = {
  name: 'invite',
  aliases: ['inv', 'invitar'],
  async execute(message) {
    try {
      const channel = await message.guild.channels.fetch(VERIFY_CHANNEL_ID).catch(() => null) || message.channel;

      // maxAge: 1800s (30m shortest allowed), maxUses: 1
      const invite = await channel.createInvite({
        maxAge: 1800,
        maxUses: 1,
        unique: true,
        reason: `Generado por ${message.author.tag} (chi invite)`
      });

      return message.reply({
        embeds: [
          makeEmbed('✧ invitación temporal', `Enlace de 1 solo uso para <#${channel.id}>:\n\n🔗 ${invite.url}\n\n-# Vence tras 1 uso o en 30 minutos.`)
        ]
      });
    } catch {
      return message.reply({
        embeds: [makeEmbed('✧ error', 'No tengo permisos para crear invitaciones en el canal configurado.')]
      });
    }
  }
};
