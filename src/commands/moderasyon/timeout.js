const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../../config.json');
const logger = require('../../utils/logger.js');
const { parseDuration } = require('../../utils/time.js');
const { hasStaffPermission } = require('../../utils/permissions.js');
const { successEmbed, errorEmbed, createPenalLogEmbed, createRevokeLogEmbed, createEscalationLogEmbed } = require('../../utils/embeds.js');
const penalService = require('../../services/penalService.js');

if (!global.timedPenalties) global.timedPenalties = new Map();
const timedPenalties = global.timedPenalties;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Kullanıcıyı zaman aşımına uğratır (Timeout).')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option => 
            option.setName('kullanici')
                .setDescription('Timeout atılacak kullanıcı')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('sure')
                .setDescription('Süre (örn: 30dk, 1sa, 2g, 1h, 7d)')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('sebep')
                .setDescription('Timeout atılma sebebi')
                .setRequired(true)),

    async execute(interaction) {
        try {
            if (!hasStaffPermission(interaction.member, 'timeout')) {
                return interaction.reply({ embeds: [errorEmbed('Bu komutu kullanmak için gerekli yetkiye sahip değilsiniz.')], ephemeral: true });
            }

            const targetUser = interaction.options.getUser('kullanici');
            const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            const durationStr = interaction.options.getString('sure');
            const reason = interaction.options.getString('sebep');

            if (!targetMember) {
                return interaction.reply({ embeds: [errorEmbed('Kullanıcı sunucuda bulunamadı.')], ephemeral: true });
            }

            const durationMs = parseDuration(durationStr);
            if (!durationMs || durationMs > 2419200000) { // Max 28 days
                return interaction.reply({ embeds: [errorEmbed('Geçersiz süre formatı veya süre çok uzun (Maksimum 28 gün).')], ephemeral: true });
            }

            await targetMember.timeout(durationMs, reason);

            const expiresAt = new Date(Date.now() + durationMs);
            const points = config.penals?.timeout?.points || 0;
            
            const penalty = penalService.create({
                userId: targetUser.id,
                type: 'timeout',
                reason,
                staffId: interaction.user.id,
                points,
                duration: durationStr,
                expiresAt: expiresAt.toISOString()
            });

            const logChannelId = config.penals?.timeout?.log || config.channels?.ceza_log;
            const logChannel = interaction.guild.channels.cache.get(logChannelId);

            // Timeout süresi bittiğinde DB ceza kaydını güncelle ve logla
            const timer = setTimeout(async () => {
                penalService.revoke(penalty.id, interaction.client.user.id, 'Süre doldu (Otomatik)');
                timedPenalties.delete(`timeout_${targetUser.id}`);
                timedPenalties.delete(penalty.id);

                if (logChannel) {
                    const untimeoutEmbed = createRevokeLogEmbed({
                        targetUser,
                        staffUser: null,
                        type: 'timeout',
                        reason: 'Otomatik (Süre Doldu)',
                        penaltyId: penalty.id
                    });
                    await logChannel.send({ embeds: [untimeoutEmbed] }).catch(() => {});
                }
            }, durationMs);

            timedPenalties.set(`timeout_${targetUser.id}`, timer);
            timedPenalties.set(penalty.id, timer);

            const escalation = penalService.checkEscalation(targetUser.id, 'timeout');
            
            if (logChannel) {
                const logEmbed = createPenalLogEmbed({
                    targetUser,
                    staffUser: interaction.user,
                    type: 'timeout',
                    reason,
                    duration: durationStr,
                    expiresAt,
                    points,
                    penaltyId: penalty?.id
                });
                await logChannel.send({ embeds: [logEmbed] }).catch(err => logger.error('Log channel send error:', 'TIMEOUT', err));
            }

            if (escalation && escalation.triggered) {
                const escalationChannelId = config.channels?.eskalasyon_log;
                const escChannel = interaction.guild.channels.cache.get(escalationChannelId);
                if (escChannel) {
                    const escEmbed = createEscalationLogEmbed({
                        targetUser,
                        type: 'timeout',
                        count: escalation.count,
                        limit: escalation.limit,
                        nextAction: escalation.nextAction
                    });
                    await escChannel.send({ embeds: [escEmbed] }).catch(() => {});
                }
            }

            await interaction.reply({ embeds: [successEmbed(`<@${targetUser.id}> başarıyla ${durationStr} boyunca zaman aşımına uğratıldı.`)], ephemeral: true });
        } catch (error) {
            logger.error('Timeout command error:', error);
            await interaction.reply({ embeds: [errorEmbed('İşlem sırasında bir hata oluştu.')], ephemeral: true }).catch(() => {});
        }
    }
};
