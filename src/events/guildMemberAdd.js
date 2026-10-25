const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.json');
const timeUtils = require('../utils/time');
const registrationService = require('../services/registrationService');
const penalService = require('../services/penalService');
const { warningEmbed, createWelcomeEmbed } = require('../utils/embeds');
const logger = require('../utils/logger');

module.exports = {
    name: 'guildMemberAdd',
    once: false,
    async execute(member) {
        try {
            const accountAgeDays = (Date.now() - member.user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
            const isSuspicious = accountAgeDays < 7;
            const relativeTimeStr = timeUtils.relativeTime(member.user.createdAt);
            const accountCreatedStr = timeUtils.formatDate(member.user.createdAt);

            // 1. Ceza Bypass Koruması Kontrolü (Jail veya Mute)
            const activePenalties = penalService.getByUserId(member.id);
            const activeJail = activePenalties.find(p => p.type === 'jail');
            const activeMute = activePenalties.find(p => p.type === 'mute');

            if (activeJail) {
                // Aktif Jail cezası varsa jail rollerini geri yükle ve kayıt rollerini verme
                const jailRoles = (config.penals?.jail?.roles || []).map(r => String(r));
                for (const roleId of jailRoles) {
                    await member.roles.add(roleId).catch(err => logger.warn(`Jail rolü verilemedi (${member.id}): ${err.message}`));
                }
                await member.setNickname(`[JAIL] ${member.user.username}`).catch(() => {});
                logger.info(`Ceza koruması devreye girdi: ${member.user.tag} aktif jail cezası nedeniyle jail'e geri alındı.`);
            } else {
                // Aktif mute varsa mute rollerini geri yükle
                if (activeMute) {
                    const muteRoles = (config.penals?.mute?.roles || []).map(r => String(r));
                    for (const roleId of muteRoles) {
                        await member.roles.add(roleId).catch(err => logger.warn(`Mute rolü verilemedi (${member.id}): ${err.message}`));
                    }
                    logger.info(`Ceza koruması devreye girdi: ${member.user.tag} aktif mute cezası nedeniyle susturuldu.`);
                }

                // 2. Otomatik Kayıtsız Rolü Verme
                const kayitsizRoleId = config.roles?.kayitsiz;
                if (kayitsizRoleId) {
                    await member.roles.add(kayitsizRoleId).catch(err => logger.warn(`Kayıtsız rolü verilemedi (${member.id}): ${err.message}`));
                }

                // 3. Otomatik İsim Ayarlama (Önceki kayıt varsa eski ismi, yoksa şablon ismi)
                const previousReg = registrationService.getPreviousRegistration(member.id);
                const tagSymbol = config.tagSymbol || '•';
                let initialNickname;

                if (previousReg && previousReg.name && previousReg.age) {
                    initialNickname = `${tagSymbol} ${previousReg.name} | ${previousReg.age}`;
                } else {
                    const defaultName = config.kayitsizHesapIsim || 'İsim | Yaş';
                    initialNickname = `${tagSymbol} ${defaultName}`;
                }

                await member.setNickname(initialNickname).catch(err => {
                    logger.warn(`Üyenin ismi ayarlanamadı (${member.id}): ${err.message}`);
                });
            }

            // 4. Genel Karşılama Kanalı Log / Embed
            const welcomeChannelId = config.channels?.karsilama;
            if (welcomeChannelId) {
                const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);
                if (welcomeChannel) {
                    const welcomeEmbed = createWelcomeEmbed({
                        member,
                        isSuspicious,
                        accountCreatedStr,
                        relativeTimeStr,
                        memberCount: member.guild.memberCount
                    });
                    await welcomeChannel.send({ content: `👋 Hoş geldin <@${member.id}>!`, embeds: [welcomeEmbed] }).catch(() => {});
                }
            }

            // 5. Yetkili / Admin Hoşgeldin Takip Kanalı
            const adminInfoChannelId = config.channels?.admin_hosgeldin;
            if (adminInfoChannelId) {
                const adminChannel = member.guild.channels.cache.get(adminInfoChannelId);
                if (adminChannel) {
                    const embed = new EmbedBuilder()
                        .setTitle('🛡️ Yeni Üye Katılım İncelemesi')
                        .setColor(isSuspicious ? '#ED4245' : '#5865F2')
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                        .addFields(
                            { name: '👤 Kullanıcı', value: `<@${member.id}>\n\`${member.user.tag || member.user.username}\``, inline: true },
                            { name: '🆔 Discord ID', value: `\`${member.id}\``, inline: true },
                            { name: '🛡️ Güvenlik', value: isSuspicious ? '⚠️ **Şüpheli Hesap (< 7 Gün)**' : '🟢 **Normal Hesap**', inline: true },
                            { name: '📅 Hesap Oluşturulma', value: `${accountCreatedStr}\n*(<t:${Math.floor(member.user.createdAt.getTime() / 1000)}:R>)*`, inline: true },
                            { name: '📥 Katılma Tarihi', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                        )
                        .setFooter({ text: `Sunucu Üye Sayısı: ${member.guild.memberCount}` })
                        .setTimestamp();

                    if (activeJail) {
                        embed.addFields({
                            name: '🚨 AKTİF JAIL CEZASI BULUNDU!',
                            value: `Kullanıcı sunucudan kaçmaya çalıştı, otomatik olarak Jail'e geri alındı!\nCeza ID: \`#${activeJail.id}\` | Sebep: \`${activeJail.reason || 'Belirtilmedi'}\``,
                            inline: false
                        });
                    }

                    const previousReg = registrationService.getPreviousRegistration(member.id);
                    if (previousReg) {
                        embed.addFields({
                            name: '⚠️ Önceki Sunucu Kaydı Tespit Edildi!',
                            value: `🏷️ **İsim/Yaş:** \`${previousReg.name} | ${previousReg.age}\`\n⚧️ **Cinsiyet:** \`${previousReg.gender || '-'}\`\n📅 **Kayıt Tarihi:** \`${previousReg.created_at}\``,
                            inline: false
                        });
                    }

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`findcord_sicil_sorgu:${member.id}`)
                            .setLabel('Findcord Sicil')
                            .setEmoji('⚖️')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId(`findcord_sunucu_sorgu:${member.id}`)
                            .setLabel('Findcord Sunucu')
                            .setEmoji('🌐')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId(`findcord_kayit_sorgu:${member.id}`)
                            .setLabel('Findcord Kayıt')
                            .setEmoji('📝')
                            .setStyle(ButtonStyle.Success)
                    );

                    await adminChannel.send({ embeds: [embed], components: [row] }).catch(() => {});
                }
            }
        } catch (error) {
            logger.error(`Error in guildMemberAdd event: ${error.message}`);
        }
    }
};
