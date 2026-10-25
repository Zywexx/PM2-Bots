module.exports = {
    name: 'messageDelete',
    once: false,
    async execute(message, client) {
        try {
            if (!message || !message.guild || message.partial) return;
            if (message.author?.bot) return;

            const snipes = client.snipes || new Map();
            const attachment = message.attachments.first() ? message.attachments.first().proxyURL : null;

            snipes.set(message.channel.id, {
                content: message.content || null,
                author: message.author,
                image: attachment,
                createdAt: message.createdTimestamp || Date.now(),
                deletedAt: Date.now()
            });

            client.snipes = snipes;
        } catch (error) {
            // Sessizce geç veya hata loglama
        }
    }
};
