const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const config = require('../../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sunucu_bilgi')
        .setDescription('Sunucunun detaylı istatistik ve yapılandırma bilgilerini gösterir.'),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const guild = interaction.guild;
            await guild.members.fetch().catch(() => {});

            const owner = await guild.fetchOwner().catch(() => null);

            // Üye İstatistikleri
            const totalMembers = guild.memberCount;
            const botMembers = guild.members.cache.filter(m => m.user.bot).size;
            const humanMembers = totalMembers - botMembers;

            // Kanal İstatistikleri
            const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
            const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
            const categoryChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
            const totalChannels = textChannels + voiceChannels + categoryChannels;

            // Rol ve Emoji İstatistikleri
            const totalRoles = guild.roles.cache.size;
            const totalEmojis = guild.emojis.cache.size;
            const totalStickers = guild.stickers.cache.size;

            // Güvenlik Seviyesi
            const verificationLevels = {
                0: 'Yok (Sınırsız)',
                1: 'Düşük (E-posta doğrulaması)',
                2: 'Orta (5 dakikalık hesap)',
                3: 'Yüksek (10 dakikalık üyelik)',
                4: 'Çok Yüksek (Telefon doğrulaması)'
            };
            const verificationLevel = verificationLevels[guild.verificationLevel] || 'Bilinmiyor';

            // Boost Durumu
            const boostLevel = guild.premiumTier;
            const boostCount = guild.premiumSubscriptionCount || 0;

            const createdUnix = Math.floor(guild.createdTimestamp / 1000);

            const embed = new EmbedBuilder()
                .setTitle(`📊 ${guild.name} — Sunucu Bilgileri`)
                .setColor('#5865F2')
                .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
                .addFields(
                    {
                        name: '👑 Sunucu Sahibi',
                        value: owner ? `<@${owner.id}>\n\`${owner.user.tag || owner.user.username}\` (\`${owner.id}\`)` : 'Bilinmiyor',
                        inline: true
                    },
                    {
                        name: '🆔 Sunucu ID',
                        value: `\`${guild.id}\``,
                        inline: true
                    },
                    {
                        name: '📅 Kuruluş Tarihi',
                        value: `<t:${createdUnix}:F>\n*(<t:${createdUnix}:R>)*`,
                        inline: true
                    },
                    {
                        name: `👥 Üyeler (${totalMembers})`,
                        value: `👤 **İnsan:** ${humanMembers}\n🤖 **Bot:** ${botMembers}`,
                        inline: true
                    },
                    {
                        name: `💬 Kanallar (${totalChannels})`,
                        value: `💬 **Metin:** ${textChannels}\n🔊 **Ses:** ${voiceChannels}\n📁 **Kategori:** ${categoryChannels}`,
                        inline: true
                    },
                    {
                        name: '🚀 Takviye (Boost)',
                        value: `💎 **Seviye:** ${boostLevel}\n✨ **Takviye:** ${boostCount} adet`,
                        inline: true
                    },
                    {
                        name: '🛡️ Güvenlik Düzeyi',
                        value: `\`${verificationLevel}\``,
                        inline: true
                    },
                    {
                        name: '🎭 Roller & İfadeler',
                        value: `🏷️ **Roller:** ${totalRoles} adet\n😃 **Emojiler:** ${totalEmojis} adet\n🎨 **Çıkartmalar:** ${totalStickers} adet`,
                        inline: true
                    }
                )
                .setFooter({ text: config.footer || '787 INC By Zywexx' })
                .setTimestamp();

            if (guild.bannerURL()) {
                embed.setImage(guild.bannerURL({ size: 1024 }));
            }

            return interaction.followUp({ embeds: [embed] });
        } catch (error) {
            const { errorEmbed } = require('../../utils/embeds');
            if (interaction.replied || interaction.deferred) {
                return interaction.followUp({ embeds: [errorEmbed('Hata', `Sunucu bilgileri alınamadı: ${error.message}`)], ephemeral: true });
            } else {
                return interaction.reply({ embeds: [errorEmbed('Hata', `Sunucu bilgileri alınamadı: ${error.message}`)], ephemeral: true });
            }
        }
    }
};

