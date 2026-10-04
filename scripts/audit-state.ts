// This token belongs only to the disposable backend audit fixture.
const fixture = await Bun.file('/tmp/trptools-audit-ui.json').json()
await Bun.write('/tmp/trptools-audit-browser-state.json', JSON.stringify({
    cookies: [{ name: 'access_token', value: fixture.token, domain: 'localhost', path: '/',
        expires: -1, httpOnly: true, secure: false, sameSite: 'Lax' }], origins: []
}))
