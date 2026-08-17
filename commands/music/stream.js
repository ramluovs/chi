const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getSpotifyApiForUser, BABY_BLUE } = require('./spotifyHelper');

const TARGET_CHANNEL_ID = '1528987534506594414';
const activeStreams = new Map();

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let parts = [];
  if (hours > 0) parts.push(`**${hours} ${hours === 1 ? 'hora' : 'horas'}**`);
  if (minutes > 0) parts.push(`**${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}**`);
  if (seconds > 0 || parts.length === 0) parts.push(`**${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}**`);

  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} y ${parts[1]}`;
  return `${parts[0]}, ${parts[1]} y ${parts[2]}`;
}

async function checkAndSkipForUser(client, userId) {
  const userStream = activeStreams.get(userId);
  if (!userStream) return;

  let userRes = await getSpotifyApiForUser(userId);
  if (userRes.error) {
    userStream.consecutiveErrors = (userStream.consecutiveErrors || 0) + 1;
    if (userStream.consecutiveErrors >= 5) {
      clearInterval(userStream.intervalId);
      activeStreams.delete(userId);
    }
    return;
  }

  let spotifyApi = userRes.api;

  try {
    let data = await spotifyApi.getMyCurrentPlaybackState();
    userStream.consecutiveErrors = 0;

    if (!data.body || !data.body.is_playing || !data.body.item) return;

    const oldTrack = data.body.item;
    const progressMs = data.body.progress_ms;
    const durationMs = oldTrack.duration_ms;
    const targetMs = (durationMs * (userStream.percent / 100)) + (userStream.extraSeconds * 1000);

    if (progressMs >= targetMs && userStream.lastSkippedTrackId !== oldTrack.id) {
      await spotifyApi.skipToNext();
      userStream.lastSkippedTrackId = oldTrack.id;
      userStream.skippedCount++;

      await new Promise(resolve => setTimeout(resolve, 800));

      let newTrack = null;
      try {
        const newPlayback = await spotifyApi.getMyCurrentPlaybackState();
        if (newPlayback.body && newPlayback.body.item) {
          newTrack = newPlayback.body.item;
        }
      } catch (_) {}

      if (userStream.notifyOnSkip && client) {
        const targetChannel = client.channels.cache.get(TARGET_CHANNEL_ID) || await client.channels.fetch(TARGET_CHANNEL_ID).catch(() => null);
        if (targetChannel) {
          let desc = `<@${userId}> saltó **${oldTrack.name}** de **${oldTrack.artists[0].name}**`;
          if (newTrack) desc += ` a **${newTrack.name}** de **${newTrack.artists[0].name}**`;

          const skipEmbed = new EmbedBuilder()
            .setColor(BABY_BLUE)
            .setTitle('⚡ Auto-Salto ♡')
            .setDescription(desc)
            .setThumbnail(newTrack?.album?.images[0]?.url || oldTrack.album?.images[0]?.url || null)
            .setFooter({ text: `Saltado al ${userStream.percent}% + ${userStream.extraSeconds}s ♡` });

          targetChannel.send({ embeds: [skipEmbed] }).catch(() => {});
        }
      }
    }
  } catch (err) {
    userStream.consecutiveErrors = (userStream.consecutiveErrors || 0) + 1;
    if (userStream.consecutiveErrors >= 5) {
      clearInterval(userStream.intervalId);
      activeStreams.delete(userId);
    }
  }
}

function stopUserStream(userId) {
  if (activeStreams.has(userId)) {
    const userStream = activeStreams.get(userId);
    clearInterval(userStream.intervalId);
    activeStreams.delete(userId);
    return userStream;
  }
  return null;
}

module.exports = {
  name: 'stream',
  aliases: [],
  stopUserStream,
  async execute(message, args) {
    const userId = message.author.id;
    const userRes = await getSpotifyApiForUser(userId);

    if (userRes.error === 'unlinked') {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(BABY_BLUE)
            .setTitle('✧ vincula spotify')
            .setDescription(`¡Hola <@${userId}>! Para usar el Modo Stream, vincula tu cuenta en:\nhttps://chidoris.lovable.app`)
        ]
      });
    }

    if (userRes.error) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(BABY_BLUE)
            .setTitle('✧ error')
            .setDescription('No se pudo conectar con Spotify.')
        ]
      });
    }

    const option = args[0]?.toLowerCase();
    const userStream = activeStreams.get(userId);

    // Turn OFF Stream
    if (userStream && (option === 'off' || option === 'stop' || !args[0])) {
      const stopped = stopUserStream(userId);
      const durationMs = Date.now() - stopped.startTime;

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(BABY_BLUE)
            .setTitle('🔴 Modo Stream ♡')
            .setDescription(`Modo stream: **APAGADO** para <@${userId}>\n\nTransmitiste **${stopped.skippedCount} canciones** durante ${formatTime(durationMs)}.`)
        ]
      });
    }

    // Turn ON Stream
    const percent = args[0] !== undefined && !isNaN(args[0]) ? Number(args[0]) : 50;
    const seconds = args[1] !== undefined && !isNaN(args[1]) ? Number(args[1]) : 5;

    if (userStream) clearInterval(userStream.intervalId);

    const intervalId = setInterval(() => checkAndSkipForUser(message.client, userId), 2500);

    const newConfig = {
      percent,
      extraSeconds: seconds,
      lastSkippedTrackId: null,
      startTime: Date.now(),
      skippedCount: 0,
      notifyOnSkip: true,
      consecutiveErrors: 0,
      intervalId
    };

    activeStreams.set(userId, newConfig);

    const streamEmbed = new EmbedBuilder()
      .setColor(BABY_BLUE)
      .setTitle('chi stream ♡')
      .setDescription(`Modo stream: **ENCENDIDO** para <@${userId}>\n\n¿Deseas enviar avisos al canal cuando se salte una canción?`)
      .addFields(
        { name: 'Porcentaje', value: `**${percent}%**`, inline: true },
        { name: 'Segundos Extra', value: `**+${seconds}s**`, inline: true }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`stream_yes_${userId}`).setLabel('Sí ♡').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`stream_no_${userId}`).setLabel('No ♡').setStyle(ButtonStyle.Secondary)
    );

    const replyMsg = await message.reply({ embeds: [streamEmbed], components: [row] });

    const collector = replyMsg.createMessageComponentCollector({
      filter: i => i.user.id === userId,
      time: 30000
    });

    collector.on('collect', async i => {
      const cfg = activeStreams.get(userId);
      if (cfg) {
        cfg.notifyOnSkip = i.customId.startsWith('stream_yes');
      }

      await i.update({
        embeds: [streamEmbed.setFooter({ text: cfg?.notifyOnSkip ? 'Notificaciones activadas ♡' : 'Notificaciones desactivadas ♡' })],
        components: []
      });
      collector.stop();
    });
  }
};
