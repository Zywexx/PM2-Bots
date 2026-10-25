const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db.js');
const logger = require('../../utils/logger.js');
const { getWeeklyKey, getMonthlyKey } = require('../../utils/time.js');
const { errorEmbed, infoEmbed } = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kayit_siralama')
        .setDescription('Kayıt yapan yetkililerin sıralamasını gösterir.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
        .addStringOption(option => 
            option.setName('tur')
                .setDescription('Sıralama türü')
                .setRequired(true)
                .addChoices(
                    { name: 'Haftalık', value: 'haftalik' },
                    { name: 'Aylık', value: 'aylik' },
                    { name: 'Kendin', value: 'kendin' }
                )
        ),
    async execute(interaction) {
        try {
            const tur = interaction.options.getString('tur');
            const now = new Date();
            const weeklyKey = getWeeklyKey(now);
            const monthlyKey = getMonthlyKey(now);

            if (tur === 'kendin') {
                const weeklyStats = db.prepare('SELECT count, (SELECT COUNT(*) + 1 FROM registration_stats r2 WHERE r2.period_type = ? AND r2.period_key = ? AND r2.count > r1.count) as rank FROM registration_stats r1 WHERE staff_id = ? AND period_type = ? AND period_key = ?').get('weekly', weeklyKey, interaction.user.id, 'weekly', weeklyKey);
                
                const monthlyStats = db.prepare('SELECT count, (SELECT COUNT(*) + 1 FROM registration_stats r2 WHERE r2.period_type = ? AND r2.period_key = ? AND r2.count > r1.count) as rank FROM registration_stats r1 WHERE staff_id = ? AND period_type = ? AND period_key = ?').get('monthly', monthlyKey, interaction.user.id, 'monthly', monthlyKey);

                const wCount = weeklyStats ? weeklyStats.count : 0;
                const wRank = weeklyStats ? weeklyStats.rank : '-';
                
                const mCount = monthlyStats ? monthlyStats.count : 0;
                const mRank = monthlyStats ? monthlyStats.rank : '-';

                const embed = infoEmbed(`👤 Kendi Kayıt İstatistiklerin`)
                    .addFields(
                        { name: 'Haftalık Kayıt', value: `${wCount} kayıt (Sıra: #${wRank})`, inline: false },
                        { name: 'Aylık Kayıt', value: `${mCount} kayıt (Sıra: #${mRank})`, inline: false }
                    );

                return interaction.reply({ embeds: [embed] });
            } else {
                const isWeekly = tur === 'haftalik';
                const periodType = isWeekly ? 'weekly' : 'monthly';
                const periodKey = isWeekly ? weeklyKey : monthlyKey;
                const titleStr = isWeekly ? 'Haftalık' : 'Aylık';

                const topList = db.prepare(`SELECT staff_id, count FROM registration_stats WHERE period_type = ? AND period_key = ? ORDER BY count DESC LIMIT 10`).all(periodType, periodKey);
                
                const ownStat = db.prepare(`SELECT count, (SELECT COUNT(*) + 1 FROM registration_stats r2 WHERE r2.period_type = ? AND r2.period_key = ? AND r2.count > r1.count) as rank FROM registration_stats r1 WHERE staff_id = ? AND period_type = ? AND period_key = ?`).get(periodType, periodKey, interaction.user.id, periodType, periodKey);

                let listDesc = `Dönem: ${periodKey}\n\n`;
                if (topList.length === 0) {
                    listDesc += 'Henüz kayıt istatistiği bulunmuyor.';
                } else {
                    topList.forEach((stat, index) => {
                        listDesc += `${index + 1}. <@${stat.staff_id}> - ${stat.count} kayıt\n`;
                    });
                }

                if (ownStat) {
                    listDesc += `\n---\n📍 Senin sıran: #${ownStat.rank} (${ownStat.count} kayıt)`;
                } else {
                    listDesc += `\n---\n📍 Senin sıran: Yok (0 kayıt)`;
                }

                const embed = infoEmbed(`🏆 KAYIT SIRALAMASI (${titleStr})`)
                    .setDescription(listDesc);

                return interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            logger.error(`Kayit siralama command error: ${error.message}`);
            await interaction.reply({ embeds: [errorEmbed('Sıralama getirilirken bir hata oluştu.')], ephemeral: true });
        }
    }
};
