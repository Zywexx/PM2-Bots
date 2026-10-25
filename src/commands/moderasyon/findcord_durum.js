const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const findcordService = require('../../services/findcordService');
const { errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('findcord_durum')
        .setDescription('Findcord API bağlantısını kontrol eder.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            // API Sağlık / Bağlantı Testi
            const startTime = Date.now();
            let apiStatus = '🟢 Erişilebilir';
            let apiLatency = '0 ms';
            
            try {
                // Test amaçlı bot kullanıcısını sorgulamayı dener
                const testRes = await findcordService.getUser(interaction.client.user.id);
                apiLatency = `${Date.now() - startTime} ms`;
                if (!testRes.success && testRes.error && testRes.error.includes && testRes.error.includes('ECONNREFUSED')) {
                    apiStatus = '🔴 Bağlantı Reddedildi (Sunucu Kapalı)';
                }
            } catch (e) {
                apiStatus = `🟠 Hata (${e.message})`;
                apiLatency = `${Date.now() - startTime} ms`;
            }

            const embed = new EmbedBuilder()
                .setTitle('🌐 Findcord API Durumu')
                .setColor('#0099FF')
                .addFields(
                    { name: '🔌 API Durumu', value: apiStatus, inline: true },
                    { name: '⚡ API Gecikmesi', value: apiLatency, inline: true },
                    { name: '🌐 Base URL', value: `\`${process.env.FINDCORD_BASE_URL || 'https://app.findcord.com/v1 (Varsayılan)'}\``, inline: false }
                )
                .setFooter({ text: 'Findcord API Takipçisi' })
                .setTimestamp();

            await interaction.followUp({ embeds: [embed] });
        } catch (error) {
            await interaction.followUp({ embeds: [errorEmbed('Hata', `Findcord durumu sorgulanamadı: ${error.message}`)] });
        }
    }
};
