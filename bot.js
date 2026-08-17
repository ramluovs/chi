const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const BABY_BLUE = 0xaeefff;
const LOG_CHANNEL_ID = '1340867275351261335';
const ADMIN_ROLE_ID = '1340864854243803248';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildInvites // Needed to detect invite creation
  ]
});

client.commands = new Collection();
client.aliases = new Collection();

// Dynamically read commands from all subfolders inside /commands
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const categories = fs.readdirSync(commandsPath);

  for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
      const command = require(path.join(categoryPath, file));
      const commandName = (command.name || file.replace('.js', '')).toLowerCase();
      
      client.commands.set(commandName, command);
      
      if (command.aliases && Array.isArray(command.aliases)) {
        command.aliases.forEach(alias => {
          client.aliases.set(alias.toLowerCase(), commandName);
        });
      }
    }
  }
}

// ===== READY =====
client.once('clientReady', () => {
  console.log(`✅ CHI is online as ${client.user.tag}`);

  const birthdayCommand = client.commands.get('birthday');
  if (birthdayCommand && typeof birthdayCommand.scheduleCheck === 'function') {
    birthdayCommand.scheduleCheck(client);
  }
});

// ===== INTERCEPT NON-BOT MANUAL INVITES =====
client.on('inviteCreate', async invite => {
  // If the invite was created by CHI, let it pass
  if (invite.inviter?.id === client.user.id) return;

  try {
    // 1. Delete the unauthorized invite
    await invite.delete('Invitación manual no permitida (debe usarse CHI)').catch(() => {});

    // 2. Fetch the notification log channel
    const logChannel = await invite.guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (!logChannel || !logChannel.isTextBased()) return;

    const inviterId = invite.inviter?.id;
    const inviterMention = inviterId ? `<@${inviterId}>` : 'Usuario desconocido';

    const embed = new EmbedBuilder()
      .setColor(BABY_BLUE)
      .setTitle('✧ invitación no autorizada eliminada')
      .setDescription(
        `Intentaste crear una invitación manualmente sin usar **CHI**.\n\n` +
        `El enlace generado ha sido eliminado automáticamente.\n` +
        `Para crear invitaciones válidas de 1 solo uso o 30 minutos de duración, usa:\n` +
        `> \`chi invite\`, \`chi inv\` o \`chi invitar\``
      );

    // Tags user and admin role outside the embed so they receive the actual ping
    await logChannel.send({
      content: `${inviterMention} <@&${ADMIN_ROLE_ID}>`,
      embeds: [embed]
    });
  } catch (err) {
    console.error('Error al interceptar invitación manual:', err);
  }
});

// ===== MESSAGE HANDLER =====
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const content = message.content.trim();
  const prefix = 'chi ';
  if (!content.toLowerCase().startsWith(prefix)) return;

  const args = content.slice(prefix.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName) || client.commands.get(client.aliases.get(commandName));
  if (!command) return;

  try {
    await command.execute(message, args, client);
  } catch (err) {
    console.error(`[Command: ${commandName}] Error:`, err);
    await message.reply('⚠️ Ocurrió un error inesperado al ejecutar ese comando.').catch(() => {});
  }
});

// ===== TERMUX ERROR HANDLING =====
process.on('unhandledRejection', reason => console.error('[unhandledRejection]', reason));
process.on('uncaughtException', err => console.error('[uncaughtException]', err));

if (!process.env.TOKEN) {
  console.error('❌ Falta la variable de entorno TOKEN.');
  process.exit(1);
}

client.login(process.env.TOKEN);
