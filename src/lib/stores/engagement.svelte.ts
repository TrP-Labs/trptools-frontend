import { api } from '$lib/api/client';
import type { NotificationState } from '$lib/api/types';
const states = $state<Record<string, { data: NotificationState | null; failed: boolean }>>({});
let deviceRevision = $state(0);
export function pushDeviceRevision() { return deviceRevision; }
export function pushDeviceChanged() { deviceRevision++; }
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
            // Group-wide choices stay consistent on already visited shift pages.
            for (const other of Object.keys(states)) {
                if (other !== key && other.startsWith(`${userId}:${groupId}:`) && states[other]?.data) {
                    if (patch.following !== undefined) states[other].data!.following = patch.following;
                    if (patch.groupReminder !== undefined) states[other].data!.groupReminder = patch.groupReminder;
                }
            }
        }
    };
}
