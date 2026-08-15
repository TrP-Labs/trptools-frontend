import type { ReportTarget } from '$lib/api/types';

export interface ReportRequest {
	targetType: ReportTarget;
	targetId: string;
	label: string;
}

/**
 * A single shared report dialog.
 *
 * A public group page can easily carry twenty report buttons. Giving each one
 * its own `<dialog>` meant twenty backdrop-blurred layers on the page, which
 * pushed the browser into visibly broken compositing — the sticky header
 * detached and whole regions stopped painting. One dialog, opened with the
 * target, avoids that entirely and is less markup besides.
 */
class ReportStore {
	target = $state<ReportRequest | null>(null);

	open(request: ReportRequest) {
		this.target = request;
	}

	close() {
		this.target = null;
	}
}

export const reportDialog = new ReportStore();
