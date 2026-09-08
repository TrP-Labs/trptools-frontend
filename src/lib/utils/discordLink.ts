import { api, errorMessage } from '$lib/api/client';
import { toasts } from '$lib/stores/toast.svelte';
import { consumeUrlMarkers } from '$lib/utils/urlMarker';
import { m } from '$lib/paraglide/messages.js';

/**
 * Connecting a Discord account, from wherever the button appears.
 *
 * Three places offer it — account settings, a sign-up sheet, and the apply
 * form — because a group can require one before it accepts a sign-up or an
 * application, and being told so with no way to act on it is worse than not
 * being told. The flow is identical from all three; only where it lands
 * afterwards differs.
 */

/** Keyed by what the callback puts in the URL; only the sentences are ours. */
const LINK_ERRORS: Record<string, () => string> = {
	cancelled: m.settings_discord_canceled,
	expired: m.settings_discord_took_too_long,
	taken: m.settings_discord_already_connected_elsewhere,
	failed: m.settings_discord_could_not_confirm,
	unavailable: m.api_error_discord_is_not_configured_on_this_instance
};

/**
 * Sends the browser to Discord's consent screen.
 *
 * A full navigation rather than a fetch: the consent screen is a page, and the
 * OAuth state has to be parked by the same round trip that sends the browser
 * there. Anything half-typed on the current page goes with it, which is why
 * the notices that offer this sit above a form rather than beside its send
 * button.
 *
 * `returnTo` is where the callback lands afterwards, so somebody who pressed
 * this to unblock a form is put back in front of that form. The API refuses
 * anything but a site-relative path.
 *
 * Returns false when the redirect could not be started; the caller is left to
 * decide what its button does next, since only it knows what it disabled.
 */
export async function startDiscordLink(returnTo: string): Promise<boolean> {
	try {
		const { data, error } = await api.auth.discord.link.get({
			query: { json: 'true', returnTo }
		});
		if (error) throw error;
		if (!data) return false;

		window.location.href = data.url;
		return true;
	} catch (error) {
		toasts.error(errorMessage(error, m.settings_discord_could_not_start()));
		return false;
	}
}

/**
 * Announces the result the callback left in the URL, and clears the marker.
 *
 * Call this from `afterNavigate` — `consumeUrlMarkers` carries the reasons —
 * and from the *page* rather than from a component drawn once per row: a
 * shift page renders a sign-up sheet per occurrence, and a toast apiece is a
 * toast too many.
 *
 * `onLinked` runs only on success, for whatever the caller has to re-read.
 */
export function announceDiscordResult(onLinked?: () => void): void {
	consumeUrlMarkers(['discord'], ({ discord: result }) => {
		if (result === 'linked') {
			toasts.success(m.settings_discord_connected());
			onLinked?.();
		} else {
			toasts.error(LINK_ERRORS[result!]?.() ?? m.settings_discord_could_not_confirm());
		}
	});
}
