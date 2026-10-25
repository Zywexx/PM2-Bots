const { EmbedBuilder } = require('discord.js');

const PALETTE = {
    PRIMARY: '#5865F2',
    SUCCESS: '#2ECC71',
    ERROR: '#ED4245',
    WARNING: '#FEE75C',
    INFO: '#57F287',
    BAN: '#ED4245',
    JAIL: '#9B59B6',
    KICK: '#E67E22',
    MUTE: '#F1C40F',
    WARN: '#FFA500',
    TIMEOUT: '#7289DA',
    MALE: '#3498DB',
    FEMALE: '#E91E63',
    BACKUP: '#27AE60',
    ESCALATION: '#C0392B'
};

function safeText(val, fallback = 'İşlem tamamlandı') {
    if (val === null || val === undefined) return fallback;
    if (val instanceof Error) return val.message || fallback;
    const str = String(val).trim();
    if (str.length === 0) return fallback;
    return str.length > 4000 ? str.substring(0, 3997) + '...' : str;
}

function successEmbed(titleOrDescription, description = null) {
    const embed = new EmbedBuilder().setColor(PALETTE.SUCCESS).setTimestamp();
    if (description === null || description === undefined) {
        embed.setTitle('✅ Başarılı');
        embed.setDescription(safeText(titleOrDescription, 'İşlem başarıyla tamamlandı.'));
    } else {
        embed.setTitle(`✅ ${safeText(titleOrDescription, 'Başarılı')}`);
        embed.setDescription(safeText(description, 'İşlem başarıyla tamamlandı.'));
    }
    return embed;
}

function errorEmbed(titleOrDescription, description = null) {
    const embed = new EmbedBuilder().setColor(PALETTE.ERROR).setTimestamp();
    if (description === null || description === undefined) {
        embed.setTitle('❌ Hata');
        embed.setDescription(safeText(titleOrDescription, 'Bir hata oluştu.'));
    } else {
        embed.setTitle(`❌ ${safeText(titleOrDescription, 'Hata')}`);
        embed.setDescription(safeText(description, 'Bir hata oluştu.'));
    }
    return embed;
}

function infoEmbed(titleOrDescription, description = null) {
    const embed = new EmbedBuilder().setColor(PALETTE.PRIMARY).setTimestamp();
    if (description === null || description === undefined) {
        embed.setTitle('ℹ️ Bilgi');
        embed.setDescription(safeText(titleOrDescription, 'Bilgilendirme.'));
    } else {
        embed.setTitle(`ℹ️ ${safeText(titleOrDescription, 'Bilgi')}`);
        embed.setDescription(safeText(description, 'Bilgilendirme.'));
    }
    return embed;
}

function warningEmbed(titleOrDescription, description = null) {
    const embed = new EmbedBuilder().setColor(PALETTE.WARN).setTimestamp();
    if (description === null || description === undefined) {
        embed.setTitle('⚠️ Uyarı');
        embed.setDescription(safeText(titleOrDescription, 'Dikkat.'));
    } else {
        embed.setTitle(`⚠️ ${safeText(titleOrDescription, 'Uyarı')}`);
        embed.setDescription(safeText(description, 'Dikkat.'));
    }
    return embed;
}

function penaltyEmbed(type, fields = []) {
    const typeUpper = (type || 'CEZA').toUpperCase();
    const color = PALETTE[typeUpper] || PALETTE.PRIMARY;

    const embed = new EmbedBuilder()
        .setTitle(`🔨 Ceza İşlemi: ${typeUpper}`)
        .setColor(color)
        .setTimestamp();

    if (Array.isArray(fields) && fields.length > 0) {
        embed.addFields(fields);
    }

    return embed;
}

/**
 * Moderasyon Ceza Logu için profesyonel embed oluşturur.
 */
