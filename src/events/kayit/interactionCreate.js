const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../../utils/logger');
const registrationService = require('../../services/registrationService');
const findcordService = require('../../services/findcordService');
const { errorEmbed } = require('../../utils/embeds');

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
                    logger.error(`Komut hatası: /${interaction.commandName} (${interaction.user.tag})`, 'KAYIT-KOMUT', error);
                    const embed = errorEmbed('Komut Hatası', `Bu komut çalıştırılırken beklenmeyen bir hata oluştu:\n\`\`\`${error.message}\`\`\``);
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ embeds: [embed], ephemeral: true });
                    } else {
                        await interaction.reply({ embeds: [embed], ephemeral: true });
                    }
                }
            } else if (interaction.isButton()) {
                const [action, param1] = interaction.customId.split(':');

                // Sadece Kayıt ile ilgili butonları işle
                if (action === 'kayit_iptal') {
                    logger.btn(interaction.customId, interaction.user.tag);
                    const registrationId = param1;
                    const success = registrationService.cancel(registrationId);

                    if (success) {
                        try {
                            const reg = registrationService.getById(registrationId);
                            if (reg) {
                                const member = await interaction.guild.members.fetch(reg.user_id).catch(() => null);
                                if (member) {
                                    await member.setNickname(null, 'Kayıt iptal edildi');
                                }
                            }
                        } catch (e) {
                            logger.warn(`Kayıt iptali sonrası takma ad sıfırlanamadı: ${e.message}`, 'KAYIT-İPTAL');
                        }

                        const oldEmbed = interaction.message.embeds[0];
                        const newEmbed = oldEmbed ? EmbedBuilder.from(oldEmbed) : new EmbedBuilder();
                        newEmbed
                            .setTitle('❌ Kayıt İptal Edildi')
                            .setColor('#ED4245')
                            .addFields({ name: '🚫 İptal Eden Yetkili', value: `<@${interaction.user.id}> (<t:${Math.floor(Date.now() / 1000)}:R>)`, inline: false });

                        const row = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId(interaction.customId)
                                .setLabel('Kayıt İptal Edildi')
                                .setEmoji('🚫')
                                .setStyle(ButtonStyle.Danger)
                                .setDisabled(true)
                        );

                        await interaction.update({ embeds: [newEmbed], components: [row] });
                    } else {
                        await interaction.reply({ embeds: [errorEmbed('Kayıt iptal edilemedi veya zaten iptal edilmiş.')], ephemeral: true });
                    }
                } else if (action === 'kayit_gecmisi') {
                    logger.btn(interaction.customId, interaction.user.tag);
                    const registrationId = param1;
                    await interaction.deferReply({ ephemeral: true });
                    const history = registrationService.getHistory(registrationId);
                    const reg = registrationService.getById(registrationId);

                    if (!reg) {
                        return interaction.followUp({ embeds: [errorEmbed('Kayıt bulunamadı.')] });
                    }

                    const embed = new EmbedBuilder()
                        .setTitle(`📜 Sunucu İçi Kayıt / Bilgi Değişiklik Geçmişi`)
                        .setColor('#9B59B6')
                        .setDescription(`👤 <@${reg.user_id}> (\`${reg.user_id}\`)\n🏷️ **Mevcut İsim/Yaş:** \`${reg.name} | ${reg.age}\` (${reg.gender})\n📅 **İlk Kayıt:** <t:${Math.floor(new Date(reg.created_at).getTime() / 1000)}:F>`);

                    if (!history || history.length === 0) {
                        embed.addFields({ name: 'ℹ️ Bilgi', value: 'Bu kayıtta daha önce yapılmış herhangi bir isim/yaş/cinsiyet değişikliği bulunmamaktadır.' });
                    } else {
                        const fieldNameMap = { name: 'İsim', age: 'Yaş', gender: 'Cinsiyet' };
                        const historyLines = history.map((h, i) => {
                            const fieldTr = fieldNameMap[h.field] || h.field;
                            const timeStr = h.changed_at ? `<t:${Math.floor(new Date(h.changed_at).getTime() / 1000)}:R>` : '';
                            return `**${i + 1}.** \`${fieldTr}\`: \`${h.old_value}\` ➔ \`${h.new_value}\` (Yetkili: <@${h.changed_by}> ${timeStr})`;
                        });
                        embed.addFields({ name: `📝 Değişiklikler (${history.length})`, value: historyLines.join('\n') });
                    }

                    await interaction.followUp({ embeds: [embed] });
                } else if (action === 'findcord_kayit_sorgu') {
                    logger.btn(interaction.customId, interaction.user.tag);
                    const userId = param1;
                    await interaction.deferReply({ ephemeral: true });
                    const res = await findcordService.getUser(userId);

                    if (!res.success || !res.data) {
                        return interaction.followUp({ embeds: [errorEmbed('Findcord Kayıt Hatası', res.error || 'Findcord kayıt geçmişi bulunamadı.')] });
                    }

                    const mInfo = res.data.MemberInfo || {};
                    const info = res.data.UserInfo || {};

                    const embed = new EmbedBuilder()
                        .setTitle(`📝 Findcord İsim / Kayıt Geçmişi (<@${userId}>)`)
                        .setColor('Aqua')
                        .setThumbnail(info.UserdisplayAvatar || null)
                        .addFields(
                            { name: '🏷️ En Çok Kullanılan İsim', value: `\`${mInfo.TopName || '-'}\``, inline: true },
                            { name: '🎂 Tahmini Yaş', value: `\`${mInfo.TopAge || '-'}\``, inline: true },
                            { name: '⚧️ Cinsiyet', value: `\`${mInfo.TopSex || '-'}\``, inline: true }
                        );

                    if (mInfo.Names && Array.isArray(mInfo.Names) && mInfo.Names.length > 0) {
                        const nameLines = mInfo.Names.slice(0, 10).map((n, i) => `**${i + 1}.** ${n.Name || n} ${n.Date ? `*(<t:${Math.floor(new Date(n.Date).getTime()/1000)}:d>)*` : ''}`);
                        embed.addFields({ name: `📜 Geçmiş İsimler (${mInfo.Names.length})`, value: nameLines.join('\n'), inline: false });
                    } else {
                        embed.setDescription('ℹ️ *Kullanıcının geçmiş isim veya kayıt verisi bulunmamaktadır.*');
                    }

                    await interaction.followUp({ embeds: [embed] });
                }
            }
        } catch (error) {
            logger.error(`Kayıt botu interaction hatası: ${error.message}`, 'KAYIT-INTERACTION');
        }
    }
};
