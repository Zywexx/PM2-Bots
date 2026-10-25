const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, version: djsVersion } = require('discord.js');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { formatDuration } = require('../../utils/time');
const { db } = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bot_durum')
        .setDescription('Botun sistem, bellek, ping ve veritabanı durumunu gösterir.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            // Sistem metrikleri
            const uptime = formatDuration(interaction.client.uptime);
            const ping = interaction.client.ws.ping;
            const memoryUsage = process.memoryUsage();
            const ramMb = (memoryUsage.rss / 1024 / 1024).toFixed(2);
            const heapMb = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);

            // Veritabanı boyut metrikleri
            const dbPath = path.join(__dirname, '../../../database.db');
            let dbSize = '0 KB';
            if (fs.existsSync(dbPath)) {
                const stat = fs.statSync(dbPath);
                dbSize = stat.size > 1024 * 1024
                    ? `${(stat.size / (1024 * 1024)).toFixed(2)} MB`
                    : `${(stat.size / 1024).toFixed(2)} KB`;
            }

            // İstatistikler
            const totalRegistrations = db.prepare('SELECT COUNT(*) as count FROM registrations WHERE cancelled = 0').get()?.count || 0;
            const totalPenalties = db.prepare('SELECT COUNT(*) as count FROM penalties').get()?.count || 0;
            const activePenalties = db.prepare("SELECT COUNT(*) as count FROM penalties WHERE status = 'active'").get()?.count || 0;
            const pendingSyncs = db.prepare('SELECT COUNT(*) as count FROM registrations WHERE synced_to_findcord = 0 AND cancelled = 0').get()?.count || 0;

            const totalMembers = interaction.client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);

            const embed = new EmbedBuilder()
                .setTitle('🤖 Bot & Sistem Durumu')
                .setColor(ping < 100 ? '#00FF00' : ping < 250 ? '#FFA500' : '#FF0000')
                .setThumbnail(interaction.client.user.displayAvatarURL())
                .addFields(
                    { name: '⏱️ Uptime', value: uptime, inline: true },
                    { name: '📡 WebSocket Ping', value: `${ping} ms`, inline: true },
                    { name: '🧠 RAM Kullanımı', value: `${ramMb} MB (Heap: ${heapMb} MB)`, inline: true },
                    { name: '💾 Veritabanı Boyutu', value: dbSize, inline: true },
                    { name: '👥 Sunucular / Üyeler', value: `${interaction.client.guilds.cache.size} sunucu / ${totalMembers} üye`, inline: true },
                    { name: '⚙️ Çalışma Ortamı', value: `Node.js ${process.version} | D.js v${djsVersion}`, inline: true },
                    { name: '📝 Toplam Kayıt', value: `${totalRegistrations} üye`, inline: true },
                    { name: '⚖️ Cezalar (Aktif/Toplam)', value: `${activePenalties} / ${totalPenalties}`, inline: true },
                    { name: '⏳ Bekleyen Senkron', value: `${pendingSyncs} kayıt`, inline: true }
                )
                .setFooter({ text: '787 INC By Zywexx' })
                .setTimestamp();

            await interaction.followUp({ embeds: [embed] });
        } catch (error) {
            const { errorEmbed } = require('../../utils/embeds');
            await interaction.followUp({ embeds: [errorEmbed('Hata', `Durum bilgisi alınamadı: ${error.message}`)] });
        }
    }
};

