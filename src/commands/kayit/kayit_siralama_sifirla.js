const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db.js');
const logger = require('../../utils/logger.js');
const { getWeeklyKey, getMonthlyKey } = require('../../utils/time.js');
const { checkPermission } = require('../../utils/permissions.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kayit_siralama_sifirla')
        .setDescription('Belirli bir kullanıcının kayıt sıralama istatistiğini sıfırlar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(option => 
            option.setName('tur')
                .setDescription('Sıfırlanacak sıralama türü')
                .setRequired(true)
                .addChoices(
                    { name: 'Haftalık', value: 'haftalik' },
                    { name: 'Aylık', value: 'aylik' }
                )
        )
        .addUserOption(option => 
            option.setName('kullanici')
                .setDescription('İstatistiği sıfırlanacak kullanıcı')
                .setRequired(true)
        ),
    async execute(interaction) {
        try {
            if (!(await checkPermission(interaction, 'kayit_sifirlama'))) {
                return;
            }

            const tur = interaction.options.getString('tur');
            const kullanici = interaction.options.getUser('kullanici');
            const now = new Date();
            
            const isWeekly = tur === 'haftalik';
            const periodType = isWeekly ? 'weekly' : 'monthly';
            const periodKey = isWeekly ? getWeeklyKey(now) : getMonthlyKey(now);
            const titleStr = isWeekly ? 'Haftalık' : 'Aylık';

            const config = require('../../../config.json');
            const stmt = db.prepare('UPDATE registration_stats SET count = 0 WHERE staff_id = ? AND period_type = ? AND period_key = ?');
            const result = stmt.run(kullanici.id, periodType, periodKey);

            if (result.changes === 0) {
                await interaction.reply({ embeds: [successEmbed(`${kullanici} adlı kullanıcının mevcut dönemde zaten kayıt istatistiği bulunmuyor.`)], ephemeral: true });
            } else {
                const logChannelId = config.channels?.kayit_log;
                if (logChannelId) {
                    const logChan = interaction.guild.channels.cache.get(logChannelId);
                    if (logChan) {
                        const { EmbedBuilder } = require('discord.js');
                        const logEmbed = new EmbedBuilder()
                            .setTitle('📊 Kayıt İstatistikleri Sıfırlandı')
                            .setColor('#FFA500')
                            .addFields(
                                { name: '👤 Hedef Yetkili', value: `<@${kullanici.id}> (\`${kullanici.id}\`)`, inline: true },
                                { name: '🛡️ Sıfırlayan', value: `<@${interaction.user.id}> (\`${interaction.user.id}\`)`, inline: true },
                                { name: '📅 Dönem', value: `${titleStr} (\`${periodKey}\`)`, inline: true }
                            )
                            .setFooter({ text: '787 INC By Zywexx' })
                            .setTimestamp();
                        await logChan.send({ embeds: [logEmbed] }).catch(() => {});
                    }
                }

                await interaction.reply({ embeds: [successEmbed(`${kullanici} adlı kullanıcının ${titleStr} (${periodKey}) kayıt istatistikleri sıfırlandı.`)], ephemeral: false });
            }
        } catch (error) {
            logger.error(`Kayit siralama sifirla command error: ${error.message}`);
            await interaction.reply({ embeds: [errorEmbed('Kayıt sıralaması sıfırlanırken bir hata oluştu.')], ephemeral: true });
        }
    }
};

