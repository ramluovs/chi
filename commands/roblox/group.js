const { EmbedBuilder } = require('discord.js');
const { safeFetch, BABY_BLUE } = require('./robloxHelper');

function makeEmbed(title, description, url = null) {
  const embed = new EmbedBuilder().setColor(BABY_BLUE);
  if (title) embed.setTitle(title);
  if (url) embed.setURL(url);
  if (description) embed.setDescription(description);
  return embed;
}

// Helper to resolve group input by numeric ID or Search by Name
async function resolveRobloxGroup(input) {
  const cleanInput = input.trim();
  if (!cleanInput) return null;

  // 1. If it's a numeric ID
  if (/^\d+$/.test(cleanInput)) {
    return cleanInput;
  }

  // 2. Search group by name via Roblox Groups Search API
  const searchRes = await safeFetch(`https://groups.roblox.com/v1/groups/search/lookup?groupName=${encodeURIComponent(cleanInput)}&prioritizeExactMatch=true&limit=10`);
  if (searchRes && searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.data && searchData.data.length > 0) {
      const exactMatch = searchData.data.find(g => g.name.toLowerCase() === cleanInput.toLowerCase());
      return exactMatch ? exactMatch.id : searchData.data[0].id;
    }
  }

  return null;
}

module.exports = {
  name: 'group',
  aliases: ['rgroup'],
  async execute(message, args) {
    const input = args.join(' ').trim();
    if (!input) {
      return message.reply({
        embeds: [makeEmbed('✧ grupo — uso', 'Debes escribir el nombre o ID de un grupo.\nUso: `chi group <nombre/ID>`')]
      });
    }

    const groupId = await resolveRobloxGroup(input);
    if (!groupId) {
      return message.reply({
        embeds: [makeEmbed('✧ error', `No se encontró ningún grupo con el término **${input}**.`)]
      });
    }

    // Parallel requests for v1 metadata, v2 metadata (for creation date), and icon
    const [groupRes, groupV2Res, iconRes] = await Promise.all([
      safeFetch(`https://groups.roblox.com/v1/groups/${groupId}`),
      safeFetch(`https://groups.roblox.com/v2/groups?groupIds=${groupId}`),
      safeFetch(`https://thumbnails.roblox.com/v1/groups/icons?groupIds=${groupId}&size=420x420&format=Png&isCircular=false`)
    ]);

    if (!groupRes || !groupRes.ok) {
      return message.reply({
        embeds: [makeEmbed('✧ error', `No se encontró ningún grupo con el ID **${groupId}**.`)]
      });
    }

    const groupData = await groupRes.json();
    const groupV2Data = groupV2Res && groupV2Res.ok ? await groupV2Res.json() : {};
    const groupV2Info = groupV2Data.data?.[0] || {};

    let iconUrl = null;
    if (iconRes && iconRes.ok) {
      const iconData = await iconRes.json();
      iconUrl = iconData.data?.[0]?.imageUrl || null;
    }

    // Creation date timestamp
    const rawCreated = groupV2Info.created || groupData.created;
    const createdUnix = rawCreated ? Math.floor(new Date(rawCreated).getTime() / 1000) : null;
    const createdText = createdUnix ? `<t:${createdUnix}:D> (<t:${createdUnix}:R>)` : 'Desconocida';

    const groupUrl = `https://www.roblox.com/groups/${groupData.id}`;
    const ownerName = groupData.owner ? `[${groupData.owner.username}](https://www.roblox.com/users/${groupData.owner.userId}/profile)` : '*Sin dueño (Abandonado)*';
    const accessText = groupData.publicEntryAllowed ? 'Público' : 'Requiere Aprobación';
    const memberCount = groupData.memberCount ? groupData.memberCount.toLocaleString() : '0';

    // Description layout with bold labels, neat rows, shout, and bio
    const description = [
      `**Dueño:** ${ownerName} | **Miembros:** ${memberCount}`,
      `**ID:** \`${groupData.id}\` | **Acceso:** ${accessText}`,
      `**Creado:** ${createdText}`,
      '',
      `**Anuncio:**`,
      groupData.shout?.body ? `\`\`\`${groupData.shout.body.slice(0, 300)}\`\`\`\n-# Por: ${groupData.shout.poster?.username || 'Desconocido'}` : '*Sin anuncio reciente*',
      '',
      `**Descripción:**`,
      groupData.description ? `\`\`\`${groupData.description.slice(0, 400)}\`\`\`` : '*Sin descripción*'
    ].join('\n');

    const embed = makeEmbed(groupData.name, description, groupUrl)
      .setThumbnail(iconUrl)
      .setFooter({ text: 'ver grupo de roblox' });

    return message.reply({ embeds: [embed] });
  }
};
