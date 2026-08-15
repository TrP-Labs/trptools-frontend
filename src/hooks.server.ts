import type { Handle } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';

const THEMES = new Set(['dim', 'midnight', 'light']);

/**
 * Resolves the session once per request and stamps the theme into the shell.
 *
 * Reading the theme from a cookie during SSR is what stops the page flashing
 * the wrong colours before hydration.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const cookieTheme = event.cookies.get('theme');
	const hasCookieTheme = Boolean(cookieTheme && THEMES.has(cookieTheme));

	event.locals.theme = hasCookieTheme ? cookieTheme! : 'dim';
	event.locals.user = null;

	// Only ask the backend who this is when a session cookie is actually
	// present, so anonymous page loads cost nothing.
	if (event.cookies.get('access_token')) {
		try {
			const { data } = await serverApi(event).auth.session.get();
			if (data?.authenticated && data.user) {
				event.locals.user = data.user;

				// The cookie reflects the most recent choice made on this
				// device, so it wins. The account preference is what carries
				// the theme to a device that has not chosen one yet.
				if (!hasCookieTheme && THEMES.has(data.user.theme)) {
					event.locals.theme = data.user.theme;
				}
			}
		} catch {
			// A backend that is down must not take the whole site with it.
		}
	}

	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%trptools.theme%', event.locals.theme)
	});
};
