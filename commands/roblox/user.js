const { EmbedBuilder } = require('discord.js');
const { safeFetch, resolveRobloxUser, BABY_BLUE } = require('./robloxHelper');

function makeEmbed(title, description, url = null) {
  const embed = new EmbedBuilder().setColor(BABY_BLUE);
  if (title) embed.setTitle(title);
  if (url) embed.setURL(url);
  if (description) embed.setDescription(description);
  return embed;
}

module.exports = {
  name: 'user',
  aliases: ['ruser', 'perfil'],
  async execute(message, args) {
    const input = args[0];
    if (!input) {
      return message.reply({
        embeds: [makeEmbed('✧ usuario — uso', 'Debes escribir un nombre o ID de Roblox.\nUso: `chi user <usuario/ID>`')]
      });
    }

    const target = await resolveRobloxUser(input);
    if (!target) {
      return message.reply({
        embeds: [makeEmbed('✧ error', `No se encontró al usuario ${input} en Roblox.`)]
      });
    }

    // Parallel safe requests
    const [userRes, friendsRes, followersRes, followingRes, invRes, avatarRes] = await Promise.all([
      safeFetch(`https://users.roblox.com/v1/users/${target.id}`),
      safeFetch(`https://friends.roblox.com/v1/users/${target.id}/friends/count`),
      safeFetch(`https://friends.roblox.com/v1/users/${target.id}/followers/count`),
      safeFetch(`https://friends.roblox.com/v1/users/${target.id}/followings/count`),
      safeFetch(`https://inventory.roblox.com/v1/users/${target.id}/can-view-inventory`),
      safeFetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${target.id}&size=420x420&format=Png&isCircular=false`)
    ]);

    const userData = userRes && userRes.ok ? await userRes.json() : {};
    const friendsCount = friendsRes && friendsRes.ok ? (await friendsRes.json()).count : 0;
    const followersCount = followersRes && followersRes.ok ? (await followersRes.json()).count : 0;
    const followingCount = followingRes && followingRes.ok ? (await followingRes.json()).count : 0;
    
    let isInventoryPublic = 'Desconocido';
    if (invRes && invRes.ok) {
      const invData = await invRes.json();
      isInventoryPublic = invData.canView ? 'Público' : 'Privado';
    }

    let headshotUrl = null;
    if (avatarRes && avatarRes.ok) {
      const avData = await avatarRes.json();
      headshotUrl = avData.data?.[0]?.imageUrl || null;
    }

    const createdUnix = userData.created ? Math.floor(new Date(userData.created).getTime() / 1000) : null;
    const createdText = createdUnix ? `<t:${createdUnix}:D> (<t:${createdUnix}:R>)` : 'Desconocida';
    
    // Direct Roblox profile, inventory & interaction URLs
    const profileUrl = `https://www.roblox.com/users/${target.id}/profile`;
    const friendsUrl = `https://www.roblox.com/users/${target.id}/friends`;
    const followersUrl = `https://www.roblox.com/users/${target.id}/inventory#!/followers`;
    const followingUrl = `https://www.roblox.com/users/${target.id}/inventory#!/following`;
    const inventoryUrl = `https://www.roblox.com/users/${target.id}/inventory`;

    // Title format: {user_display} (@{username}) with clickable link to profile
    const displayName = target.displayName || target.name;
    const titleText = `${displayName} (@${target.name})`;

    // Description layout with bold labels, clickable numbers/links, 2x2 rows, and bio
    const description = [
      `**Amigos:** [${friendsCount.toLocaleString()}](${friendsUrl}) | **Seguidores:** [${followersCount.toLocaleString()}](${followersUrl}) | **Siguiendo:** [${followingCount.toLocaleString()}](${followingUrl})`,
      '',
      `**ID:** \`${target.id}\` | **Creado:** ${createdText}`,
      `**Inventario:** [${isInventoryPublic}](${inventoryUrl}) | **Baneado:** ${userData.isBanned ? 'Sí' : 'No'}`,
      '',
      `**Descripción / Bio:**`,
      userData.description ? `\`\`\`${userData.description.slice(0, 500)}\`\`\`` : '*Sin descripción*'
    ].join('\n');

    const embed = makeEmbed(titleText, description, profileUrl)
      .setThumbnail(headshotUrl)
      .setFooter({ text: 'ver usuario de roblox' });

    return message.reply({ embeds: [embed] });
  }
};
