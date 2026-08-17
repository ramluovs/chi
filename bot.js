const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
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

  // Schedule birthday checks
  const birthdayCommand = client.commands.get('birthday');
  if (birthdayCommand && typeof birthdayCommand.scheduleCheck === 'function') {
    birthdayCommand.scheduleCheck(client);
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

// ===== TERMUX ERROR PROTECTION =====
process.on('unhandledRejection', reason => console.error('[unhandledRejection]', reason));
process.on('uncaughtException', err => console.error('[uncaughtException]', err));

if (!process.env.TOKEN) {
  console.error('❌ Falta la variable de entorno TOKEN.');
  process.exit(1);
}

client.login(process.env.TOKEN);
