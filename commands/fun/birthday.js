const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const BABY_BLUE = 0xaeefff;
const BIRTHDAY_FILE = path.join(__dirname, '../../data/birthdays.json');
const BACKUP_CHANNEL_ID = '1499961569914654871';
const ANNOUNCEMENT_CHANNEL_ID = '1340867371971383376';

const CUTE_EMOJIS = [
  '<a:conejito:1456045352963674173>',
  '<a:brillos:1365029394090954832>',
  '<a:brillos:1366478256676671618>',
  '<a:camara:1363776138056564858>',
  '<a:first:1499651324600651877>',
  '<:mariposa:1456045355509747782>',
  '<:osito:1456045350690488382>',
  '<a:right2:1499651329570897982>',
  '<:right3:1499652025129111572>',
  '<a:typing:1456045079629402224>'
];

const BIRTHDAY_MESSAGES = [
  'esperemos que la pases increíble rodeada de personas que te quieren mucho!',
  'que este día esté lleno de cosas bonitas y momentos que recuerdes siempre!',
  'mereces todo lo mejor hoy y siempre, que lo disfrutes muchísimo!',
  'ojalá este cumpleaños sea tan especial como tú lo eres!',
  'que todos tus deseos se hagan realidad hoy, lo mereces!'
];

// Helper: standard themed embed
function makeEmbed(title, description) {
  const embed = new EmbedBuilder().setColor(BABY_BLUE);
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

function loadBirthdays() {
  try {
    if (!fs.existsSync(BIRTHDAY_FILE)) return {};
    return JSON.parse(fs.readFileSync(BIRTHDAY_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveBirthdays(data) {
  try {
    const dir = path.dirname(BIRTHDAY_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(BIRTHDAY_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to save birthdays locally:', e);
  }
}

function parseDate(input) {
  const match = input.trim().match(/^(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{4}))?$/);
  if (!match) return null;
  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  const year = match[3] ? parseInt(match[3], 10) : null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { month, day, year };
}

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function saveToBackupChannel(client, userId, month, day, year) {
  try {
    const channel = await client.channels.fetch(BACKUP_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;
    const yearStr = year ? `/${year}` : '';
    await channel.send(`BIRTHDAY_DATA userId:${userId} date:${month}/${day}${yearStr}`);
  } catch (e) {
    console.error('Failed to save to backup channel:', e);
  }
}

async function deleteFromBackupChannel(client, userId) {
  try {
    const channel = await client.channels.fetch(BACKUP_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;
    let lastId = null;
    let found = true;
    while (found) {
      found = false;
      const messages = await channel.messages.fetch({ limit: 100, ...(lastId ? { before: lastId } : {}) });
      if (!messages.size) break;
      for (const msg of messages.values()) {
        if (msg.author.id === client.user.id && msg.content.includes(`userId:${userId}`)) {
          await msg.delete().catch(() => {});
          found = true;
        }
        lastId = msg.id;
      }
    }
  } catch (e) {
    console.error('Failed to delete from backup channel:', e);
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
    console.error('Failed to load from backup channel:', e);
    return {};
  }
}

async function sendBirthdayAnnouncement(client, userId, month, day, year) {
  try {
    const channel = await client.channels.fetch(ANNOUNCEMENT_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;

    const cuteEmoji = getRandomItem(CUTE_EMOJIS);
    const birthdayMsg = getRandomItem(BIRTHDAY_MESSAGES);
    const userMention = `<@${userId}>`;

    let ageText = '';
    if (year) {
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const age = now.getFullYear() - year;
      ageText = `\n¡Feliz **${age}** años! ${birthdayMsg}`;
    }

    const embed = makeEmbed(
      '✧ ¡feliz cumpleaños! 🎂',
      `Hoy celebramos a ${userMention} ${cuteEmoji}${ageText ? `\n${ageText}` : ''}`
    );

    const sent = await channel.send({
      content: '|| @everyone ||',
      embeds: [embed]
    });

    await sent.react('<a:wing2:1499968356898308198>').catch(() => {});
    await sent.react('<a:wing1:1499968359293259856>').catch(() => {});
  } catch (e) {
    console.error('Failed to send birthday announcement:', e);
  }
}

function scheduleCheck(client) {
  function getNextMidnightET() {
    const now = new Date();
    const etNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const nextMidnight = new Date(etNow);
    nextMidnight.setHours(24, 0, 0, 0);
    return nextMidnight - etNow;
  }

  async function checkBirthdays() {
    const etNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const todayMonth = etNow.getMonth() + 1;
    const todayDay = etNow.getDate();

    const backupData = await loadFromBackupChannel(client);
    saveBirthdays(backupData);
    const birthdays = loadBirthdays();

    for (const [userId, data] of Object.entries(birthdays)) {
      if (data.month === todayMonth && data.day === todayDay) {
        await sendBirthdayAnnouncement(client, userId, data.month, data.day, data.year);
      }
    }

    setTimeout(async () => {
      await checkBirthdays();
    }, 24 * 60 * 60 * 1000);
  }

  const msUntilMidnight = getNextMidnightET();
  setTimeout(async () => {
    await checkBirthdays();
  }, msUntilMidnight);
}

module.exports = {
  scheduleCheck,
  async execute(message, parsedCommand) {
    const userId = message.author.id;
    const input = parsedCommand.args.join(' ').trim();

    if (!input) {
      return message.reply({
        embeds: [
          makeEmbed('✧ cumpleaños — ayuda', 'Escribe tu cumpleaños usando:\n`chi birthday MM / DD / YYYY`\n*(el año es opcional)*')
        ]
      });
    }

    const parsed = parseDate(input);
    if (!parsed) {
      return message.reply({
        embeds: [
          makeEmbed('✧ formato inválido', 'Por favor usa el formato:\n`chi birthday MM / DD / YYYY` o `chi birthday MM / DD`')
        ]
      });
    }

    const birthdays = loadBirthdays();

    if (birthdays[userId]) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('birthday_yes').setLabel('Sí').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('birthday_no').setLabel('No').setStyle(ButtonStyle.Danger)
      );

      const reply = await message.reply({
        embeds: [
          makeEmbed('✧ cumpleaños', 'Ya tienes una fecha guardada. ¿Deseas reemplazarla?')
        ],
        components: [row]
      });

      const filter = i => (i.customId === 'birthday_yes' || i.customId === 'birthday_no') && i.user.id === userId;
      const collector = reply.createMessageComponentCollector({ filter, max: 1, time: 60 * 1000 });

      collector.on('collect', async interaction => {
        if (interaction.customId === 'birthday_no') {
          await interaction.update({
            embeds: [makeEmbed('✧ cumpleaños', 'Tu fecha guardada se mantuvo sin cambios.')],
            components: []
          });
          return;
        }

        delete birthdays[userId];
        saveBirthdays(birthdays);
        await deleteFromBackupChannel(interaction.client, userId);

        birthdays[userId] = { month: parsed.month, day: parsed.day, year: parsed.year };
        saveBirthdays(birthdays);
        await saveToBackupChannel(interaction.client, userId, parsed.month, parsed.day, parsed.year);

        await interaction.update({
          embeds: [
            makeEmbed('✧ cumpleaños actualizado', `Tu nueva fecha fue guardada:\n**${parsed.month}/${parsed.day}${parsed.year ? `/${parsed.year}` : ''}** 🎂`)
          ],
          components: []
        });
      });

      collector.on('end', collected => {
        if (!collected.size) {
          reply.edit({ components: [] }).catch(() => {});
        }
      });

      return;
    }

    birthdays[userId] = { month: parsed.month, day: parsed.day, year: parsed.year };
    saveBirthdays(birthdays);
    await saveToBackupChannel(message.client, userId, parsed.month, parsed.day, parsed.year);

    return message.reply({
      embeds: [
        makeEmbed('✧ cumpleaños guardado', `Tu fecha fue guardada correctamente:\n**${parsed.month}/${parsed.day}${parsed.year ? `/${parsed.year}` : ''}** 🎂`)
      ]
    });
  }
};
