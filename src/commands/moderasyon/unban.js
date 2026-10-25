const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../../config.json');
const logger = require('../../utils/logger.js');
const { hasStaffPermission } = require('../../utils/permissions.js');
const { successEmbed, errorEmbed, createRevokeLogEmbed } = require('../../utils/embeds.js');
const penalService = require('../../services/penalService.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Kullanıcının yasaklamasını kaldırır.')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption(option => 
            option.setName('kullanici_id')
                .setDescription('Yasağı kaldırılacak kullanıcı IDsi')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('sebep')
                .setDescription('Yasağın kaldırılma sebebi')
                .setRequired(false)),

    async execute(interaction) {
        try {
            if (!hasStaffPermission(interaction.member, 'ban')) {
                return interaction.reply({ embeds: [errorEmbed('Bu komutu kullanmak için gerekli yetkiye sahip değilsiniz.')], ephemeral: true });
            }

            const targetUserId = interaction.options.getString('kullanici_id');
            const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';

            try {
                await interaction.guild.members.unban(targetUserId, reason);
            } catch (err) {
                return interaction.reply({ embeds: [errorEmbed('Kullanıcı yasaklı değil veya ID geçersiz.')], ephemeral: true });
            }

            const activePenalties = penalService.getByType(targetUserId, 'ban');
            const activeBan = activePenalties.find(p => p.status === 'active');
            if (activeBan) {
                penalService.revoke(activeBan.id, interaction.user.id, reason);
            }

            const logChannelId = config.penals?.ban?.log || config.channels?.ceza_log;
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            
            if (logChannel) {
                const revokeEmbed = createRevokeLogEmbed({
                    targetUser: { id: targetUserId },
                    staffUser: interaction.user,
                    type: 'ban',
                    reason,
                    penaltyId: activeBan?.id
                });
                await logChannel.send({ embeds: [revokeEmbed] }).catch(err => logger.error('Log channel send error:', err));
            }

            await interaction.reply({ embeds: [successEmbed(`<@${targetUserId}> kullanıcısının yasağı başarıyla kaldırıldı.`)], ephemeral: true });
        } catch (error) {
            logger.error('Unban command error:', error);
            await interaction.reply({ embeds: [errorEmbed('İşlem sırasında bir hata oluştu.')], ephemeral: true }).catch(() => {});
        }
    }
};
