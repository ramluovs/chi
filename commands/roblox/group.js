const { EmbedBuilder } = require('discord.js');
const { safeFetch, BABY_BLUE } = require('./robloxHelper');

function makeEmbed(title, description) {
  const embed = new EmbedBuilder().setColor(BABY_BLUE);
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

module.exports = {
  name: 'group',
  aliases: ['rgroup'],
  async execute(message, args) {
    const groupId = args[0];
    if (!groupId || !/^\d+$/.test(groupId)) {
      return message.reply({
        embeds: [makeEmbed('✧ group — uso', 'Debes ingresar el ID numérico del grupo.\nUso: `chi group <ID>`')]
      });
    }

    const [groupRes, iconRes] = await Promise.all([
      safeFetch(`https://groups.roblox.com/v1/groups/${groupId}`),
      safeFetch(`https://thumbnails.roblox.com/v1/groups/icons?groupIds=${groupId}&size=420x420&format=Png&isCircular=false`)
    ]);

    if (!groupRes || !groupRes.ok) {
      return message.reply({
        embeds: [makeEmbed('✧ error', `No se encontró ningún grupo con el ID **${groupId}**.`)]
      });
    }

    const groupData = await groupRes.json();

    let iconUrl = null;
    if (iconRes && iconRes.ok) {
      const iconData = await iconRes.json();
      iconUrl = iconData.data?.[0]?.imageUrl || null;
    }

    const ownerName = groupData.owner ? `[${groupData.owner.username}](https://www.roblox.com/users/${groupData.owner.userId}/profile)` : '*Sin dueño (Abandonado)*';
    const groupUrl = `https://www.roblox.com/groups/${groupData.id}`;
    const shoutText = groupData.shout?.body ? `\`\`\`${groupData.shout.body.slice(0, 300)}\`\`\`\n-# Por: ${groupData.shout.poster?.username || 'Desconocido'}` : '*Sin anuncio reciente*';

    const description = [
      `🏷️ **Grupo:** [${groupData.name}](${groupUrl})`,
      `🆔 **ID:** \`${groupData.id}\``,
      `👑 **Dueño:** ${ownerName}`,
      `👥 **Miembros:** ${groupData.memberCount?.toLocaleString() || 0}`,
      `🔒 **Acceso:** ${groupData.publicEntryAllowed ? '🔓 Público' : '🔒 Requiere Aprobación'}`,
      '',
      `📢 **Anuncio Actual (Shout):**`,
      shoutText,
      '',
      `📝 **Descripción:**`,
      groupData.description ? `\`\`\`${groupData.description.slice(0, 400)}\`\`\`` : '*Sin descripción*'
    ].join('\n');

    const embed = makeEmbed(`✧ información de grupo ♡`, description)
      .setThumbnail(iconUrl)
      .setFooter({ text: 'Roblox Group Lookup ♡' });

    return message.reply({ embeds: [embed] });
  }
};
