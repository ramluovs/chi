const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const BABY_BLUE = 0xaeefff;
const MOD_ROLE_ID = '1340864854243803248';

function makeEmbed(title, description) {
  const embed = new EmbedBuilder().setColor(BABY_BLUE);
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

function parseDuration(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)(s|m|h|d|w)?$/i);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = (match[2] || 'm').toLowerCase();

  switch (unit) {
    case 's': return { ms: value * 1000, label: `${value} segundo(s)` };
    case 'm': return { ms: value * 60 * 1000, label: `${value} minuto(s)` };
    case 'h': return { ms: value * 60 * 60 * 1000, label: `${value} hora(s)` };
    case 'd': return { ms: value * 24 * 60 * 60 * 1000, label: `${value} día(s)` };
    case 'w': return { ms: value * 7 * 24 * 60 * 60 * 1000, label: `${value} semana(s)` };
    default: return null;
  }
}

module.exports = {
  name: 'timeout',
  aliases: ['mute', 'silenciar'],
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
        embeds: [makeEmbed('✧ timeout — uso', 'Debes mencionar a un usuario.\nUso: `chi timeout @usuario [tiempo] [razón]`\nEjemplos: `chi timeout @usuario 10m Spam`, `chi timeout @usuario 1w`, `chi timeout @usuario` (defecto 5m)')]
      });
    }

    if (!target.moderatable) {
      return message.reply({
        embeds: [makeEmbed('✧ error', 'No puedo silenciar a ese usuario (su rol es superior o igual al mío).')]
      });
    }

    let parsedTime = parseDuration(args[1]);
    let reasonIndex = 2;

    if (!parsedTime) {
      parsedTime = { ms: 5 * 60 * 1000, label: '5 minuto(s)' };
      reasonIndex = 1;
    }

    if (parsedTime.ms > 28 * 24 * 60 * 60 * 1000 || parsedTime.ms < 5000) {
      return message.reply({
        embeds: [makeEmbed('✧ error', 'El tiempo de timeout debe estar entre 5 segundos y 28 días.')]
      });
    }

    const reason = args.slice(reasonIndex).join(' ') || 'Sin razón especificada';
    await target.timeout(parsedTime.ms, reason);

    return message.reply({
      embeds: [
        makeEmbed('✧ usuario silenciado', `**${target.user.tag}** fue silenciado por **${parsedTime.label}**.\n**Razón:** ${reason}`)
      ]
    });
  }
};
