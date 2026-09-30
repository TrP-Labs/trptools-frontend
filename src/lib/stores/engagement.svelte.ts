import { api } from '$lib/api/client';
import type { NotificationState } from '$lib/api/types';
const states = $state<Record<string, { data: NotificationState | null; failed: boolean }>>({});
const pending = new Map<string, Promise<void>>();
export function engagement(userId: string, groupId: string, eventId?: string) {
    const key = `${userId}:${groupId}:${eventId ?? ''}`;
    return {
        get data() { return states[key]?.data; },
        get failed() { return states[key]?.failed; },
        async load() {
            states[key] ??= { data: null, failed: false };
            if (states[key].data) return;
            if (pending.has(key)) return pending.get(key);
            const promise = api.notifications.groups({ groupId }).get({ query: { eventId } })
                .then(({ data }) => { states[key].data = data; states[key].failed = !data; })
                .catch(() => { states[key].failed = true; })
                .finally(() => { pending.delete(key); });
            pending.set(key, promise);
            return promise;
        },
        update(patch: Partial<NotificationState>) {
            if (states[key]?.data) Object.assign(states[key]?.data, patch);
        }
    };
}
