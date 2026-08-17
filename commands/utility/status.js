const { EmbedBuilder } = require('discord.js');

const BABY_BLUE = 0xaeefff;
const GITHUB_STATUS_URL = 'https://www.githubstatus.com/api/v2/summary.json';

function makeEmbed(title, description) {
  const embed = new EmbedBuilder().setColor(BABY_BLUE);
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

// Convert GitHub status names to clean emoji indicators
function getStatusEmoji(status) {
  switch (status) {
    case 'operational':
      return '🟢 Operativo';
    case 'degraded_performance':
      return '🟡 Rendimiento degradado';
    case 'partial_outage':
      return '🟠 Caída parcial';
    case 'major_outage':
      return '🔴 Caída mayor';
    default:
      return '⚪ Desconocido';
  }
}

module.exports = {
  name: 'status',
  aliases: ['ghstatus', 'github', 'estado'],
  async execute(message) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(GITHUB_STATUS_URL, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return message.reply({
          embeds: [makeEmbed('✧ error', 'No se pudo consultar la API de estado de GitHub.')]
        });
      }

      const data = await res.json();
      const overallDesc = data.status?.description || 'Estado no disponible';
      const indicator = data.status?.indicator || 'none';

      // Pick general header icon
      let indicatorEmoji = '🟢';
      if (indicator === 'minor') indicatorEmoji = '🟡';
      if (indicator === 'major' || indicator === 'critical') indicatorEmoji = '🔴';

      // Key components to track
      const targetComponents = [
        'Git Operations',
        'API Requests',
        'Webhooks',
        'Issues',
        'Pull Requests',
        'Actions',
        'Pages'
      ];

      const components = (data.components || [])
        .filter(c => targetComponents.some(t => c.name.toLowerCase().includes(t.toLowerCase())))
        .map(c => `♡ **${c.name}:** ${getStatusEmoji(c.status)}`);

      // Check for ongoing incidents
      const unresolvedIncident = (data.incidents || []).find(inc => inc.status !== 'resolved');
      let incidentText = '';
      if (unresolvedIncident) {
        const latestUpdate = unresolvedIncident.incident_updates?.[0]?.body || 'Sin detalles adicionales.';
        incidentText = `\n\n⚠️ **Incidente activo:** [${unresolvedIncident.name}](${unresolvedIncident.shortlink})\n> *${latestUpdate.slice(0, 300)}*`;
      }

      const description = [
        `**Estado Global:** ${indicatorEmoji} **${overallDesc}**`,
        '',
        '📋 **Servicios de GitHub:**',
        components.length ? components.join('\n') : '*(No se pudieron cargar los servicios individuales)*',
        incidentText,
        '',
        '-# [Ver página oficial de estado en tiempo real](https://www.githubstatus.com)'
      ].join('\n');

      const embed = makeEmbed('✧ estado de github ♡', description)
        .setThumbnail('https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png')
        .setFooter({ text: `Última actualización · ${data.page?.updated_at ? new Date(data.page.updated_at).toLocaleTimeString() : 'Ahora'}` });

      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Error al consultar estado de GitHub:', err);
      return message.reply({
        embeds: [makeEmbed('✧ error', 'Ocurrió un problema de conexión al verificar el estado de GitHub.')]
      });
    }
  }
};
