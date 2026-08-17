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
  name: 'unban',
  aliases: [],
  async execute(message, args) {
    const hasRole = message.member.roles.cache.has(MOD_ROLE_ID);
    const hasAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasRole && !hasAdmin) {
      return message.reply({
        embeds: [makeEmbed('✧ error', 'No tienes permiso para usar este comando.')]
      });
    }

    const userId = args[0];
    if (!userId) {
      return message.reply({
        embeds: [makeEmbed('✧ unban — uso', 'Debes ingresar la ID del usuario.\nUso: `chi unban <ID_de_usuario>`')]
      });
    }

    try {
      const bannedUser = await message.guild.bans.fetch(userId);
      await message.guild.bans.remove(userId);
      return message.reply({
        embeds: [
          makeEmbed('✧ usuario desbaneado', `**${bannedUser.user.tag}** ha sido desbaneado correctamente.`)
        ]
      });
    } catch {
      return message.reply({
        embeds: [makeEmbed('✧ error', 'No se encontró a ningún usuario baneado con esa ID.')]
      });
    }
  }
};
