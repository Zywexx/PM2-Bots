const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../../utils/logger');
const penalService = require('../../services/penalService');
const findcordService = require('../../services/findcordService');
const { errorEmbed, infoEmbed } = require('../../utils/embeds');

const cooldowns = new Map();

module.exports = {
    name: 'interactionCreate',
    once: false,
    async execute(interaction) {
        try {
            if (interaction.isChatInputCommand()) {
                const command = interaction.client.commands?.get(interaction.commandName);
                if (!command) return;

                logger.cmd(interaction.commandName, interaction.user.tag, interaction.guild?.name);

                // Basit Cooldown (2 saniye)
                const userId = interaction.user.id;
                const now = Date.now();
                const cooldownAmount = 2000;

                if (!cooldowns.has(interaction.commandName)) {
                    cooldowns.set(interaction.commandName, new Map());
                }

                const timestamps = cooldowns.get(interaction.commandName);
                if (timestamps.has(userId)) {
                    const expirationTime = timestamps.get(userId) + cooldownAmount;
                    if (now < expirationTime) {
                        const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
                        return interaction.reply({
                            embeds: [errorEmbed('Hızlı İşlem Uyarısı', `Lütfen bu komutu tekrar kullanmadan önce **${timeLeft}** saniye bekleyin.`)],
                            ephemeral: true
                        });
                    }
                }

                timestamps.set(userId, now);
                setTimeout(() => timestamps.delete(userId), cooldownAmount);

                try {
                    await command.execute(interaction);
                } catch (error) {
                    logger.error(`Komut çalıştırma hatası: /${interaction.commandName} (${interaction.user.tag})`, 'MOD-KOMUT', error);
                    const embed = errorEmbed('Komut Hatası', `Bu komut çalıştırılırken beklenmeyen bir hata oluştu:\n\`\`\`${error.message}\`\`\``);
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ embeds: [embed], ephemeral: true });
                    } else {
                        await interaction.reply({ embeds: [embed], ephemeral: true });
                    }
                }
            } else if (interaction.isButton()) {
                const [action, param1] = interaction.customId.split(':');

                if (action === 'sicil_tum') {
                    logger.btn(interaction.customId, interaction.user.tag);
                    const userId = param1;
                    const penalties = penalService.getAllByUserId(userId);

                    if (penalties.length === 0) {
                        return interaction.reply({ embeds: [infoEmbed('Kullanıcının sicili temiz.')], ephemeral: true });
                    }

                    const emojiMap = { ban: '🔴', jail: '🟣', kick: '🟠', mute: '🟡', warn: '⚠️', timeout: '⏰' };
                    const lines = penalties.slice(0, 15).map(p => {
                        const em = emojiMap[p.type.toLowerCase()] || '🔨';
                        const st = p.status === 'revoked' ? '~~' : '';
                        const tag = p.status === 'revoked' ? ' `[ESKİ / KALDIRILDI]`' : ` \`[AKTİF • ${p.points || 0} Puan]\``;
                        return `${em} ${st}**#${p.id}** [${p.type.toUpperCase()}]${st}${tag} - ${p.reason || 'Sebep yok'} (<t:${Math.floor(new Date(p.created_at).getTime() / 1000)}:d>)`;
                    });

                    const embed = new EmbedBuilder()
                        .setTitle(`📋 Tüm Sicil Kayıtları (<@${userId}>)`)
                        .setColor('Blurple')
                        .setDescription(lines.join('\n') + (penalties.length > 15 ? `\n\n*... ve ${penalties.length - 15} kayıt daha*` : ''));

                    const components = [];
                    const topPenalties = penalties.slice(0, 5);
                    if (topPenalties.length > 0) {
                        const row = new ActionRowBuilder();
                        for (const p of topPenalties) {
                            row.addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`sicil_detay:${p.id}`)
                                    .setLabel(`#${p.id} Detay`)
                                    .setStyle(ButtonStyle.Secondary)
                            );
                        }
                        components.push(row);
                    }

                    await interaction.reply({ embeds: [embed], components, ephemeral: true });
                } else if (['sicil_ban', 'sicil_jail', 'sicil_mute', 'sicil_warn'].includes(action)) {
                    logger.btn(interaction.customId, interaction.user.tag);
                    const userId = param1;
                    const type = action.split('_')[1];
                    const penalties = penalService.getByType(userId, type);

                    if (penalties.length === 0) {
                        return interaction.reply({ embeds: [infoEmbed(`Kullanıcının ${type.toUpperCase()} cezası bulunmuyor.`)], ephemeral: true });
                    }

                    const emojiMap = { ban: '🔴', jail: '🟣', kick: '🟠', mute: '🟡', warn: '⚠️', timeout: '⏰' };
                    const em = emojiMap[type.toLowerCase()] || '🔨';

                    const lines = penalties.slice(0, 15).map(p => {
                        const st = p.status === 'revoked' ? '~~' : '';
                        const tag = p.status === 'revoked' ? ' `[ESKİ / KALDIRILDI]`' : ` \`[AKTİF • ${p.points || 0} Puan]\``;
                        return `${em} ${st}**#${p.id}**${st}${tag} - ${p.reason || 'Sebep yok'} (<t:${Math.floor(new Date(p.created_at).getTime() / 1000)}:d>)`;
                    });

                    const embed = new EmbedBuilder()
                        .setTitle(`${em} ${type.toUpperCase()} Geçmişi (<@${userId}>)`)
                        .setColor('Orange')
                        .setDescription(lines.join('\n') + (penalties.length > 15 ? `\n\n*... ve ${penalties.length - 15} kayıt daha*` : ''));

                    const components = [];
                    const topPenalties = penalties.slice(0, 5);
                    if (topPenalties.length > 0) {
                        const row = new ActionRowBuilder();
                        for (const p of topPenalties) {
                            row.addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`sicil_detay:${p.id}`)
                                    .setLabel(`#${p.id} Detay`)
                                    .setStyle(ButtonStyle.Secondary)
                            );
                        }
                        components.push(row);
                    }

                    await interaction.reply({ embeds: [embed], components, ephemeral: true });
                } else if (action === 'sicil_yetkili_dagilimi') {
                    logger.btn(interaction.customId, interaction.user.tag);
                    const userId = param1;
                    const distribution = penalService.getStaffDistribution(userId);

                    const embed = new EmbedBuilder()
                        .setTitle('Yetkili Dağılımı')
                        .setColor('Purple')
                        .setDescription(distribution.map(d => `<@${d.staffId}>: ${d.count} işlem`).join('\n') || 'Veri yok.');

                    await interaction.reply({ embeds: [embed], ephemeral: true });
                } else if (action === 'sicil_detay') {
                    logger.btn(interaction.customId, interaction.user.tag);
                    const penaltyId = param1;
                    const penalty = penalService.getDetail(penaltyId);

                    if (!penalty) {
                        return interaction.reply({ embeds: [errorEmbed('Ceza bulunamadı.')], ephemeral: true });
                    }

                    const emojiMap = { ban: '🔴', jail: '🟣', kick: '🟠', mute: '🟡', warn: '⚠️', timeout: '⏰' };
                    const emoji = emojiMap[penalty.type.toLowerCase()] || '🔨';

                    const durumMetni = penalty.status === 'active'
                        ? '🔴 Aktif'
                        : `🟢 Kaldırıldı (<@${penalty.revoked_by}> - ${penalty.revoked_at || '-'})`;

                    const embed = new EmbedBuilder()
                        .setTitle(`${emoji} CEZA DETAYI`)
                        .setColor(penalty.status === 'active' ? '#FF0000' : '#00FF00')
                        .addFields(
                            { name: 'Ceza ID', value: `#${penalty.id}`, inline: true },
                            { name: 'Kullanıcı', value: `<@${penalty.user_id}>`, inline: true },
                            { name: 'Ceza', value: penalty.type.toUpperCase(), inline: true },
                            { name: 'Sebep', value: penalty.reason || 'Belirtilmedi', inline: false },
                            { name: 'Yetkili', value: `<@${penalty.staff_id}>`, inline: true },
                            { name: 'Tarih', value: penalty.created_at || '-', inline: true },
                            { name: 'Ceza Puanı', value: (penalty.points || 0).toString(), inline: true },
                            { name: 'Durum', value: durumMetni, inline: false }
                        );

                    if (penalty.status === 'revoked' && penalty.revoke_reason) {
                        embed.addFields({ name: 'Kaldırılma Sebebi', value: penalty.revoke_reason, inline: false });
                    }

                    await interaction.reply({ embeds: [embed], ephemeral: true });
                } else if (action === 'sicil_findcord') {
                    logger.btn(interaction.customId, interaction.user.tag);
                    const userId = param1;
                    await interaction.deferReply({ ephemeral: true });
                    const res = await findcordService.getUser(userId);
                    if (!res.success || !res.data) {
                        return interaction.followUp({ embeds: [errorEmbed('Findcord Sicil Hatası', res.error || 'Findcord verisi alınamadı veya kullanıcı bulunamadı.')] });
                    }

                    const userData = res.data.UserInfo || {};
                    const punishments = res.data.Punishments || [];

                    const embed = new EmbedBuilder()
                        .setTitle(`🌐 Findcord Sicil Kayıtları — ${userData.UserName || userId}`)
                        .setColor(punishments.length > 0 ? 0xFF0000 : 0x00FF00)
                        .setThumbnail(userData.UserdisplayAvatar || null);

                    if (punishments.length === 0) {
                        embed.setDescription('✅ **Findcord üzerinde kayıtlı herhangi bir ceza kaydı bulunmamaktadır.**');
                    } else {
                        const lines = punishments.slice(0, 10).map((p, idx) => {
                            const type = (p.Type || 'Ceza').toUpperCase();
                            const guild = p.GuildName || p.GuildID || 'Bilinmeyen Sunucu';
                            const reason = p.Reason || 'Sebep belirtilmedi';
                            const date = p.Date ? `(<t:${Math.floor(new Date(p.Date).getTime() / 1000)}:d>)` : '';
                            return `**${idx + 1}. [${type}]** — **${guild}**\n> 📄 Sebep: ${reason} ${date}`;
                        });
                        embed.setDescription(lines.join('\n\n') + (punishments.length > 10 ? `\n\n*... ve ${punishments.length - 10} ceza daha*` : ''));
                    }

                    await interaction.followUp({ embeds: [embed] });
                } else if (action === 'findcord_sicil_sorgu') {
                    logger.btn(interaction.customId, interaction.user.tag);
                    const userId = param1;
                    await interaction.deferReply({ ephemeral: true });
                    const userRes = await findcordService.getUser(userId);

                    if (!userRes.success || !userRes.data) {
                        return interaction.followUp({ embeds: [errorEmbed('Findcord Profil Hatası', userRes.error || 'Findcord kullanıcı verisi alınamadı.')] });
                    }

                    const info = userRes.data.UserInfo || {};
                    const punishments = userRes.data.Punishments || [];
                    const staffs = userRes.data.GuildStaff || [];
                    const guilds = userRes.data.Guilds || [];

                    const embed = new EmbedBuilder()
                        .setTitle(`🌐 Findcord Kullanıcı & Sicil Profili`)
                        .setColor(punishments.length > 0 ? 0xFFA500 : 0x0099FF)
                        .setThumbnail(info.UserdisplayAvatar || null)
                        .addFields(
                            { name: '👤 Kullanıcı', value: `<@${userId}>\n\`${info.UserName || 'Bilinmiyor'}\` (${info.UserGlobalName || '-'})`, inline: true },
                            { name: '🆔 Discord ID', value: `\`${userId}\``, inline: true },
                            { name: '📅 Hesap Kuruluş', value: info.UserCreated || '-', inline: true }
                        );

                    if (info.Presence) {
                        const statusMap = { online: '🟢 Çevrimiçi', idle: '🟡 Boşta', dnd: '🔴 Rahatsız Etmeyin', offline: '⚪ Çevrimdışı' };
                        const statusStr = statusMap[info.Presence.Status] || info.Presence.Status || 'Bilinmiyor';
                        embed.addFields({ name: '📶 Durum', value: statusStr, inline: true });
                    }

                    if (staffs.length > 0) {
                        const staffList = staffs.slice(0, 5).map(s => `🛡️ **${s.GuildName || s.GuildId}**`).join(', ');
                        embed.addFields({ name: `🛡️ Yetkili Olduğu Sunucular (${staffs.length})`, value: staffList + (staffs.length > 5 ? ` *(+${staffs.length - 5})*` : ''), inline: false });
                    }

                    if (guilds.length > 0) {
                        const guildList = guilds.slice(0, 5).map(g => `🏠 **${g.GuildName || g.GuildId}**`).join(', ');
                        embed.addFields({ name: `🏠 Bulunduğu Sunucular (${guilds.length})`, value: guildList + (guilds.length > 5 ? ` *(+${guilds.length - 5})*` : ''), inline: false });
                    }

                    if (punishments.length === 0) {
                        embed.addFields({ name: '⚖️ Sicil Kayıtları (0)', value: '✅ Findcord veritabanında ceza kaydı bulunmamaktadır.', inline: false });
                    } else {
                        const lines = punishments.slice(0, 5).map((p, idx) => {
                            const type = (p.Type || 'Ceza').toUpperCase();
                            const guild = p.GuildName || p.GuildID || 'Sunucu';
                            const reason = p.Reason || 'Sebep yok';
                            return `**#${idx + 1} [${type}]** - **${guild}**: ${reason}`;
                        });
                        embed.addFields({
                            name: `⚖️ Sicil Kayıtları (${punishments.length})`,
                            value: lines.join('\n') + (punishments.length > 5 ? `\n*... ve ${punishments.length - 5} ceza daha*` : ''),
                            inline: false
                        });
                    }

                    await interaction.followUp({ embeds: [embed] });
                } else if (action === 'findcord_sunucu_sorgu') {
                    logger.btn(interaction.customId, interaction.user.tag);
                    const userId = param1;
                    await interaction.deferReply({ ephemeral: true });
                    const res = await findcordService.getUser(userId);
                    if (!res.success || !res.data) {
                        return interaction.followUp({ embeds: [errorEmbed('Findcord Sunucu Hatası', res.error || 'Findcord sunucu verisi alınamadı.')] });
                    }

                    const info = res.data.UserInfo || {};
                    const staffs = res.data.GuildStaff || [];
                    const guilds = res.data.Guilds || [];
                    const lastSeen = res.data.LastSeen || {};

                    const embed = new EmbedBuilder()
                        .setTitle(`🌐 Findcord Sunucu Bilgileri — ${info.UserName || userId}`)
                        .setColor('Gold')
                        .setThumbnail(info.UserdisplayAvatar || null);

                    let desc = '';
                    if (staffs.length > 0) {
                        desc += `### 🛡️ Yetkili Olduğu Sunucular (${staffs.length})\n`;
                        desc += staffs.map(s => `• **${s.GuildName || 'Sunucu'}** (\`${s.GuildId || s.id || '-'}\`)`).join('\n') + '\n\n';
                    } else {
                        desc += `### 🛡️ Yetkili Olduğu Sunucular (0)\nℹ️ *Kullanıcının kayıtlı bir yetkili sunucusu bulunamadı.*\n\n`;
                    }

                    if (guilds.length > 0) {
                        desc += `### 🏠 Bulunduğu Sunucular (${guilds.length})\n`;
                        desc += guilds.map(g => {
                            const joinStr = g.JoinTime ? ` • Katılım: \`${g.JoinTime}\`` : '';
                            const boostStr = g.Booster ? ' 🚀 *Booster*' : '';
                            return `• **${g.GuildName || 'Sunucu'}** (\`${g.GuildId || '-'}\`)${joinStr}${boostStr}`;
                        }).join('\n') + '\n\n';
                    } else {
                        desc += `### 🏠 Bulunduğu Sunucular (0)\nℹ️ *Kayıtlı bulunduğu sunucu verisi bulunamadı.*\n\n`;
                    }

                    if (lastSeen.Message && Array.isArray(lastSeen.Message) && lastSeen.Message.length > 0) {
                        const m = lastSeen.Message[0];
                        desc += `### 💬 Son Mesaj Görüldüğü Yer\n• **Sunucu:** ${m.GuildName || '-'}\n• **Kanal:** ${m.ChannelName || '-'}\n• **Tarih:** ${m.TimeString || '-'}\n\n`;
                    }

                    if (lastSeen.Voice && Array.isArray(lastSeen.Voice) && lastSeen.Voice.length > 0) {
                        const v = lastSeen.Voice[0];
                        desc += `### 🔊 Son Seste Görüldüğü Yer\n• **Sunucu:** ${v.GuildName || '-'}\n• **Kanal:** ${v.ChannelName || '-'}\n• **Tarih:** ${v.TimeString || '-'}\n`;
                    }

                    embed.setDescription(desc || 'Veri bulunamadı.');
                    await interaction.followUp({ embeds: [embed] });
                }
            }
        } catch (error) {
            logger.error(`Moderasyon interaction hatası: ${error.message}`, 'MOD-INTERACTION');
        }
    }
};
