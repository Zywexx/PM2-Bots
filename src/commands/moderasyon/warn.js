const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../../config.json');
const logger = require('../../utils/logger.js');
const { hasStaffPermission } = require('../../utils/permissions.js');
const { successEmbed, errorEmbed, createPenalLogEmbed, createEscalationLogEmbed } = require('../../utils/embeds.js');
const penalService = require('../../services/penalService.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Kullanıcıyı uyarır.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option => 
            option.setName('kullanici')
                .setDescription('Uyarılacak kullanıcı')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('sebep')
                .setDescription('Uyarı sebebi')
                .setRequired(true)),

    async execute(interaction) {
        try {
            if (!hasStaffPermission(interaction.member, 'warn')) {
                return interaction.reply({ embeds: [errorEmbed('Bu komutu kullanmak için gerekli yetkiye sahip değilsiniz.')], ephemeral: true });
            }

            const targetUser = interaction.options.getUser('kullanici');
            const reason = interaction.options.getString('sebep');

            const points = config.penals?.warn?.points || 0;
            const penalty = penalService.create({
                userId: targetUser.id,
                type: 'warn',
                reason,
                staffId: interaction.user.id,
                points,
                duration: null,
                expiresAt: null
            });

            const escalation = penalService.checkEscalation(targetUser.id, 'warn');

            const logChannelId = config.penals?.warn?.log || config.channels?.ceza_log;
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            
            if (logChannel) {
                const logEmbed = createPenalLogEmbed({
                    targetUser,
                    staffUser: interaction.user,
                    type: 'warn',
                    reason,
                    duration: 'Uyarı (Puan Eklendi)',
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
                        type: 'warn',
                        count: escalation.count,
                        limit: escalation.limit,
                        nextAction: escalation.nextAction
                    });
                    await escChannel.send({ embeds: [escEmbed] }).catch(() => {});
                }
            }

            await interaction.reply({ embeds: [successEmbed(`<@${targetUser.id}> başarıyla uyarıldı.`)], ephemeral: true });
        } catch (error) {
            logger.error('Warn command error:', error);
            await interaction.reply({ embeds: [errorEmbed('İşlem sırasında bir hata oluştu.')], ephemeral: true }).catch(() => {});
        }
    }
};
