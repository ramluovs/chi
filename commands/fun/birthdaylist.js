const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const BABY_BLUE = 0xaeefff;
const BIRTHDAY_FILE = path.join(__dirname, '../../data/birthdays.json');
const BACKUP_CHANNEL_ID = '1499961569914654871';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function makeEmbed(title, description) {
  const embed = new EmbedBuilder().setColor(BABY_BLUE);
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

function loadLocalBirthdays() {
  try {
    if (!fs.existsSync(BIRTHDAY_FILE)) return {};
    return JSON.parse(fs.readFileSync(BIRTHDAY_FILE, 'utf8'));
  } catch {
    return {};
  }
}

async function loadFromBackupChannel(client) {
  try {
    const channel = await client.channels.fetch(BACKUP_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return {};
    const data = {};
    let lastId = null;
    let fetching = true;

    while (fetching) {
      const messages = await channel.messages.fetch({ limit: 100, ...(lastId ? { before: lastId } : {}) });
      if (!messages.size) { fetching = false; break; }

      for (const msg of messages.values()) {
        if (msg.author.id !== client.user.id) continue;
        const match = msg.content.match(/userId:(\d+)\s+date:(\d+)\/(\d+)(?:\/(\d+))?/);
        if (match) {
          const userId = match[1];
          if (!data[userId]) {
            data[userId] = {
              month: parseInt(match[2], 10),
              day: parseInt(match[3], 10),
              year: match[4] ? parseInt(match[4], 10) : null
            };
          }
        }
        lastId = msg.id;
      }
      if (messages.size < 100) fetching = false;
    }
    return data;
  } catch (e) {
    console.error('Error al sincronizar desde el canal de backup:', e);
    return {};
  }
}

module.exports = {
  async execute(message) {
    // 1. Cargar datos locales o sincronizar con el canal de respaldo
    let birthdays = loadLocalBirthdays();

    if (Object.keys(birthdays).length === 0) {
      birthdays = await loadFromBackupChannel(message.client);
    }

    const entries = Object.entries(birthdays);

    if (!entries.length) {
      return message.reply({
        embeds: [
          makeEmbed('✧ lista de cumpleaños', 'Aún no hay ningún cumpleaños registrado en la lista.')
        ]
      });
    }

    // 2. Ordenar cronológicamente (por mes y luego por día)
    const sorted = entries
      .map(([userId, data]) => ({
        userId,
        month: data.month,
        day: data.day,
        year: data.year || null
      }))
      .sort((a, b) => {
        if (a.month !== b.month) return a.month - b.month;
        return a.day - b.day;
      });

    // 3. Formatear la lista
    const lines = sorted.map(item => {
      const monthName = MONTH_NAMES[item.month - 1] || `Mes ${item.month}`;
      const yearText = item.year ? ` (${item.year})` : '';
      return `♡- <@${item.userId}> — **${item.day} de ${monthName}**${yearText}`;
    });

    const embed = makeEmbed(
      '✧ lista de cumpleaños 🎂',
      lines.join('\n\n')
    ).setFooter({ text: `Total de cumpleaños registrados: ${sorted.length}` });

    return message.reply({ embeds: [embed] });
  }
};
