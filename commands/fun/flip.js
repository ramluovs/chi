const { EmbedBuilder } = require('discord.js');

const BABY_BLUE = 0xaeefff;

function makeEmbed(description) {
  return new EmbedBuilder()
    .setColor(BABY_BLUE)
    .setDescription(description);
}

module.exports = {
  name: 'flip',
  aliases: ['coin', 'moneda'],
  async execute(message) {
    const flippingMsg = await message.reply({
      embeds: [
        makeEmbed('Lanzando la moneda... <a:coinmariobrosarcade:1500007371420860436>')
      ]
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const isHeads = Math.random() < 0.5;
    const resultBold = isHeads ? '**cara**' : '**cruz**';
    const speed = Math.floor(Math.random() * 150) + 50;
    const rotations = Math.floor(Math.random() * 8) + 3;

    await flippingMsg.edit({
      embeds: [
        makeEmbed(`La moneda giró a ${speed} km/h, dio ${rotations} vueltas en el aire y cayó en ${resultBold}.`)
      ]
    });

    const filter = m =>
      m.reference?.messageId === flippingMsg.id &&
      m.author.id === message.author.id &&
      /^(otra|otra vez|again)$/i.test(m.content.trim());

    const collector = message.channel.createMessageCollector({ filter, time: 60 * 1000 });

    collector.on('collect', async m => {
      const newResult = Math.random() < 0.5 ? '**cara**' : '**cruz**';
      const newSpeed = Math.floor(Math.random() * 150) + 50;
      const newRotations = Math.floor(Math.random() * 8) + 3;

      const newFlip = await m.reply({
        embeds: [
          makeEmbed('Lanzando la moneda... <a:coinmariobrosarcade:1500007371420860436>')
        ]
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      await newFlip.edit({
        embeds: [
          makeEmbed(`La moneda giró a ${newSpeed} km/h, dio ${newRotations} vueltas en el aire y cayó en ${newResult}.`)
        ]
      });
    });
  }
};
