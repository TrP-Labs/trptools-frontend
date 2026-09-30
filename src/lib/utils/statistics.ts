import { API_URL } from '$lib/api/client';
/** Non-blocking, anonymous batches. Do not count prefetches or opt-out browsers. */
export function recordStatistics(groupId: string, kinds: string[], targetId?: string, visit?: Map<string, string>) {
    if (typeof window === 'undefined' || navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
    const events = kinds.map(kind => {
        const id = visit?.get(kind) ?? crypto.randomUUID();
        visit?.set(kind, id);
        return { id, groupId, kind, ...(targetId ? { targetId } : {}) };
    });
    void fetch(`${API_URL}/statistics/events`, {
        method: 'POST', credentials: 'omit', keepalive: true,
        headers: { 'content-type': 'application/json' }, body: JSON.stringify({ events })
    }).catch(() => {});
}
