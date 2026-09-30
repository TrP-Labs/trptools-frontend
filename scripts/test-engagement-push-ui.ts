import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
// The production frontend runs normally. Route only notification API requests
// to the configured local Worker. Browser push provisioning is replaced, while
// real permission, SW registration, API auth, encrypted storage and watches run.
const fixture = await Bun.file('/tmp/trptools-engagement-fixture.json').json();
const origin = 'http://localhost:54100', worker = 'http://localhost:54002';
const headers = { cookie: `access_token=${fixture.token}`, origin: 'http://localhost:54000', 'content-type': 'application/json' };
for (const eventId of [undefined, fixture.eventId]) {
    const response = await fetch(`${worker}/notifications/groups/${fixture.groupId}`, { method: 'PUT', headers, body: JSON.stringify({ enabled: false, eventId }) });
    assert.equal(response.status, 200);
}
const ecdh = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
const keys = { p256dh: Buffer.from(await crypto.subtle.exportKey('raw', ecdh.publicKey)).toString('base64url'), auth: Buffer.alloc(16, 1).toString('base64url') };
const endpoint = 'https://fcm.googleapis.com/fcm/send/' + crypto.randomUUID();
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Chromium.app/Contents/MacOS/Chromium' });
try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.grantPermissions(['notifications'], { origin });
    await context.addCookies([{ name: 'access_token', value: fixture.token, url: origin, httpOnly: true, sameSite: 'Lax' }]);
    await context.addInitScript(({ keys, endpoint }) => {
        const value = () => {
            const stored = localStorage.getItem('qa:push');
            if (!stored) return null;
            const key = JSON.parse(stored);
            return { endpoint, options: { applicationServerKey: Uint8Array.from(key).buffer },
                toJSON: () => ({ endpoint, keys }),
                unsubscribe: async () => { localStorage.removeItem('qa:push'); return true; } };
        };
        PushManager.prototype.getSubscription = async () => value() as PushSubscription | null;
        PushManager.prototype.subscribe = async (options) => {
            localStorage.setItem('qa:push', JSON.stringify(Array.from(new Uint8Array(options!.applicationServerKey as ArrayBuffer))));
            return value() as PushSubscription;
        };
    }, { keys, endpoint });
    await context.route('http://localhost:54101/notifications/**', async route => {
        const response = await route.fetch({ url: route.request().url().replace('http://localhost:54101', worker), headers: { ...route.request().headers(), origin: 'http://localhost:54000' } });
        await route.fulfill({ response, headers: { ...response.headers(), 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true' } });
    });
    const page = await context.newPage(); page.setDefaultTimeout(20000);
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${origin}/g/${fixture.groupSlug}/shift/evening-service`);
    await page.getByRole('button', { name: 'Remind me', exact: true }).last().click();
    await page.getByRole('button', { name: 'Reminders on', exact: true }).first().waitFor();
    assert.equal(await page.getByRole('button', { name: 'Reminders on', exact: true }).count(), 2);
    await page.waitForFunction(() => !document.body.innerText.includes('Enable on this device'));
    assert.equal(await page.evaluate(async () => Boolean(await navigator.serviceWorker.getRegistration('/'))), true);
    const state = await (await fetch(`${worker}/notifications/groups/${fixture.groupId}?eventId=${fixture.eventId}`, { headers })).json();
    assert.equal(state.shiftReminder, true); assert.ok(state.deviceCount > 0);
    await page.screenshot({ path: '/tmp/trptools-engagement-visual/shift-reminders-enabled-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: '/tmp/trptools-engagement-visual/shift-reminders-enabled-375.png', fullPage: true });
    await page.goto(`${origin}/settings/notifications`);
    await page.getByRole('button', { name: 'Turn off this device', exact: true }).click();
    await page.getByText('Enable reminders on a group or shift page to set up this browser.', { exact: true }).waitFor();
    assert.equal(await page.evaluate(async () => Boolean(await (await navigator.serviceWorker.getRegistration('/'))?.pushManager.getSubscription())), false);
    // Revoking this browser does not silently remove reminders on other devices.
    const after = await (await fetch(`${worker}/notifications/groups/${fixture.groupId}?eventId=${fixture.eventId}`, { headers })).json();
    assert.equal(after.shiftReminder, true);
    assert.deepEqual(errors, []);
    console.log('Notification browser flow passed: explicit permission, real SW registration, encrypted API subscription, synchronized signup/header controls, mobile and device revocation.');
} finally {
    await fetch(`${worker}/notifications/subscription`, { method: 'DELETE', headers, body: JSON.stringify({ endpoint }) });
    await fetch(`${worker}/notifications/groups/${fixture.groupId}`, { method: 'PUT', headers, body: JSON.stringify({ enabled: false, eventId: fixture.eventId }) });
    await browser.close();
}
