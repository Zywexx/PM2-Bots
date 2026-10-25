const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../../config.json');
const logger = require('../../utils/logger.js');
const { hasStaffPermission } = require('../../utils/permissions.js');
const { successEmbed, errorEmbed, createPenalLogEmbed, createEscalationLogEmbed } = require('../../utils/embeds.js');
const penalService = require('../../services/penalService.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kullanıcıyı sunucudan atar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(option => 
            option.setName('kullanici')
                .setDescription('Atılacak kullanıcı')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('sebep')
                .setDescription('Atılma sebebi')
                .setRequired(true)),

    async execute(interaction) {
        try {
            if (!hasStaffPermission(interaction.member, 'kick')) {
                return interaction.reply({ embeds: [errorEmbed('Bu komutu kullanmak için gerekli yetkiye sahip değilsiniz.')], ephemeral: true });
            }

            const targetUser = interaction.options.getUser('kullanici');
            const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            const reason = interaction.options.getString('sebep');

            if (!targetMember) {
                return interaction.reply({ embeds: [errorEmbed('Kullanıcı sunucuda bulunamadı.')], ephemeral: true });
            }

            if (!targetMember.kickable) {
                return interaction.reply({ embeds: [errorEmbed('Bu kullanıcıyı atamıyorum (yetkim yetersiz olabilir veya benden üstün).')], ephemeral: true });
            }

            await targetMember.kick(reason);

            const points = config.penals?.kick?.points || 0;
            const penalty = penalService.create({
                userId: targetUser.id,
                type: 'kick',
                reason,
                staffId: interaction.user.id,
                points,
                duration: null,
                expiresAt: null
            });

            const escalation = penalService.checkEscalation(targetUser.id, 'kick');

            const logChannelId = config.penals?.kick?.log || config.channels?.ceza_log;
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            
            if (logChannel) {
                const logEmbed = createPenalLogEmbed({
                    targetUser,
                    staffUser: interaction.user,
                    type: 'kick',
                    reason,
                    duration: 'Süresiz (Atılma)',
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
                        type: 'kick',
                        count: escalation.count,
                        limit: escalation.limit,
                        nextAction: escalation.nextAction
                    });
                    await escChannel.send({ embeds: [escEmbed] }).catch(() => {});
                }
            }

            await interaction.reply({ embeds: [successEmbed(`<@${targetUser.id}> başarıyla sunucudan atıldı.`)], ephemeral: true });
        } catch (error) {
            logger.error('Kick command error:', error);
            await interaction.reply({ embeds: [errorEmbed('İşlem sırasında bir hata oluştu.')], ephemeral: true }).catch(() => {});
        }
    }
};
