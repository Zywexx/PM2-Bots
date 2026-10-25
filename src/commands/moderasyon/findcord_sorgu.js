const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const findcordService = require('../../services/findcordService');
const registrationService = require('../../services/registrationService');
const penalService = require('../../services/penalService');
const { errorEmbed } = require('../../utils/embeds');
const { hasPermission, hasStaffPermission } = require('../../utils/permissions');
const logger = require('../../utils/logger');

/**
 * Tarih metinlerini güvenli bir şekilde Unix zaman damgasına (saniye) çevirir.
 * @param {string|Date} dateStr 
 * @returns {number|null}
 */
function parseFindcordDate(dateStr) {
    if (!dateStr) return null;
    if (typeof dateStr !== 'string') {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : Math.floor(d.getTime() / 1000);
    }

    // Format: DD.MM.YYYY HH:mm:ss veya DD.MM.YYYY HH:mm
    const match = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (match) {
        const [_, day, month, year, hour, min, sec] = match;
        const d = new Date(Number(year), Number(month) - 1, Number(day), Number(hour || 0), Number(min || 0), Number(sec || 0));
        if (!isNaN(d.getTime())) return Math.floor(d.getTime() / 1000);
    }

    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : Math.floor(d.getTime() / 1000);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('findcord-sorgu')
        .setDescription('Findcord üzerindeki tüm küresel sicil, isim geçmişi ve sunucu verilerini sorgular.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option.setName('kullanici')
                .setDescription('Sorgulanacak kullanıcı')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('id')
                .setDescription('Kullanıcı Discord ID (Sunucuda olmayan kullanıcılar için)')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            // Yetki Kontrolü
            const isStaff = hasPermission(interaction.member, 'kayit_yapabilir') ||
                            hasStaffPermission(interaction.member, 'ban') ||
                            hasStaffPermission(interaction.member, 'jail') ||
                            hasStaffPermission(interaction.member, 'mute') ||
                            hasStaffPermission(interaction.member, 'warn') ||
                            hasStaffPermission(interaction.member, 'timeout') ||
                            interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
                            interaction.member.permissions.has(PermissionFlagsBits.Administrator);

            if (!isStaff) {
                return interaction.reply({
                    embeds: [errorEmbed('Erişim Reddedildi', 'Bu komutu kullanmak için yetkili olmanız gerekmektedir.')],
                    ephemeral: true
                });
            }

            const targetUser = interaction.options.getUser('kullanici');
            const rawId = interaction.options.getString('id');

            let targetId = targetUser?.id || (rawId ? rawId.trim() : null);

            if (!targetId) {
                return interaction.reply({
                    embeds: [errorEmbed('Eksik Parametre', 'Lütfen bir kullanıcı etiketleyin veya geçerli bir Discord ID girin.\nÖrnek: `/findcord-sorgu kullanici:@kullanici` veya `/findcord-sorgu id:123456789012345678`')],
                    ephemeral: true
                });
            }

            if (!findcordService.validateDiscordId(targetId)) {
                return interaction.reply({
                    embeds: [errorEmbed('Geçersiz Discord ID', 'Girilen ID geçersiz. 17-20 haneli sayısal bir Discord ID olmalıdır.')],
                    ephemeral: true
                });
            }

            await interaction.deferReply();

            // Findcord API'den kullanıcı verilerini sorgula
            const res = await findcordService.getUserData(targetId);

            if (!res.success || !res.data) {
                let errorTitle = 'Findcord Sorgu Hatası';
                let errorDesc = res.error || 'Kullanıcı verisi alınamadı.';

                if (res.code === 'PREMIUM_USER' || res.status === 405) {
                    errorDesc = '🔒 Bu kullanıcının Findcord profili gizli veya korumalıdır (Premium/Gizli Profil).';
                } else if (res.notFound || res.status === 404) {
                    errorDesc = `ℹ️ \`${targetId}\` ID'li kullanıcı Findcord veritabanında kayıtlı değil.`;
                } else if (res.code === 'API_KEY_MISSING') {
                    errorDesc = '⚠️ Bot bünyesinde `FINDCORD_API_KEY` yapılandırılmamış (.env dosyasını kontrol edin).';
                }

                return interaction.followUp({
                    embeds: [errorEmbed(errorTitle, errorDesc)]
                });
            }

            const data = res.data;
            const info = data.UserInfo || {};
            const punishments = Array.isArray(data.Punishments) ? data.Punishments : [];
            const staffs = Array.isArray(data.GuildStaff) ? data.GuildStaff : [];
            const guilds = Array.isArray(data.Guilds) ? data.Guilds : [];
            const mInfo = data.MemberInfo || {};
            const names = Array.isArray(mInfo.Names) ? mInfo.Names : [];
            const lastSeen = data.LastSeen || {};

            // Kullanıcı profil & avatar bilgisi
            const avatarUrl = info.UserdisplayAvatar || targetUser?.displayAvatarURL({ dynamic: true }) || null;
            const username = info.UserName || targetUser?.username || targetId;
            const globalName = info.UserGlobalName || targetUser?.globalName || username;

            // Hesap kuruluş tarihi
            let createdFormatted = 'Bilinmiyor';
            const createdTs = parseFindcordDate(info.UserCreated) || (targetUser?.createdAt ? Math.floor(targetUser.createdAt.getTime() / 1000) : null);
            if (createdTs) {
                createdFormatted = `<t:${createdTs}:D> (<t:${createdTs}:R>)`;
            } else if (info.UserCreated) {
                createdFormatted = info.UserCreated;
            }

            // Durum (Presence)
            const statusMap = {
                online: '🟢 Çevrimiçi',
                idle: '🟡 Boşta',
                dnd: '🔴 Rahatsız Etmeyin',
                offline: '⚪ Çevrimdışı'
            };
            const presenceStatus = (info.Presence?.Status || '').toLowerCase();
            const statusText = statusMap[presenceStatus] || (info.Presence?.Status ? `📶 ${info.Presence.Status}` : '⚪ Bilinmiyor');

            // Kayıt & İsim Bilgileri
            const topName = mInfo.TopName && mInfo.TopName !== '-' ? mInfo.TopName : null;
            const topAge = mInfo.TopAge && mInfo.TopAge !== '-' ? mInfo.TopAge : null;
            let topSex = mInfo.TopSex && mInfo.TopSex !== '-' ? mInfo.TopSex : null;
            if (typeof topSex === 'string') {
                const lowerSex = topSex.toLowerCase();
                if (lowerSex === 'erkek') topSex = '♂️ Erkek';
                else if (lowerSex === 'kız' || lowerSex === 'kiz') topSex = '♀️ Kız';
            }

            // Ceza Analizi & Dökümü
            const penalCounts = { ban: 0, jail: 0, kick: 0, mute: 0, warn: 0, timeout: 0, other: 0 };
            for (const p of punishments) {
                const t = (p.Type || '').toLowerCase();
                if (penalCounts[t] !== undefined) penalCounts[t]++;
                else penalCounts.other++;
            }

            // Sunucu İçi Veriler (Eğer kullanıcı bu sunucudaysa)
            let localMember = null;
            try {
                localMember = interaction.guild?.members.cache.get(targetId) || await interaction.guild?.members.fetch(targetId).catch(() => null);
            } catch (e) {
                localMember = null;
            }
            const localReg = registrationService.getByUserId(targetId);
            const localPenalSummary = penalService.getSummary(targetId);

            // Dinamik Renk Belirleme (Güvenlik Riskine Göre)
            let embedColor = '#2ECC71'; // Yeşil (Temiz)
            if (penalCounts.ban > 0 || punishments.length >= 4) {
                embedColor = '#ED4245'; // Kırmızı (Yüksek Risk)
            } else if (punishments.length > 0) {
                embedColor = '#FFA500'; // Turuncu (Orta Risk)
            }

            // ==========================================
            // KUSURSUZ OKUNABİLİR AESTHETIC EMBED TASARIMI
            // ==========================================
            const sections = [];

            // 1. KULLANICI KİMLİĞİ
            const userLines = [
                `> • **Kullanıcı:** <@${targetId}> (\`@${username}\`)`,
                `> • **Discord ID:** \`${targetId}\``,
                `> • **Hesap Kuruluşu:** ${createdFormatted}`,
                `> • **Çevrim Durumu:** ${statusText}`
            ];
            sections.push(`### 👤 Kullanıcı Kimliği\n${userLines.join('\n')}`);

            // 2. FINDCORD KAYIT & İSİM GEÇMİŞİ
            const regLines = [];
            if (topName) {
                regLines.push(`> • **Popüler İsim:** **${topName}**`);
                regLines.push(`> • **Tahmini Yaş / Cinsiyet:** \`${topAge || '-'}\` / ${topSex || '-'}`);
            } else {
                regLines.push(`> • **Popüler İsim:** *Kayıt Yok*`);
                regLines.push(`> • **Tahmini Yaş / Cinsiyet:** \`-\` / \`-\``);
            }

            if (names.length > 0) {
                const formattedNames = names.slice(0, 3).map(n => {
                    const val = n.Name || (typeof n === 'string' ? n : JSON.stringify(n));
                    return `\`${val}\``;
                }).join(', ');
                const moreCount = names.length > 3 ? ` *(+${names.length - 3} isim)*` : '';
                regLines.push(`> • **Geçmiş İsimler (${names.length}):** ${formattedNames}${moreCount}`);
            } else {
                regLines.push(`> • **Geçmiş İsimler:** *Kayıtlı isim geçmişi bulunmuyor.*`);
            }
            sections.push(`### 🏷️ Findcord Kayıt Verileri\n${regLines.join('\n')}`);

            // 3. KÜRESEL SİCİL & CEZA DÖKÜMÜ
            const penalLines = [
                `> 🔴 Ban \`${penalCounts.ban}\`  •  🟣 Jail \`${penalCounts.jail}\`  •  🟠 Kick \`${penalCounts.kick}\`  •  🟡 Mute \`${penalCounts.mute}\`  •  ⚠️ Warn \`${penalCounts.warn}\``
            ];

            if (punishments.length === 0) {
                penalLines.push(`> 🛡️ *Findcord veritabanında herhangi bir ceza kaydı bulunmuyor.*`);
            } else {
                const recentPenals = punishments.slice(0, 3).map(p => {
                    const typeEmoji = { ban: '🔴', jail: '🟣', kick: '🟠', mute: '🟡', warn: '⚠️', timeout: '⏰' }[p.Type?.toLowerCase()] || '🔨';
                    const typeStr = (p.Type || 'Ceza').toUpperCase();
                    const guildStr = p.GuildName || p.GuildID || 'Sunucu';
                    const pTs = parseFindcordDate(p.Date);
                    const timeStr = pTs ? `<t:${pTs}:d>` : (p.Date ? `(${p.Date})` : '');
                    const reasonStr = p.Reason ? p.Reason : 'Sebep belirtilmedi';
                    return `> ${typeEmoji} **[${typeStr}]** **${guildStr}** ${timeStr}\n> └ *Sebep:* ${reasonStr}`;
                });
                penalLines.push(`>\n${recentPenals.join('\n')}`);
                if (punishments.length > 3) {
                    penalLines.push(`> ℹ️ *... ve ${punishments.length - 3} ceza daha (Aşağıdaki butondan görüntülenebilir)*`);
                }
            }
            sections.push(`### ⚖️ Küresel Sicil & Cezalar (${punishments.length})\n${penalLines.join('\n')}`);

            // 4. YETKİLİ SUNUCULAR, BULUNDUĞU SUNUCULAR & AKTİVİTE
            const activityLines = [];

            // Yetkili Olduğu Sunucular
            if (staffs.length > 0) {
                const staffList = staffs.slice(0, 3).map(s => `**${s.GuildName || s.GuildId}**`).join(', ');
                const moreStaff = staffs.length > 3 ? ` *(+${staffs.length - 3} sunucu)*` : '';
                activityLines.push(`> • **Yetkili Olduğu Sunucular (${staffs.length}):** ${staffList}${moreStaff}`);
            } else {
                activityLines.push(`> • **Yetkili Olduğu Sunucular:** *Bulunmuyor*`);
            }

            // Bulunduğu Sunucular
            if (guilds.length > 0) {
                const guildList = guilds.slice(0, 3).map(g => {
                    const boostStr = g.Booster ? ' 🚀' : '';
                    return `**${g.GuildName || g.GuildId}**${boostStr}`;
                }).join(', ');
                const moreGuilds = guilds.length > 3 ? ` *(+${guilds.length - 3} sunucu)*` : '';
                activityLines.push(`> • **Bulunduğu Sunucular (${guilds.length}):** ${guildList}${moreGuilds}`);
            } else {
                activityLines.push(`> • **Bulunduğu Sunucular:** *Veri bulunamadı*`);
            }

            let hasLastSeen = false;
            if (lastSeen.Voice && Array.isArray(lastSeen.Voice) && lastSeen.Voice.length > 0) {
                const v = lastSeen.Voice[0];
                const vTs = parseFindcordDate(v.TimeString);
                const timeStr = vTs ? `<t:${vTs}:R>` : (v.TimeString ? `*${v.TimeString}*` : '');
                activityLines.push(`> • **Son Ses:** **${v.GuildName || 'Sunucu'}** › 🔊 \`${v.ChannelName || '-'}\` ${timeStr ? `(${timeStr})` : ''}`);
                hasLastSeen = true;
            }

            if (lastSeen.Message && Array.isArray(lastSeen.Message) && lastSeen.Message.length > 0) {
                const m = lastSeen.Message[0];
                const mTs = parseFindcordDate(m.TimeString);
                const timeStr = mTs ? `<t:${mTs}:R>` : (m.TimeString ? `*${m.TimeString}*` : '');
                activityLines.push(`> • **Son Mesaj:** **${m.GuildName || 'Sunucu'}** › 💬 \`#${m.ChannelName || '-'}\` ${timeStr ? `(${timeStr})` : ''}`);
                hasLastSeen = true;
            }

            if (!hasLastSeen) {
                activityLines.push(`> • **Son Aktivite:** *Aktivite kaydı bulunamadı*`);
            }
            sections.push(`### 📡 Sunucu & Aktivite Bilgileri\n${activityLines.join('\n')}`);

            // 5. SUNUCU İÇİ DURUM (Kullanıcı bu sunucudaysa)
            if (localMember) {
                const localJoinedTs = Math.floor(localMember.joinedTimestamp / 1000);
                const localRoleCount = Math.max(0, localMember.roles.cache.size - 1);
                const localRegStr = localReg ? `\`${localReg.name} | ${localReg.age}\` (${localReg.gender || '-'})` : '*Kayıtsız*';
                const localPenalCount = localPenalSummary ? localPenalSummary.totalCount : 0;
                const localPenalPts = localPenalSummary ? localPenalSummary.totalPoints : 0;

                const localLines = [
                    `> • **Sunucuya Giriş:** <t:${localJoinedTs}:R>  •  **Roller:** \`${localRoleCount} adet\``,
                    `> • **Sunucu Kaydı:** ${localRegStr}`,
                    `> • **Sunucu Sicili:** \`${localPenalCount} ceza (${localPenalPts} Ceza Puanı)\``
                ];
                sections.push(`### 🏠 Bu Sunucudaki Durumu (${interaction.guild?.name || 'Sunucu'})\n${localLines.join('\n')}`);
            }

            // Embed Oluşturma
            const embed = new EmbedBuilder()
                .setTitle(`🌐 Findcord Küresel Kullanıcı Profili`)
                .setColor(embedColor)
                .setAuthor({
                    name: `${globalName} (@${username})`,
                    iconURL: avatarUrl || undefined
                })
                .setThumbnail(avatarUrl)
                .setDescription(sections.join('\n\n'))
                .setFooter({
                    text: `Findcord Küresel İstihbarat Servisi • Sorgulayan: ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            // Alt Detay Butonları
            const totalServers = staffs.length + guilds.length;
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`findcord_sicil_sorgu:${targetId}`)
                    .setLabel(`Sicil Detayı (${punishments.length})`)
                    .setEmoji('⚖️')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(punishments.length === 0),
                new ButtonBuilder()
                    .setCustomId(`findcord_kayit_sorgu:${targetId}`)
                    .setLabel(`Tüm İsimler (${names.length})`)
                    .setEmoji('📝')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(names.length === 0),
                new ButtonBuilder()
                    .setCustomId(`findcord_sunucu_sorgu:${targetId}`)
                    .setLabel(`Sunucu Bilgileri (${totalServers})`)
                    .setEmoji('🌐')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(totalServers === 0 && (!lastSeen.Message || lastSeen.Message.length === 0) && (!lastSeen.Voice || lastSeen.Voice.length === 0))
            );

            await interaction.followUp({
                embeds: [embed],
                components: [row]
            });
        } catch (error) {
            logger.error(`Findcord sorgu komutu hatası: ${error.message}`, 'KOMUT', error);
            const errEmbed = errorEmbed('Komut Hatası', `Sorgulama sırasında bir hata oluştu: \`\`\`${error.message}\`\`\``);
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ embeds: [errEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errEmbed], ephemeral: true });
            }
        }
    }
};
