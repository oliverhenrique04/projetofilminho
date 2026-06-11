function createPushClient() {
    let messaging = null;

    function hasConfig() {
        return Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    }

    function toStringMap(data) {
        return Object.fromEntries(
            Object.entries(data || {}).map(([key, value]) => [key, String(value)])
        );
    }

    async function getMessagingClient() {
        if (!hasConfig()) return null;
        if (messaging) return messaging;

        const { getApps, initializeApp, applicationDefault } = require('firebase-admin/app');
        const { getMessaging } = require('firebase-admin/messaging');

        const app = getApps()[0] || initializeApp({
            credential: applicationDefault(),
        });
        messaging = getMessaging(app);
        return messaging;
    }

    return {
        async sendToTokens({ tokens, notification, data }) {
            if (!tokens || tokens.length === 0) {
                return {
                    ok: false,
                    skipped: true,
                    reason: 'no-tokens',
                    sentCount: 0,
                    failureCount: 0,
                };
            }

            if (!hasConfig()) {
                return {
                    ok: false,
                    skipped: true,
                    reason: 'missing-config',
                    sentCount: 0,
                    failureCount: tokens.length,
                };
            }

            try {
                const client = await getMessagingClient();
                const response = await client.sendEachForMulticast({
                    tokens,
                    notification,
                    data: toStringMap(data),
                });

                return {
                    ok: response.failureCount === 0,
                    skipped: false,
                    reason: null,
                    sentCount: response.successCount,
                    failureCount: response.failureCount,
                };
            } catch (error) {
                console.warn('FCM indisponivel:', error.message);
                return {
                    ok: false,
                    skipped: true,
                    reason: 'send-failed',
                    sentCount: 0,
                    failureCount: tokens.length,
                };
            }
        },
    };
}

module.exports = { createPushClient };