function createPenalLogEmbed({ targetUser, staffUser, type, reason, duration, expiresAt, points, penaltyId }) {
    const typeKey = (type || '').toUpperCase();
    const color = PALETTE[typeKey] || PALETTE.ERROR;

    const emojiMap = {
        BAN: '🔴',
        JAIL: '🟣',
        KICK: '🟠',
        MUTE: '🟡',
        WARN: '⚠️',
        TIMEOUT: '⏰'
    };

    const emoji = emojiMap[typeKey] || '🔨';

    const embed = new EmbedBuilder()
        .setTitle(`${emoji} Moderasyon Logu: ${typeKey}`)
        .setColor(color)
        .addFields(
            { name: '👤 Cezalandırılan', value: `<@${targetUser.id}>\n\`${targetUser.tag || targetUser.username}\` (\`${targetUser.id}\`)`, inline: true },
            { name: '🛡️ Yetkili', value: `<@${staffUser.id}>\n\`${staffUser.tag || staffUser.username}\``, inline: true },
            { name: '⚖️ Ceza Puanı', value: `\`+${points || 0} Puan\``, inline: true },
            { name: '📝 Sebep', value: `\`\`\`${reason || 'Sebep belirtilmedi.'}\`\`\``, inline: false }
        )
        .setFooter({ text: `Ceza ID: #${penaltyId || 'N/A'} • 787 INC By Zywexx` })
        .setTimestamp();

    if (targetUser.displayAvatarURL) {
        embed.setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));
    }

    if (duration) {
        embed.addFields({ name: '⏳ Süre', value: `\`${duration}\``, inline: true });
    } else {
        embed.addFields({ name: '⏳ Süre', value: '`Kalıcı / Süresiz`', inline: true });
    }

    if (expiresAt) {
        const expUnix = Math.floor(new Date(expiresAt).getTime() / 1000);
        embed.addFields({ name: '⌛ Bitiş Zamanı', value: `<t:${expUnix}:F> (<t:${expUnix}:R>)`, inline: true });
    }

    return embed;
}

/**
 * Ceza Kaldırma (Revoke/Unban/Unjail/Unmute/Untimeout) Log Embed'i
 */
function createRevokeLogEmbed({ targetUser, staffUser, type, reason, penaltyId }) {
    const typeKey = (type || '').toUpperCase();
    const embed = new EmbedBuilder()
        .setTitle(`🟢 Ceza Kaldırıldı: ${typeKey}`)
        .setColor(PALETTE.SUCCESS)
        .addFields(
            { name: '👤 Kullanıcı', value: `<@${targetUser.id || targetUser}>\n(\`${targetUser.id || targetUser}\`)`, inline: true },
            { name: '🛡️ Yetkili', value: staffUser ? `<@${staffUser.id || staffUser}>` : '`Sistem (Süre Doldu)`', inline: true },
            { name: '📋 İşlem Türü', value: `\`UN${typeKey}\``, inline: true },
            { name: '📝 Kaldırılma Sebebi', value: `\`\`\`${reason || 'Belirtilmedi'}\`\`\``, inline: false }
        )
        .setFooter({ text: penaltyId ? `Ceza ID: #${penaltyId} • 787 INC By Zywexx` : '787 INC By Zywexx' })
        .setTimestamp();

    if (targetUser.displayAvatarURL) {
        embed.setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));
    }

    return embed;
}

/**
 * Eskalasyon Tetiklenme Log Embed'i
 */
function createEscalationLogEmbed({ targetUser, type, count, limit, nextAction }) {
    const typeUpper = (type || '').toUpperCase();
    const nextActionUpper = (nextAction || 'İNCELEME').toUpperCase();

    return new EmbedBuilder()
        .setTitle('🚨 CEZA ESKALASYONU TETİKLENDİ')
        .setColor(PALETTE.ESCALATION)
        .setDescription(`⚠️ <@${targetUser.id}> adlı kullanıcı son 30 gün içinde izin verilen **${typeUpper}** sınırına ulaştı!`)
        .addFields(
            { name: '👤 Kullanıcı', value: `<@${targetUser.id}> (\`${targetUser.id}\`)`, inline: true },
            { name: '📊 Ceza Sayısı', value: `**${count}** / **${limit}**`, inline: true },
            { name: '⚡ Sıradaki Önerilen Ceza', value: `🔜 \`${nextActionUpper}\``, inline: true }
        )
        .setFooter({ text: '787 INC By Zywexx' })
        .setTimestamp();
}

/**
 * Yeni Kayıt Log Embed'i
 */
