function formatDate(date) {
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function relativeTime(date) {
    const rtf = new Intl.RelativeTimeFormat('tr', { numeric: 'auto' });
    const diffInMs = new Date(date) - new Date();
    const diffInSeconds = Math.round(diffInMs / 1000);
    const absSeconds = Math.abs(diffInSeconds);

    if (absSeconds < 60) return rtf.format(Math.round(diffInSeconds), 'second');
    
    const diffInMinutes = Math.round(diffInSeconds / 60);
    if (Math.abs(diffInMinutes) < 60) return rtf.format(diffInMinutes, 'minute');
    
    const diffInHours = Math.round(diffInMinutes / 60);
    if (Math.abs(diffInHours) < 24) return rtf.format(diffInHours, 'hour');
    
    const diffInDays = Math.round(diffInHours / 24);
    if (Math.abs(diffInDays) < 30) return rtf.format(diffInDays, 'day');
    
    const diffInMonths = Math.round(diffInDays / 30);
    if (Math.abs(diffInMonths) < 12) return rtf.format(diffInMonths, 'month');
    
    const diffInYears = Math.round(diffInDays / 365);
    return rtf.format(diffInYears, 'year');
}

function parseDuration(str) {
    if (!str) return 0;
    const match = str.trim().match(/^(\d+)\s*([a-zA-Zçğıöşü]+)$/i);
    if (!match) return 0;
    
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    switch (unit) {
        case 's': case 'sn': case 'sec': case 'second': case 'saniye':
            return value * 1000;
        case 'm': case 'min': case 'minute': case 'dk': case 'dakika':
            return value * 60 * 1000;
        case 'h': case 'hr': case 'hour': case 'sa': case 'saat':
            return value * 60 * 60 * 1000;
        case 'd': case 'day': case 'g': case 'gun': case 'gün':
            return value * 24 * 60 * 60 * 1000;
        case 'w': case 'wk': case 'week': case 'hf': case 'hafta':
            return value * 7 * 24 * 60 * 60 * 1000;
        case 'mo': case 'month': case 'ay':
            return value * 30 * 24 * 60 * 60 * 1000;
        case 'y': case 'yr': case 'year': case 'yil': case 'yıl':
            return value * 365 * 24 * 60 * 60 * 1000;
        default:
            return 0;
    }
}


function formatDuration(ms) {
    if (!ms || isNaN(ms)) return 'Belirsiz';
    
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    const parts = [];
    if (days > 0) parts.push(`${days} gün`);
    if (hours > 0) parts.push(`${hours} saat`);
    if (minutes > 0) parts.push(`${minutes} dakika`);
    if (seconds > 0 && parts.length === 0) parts.push(`${seconds} saniye`);

    return parts.join(' ') || '0 dakika';
}

function getWeeklyKey(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    const weekNumber = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    return `${d.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

function getMonthlyKey(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

module.exports = {
    formatDate,
    relativeTime,
    parseDuration,
    formatDuration,
    getWeeklyKey,
    getMonthlyKey
};
