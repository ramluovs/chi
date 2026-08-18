const { EmbedBuilder } = require('discord.js');
const { getSpotifyApiForUser, BABY_BLUE } = require('./spotifyHelper');

const ALLOWED_CHANNEL_ID = '1340907464161497168';
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

async function sendDisconnectNotice(client, userId, reason) {
  try {
    const channel = client.channels.cache.get(ALLOWED_CHANNEL_ID) || await client.channels.fetch(ALLOWED_CHANNEL_ID).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(BABY_BLUE)
      .setTitle('✧ modo stream desconectado')
      .setDescription(`El modo stream de <@${userId}> se detuvo automáticamente.\n**Motivo:** ${reason}`);

    await channel.send({ embeds: [embed] }).catch(() => {});
  } catch (_) {}
}

async function checkAndSkipForUser(client, userId) {
  const userStream = activeStreams.get(userId);
  if (!userStream) return;

  let userRes = await getSpotifyApiForUser(userId);
  if (userRes.error) {
    userStream.consecutiveErrors = (userStream.consecutiveErrors || 0) + 1;
    if (userStream.consecutiveErrors >= 5) {
      stopUserStream(userId);
      await sendDisconnectNotice(client, userId, 'No se pudo conectar con tu cuenta de Spotify tras varios intentos.');
    }
    return;
  }

  let spotifyApi = userRes.api;

  try {
    let data = await spotifyApi.getMyCurrentPlaybackState();
    
    // Check if no active playback / device is playing
    if (!data.body || !data.body.is_playing || !data.body.item) {
      userStream.consecutiveErrors = (userStream.consecutiveErrors || 0) + 1;
      if (userStream.consecutiveErrors >= 5) {
        stopUserStream(userId);
        await sendDisconnectNotice(client, userId, 'No se detectó ningún dispositivo reproduciendo música en Spotify.');
      }
      return;
    }

    userStream.consecutiveErrors = 0;

    const oldTrack = data.body.item;
    const progressMs = data.body.progress_ms;
    const durationMs = oldTrack.duration_ms;
    const targetMs = (durationMs * (userStream.percent / 100)) + (userStream.extraSeconds * 1000);

    if (progressMs >= targetMs && userStream.lastSkippedTrackId !== oldTrack.id) {
      await spotifyApi.skipToNext();
      userStream.lastSkippedTrackId = oldTrack.id;
      userStream.skippedCount++;
    }
  } catch (err) {
    userStream.consecutiveErrors = (userStream.consecutiveErrors || 0) + 1;
    if (userStream.consecutiveErrors >= 5) {
      stopUserStream(userId);
      await sendDisconnectNotice(client, userId, 'Error de conexión con la reproducción de Spotify.');
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
    // Strictly restrict execution to this channel only; ignore silently anywhere else
    if (message.channel.id !== ALLOWED_CHANNEL_ID) return;

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
      consecutiveErrors: 0,
      intervalId
    };

    activeStreams.set(userId, newConfig);

    const streamEmbed = new EmbedBuilder()
      .setColor(BABY_BLUE)
      .setTitle('chi stream ♡')
      .setDescription(`Modo stream: **ENCENDIDO** para <@${userId}>`)
      .addFields(
        { name: 'Porcentaje', value: `**${percent}%**`, inline: true },
        { name: 'Segundos Extra', value: `**+${seconds}s**`, inline: true }
      );

    return message.reply({ embeds: [streamEmbed] });
  }
};
