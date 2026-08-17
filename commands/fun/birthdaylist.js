const { EmbedBuilder } = require('discord.js');

const BABY_BLUE = 0xaeefff;
const BACKUP_CHANNEL_ID = '1499961569914654871';

function makeEmbed(title, description) {
  const embed = new EmbedBuilder().setColor(BABY_BLUE);
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

// Fetch all messages from the backup channel without restricting by bot author ID
async function loadAllFromBackupChannel(client) {
  try {
    const channel = await client.channels.fetch(BACKUP_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return {};

    const data = {};
    let lastId = null;
    let fetching = true;

    while (fetching) {
      const messages = await channel.messages.fetch({
        limit: 100,
        ...(lastId ? { before: lastId } : {})
      });

      if (!messages.size) {
        fetching = false;
        break;
      }

      for (const msg of messages.values()) {
        // Regex matches both standard and older backup message formats
        const match = msg.content.match(/userId:(\d+)\s+date:(\d+)\/(\d+)(?:\/(\d+))?/i);
        if (match) {
          const userId = match[1];
          // If duplicate entries exist, keep the latest one found
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
    console.error('Error al sincronizar lista de cumpleaños desde el canal:', e);
    return {};
  }
}

// Calculates next birthday UNIX timestamp for Discord dynamic formatting
function getNextBirthdayTimestamp(month, day) {
  const now = new Date();
  const currentYear = now.getFullYear();

  // Create UTC date representation for the birthday this year
  let bdayDate = new Date(Date.UTC(currentYear, month - 1, day, 12, 0, 0));

  // If the birthday already passed this year, point to next year
  if (bdayDate < now) {
    bdayDate = new Date(Date.UTC(currentYear + 1, month - 1, day, 12, 0, 0));
  }

  return Math.floor(bdayDate.getTime() / 1000);
}

module.exports = {
  name: 'birthdaylist',
  aliases: ['blist', 'cumples', 'birthdays'],
  async execute(message) {
    const birthdays = await loadAllFromBackupChannel(message.client);
    const entries = Object.entries(birthdays);

    if (!entries.length) {
      return message.reply({
        embeds: [
          makeEmbed('✧ lista de cumpleaños', 'Aún no hay ningún cumpleaños registrado en la lista.')
        ]
      });
    }

    // Sort chronologically (by month, then by day)
    const sorted = entries
      .map(([userId, data]) => ({
        userId,
        month: data.month,
        day: data.day,
        year: data.year || null,
        timestamp: getNextBirthdayTimestamp(data.month, data.day)
      }))
      .sort((a, b) => {
        if (a.month !== b.month) return a.month - b.month;
        return a.day - b.day;
      });

    // Format list using Discord Timestamps: <t:TIMESTAMP:D> (e.g., "15 de mayo de 2026")
    const lines = sorted.map(item => {
      const yearNote = item.year ? ` *(Año: ${item.year})*` : '';
      return `♡- <@${item.userId}> — <t:${item.timestamp}:D>${yearNote}`;
    });

    const embed = makeEmbed(
      '✧ lista de cumpleaños 🎂',
      lines.join('\n\n')
    ).setFooter({ text: `Total de cumpleaños registrados: ${sorted.length}` });

    return message.reply({ embeds: [embed] });
  }
};
