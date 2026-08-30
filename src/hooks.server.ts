import type { Handle } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import { paraglideMiddleware } from '$lib/paraglide/server.js';
import { cookieName, getLocale, isLocale } from '$lib/paraglide/runtime.js';

const THEMES = new Set(['dim', 'midnight', 'light']);

const YEAR = 60 * 60 * 24 * 365;

/**
 * Rewrites the request's `Cookie` header so Paraglide's cookie strategy reads
 * the locale we resolved rather than the one the browser sent.
 *
 * The account preference is only knowable after the session has been fetched,
 * which is here — by which point the middleware would otherwise already have
 * settled on the browser's `Accept-Language`. Setting the response cookie
 * alone would fix the *next* request and leave this one rendering in the
 * wrong language, which is exactly the flash the theme cookie exists to avoid.
 */
function withLocaleCookie(request: Request, locale: string): Request {
	const headers = new Headers(request.headers);
	const existing = headers
		.get('cookie')
		?.split(';')
		.map((part) => part.trim())
		.filter((part) => part.length > 0 && !part.startsWith(`${cookieName}=`));

	headers.set('cookie', [...(existing ?? []), `${cookieName}=${locale}`].join('; '));

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

				// Same precedence for language, with one extra step: the
				// account preference is written to the cookie as well, so every
				// later request resolves it without a session lookup and the
				// browser's own `Accept-Language` stops being consulted.
				if (!hasCookieLocale && isLocale(data.user.locale)) {
					event.cookies.set(cookieName, data.user.locale, {
						path: '/',
						maxAge: YEAR,
						sameSite: 'lax',
						httpOnly: false
					});
					request = withLocaleCookie(request, data.user.locale);
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
