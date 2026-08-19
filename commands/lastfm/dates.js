const { EmbedBuilder } = require('discord.js');
const { checkLastfmAuth, BABY_BLUE } = require('./lastfmHelper');

module.exports = {
  name: 'dates',
  aliases: ['date', 'fechas', 'tiempos'],
  async execute(message) {
    // Role check: strictly ignore if user lacks role
    if (!checkLastfmAuth(message)) return;

    const description = [
      'Usa estas opciones al final de tus comandos de Last.fm (ejemplo: `chi w sabrina carpenter 7d`):\n',
      '♡ **1 Día / 24 Horas:** `1d`, `24h`, `day`, `d`, `hoy`',
      '♡ **7 Días / 1 Semana:** `7d`, `1w`, `week`, `w`, `semana`',
      '♡ **1 Mes:** `1m`, `month`, `m`, `mes`',
      '♡ **3 Meses:** `3m`, `3months`, `3meses`',
      '♡ **6 Meses:** `6m`, `6months`, `halfyear`',
      '♡ **1 Año:** `1y`, `12m`, `year`, `y`, `año`',
      '♡ **Todo el tiempo (Defecto):** `all`, `alltime`, `overall`, `siempre`\n',
      '-# Puedes añadir `nr` al final de cualquier comando para desactivar redirecciones automáticas.'
    ].join('\n');

    const embed = new EmbedBuilder()
      .setColor(BABY_BLUE)
      .setTitle('✧ fechas y filtros de last.fm ♡')
      .setDescription(description);

    return message.reply({ embeds: [embed] });
  }
};
