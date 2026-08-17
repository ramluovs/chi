const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const PASTEL_BLUE = 0xaeefff;

module.exports = {
  name: 'tictactoe',
  aliases: ['ttt'],
  description: 'Juega una partida de tres en raya contra otro usuario.',
  async execute(message, args, client) {
    const challenger = message.author;
    const opponent = message.mentions.users.first();

    if (!opponent) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(PASTEL_BLUE).setTitle('error').setDescription('Debes etiquetar a alguien para jugar. Ejemplo: `chi tictactoe @usuario`')]
      });
    }

    if (opponent.id === challenger.id) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(PASTEL_BLUE).setTitle('error').setDescription('No puedes jugar contra ti mismo.')]
      });
    }

    if (opponent.bot) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(PASTEL_BLUE).setTitle('error').setDescription('No puedes jugar contra un bot.')]
      });
    }

    const players = Math.random() < 0.5
      ? { X: challenger, O: opponent }
      : { X: opponent, O: challenger };

    let currentTurn = 'X';
    const board = Array(9).fill(null);

    const WIN_COMBOS = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];

    function checkWinner(b) {
      for (const [a, c, d] of WIN_COMBOS) {
        if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
      }
      return null;
    }

    function buildRows(disabled = false) {
      const rows = [];
      for (let r = 0; r < 3; r++) {
        const row = new ActionRowBuilder();
        for (let c = 0; c < 3; c++) {
          const idx = r * 3 + c;
          const val = board[idx];
          const btn = new ButtonBuilder()
            .setCustomId(`ttt_${idx}`)
            .setLabel(val || '\u200b')
            .setStyle(val === 'X' ? ButtonStyle.Danger : val === 'O' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setDisabled(disabled || val !== null);
          row.addComponents(btn);
        }
        rows.push(row);
      }
      return rows;
    }

    const expiresAt = Math.floor((Date.now() + 3 * 60 * 1000) / 1000);

    const gameMsg = await message.reply({
      content: `<@${challenger.id}> vs <@${opponent.id}>`,
      embeds: [
        new EmbedBuilder()
          .setColor(PASTEL_BLUE)
          .setTitle('Tic Tac Toe')
          .setDescription(`¡Es el turno de <@${players[currentTurn].id}>!\n\nExpira: <t:${expiresAt}:T>`)
      ],
      components: buildRows()
    });

    const filter = i =>
      i.customId.startsWith('ttt_') &&
      (i.user.id === players.X.id || i.user.id === players.O.id);

    const collector = gameMsg.createMessageComponentCollector({ filter, time: 3 * 60 * 1000 });

    collector.on('collect', async interaction => {
      try {
        const currentPlayer = players[currentTurn];
        if (interaction.user.id !== currentPlayer.id) {
          return interaction.reply({ content: 'No es tu turno.', ephemeral: true });
        }

        const idx = parseInt(interaction.customId.replace('ttt_', ''));
        if (board[idx]) {
          return interaction.reply({ content: 'Esa casilla ya está ocupada.', ephemeral: true });
        }

        board[idx] = currentTurn;
        const winner = checkWinner(board);
        const isDraw = !winner && board.every(c => c !== null);

        if (winner || isDraw) {
          collector.stop('done');

          let resultText = '';
          if (isDraw) {
            resultText = '¡Empate!';
          } else {
            const winnerUser = players[winner];
            const loserUser = players[winner === 'X' ? 'O' : 'X'];
            const winEmojis = ['<:right3:1499652025129111572>', '<a:right2:1499651329570897982>', '<a:right1:1499651327016439819>', '<a:first:1499651324600651877>'];
            const loseEmojis = ['<a:wrong2:1499651340664705084>', '<a:wrong1:1499651337170718792>', '<a:wrong3:1499651342992408596>'];
            const winEmoji = winEmojis[Math.floor(Math.random() * winEmojis.length)];
            const loseEmoji = loseEmojis[Math.floor(Math.random() * loseEmojis.length)];
            resultText = `<@${winnerUser.id}> ganó ${winEmoji}\n<@${loserUser.id}> perdió ${loseEmoji}`;
          }

          return interaction.update({
            content: `<@${challenger.id}> vs <@${opponent.id}>`,
            embeds: [
              new EmbedBuilder()
                .setColor(PASTEL_BLUE)
                .setTitle('Tic Tac Toe')
                .setDescription(resultText)
            ],
            components: buildRows(true)
          });
        }

        currentTurn = currentTurn === 'X' ? 'O' : 'X';

        return interaction.update({
          content: `<@${challenger.id}> vs <@${opponent.id}>`,
          embeds: [
            new EmbedBuilder()
              .setColor(PASTEL_BLUE)
              .setTitle('Tic Tac Toe')
              .setDescription(`¡Es el turno de <@${players[currentTurn].id}>!\n\nExpira: <t:${expiresAt}:T>`)
          ],
          components: buildRows()
        });
      } catch (error) {
        console.error('TicTacToe error:', error);
        await interaction.reply({ content: 'Algo salió mal.', ephemeral: true }).catch(() => {});
      }
    });

    collector.on('end', (_, reason) => {
      try {
        if (reason !== 'done') {
          gameMsg.edit({
            embeds: [
              new EmbedBuilder()
                .setColor(PASTEL_BLUE)
                .setTitle('Tic Tac Toe')
                .setDescription('El juego expiró por inactividad.')
            ],
            components: buildRows(true)
          }).catch(() => {});
        }
      } catch (error) {
        console.error('TicTacToe end error:', error);
      }
    });
  }
};
