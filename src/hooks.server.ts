import type { Handle } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import { paraglideMiddleware } from '$lib/paraglide/server.js';
import { cookieName, getLocale, isLocale } from '$lib/paraglide/runtime.js';

const THEMES = new Set(['dim', 'midnight', 'light']);

const YEAR = 60 * 60 * 24 * 365;

/**
 * Rewrites the request's `Cookie` header so Paraglide's cookie strategy reads
 * the locale the account asked for — or, with `locale` null, so it finds no
 * cookie at all and falls through to `Accept-Language`.
 *
 * The account preference is only knowable after the session has been fetched,
 * which is here — by which point the middleware would otherwise already have
 * settled on whatever the browser sent. Setting the response cookie alone
 * would fix the *next* request and leave this one rendering in the wrong
 * language, which is exactly the flash the theme cookie exists to avoid.
 */
function withLocaleCookie(request: Request, locale: string | null): Request {
	const headers = new Headers(request.headers);
	const existing = headers
		.get('cookie')
		?.split(';')
		.map((part) => part.trim())
		.filter((part) => part.length > 0 && !part.startsWith(`${cookieName}=`));

	const parts = existing ?? [];
	headers.set('cookie', (locale === null ? parts : [...parts, `${cookieName}=${locale}`]).join('; '));

	return new Request(request, { headers });
}

/**
 * Resolves the session once per request and stamps the theme and language
 * into the shell.
 *
 * Reading both from a cookie during SSR is what stops the page flashing the
 * wrong colours — or the wrong language — before hydration.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const cookieTheme = event.cookies.get('theme');
	const hasCookieTheme = Boolean(cookieTheme && THEMES.has(cookieTheme));

	const cookieLocale = event.cookies.get(cookieName);
	const hasCookieLocale = Boolean(cookieLocale && isLocale(cookieLocale));

	event.locals.theme = hasCookieTheme ? cookieTheme! : 'dim';
	event.locals.user = null;

	// Why the page is in the language it is in, which the resolved locale
	// cannot say on its own — "English because you chose it" and "English
	// because your browser asked for it" are the same tag. The settings picker
	// needs the difference to know whether to show Automatic as the selection.
	//
	// Signed out, the cookie is the only thing there is. Signed in, the account
	// overrules it below.
	event.locals.localeSource = hasCookieLocale ? 'device' : 'automatic';

	let request = event.request;

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

				// Language does *not* follow the theme's precedence, and the
				// difference is forced rather than chosen. Paraglide persists
				// whatever it resolves: the first `m.*()` on the client calls
				// `getLocale`, which calls `setLocale(resolved, {reload:false})`,
				// which writes the cookie. So a cookie always exists after one
				// render, and "no cookie" can never mean "no preference" —
				// which is what an Automatic setting has to be able to say.
				//
				// The account is therefore the only authority for somebody
				// signed in, and the cookie is a cache of it. That also makes
				// the setting behave the way people expect a language to: chosen
				// once, and the same on every device you sign in on.
				if (isLocale(data.user.locale)) {
					event.locals.localeSource = 'account';
					event.cookies.set(cookieName, data.user.locale, {
						path: '/',
						maxAge: YEAR,
						sameSite: 'lax',
						httpOnly: false
					});
					request = withLocaleCookie(request, data.user.locale);
				} else {
					// Following the browser. The cookie is cleared on both the
					// response and this request's own headers, so the render and
					// the hydration that follows it agree on `Accept-Language`
					// rather than on a value Paraglide cached last time.
					event.locals.localeSource = 'automatic';
					if (hasCookieLocale) {
						event.cookies.delete(cookieName, { path: '/' });
						request = withLocaleCookie(request, null);
					}
				}
			}
		} catch {
			// A backend that is down must not take the whole site with it.
		}
	}

	// Everything inside this callback runs with the request's locale in
	// AsyncLocalStorage, so `m.*` resolves per request rather than per process
	// — which is what keeps two concurrent renders in different languages from
	// reading each other's.
	return paraglideMiddleware(request, ({ request: localised, locale }) => {
		event.locals.locale = locale;

		return resolve({ ...event, request: localised }, {
			transformPageChunk: ({ html }) =>
				html
					.replace('%trptools.theme%', event.locals.theme)
					.replace('%trptools.lang%', getLocale())
		});
	});
};
