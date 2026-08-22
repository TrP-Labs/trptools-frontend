import { invalidateAll } from '$app/navigation';

/**
 * Re-runs the current page's load functions, without letting a failure here be
 * mistaken for a failure of whatever triggered it.
 *
 * Every editor on the site saves through the API and then refreshes the page
 * data, and both used to sit inside one `try`. A hiccup in the *refresh* —
 * SvelteKit's router throwing because it is mid-hydration, a load function
 * timing out — was therefore reported as "could not save" over a change that
 * had already been written, and the raw exception text ended up in a toast.
 *
 * The save is what the user asked for. A screen that has not caught up yet
 * resolves itself on the next navigation, so this logs and moves on.
 */
export async function refreshData(): Promise<void> {
	try {
		await invalidateAll();
	} catch (error) {
		console.error('[refresh] could not reload page data', error);
	}
}