function createRegistrationLogEmbed({ member, staffUser, name, age, gender, tag, registrationId }) {
    const isMale = (gender || '').toLowerCase() === 'erkek';
    const color = isMale ? PALETTE.MALE : PALETTE.FEMALE;
    const genderEmoji = isMale ? '👨 Erkek' : '👩 Kız';

    const embed = new EmbedBuilder()
        .setTitle('📝 Yeni Üye Kaydı Gerçekleşti')
        .setColor(color)
        .addFields(
            { name: '👤 Kayıt Olan', value: `${member} (\`${member.id}\`)`, inline: true },
            { name: '🛡️ Kayıt Yapan Yetkili', value: `<@${staffUser.id}> (\`${staffUser.id}\`)`, inline: true },
            { name: '🏷️ Kayıt Edilen İsim', value: `\`${name} ${tag || '|'} ${age}\``, inline: true },
            { name: '⚧️ Cinsiyet', value: `\`${genderEmoji}\``, inline: true },
            { name: '🎂 Yaş', value: `\`${age}\``, inline: true },
            { name: '🆔 Kayıt Numarası', value: `\`#${registrationId || 'N/A'}\``, inline: true }
        )
        .setFooter({ text: `Kayıt ID: #${registrationId || 'N/A'} • 787 INC By Zywexx` })
        .setTimestamp();

    if (member.user && member.user.displayAvatarURL) {
        embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
    }

    return embed;
}

/**
 * Kayıt Güncelleme Log Embed'i
 */
function createRegistrationUpdateLogEmbed({ member, staffUser, changesList, newNickname }) {
    const embed = new EmbedBuilder()
        .setTitle('✏️ Kayıt Bilgisi Güncellendi')
        .setColor(PALETTE.JAIL)
        .addFields(
            { name: '👤 Kullanıcı', value: `${member} (\`${member.id}\`)`, inline: true },
            { name: '🛡️ Güncelleyen Yetkili', value: `<@${staffUser.id}> (\`${staffUser.id}\`)`, inline: true },
            { name: '🏷️ Güncel İsim / Tag', value: `\`${newNickname}\``, inline: true },
            { name: '🔄 Değiştirilen Bilgiler', value: changesList.join('\n') || 'Bilgi değişikliği', inline: false }
        )
        .setFooter({ text: '787 INC By Zywexx' })
        .setTimestamp();

    if (member.user && member.user.displayAvatarURL) {
        embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
    }

    return embed;
}

/**
 * Sunucuya Giriş Karşılama Log Embed'i (Kullanıcı Kanalı ve Admin Kanalı için)
 */
function createWelcomeEmbed({ member, isSuspicious, accountCreatedStr, relativeTimeStr, memberCount }) {
    const embed = new EmbedBuilder()
        .setTitle('👋 Aramıza Yeni Bir Üye Katıldı!')
        .setColor(isSuspicious ? PALETTE.WARN : PALETTE.PRIMARY)
        .setDescription(`Sunucumuza hoş geldin <@${member.id}>! Seninle beraber **${memberCount}** üyeye ulaştık.\nLütfen kayıt olmak için yetkililerimizi bekleyiniz ve kurallar kanalını inceleyiniz.`)
        .addFields(
            { name: '📅 Hesap Kuruluş Tarihi', value: `${accountCreatedStr} (${relativeTimeStr})`, inline: false },
            { name: '🛡️ Güvenlik Durumu', value: isSuspicious ? '⚠️ **Yeni / Şüpheli Hesap (< 7 Gün)**' : '🟢 **Güvenli Hesap**', inline: false }
        )
        .setFooter({ text: `Kullanıcı ID: ${member.id} • Hoş Geldin!` })
        .setTimestamp();

    if (member.user && member.user.displayAvatarURL) {
        embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
    }

    return embed;
}

/**
 * Veritabanı Yedekleme Log Embed'i
 */
function createBackupLogEmbed({ fileName, sizeKb, manual = false, staffUser = null }) {
    const embed = new EmbedBuilder()
        .setTitle('💾 Veritabanı Yedeği Alındı')
        .setColor(PALETTE.BACKUP)
        .addFields(
            { name: '📁 Dosya Adı', value: `\`${fileName}\``, inline: true },
            { name: '📦 Boyut', value: `\`${sizeKb} KB\``, inline: true },
            { name: '⚙️ Yedekleme Türü', value: manual ? `👤 Manuel (\`${staffUser?.tag || staffUser?.username || 'Yetkili'}\`)` : '⏰ Otomatik (Planlanmış Cron)', inline: true }
        )
        .setFooter({ text: '787 INC By Zywexx' })
        .setTimestamp();

    return embed;
}

module.exports = {
    PALETTE,
    successEmbed,
    errorEmbed,
    infoEmbed,
    warningEmbed,
    penaltyEmbed,
    createPenalLogEmbed,
    createRevokeLogEmbed,
    createEscalationLogEmbed,
    createRegistrationLogEmbed,
    createRegistrationUpdateLogEmbed,
    createWelcomeEmbed,
    createBackupLogEmbed
};


