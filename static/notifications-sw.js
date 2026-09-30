self.addEventListener('push', (event) => {
    let message = {};
    try { message = event.data?.json() ?? {}; } catch { /* Provider payload was malformed. */ }
    const title = typeof message.title === 'string' ? message.title : 'TrPTools';
    let url = new URL('/', self.location.origin);
    try {
        const target = new URL(message.url, self.location.origin);
        if (target.origin === self.location.origin) url = target;
    } catch { /* Keep a safe destination. */ }
    event.waitUntil(self.registration.showNotification(title, {
        body: typeof message.body === 'string' ? message.body : 'A shift is starting soon.',
        tag: typeof message.tag === 'string' ? message.tag : 'shift-reminder',
        data: { url: url.href }
    }));
});
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = new URL(event.notification.data?.url ?? '/', self.location.origin);
    if (target.origin !== self.location.origin) return;
    event.waitUntil((async () => {
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of windows) {
            if (client.url === target.href && 'focus' in client) return client.focus();
        }
        return self.clients.openWindow(target.href);
    })());
});
