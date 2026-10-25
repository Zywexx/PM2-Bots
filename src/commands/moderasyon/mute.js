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
        .setName('mute')
        .setDescription('Kullanıcıyı metin/ses kanallarında susturur.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option => 
            option.setName('kullanici')
                .setDescription('Susturulacak kullanıcı')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('sure')
                .setDescription('Süre (örn: 30dk, 1sa, 2g, 1h, 7d)')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('sebep')
                .setDescription('Susturulma sebebi')
                .setRequired(true)),

    async execute(interaction) {
        try {
            if (!hasStaffPermission(interaction.member, 'mute')) {
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
            if (!durationMs) {
                return interaction.reply({ embeds: [errorEmbed('Geçersiz süre formatı.')], ephemeral: true });
            }

            const muteRoles = (config.penals?.mute?.roles || []).map(r => String(r));
            const validRoles = muteRoles.filter(roleId => interaction.guild.roles.cache.has(roleId));
            if (validRoles.length === 0) {
                return interaction.reply({
                    embeds: [errorEmbed('Mute Rolü Bulunamadı', 'Sunucuda geçerli bir Mute rolü bulunamadı. Lütfen config.json dosyasındaki rol ID\'sini kontrol edin.')],
                    ephemeral: true
                });
            }

            await targetMember.roles.add(validRoles).catch(err => {
                logger.error(`Mute rolü verilemedi: ${err.message}`, 'MUTE');
            });

            const expiresAt = new Date(Date.now() + durationMs);
            const points = config.penals?.mute?.points || 0;
            
            const penalty = penalService.create({
                userId: targetUser.id,
                type: 'mute',
                reason,
                staffId: interaction.user.id,
                points,
                duration: durationStr,
                expiresAt: expiresAt.toISOString()
            });

            const logChannelId = config.penals?.mute?.log || config.channels?.ceza_log;
            const logChannel = interaction.guild.channels.cache.get(logChannelId);

            // Set timeout for auto-unmute
            const timer = setTimeout(async () => {
                const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
                if (member) await member.roles.remove(muteRoles).catch(() => {});
                penalService.revoke(penalty.id, interaction.client.user.id, 'Süre doldu');
                timedPenalties.delete(`mute_${targetUser.id}`);
                timedPenalties.delete(penalty.id);

                if (logChannel) {
                    const unmuteEmbed = createRevokeLogEmbed({
                        targetUser,
                        staffUser: null,
                        type: 'mute',
                        reason: 'Otomatik (Süre Doldu)',
                        penaltyId: penalty.id
                    });
                    await logChannel.send({ embeds: [unmuteEmbed] }).catch(() => {});
                }
            }, durationMs);
            
            timedPenalties.set(`mute_${targetUser.id}`, timer);
            timedPenalties.set(penalty.id, timer);

            const escalation = penalService.checkEscalation(targetUser.id, 'mute');
            
            if (logChannel) {
                const logEmbed = createPenalLogEmbed({
                    targetUser,
                    staffUser: interaction.user,
                    type: 'mute',
                    reason,
                    duration: durationStr,
                    expiresAt,
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
                        type: 'mute',
                        count: escalation.count,
                        limit: escalation.limit,
                        nextAction: escalation.nextAction
                    });
                    await escChannel.send({ embeds: [escEmbed] }).catch(() => {});
                }
            }

            await interaction.reply({ embeds: [successEmbed(`<@${targetUser.id}> başarıyla ${durationStr} boyunca susturuldu.`)], ephemeral: true });
        } catch (error) {
            logger.error('Mute command error:', error);
            await interaction.reply({ embeds: [errorEmbed('İşlem sırasında bir hata oluştu.')], ephemeral: true }).catch(() => {});
        }
    }
};
