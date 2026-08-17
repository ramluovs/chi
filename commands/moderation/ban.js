const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const BABY_BLUE = 0xaeefff;
const MOD_ROLE_ID = '1340864854243803248';

function makeEmbed(title, description) {
  const embed = new EmbedBuilder().setColor(BABY_BLUE);
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

module.exports = {
  name: 'ban',
  aliases: [],
  async execute(message, args) {
    const hasRole = message.member.roles.cache.has(MOD_ROLE_ID);
    const hasAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasRole && !hasAdmin) {
      return message.reply({
        embeds: [makeEmbed('✧ error', 'No tienes permiso para usar este comando.')]
      });
    }

    const target = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
    if (!target) {
      return message.reply({
        embeds: [makeEmbed('✧ ban — uso', 'Debes mencionar a un usuario o dar su ID.\nUso: `chi ban @usuario [razón]`')]
      });
    }

    if (!target.bannable) {
      return message.reply({
        embeds: [makeEmbed('✧ error', 'No puedo banear a ese usuario (su rol es superior o igual al mío).')]
      });
    }

    const reason = args.slice(1).join(' ') || 'Sin razón especificada';
    await target.ban({ reason });

    return message.reply({
      embeds: [
        makeEmbed('✧ usuario baneado', `**${target.user.tag}** fue baneado del servidor.\n**Razón:** ${reason}`)
      ]
    });
  }
};
