const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sil')
        .setDescription('Kanalda belirtilen miktarda mesajı toplu olarak siler.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(option =>
            option.setName('miktar')
                .setDescription('Silinecek mesaj sayısı (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        )
        .addUserOption(option =>
            option.setName('kullanici')
                .setDescription('Sadece bu kullanıcının mesajlarını sil')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('sadece_botlar')
                .setDescription('Sadece botların mesajlarını sil')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const amount = interaction.options.getInteger('miktar');
            const targetUser = interaction.options.getUser('kullanici');
            const botsOnly = interaction.options.getBoolean('sadece_botlar') || false;

            const channel = interaction.channel;
            if (!channel || !channel.bulkDelete) {
                return interaction.followUp({
                    embeds: [errorEmbed('Geçersiz Kanal', 'Bu kanalda mesaj silme işlemi gerçekleştirilemez.')]
                });
            }

            // Mesajları çek
            const messages = await channel.messages.fetch({ limit: amount });
            let filteredMessages = messages;

            if (targetUser) {
                filteredMessages = filteredMessages.filter(m => m.author.id === targetUser.id);
            }

            if (botsOnly) {
                filteredMessages = filteredMessages.filter(m => m.author.bot);
            }

            if (filteredMessages.size === 0) {
                return interaction.followUp({
                    embeds: [errorEmbed('Mesaj Bulunamadı', 'Belirtilen kriterlere uygun silinebilecek mesaj bulunamadı.')]
                });
            }

            const deleted = await channel.bulkDelete(filteredMessages, true);
            const count = deleted.size;

            let filterText = '';
            if (targetUser) filterText += ` (Kullanıcı: <@${targetUser.id}>)`;
            if (botsOnly) filterText += ` (Sadece Botlar)`;

            logger.info(`${interaction.user.tag} tarafından #${channel.name} kanalında ${count} mesaj silindi.${filterText}`, 'MODERASYON');

            return interaction.followUp({
                embeds: [successEmbed('Mesajlar Silindi', `Başarıyla **${count}** adet mesaj temizlendi.${filterText}\n*(14 günden eski mesajlar Discord politikası gereği silinemez)*`)]
            });
        } catch (error) {
            logger.error(`Sil komutunda hata: ${error.message}`, 'MODERASYON', error);
            return interaction.followUp({
                embeds: [errorEmbed('Hata', `Mesajlar silinirken bir hata oluştu: ${error.message}`)]
            });
        }
    }
};
