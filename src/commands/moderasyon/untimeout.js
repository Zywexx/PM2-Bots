const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../../config.json');
const logger = require('../../utils/logger.js');
const { hasStaffPermission } = require('../../utils/permissions.js');
const { successEmbed, errorEmbed, createRevokeLogEmbed } = require('../../utils/embeds.js');
const penalService = require('../../services/penalService.js');

if (!global.timedPenalties) global.timedPenalties = new Map();
const timedPenalties = global.timedPenalties;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('Kullanıcının zaman aşımı (timeout) cezasını kaldırır.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option => 
            option.setName('kullanici')
                .setDescription('Cezası kaldırılacak kullanıcı')
                .setRequired(true)),

    async execute(interaction) {
        try {
            if (!hasStaffPermission(interaction.member, 'timeout')) {
                return interaction.reply({ embeds: [errorEmbed('Bu komutu kullanmak için gerekli yetkiye sahip değilsiniz.')], ephemeral: true });
            }

            const targetUser = interaction.options.getUser('kullanici');
            const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

            if (targetMember) {
                await targetMember.timeout(null).catch(() => {});
            }

            const activePenalties = penalService.getByType(targetUser.id, 'timeout');
            const activeTimeout = activePenalties.find(p => p.status === 'active');
            if (activeTimeout) {
                penalService.revoke(activeTimeout.id, interaction.user.id, 'Yetkili tarafından kaldırıldı');
                if (timedPenalties.has(activeTimeout.id)) {
                    clearTimeout(timedPenalties.get(activeTimeout.id));
                    timedPenalties.delete(activeTimeout.id);
                }
            }

            const timerKey = `timeout_${targetUser.id}`;
            if (timedPenalties.has(timerKey)) {
                clearTimeout(timedPenalties.get(timerKey));
                timedPenalties.delete(timerKey);
            }

            const logChannelId = config.penals?.timeout?.log || config.channels?.ceza_log;
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            
            if (logChannel) {
                const revokeEmbed = createRevokeLogEmbed({
                    targetUser,
                    staffUser: interaction.user,
                    type: 'timeout',
                    reason: 'Yetkili tarafından kaldırıldı',
                    penaltyId: activeTimeout?.id
                });
                await logChannel.send({ embeds: [revokeEmbed] }).catch(err => logger.error('Log channel send error:', err));
            }

            await interaction.reply({ embeds: [successEmbed(`<@${targetUser.id}> kullanıcısının zaman aşımı cezası başarıyla kaldırıldı.`)], ephemeral: true });
        } catch (error) {
            logger.error('Untimeout command error:', error);
            await interaction.reply({ embeds: [errorEmbed('İşlem sırasında bir hata oluştu.')], ephemeral: true }).catch(() => {});
        }
    }
};
