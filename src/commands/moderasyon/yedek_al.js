const { SlashCommandBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../../config.json');
const { createBackup } = require('../../services/backupService');
const { checkPermission } = require('../../utils/permissions');
const { successEmbed, errorEmbed, createBackupLogEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yedek_al')
        .setDescription('SQLite veritabanının anlık tam yedeğini alır.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addBooleanOption(option =>
            option.setName('dosyayi_gonder')
                .setDescription('Yedek dosyasını Discord mesajı ekinde gönderilsin mi?')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            // Yalnızca üst düzey yetkililer (kayit_sifirlama yetkisi veya Administrator)
            const hasPerm = await checkPermission(interaction, 'kayit_sifirlama');
            if (!hasPerm) return;

            await interaction.deferReply({ ephemeral: true });

            const result = createBackup();
            if (!result.success) {
                return interaction.followUp({ embeds: [errorEmbed('Yedekleme Başarısız', `Hata: ${result.error}`)] });
            }

            const sendFile = interaction.options.getBoolean('dosyayi_gonder') || false;
            const embed = createBackupLogEmbed({
                fileName: result.fileName,
                sizeKb: result.sizeKb,
                manual: true,
                staffUser: interaction.user
            });

            // Yedek log kanalına da bildirim gönder
            const logChannelId = config.channels?.yedek_log;
            if (logChannelId) {
                const logChan = interaction.guild.channels.cache.get(logChannelId);
                if (logChan) {
                    await logChan.send({ embeds: [embed] }).catch(() => {});
                }
            }

            const options = { embeds: [embed] };
            if (sendFile) {
                const attachment = new AttachmentBuilder(result.filePath, { name: result.fileName });
                options.files = [attachment];
            }

            await interaction.followUp(options);
        } catch (error) {
            await interaction.followUp({ embeds: [errorEmbed('Hata', `Yedekleme sırasında hata oluştu: ${error.message}`)] });
        }
    }
};
