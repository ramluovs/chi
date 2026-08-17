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
  name: 'purge',
  aliases: [],
  async execute(message, args) {
    const hasRole = message.member.roles.cache.has(MOD_ROLE_ID);
    const hasAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasRole && !hasAdmin) {
      return message.reply({
        embeds: [makeEmbed('✧ error', 'No tienes permiso para usar este comando.')]
      });
    }

    let amount = parseInt(args[0], 10);
    if (isNaN(amount) || amount < 1) {
      amount = 1;
    } else if (amount > 100) {
      amount = 100;
    }

    await message.delete().catch(() => {});

    const deleted = await message.channel.bulkDelete(amount, true);

    const confirmMsg = await message.channel.send({
      embeds: [
        makeEmbed('✧ mensajes eliminados', `Se han borrado **${deleted.size}** mensaje(s) correctamente.`)
      ]
    });

    setTimeout(() => {
      confirmMsg.delete().catch(() => {});
    }, 3000);
  }
};
