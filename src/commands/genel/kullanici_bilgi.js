const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../../config.json');
const registrationService = require('../../services/registrationService');
const penalService = require('../../services/penalService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kullanici_bilgi')
        .setDescription('Kullanıcı hakkında ayrıntılı profil ve sunucu bilgilerini gösterir.')
        .addUserOption(option =>
            option.setName('kullanici')
                .setDescription('Bilgileri görüntülenecek kullanıcı (Varsayılan: Kendiniz)')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const targetUser = interaction.options.getUser('kullanici') || interaction.user;
            const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

            const createdUnix = Math.floor(targetUser.createdTimestamp / 1000);
            const joinedUnix = member ? Math.floor(member.joinedTimestamp / 1000) : null;

            // Roller (everyone hariç)
            let rolesString = 'Rolü yok';
            let highestRole = 'Yok';
            if (member) {
                const roles = member.roles.cache
                    .filter(r => r.id !== interaction.guild.id)
                    .sort((a, b) => b.position - a.position);

                highestRole = member.roles.highest.id !== interaction.guild.id ? `<@&${member.roles.highest.id}>` : 'Yok';

                if (roles.size > 0) {
                    const roleList = roles.map(r => `<@&${r.id}>`);
                    if (roleList.length > 10) {
                        rolesString = roleList.slice(0, 10).join(', ') + ` *(+${roleList.length - 10} rol daha)*`;
                    } else {
                        rolesString = roleList.join(', ');
                    }
                }
            }

            // Önemli Yetki Rozetleri
            const badges = [];
            if (targetUser.bot) badges.push('🤖 **Bot Hesabı**');
            if (interaction.guild.ownerId === targetUser.id) badges.push('👑 **Sunucu Sahibi**');
            if (member?.permissions.has('Administrator')) badges.push('⚡ **Yönetici (Admin)**');
            else {
                if (member?.permissions.has('BanMembers')) badges.push('🔨 **Üyeleri Yasaklayabilir**');
                if (member?.permissions.has('KickMembers')) badges.push('👢 **Üyeleri Atabilir**');
                if (member?.permissions.has('ManageChannels')) badges.push('📁 **Kanalları Yönetebilir**');
                if (member?.permissions.has('ManageRoles')) badges.push('🏷️ **Rolleri Yönetebilir**');
            }

            const embed = new EmbedBuilder()
                .setTitle(`👤 ${targetUser.tag || targetUser.username} — Profil Bilgisi`)
                .setColor(member?.displayHexColor && member.displayHexColor !== '#000000' ? member.displayHexColor : '#5865F2')
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
                .addFields(
                    {
                        name: '👤 Kullanıcı & Takma Ad',
                        value: `${member ? member : `<@${targetUser.id}>`}\n🏷️ Takma Ad: \`${member?.nickname || 'Yok'}\``,
                        inline: true
                    },
                    {
                        name: '🆔 Discord ID',
                        value: `\`${targetUser.id}\``,
                        inline: true
                    },
                    {
                        name: '📅 Hesap Kuruluş Tarihi',
                        value: `<t:${createdUnix}:F>\n*(<t:${createdUnix}:R>)*`,
                        inline: true
                    }
                );

            if (joinedUnix) {
                embed.addFields({
                    name: '📥 Sunucuya Katılım Tarihi',
                    value: `<t:${joinedUnix}:F>\n*(<t:${joinedUnix}:R>)*`,
                    inline: true
                });
            }

            embed.addFields(
                {
                    name: '⭐ En Yüksek Rol',
                    value: highestRole,
                    inline: true
                },
                {
                    name: '🔰 Yetkiler & Statü',
                    value: badges.length > 0 ? badges.join('\n') : 'Standart Üye',
                    inline: true
                },
                {
                    name: `🏷️ Roller (${member ? member.roles.cache.size - 1 : 0})`,
                    value: rolesString,
                    inline: false
                }
            );

            // Sunucu İçi Kayıt ve Ceza Özeti
            const prevReg = registrationService.getPreviousRegistration(targetUser.id);
            const penalSummary = penalService.getSummary(targetUser.id);

            let serverSummary = '';
            if (prevReg) {
                serverSummary += `📝 **Kayıt Bilgisi:** \`${prevReg.name} | ${prevReg.age}\` (${prevReg.gender || '-'})\n`;
            }
            serverSummary += `⚖️ **Toplam Ceza Puanı:** \`${penalSummary.totalPoints} Puan\` (Toplam: ${penalSummary.totalCount} işlem)`;

            embed.addFields({
                name: '📋 Sunucu İçi Sicil & Kayıt Durumu',
                value: serverSummary,
                inline: false
            });

            embed.setFooter({ text: config.footer || '787 INC By Zywexx' }).setTimestamp();

            return interaction.followUp({ embeds: [embed] });
        } catch (error) {
            const { errorEmbed } = require('../../utils/embeds');
            if (interaction.replied || interaction.deferred) {
                return interaction.followUp({ embeds: [errorEmbed('Hata', `Kullanıcı bilgisi alınamadı: ${error.message}`)], ephemeral: true });
            } else {
                return interaction.reply({ embeds: [errorEmbed('Hata', `Kullanıcı bilgisi alınamadı: ${error.message}`)], ephemeral: true });
            }
        }
    }
};

