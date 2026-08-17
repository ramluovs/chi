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
  name: 'display',
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
        embeds: [makeEmbed('✧ display — uso', 'Uso: `chi display @usuario <nuevo nombre>`')]
      });
    }

    const newNick = args.slice(1).join(' ').trim();
    if (!newNick) {
      return message.reply({
        embeds: [makeEmbed('✧ display — uso', 'Debes escribir el nuevo nombre para el usuario.\nUso: `chi display @usuario <nuevo nombre>`')]
      });
    }

    try {
      await target.setNickname(newNick);
      return message.reply({
        embeds: [
          makeEmbed('✧ apodo actualizado', `El nuevo nombre de **${target.user.username}** en el servidor ahora es: **${newNick}** ♡`)
        ]
      });
    } catch {
      return message.reply({
        embeds: [makeEmbed('✧ error', 'No tengo permisos suficientes para cambiarle el apodo a ese usuario (su rol es superior o igual al mío).')]
      });
    }
  }
};
