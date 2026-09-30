import { api } from '$lib/api/client';
export function pushSupported() {
    return typeof window !== 'undefined' && window.isSecureContext &&
        'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function enableDevice(publicKey: string, userId: string): Promise<'enabled' | 'denied' | 'unsupported'> {
    if (!pushSupported()) return 'unsupported';
    // Permission is requested only from the explicit button's click handler.
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';
    const registration = await navigator.serviceWorker.register('/notifications-sw.js', { scope: '/' });
    // `ready` waits for an active worker, including on the first registration.
    await navigator.serviceWorker.ready;
    const key = Uint8Array.from(atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
    let subscription = await registration.pushManager.getSubscription();
    const previousKey = subscription?.options.applicationServerKey;
    if (subscription && previousKey && !new Uint8Array(previousKey).every((byte, index) => byte === key[index])) {
        await subscription.unsubscribe();
        subscription = null;
    }
    if (!subscription) {
        subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    }
    const value = subscription.toJSON();
    const { error } = await api.notifications.subscription.put({ endpoint: subscription.endpoint,
        keys: { p256dh: value.keys?.p256dh ?? '', auth: value.keys?.auth ?? '' } });
    if (error) throw error;
    try { localStorage.setItem('trptools:push-account', userId); } catch { /* Storage may be unavailable. */ }
    return 'enabled';
}

export async function disableDevice() {
    const registration = await navigator.serviceWorker.getRegistration('/');
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    const { error } = await api.notifications.subscription.delete({ endpoint: subscription.endpoint });
    await subscription.unsubscribe();
    try { localStorage.removeItem('trptools:push-account'); } catch { /* Storage may be unavailable. */ }
    if (error) throw error;
}
