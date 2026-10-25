const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../../config.json');
const logger = require('../../utils/logger.js');
const { formatDate, relativeTime, parseDuration, formatDuration } = require('../../utils/time.js');
const { hasStaffPermission } = require('../../utils/permissions.js');
const { successEmbed, errorEmbed, infoEmbed, warningEmbed, penaltyEmbed, createPenalLogEmbed, createEscalationLogEmbed } = require('../../utils/embeds.js');
const penalService = require('../../services/penalService.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Kullanıcıyı sunucudan yasaklar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(option => 
            option.setName('kullanici')
                .setDescription('Yasaklanacak kullanıcı')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('sebep')
                .setDescription('Yasaklanma sebebi')
                .setRequired(true)),

    async execute(interaction) {
        try {
            if (!hasStaffPermission(interaction.member, 'ban')) {
                return interaction.reply({ embeds: [errorEmbed('Bu komutu kullanmak için gerekli yetkiye sahip değilsiniz.')], ephemeral: true });
            }

            const targetUser = interaction.options.getUser('kullanici');
            const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            const reason = interaction.options.getString('sebep');

            if (targetMember && !targetMember.bannable) {
                return interaction.reply({ embeds: [errorEmbed('Bu kullanıcıyı yasaklayamıyorum (yetkim yetersiz olabilir veya benden üstün).')], ephemeral: true });
            }

            await interaction.guild.members.ban(targetUser.id, { reason });

            const points = config.penals?.ban?.points || 0;
            const penalty = penalService.create({
                userId: targetUser.id,
                type: 'ban',
                reason,
                staffId: interaction.user.id,
                points,
                duration: null,
                expiresAt: null
            });

            const escalation = penalService.checkEscalation(targetUser.id, 'ban');

            const logChannelId = config.penals?.ban?.log || config.channels?.ceza_log;
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            
            if (logChannel) {
                const logEmbed = createPenalLogEmbed({
                    targetUser,
                    staffUser: interaction.user,
                    type: 'ban',
                    reason,
                    duration: 'Süresiz',
                    expiresAt: null,
                    points,
                    penaltyId: penalty?.id
                });
                await logChannel.send({ embeds: [logEmbed] }).catch(err => logger.error('Log channel send error:', err));
            }

            if (escalation && escalation.triggered) {
                const escalationChannelId = config.channels?.eskalasyon_log;
                const escChannel = interaction.guild.channels.cache.get(escalationChannelId);
                if (escChannel) {
                    const escEmbed = createEscalationLogEmbed({
                        targetUser,
                        type: 'ban',
                        count: escalation.count,
                        limit: escalation.limit,
                        nextAction: escalation.nextAction
                    });
                    await escChannel.send({ embeds: [escEmbed] }).catch(() => {});
                }
            }

            await interaction.reply({ embeds: [successEmbed(`<@${targetUser.id}> başarıyla sunucudan yasaklandı.`)], ephemeral: true });
        } catch (error) {
            logger.error('Ban command error:', error);
            await interaction.reply({ embeds: [errorEmbed('İşlem sırasında bir hata oluştu.')], ephemeral: true }).catch(() => {});
        }
    }
};
