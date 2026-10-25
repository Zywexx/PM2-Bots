const axios = require('axios');
const logger = require('../utils/logger');

const FINDCORD_BASE_URL = process.env.FINDCORD_BASE_URL || 'https://app.findcord.com/v1';

const api = axios.create({
    baseURL: FINDCORD_BASE_URL,
    timeout: 10000,
    headers: {
        'User-Agent': 'PALIK-BOT/1.0'
    }
});

// Bot içi kısa süreli cache (30 saniye TTL) - Rate limit ve burst koruması
const cache = new Map();
const CACHE_TTL = 30 * 1000;

/**
 * Discord Kullanıcı ID doğrulaması (17-20 haneli sayısal ID)
 * @param {string|number} userId 
 * @returns {boolean}
 */
function validateDiscordId(userId) {
    return /^\d{17,20}$/.test(String(userId || ''));
}

/**
 * API Hata nesnesini ayrıştırır ve standart formatta döndürür.
 * @param {Error} error 
 * @returns {object}
 */
function handleApiError(error) {
    if (error.response) {
        const { status, data, headers } = error.response;
        const apiError = data?.error || {};

        const code = apiError.code || (status === 405 ? 'PREMIUM_USER' : 'API_ERROR');
        const message = apiError.message || data?.message || 'Bilinmeyen API hatası';

        if (status !== 404) {
            logger.warn(`Findcord API Hatası: ${status} | ${code} | ${message}`, 'FINDCORD');
        } else {
            logger.debug(`Findcord: Kullanıcı veritabanında bulunamadı (404)`, 'FINDCORD');
        }

        if (status === 401) {
            return {
                success: false,
                status,
                code: 'UNAUTHORIZED',
                error: 'Findcord API anahtarı geçersiz veya eksik.'
            };
        }

        if (status === 403) {
            return {
                success: false,
                status,
                code: code || 'FORBIDDEN',
                error: message || 'Findcord erişimi reddedildi (IP veya anahtar kısıtlaması).'
            };
        }

        if (status === 404) {
            return {
                success: false,
                status,
                code: 'NOT_FOUND',
                notFound: true,
                error: 'Kullanıcı Findcord veritabanında bulunamadı.'
            };
        }

        if (status === 405 || code === 'PREMIUM_USER') {
            return {
                success: false,
                status: 405,
                code: 'PREMIUM_USER',
                error: 'Bu kullanıcının Findcord verilerine erişilemiyor (Gizli/Premium profil).'
            };
        }

        if (status === 429) {
            const retryAfter = Number(headers['retry-after']) || null;
            return {
                success: false,
                status,
                code: 'RATE_LIMITED',
                retryAfter,
                error: retryAfter
                    ? `İstek limiti aşıldı. ${retryAfter} saniye sonra tekrar deneyin.`
                    : 'Findcord istek limiti aşıldı, lütfen biraz bekleyin.'
            };
        }

        return {
            success: false,
            status,
            code,
            error: `Findcord hatası: ${status} - ${message}`
        };
    }

    if (error.request) {
        logger.warn(`Findcord sunucusundan yanıt alınamadı: ${error.message}`);
        return {
            success: false,
            code: 'NO_RESPONSE',
            error: 'Findcord sunucusundan yanıt alınamadı (Zaman aşımı / Bağlantı hatası).'
        };
    }

    logger.error(`Findcord isteği oluşturulamadı: ${error.message}`);
    return {
        success: false,
        code: 'REQUEST_ERROR',
        error: `İstek oluşturulurken hata oluştu: ${error.message}`
    };
}

/**
 * Findcord API üzerinden kullanıcı verilerini sorgular.
 * @param {string} userId - Sorgulanacak Discord Kullanıcı ID'si
 * @param {boolean} [bypassCache=false] - Cache'i atlayıp doğrudan API'ye istek atma durumu
 * @returns {Promise<{success: boolean, data?: object, error?: string, code?: string, status?: number, notFound?: boolean, retryAfter?: number|null}>}
 */
async function getUserData(userId, bypassCache = false) {
    if (!validateDiscordId(userId)) {
        return {
            success: false,
            code: 'INVALID_USER_ID',
            error: 'Geçerli bir Discord kullanıcı IDsi girilmelidir (17-20 haneli).'
        };
    }

    const strUserId = String(userId);

    // Cache Kontrolü
    if (!bypassCache && cache.has(strUserId)) {
        const cached = cache.get(strUserId);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            return {
                success: true,
                data: cached.data,
                cached: true
            };
        }
        cache.delete(strUserId);
    }

    const rawApiKey = process.env.FINDCORD_API_KEY;
    if (!rawApiKey) {
        logger.warn('FINDCORD_API_KEY tanımlı değil (.env dosyasını kontrol edin).');
        return {
            success: false,
            code: 'API_KEY_MISSING',
            error: 'Findcord API Key tanımlanmamış.'
        };
    }

    const authHeader = rawApiKey.startsWith('ApiKey ') || rawApiKey.startsWith('Bearer ')
        ? rawApiKey
        : `ApiKey ${rawApiKey}`;

    try {
        const response = await api.get(`/user/${strUserId}`, {
            headers: {
                Authorization: authHeader
            }
        });

        // Veriyi cache'e al
        cache.set(strUserId, {
            data: response.data,
            timestamp: Date.now()
        });

        return {
            success: true,
            data: response.data,
            rateLimit: {
                limit: response.headers['x-ratelimit-limit'],
                remaining: response.headers['x-ratelimit-remaining'],
                reset: response.headers['x-ratelimit-reset']
            }
        };
    } catch (error) {
        return handleApiError(error);
    }
}

/**
 * Findcord üzerinden kullanıcının sicil/ceza geçmişini çeker.
 * @param {string} userId
 */
async function getUserPenals(userId) {
    const res = await getUserData(userId);
    if (!res.success) return res;

    return {
        success: true,
        data: res.data?.Punishments || []
    };
}

/**
 * Findcord üzerinden kullanıcının yetkili olduğu ve bulunduğu sunucuları çeker.
 * @param {string} userId
 */
async function getUserServers(userId) {
    const res = await getUserData(userId);
    if (!res.success) return res;

    const staff = res.data?.GuildStaff || [];
    const guilds = res.data?.Guilds || [];

    return {
        success: true,
        data: {
            staff,
            guilds
        },
        staff,
        guilds
    };
}

/**
 * Findcord üzerinden kullanıcının isim/kayıt sorgusunu çeker.
 * @param {string} userId
 */
async function getQuery(userId) {
    return getUserData(userId);
}

/**
 * Belirli bir kullanıcının veya tüm kullanıcıların cache'ini temizler.
 * @param {string} [userId]
 */
function clearCache(userId) {
    if (userId) {
        cache.delete(String(userId));
    } else {
        cache.clear();
    }
}

module.exports = {
    getUserData,
    getUser: getUserData,
    getUserPenals,
    getUserServers,
    getQuery,
    clearCache,
    validateDiscordId
};
