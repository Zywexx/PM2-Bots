const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kilit')
        .setDescription('Kanalı üyelerin mesaj gönderimine kapatır veya açar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addStringOption(option =>
            option.setName('durum')
                .setDescription('Kanalın kilit durumunu seçin')
                .setRequired(false)
                .addChoices(
                    { name: '🔒 Kilitle (Yazmayı Kapat)', value: 'kilitle' },
                    { name: '🔓 Kilidi Aç (Yazmayı Aç)', value: 'ac' }
                )
        )
        .addStringOption(option =>
            option.setName('sebep')
                .setDescription('Kanal kilitleme/açma sebebi')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const durum = interaction.options.getString('durum') || 'kilitle';
            const sebep = interaction.options.getString('sebep') || 'Belirtilmedi';
            const channel = interaction.channel;
            const everyoneRole = interaction.guild.roles.everyone;

            if (durum === 'kilitle') {
                await channel.permissionOverwrites.edit(everyoneRole, {
                    SendMessages: false
                }, { reason: `${interaction.user.tag}: ${sebep}` });

                const lockEmbed = new EmbedBuilder()
                    .setTitle('🔒 Kanal Kilitlendi')
                    .setColor('#ED4245')
                    .setDescription('Bu kanal yetkililer tarafından geçici olarak mesaj gönderimine kapatılmıştır.')
                    .addFields(
                        { name: '🛡️ Kilitleyen Yetkili', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '📝 Sebep', value: sebep, inline: true }
                    )
                    .setTimestamp();

                await channel.send({ embeds: [lockEmbed] });

                return interaction.reply({
                    embeds: [successEmbed('Kanal Kilitlendi', `Bu kanal başarıyla mesaj gönderimine kapatıldı.\nSebep: **${sebep}**`)],
                    ephemeral: true
                });
            } else {
                await channel.permissionOverwrites.edit(everyoneRole, {
                    SendMessages: null
                }, { reason: `${interaction.user.tag}: ${sebep}` });

                const unlockEmbed = new EmbedBuilder()
                    .setTitle('🔓 Kanal Kilidi Açıldı')
                    .setColor('#2ECC71')
                    .setDescription('Bu kanalın kilidi açılmıştır, artık mesaj gönderebilirsiniz.')
                    .addFields(
                        { name: '🛡️ Kilidi Açan Yetkili', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '📝 Sebep', value: sebep, inline: true }
                    )
                    .setTimestamp();

                await channel.send({ embeds: [unlockEmbed] });

                return interaction.reply({
                    embeds: [successEmbed('Kanal Açıldı', `Kanal kilidi başarıyla kaldırıldı.\nSebep: **${sebep}**`)],
                    ephemeral: true
                });
            }
        } catch (error) {
            logger.error(`Kilit komutunda hata: ${error.message}`, 'MODERASYON', error);
            return interaction.reply({
                embeds: [errorEmbed('Hata', `Kanal kilit durumu değiştirilirken bir hata oluştu: ${error.message}`)],
                ephemeral: true
            });
        }
    }
};
