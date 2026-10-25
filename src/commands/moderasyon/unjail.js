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
        .setName('unjail')
        .setDescription('Kullanıcının hapis cezasını kaldırır.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option => 
            option.setName('kullanici')
                .setDescription('Cezası kaldırılacak kullanıcı')
                .setRequired(true)),

    async execute(interaction) {
        try {
            if (!hasStaffPermission(interaction.member, 'jail')) {
                return interaction.reply({ embeds: [errorEmbed('Bu komutu kullanmak için gerekli yetkiye sahip değilsiniz.')], ephemeral: true });
            }

            const targetUser = interaction.options.getUser('kullanici');
            const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

            const jailRoles = (config.penals?.jail?.roles || []).map(r => String(r));
            if (targetMember && jailRoles.length > 0) {
                const existingRoles = jailRoles.filter(roleId => targetMember.roles.cache.has(roleId));
                if (existingRoles.length > 0) {
                    await targetMember.roles.remove(existingRoles).catch(err => logger.warn(`Jail rolü kaldırılamadı: ${err.message}`));
                }
            }

            const activePenalties = penalService.getByType(targetUser.id, 'jail');
            const activeJail = activePenalties.find(p => p.status === 'active');
            if (activeJail) {
                penalService.revoke(activeJail.id, interaction.user.id, 'Yetkili tarafından kaldırıldı');
                if (timedPenalties.has(activeJail.id)) {
                    clearTimeout(timedPenalties.get(activeJail.id));
                    timedPenalties.delete(activeJail.id);
                }
            }

            const timerKey = `jail_${targetUser.id}`;
            if (timedPenalties.has(timerKey)) {
                clearTimeout(timedPenalties.get(timerKey));
                timedPenalties.delete(timerKey);
            }

            const logChannelId = config.penals?.jail?.log || config.channels?.ceza_log;
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            
            if (logChannel) {
                const revokeEmbed = createRevokeLogEmbed({
                    targetUser,
                    staffUser: interaction.user,
                    type: 'jail',
                    reason: 'Yetkili tarafından kaldırıldı',
                    penaltyId: activeJail?.id
                });
                await logChannel.send({ embeds: [revokeEmbed] }).catch(err => logger.error('Log channel send error:', err));
            }

            await interaction.reply({ embeds: [successEmbed(`<@${targetUser.id}> kullanıcısının hapis cezası başarıyla kaldırıldı.`)], ephemeral: true });
        } catch (error) {
            logger.error('Unjail command error:', error);
            await interaction.reply({ embeds: [errorEmbed('İşlem sırasında bir hata oluştu.')], ephemeral: true }).catch(() => {});
        }
    }
};
