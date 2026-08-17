const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const BABY_BLUE = 0xaeefff;
const VERIFY_ALLOWED_ROLES = ['1340864854243803248', '1364791264997806170'];
const VERIFY_ROLE_ID = '1340869620894142475';

function makeEmbed(title, description) {
  const embed = new EmbedBuilder().setColor(BABY_BLUE);
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

module.exports = {
  name: 'verify',
  aliases: ['v'],
  async execute(message, args) {
    const hasAllowedRole = VERIFY_ALLOWED_ROLES.some(id => message.member.roles.cache.has(id));
    const hasAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasAllowedRole && !hasAdmin) {
      return message.reply({
        embeds: [makeEmbed('✧ error', 'No tienes permiso para verificar miembros.')]
      });
    }

    const target = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : message.member);

    if (!target) {
      return message.reply({
        embeds: [makeEmbed('✧ verify — uso', 'Debes mencionar a un usuario.\nUso: `chi verify @usuario` o `chi v @usuario`')]
      });
    }

    const role = message.guild.roles.cache.get(VERIFY_ROLE_ID);
    if (!role) {
      return message.reply({
        embeds: [makeEmbed('✧ error', 'No se encontró el rol de verificación en el servidor.')]
      });
    }

    try {
      if (target.roles.cache.has(VERIFY_ROLE_ID)) {
        await target.roles.remove(role);
        return message.reply({
          embeds: [
            makeEmbed('✧ verificación retirada', `Se le ha quitado el rol **${role.name}** a **${target.user.tag}**.`)
          ]
        });
      } else {
        await target.roles.add(role);
        return message.reply({
          embeds: [
            makeEmbed('✧ verificación exitosa', `Se le ha asignado el rol **${role.name}** a **${target.user.tag}** ♡`)
          ]
        });
      }
    } catch {
      return message.reply({
        embeds: [makeEmbed('✧ error', 'No pude modificar el rol. Asegúrate de que mi rol esté por encima del rol que intento asignar.')]
      });
    }
  }
};
