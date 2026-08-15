export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
	id: number;
	kind: ToastKind;
	message: string;
}

let nextId = 0;

/**
 * Transient feedback. Kept deliberately small: one queue, auto-dismissing, no
 * per-call configuration to get wrong.
 */
class ToastStore {
	items = $state<Toast[]>([]);

	push(kind: ToastKind, message: string, ttl = 4000) {
		const id = nextId++;
		this.items = [...this.items, { id, kind, message }];

		if (ttl > 0) setTimeout(() => this.dismiss(id), ttl);
		return id;
	}

	success(message: string) {
		return this.push('success', message);
	}

	error(message: string) {
		return this.push('error', message, 6000);
	}

	info(message: string) {
		return this.push('info', message);
	}

	dismiss(id: number) {
		this.items = this.items.filter((toast) => toast.id !== id);
	}
}

export const toasts = new ToastStore();
