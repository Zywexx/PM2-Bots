const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yavasmod')
        .setDescription('Kanal için yavaş mod (slowmode) süresini ayarlar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addIntegerOption(option =>
            option.setName('sure')
                .setDescription('Yavaş mod süresi (Saniye cinsinden: 0 = Kapalı)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(21600)
                .addChoices(
                    { name: 'Kapat (0 saniye)', value: 0 },
                    { name: '5 saniye', value: 5 },
                    { name: '10 saniye', value: 10 },
                    { name: '15 saniye', value: 15 },
                    { name: '30 saniye', value: 30 },
                    { name: '1 dakika (60s)', value: 60 },
                    { name: '2 dakika (120s)', value: 120 },
                    { name: '5 dakika (300s)', value: 300 },
                    { name: '10 dakika (600s)', value: 600 },
                    { name: '1 saat (3600s)', value: 3600 },
                    { name: '6 saat (21600s)', value: 21600 }
                )
        )
        .addStringOption(option =>
            option.setName('sebep')
                .setDescription('Yavaş mod uygulama sebebi')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const seconds = interaction.options.getInteger('sure');
            const sebep = interaction.options.getString('sebep') || 'Belirtilmedi';
            const channel = interaction.channel;

            if (!channel || !channel.setRateLimitPerUser) {
                return interaction.reply({
                    embeds: [errorEmbed('Geçersiz Kanal', 'Bu kanalda yavaş mod ayarlanamaz.')],
                    ephemeral: true
                });
            }

            await channel.setRateLimitPerUser(seconds, `${interaction.user.tag}: ${sebep}`);

            if (seconds === 0) {
                return interaction.reply({
                    embeds: [successEmbed('Yavaş Mod Kapatıldı', `Bu kanaldaki yavaş mod başarıyla kaldırıldı.\nSebep: **${sebep}**`)],
                    ephemeral: true
                });
            } else {
                return interaction.reply({
                    embeds: [successEmbed('Yavaş Mod Ayarlandı', `Kanal yavaş modu başarıyla **${seconds}** saniye olarak ayarlandı.\nSebep: **${sebep}**`)],
                    ephemeral: true
                });
            }
        } catch (error) {
            logger.error(`Yavasmod komutunda hata: ${error.message}`, 'MODERASYON', error);
            return interaction.reply({
                embeds: [errorEmbed('Hata', `Yavaş mod ayarlanırken bir hata oluştu: ${error.message}`)],
                ephemeral: true
            });
        }
    }
};
