const { EmbedBuilder } = require('discord.js');
const { safeFetch, resolveRobloxUser, BABY_BLUE } = require('./robloxHelper');

function makeEmbed(title, description) {
  const embed = new EmbedBuilder().setColor(BABY_BLUE);
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

module.exports = {
  name: 'avatar',
  aliases: ['av', 'ravatar'],
  async execute(message, args) {
    const input = args[0];
    if (!input) {
      return message.reply({
        embeds: [makeEmbed('✧ avatar — uso', 'Debes escribir un nombre o ID de Roblox.\nUso: `chi avatar <usuario/ID>`')]
      });
    }

    const target = await resolveRobloxUser(input);
    if (!target) {
      return message.reply({
        embeds: [makeEmbed('✧ error', `No se encontró al usuario **${input}** en Roblox.`)]
      });
    }

    // Fetch full body avatar thumbnail
    const res = await safeFetch(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${target.id}&size=720x720&format=Png&isCircular=false`);
    let avatarUrl = null;

    if (res && res.ok) {
      const data = await res.json();
      avatarUrl = data.data?.[0]?.imageUrl || null;
    }

    if (!avatarUrl) {
      return message.reply({
        embeds: [makeEmbed('✧ error', 'No se pudo cargar la imagen del avatar.')]
      });
    }

    const profileUrl = `https://www.roblox.com/users/${target.id}/profile`;
    const embed = makeEmbed('✧ avatar de roblox ♡', `Avatar de [**${target.name}**](${profileUrl}) (\`${target.id}\`)`)
      .setImage(avatarUrl);

    return message.reply({ embeds: [embed] });
  }
};
