const config = require('../../config.json');
const { errorEmbed } = require('./embeds');

function hasPermission(member, key) {
    if (!member || !member.roles) return false;
    
    // Yöneticiler her şeye erişebilir
    if (member.permissions.has('Administrator')) return true;

    const allowedRoles = config.permissions[key];
    if (!allowedRoles || !Array.isArray(allowedRoles) || allowedRoles.length === 0) {
        return false;
    }

    return member.roles.cache.some(role => allowedRoles.some(r => String(r) === role.id));
}

function hasStaffPermission(member, type) {
    if (!member || !member.roles) return false;
    if (member.permissions.has('Administrator')) return true;

    const staffRoles = config.penals?.[type]?.staff || [];
    return staffRoles.some(roleId => member.roles.cache.has(String(roleId)));
}

async function checkPermission(interaction, key) {
    if (!hasPermission(interaction.member, key)) {
        await interaction.reply({
            embeds: [errorEmbed('Erişim Reddedildi', 'Bu işlemi gerçekleştirmek için gerekli yetkiye sahip değilsiniz.')],
            ephemeral: true
        });
        return false;
    }
    return true;
}

module.exports = {
    hasPermission,
    hasStaffPermission,
    checkPermission
};

