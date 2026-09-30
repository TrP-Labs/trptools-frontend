import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const fixture = JSON.parse(await readFile('/tmp/trptools-engagement-fixture.json', 'utf8'));
const origin = process.env.ENGAGEMENT_UI_ORIGIN ?? 'http://localhost:54000';
const apiOrigin = process.env.ENGAGEMENT_API_ORIGIN ?? 'http://localhost:54001';
// Each run restores only its own fixture, making failed interaction checks repeatable.
for (const groupId of fixture.groupIds) await fetch(apiOrigin + '/users/me/follows/' + groupId, { method: 'PUT', headers: { cookie: `access_token=${fixture.token}`, origin, 'content-type': 'application/json' }, body: JSON.stringify({ following: true }) });
const { DEFAULT_HOME_LAYOUT } = await import('../../trptools-backend/src/users/homeLayout');
await fetch(apiOrigin + '/users/me/preferences', { method: 'PATCH', headers: { cookie: `access_token=${fixture.token}`, origin, 'content-type': 'application/json' }, body: JSON.stringify({ homeLayout: DEFAULT_HOME_LAYOUT, homeMode: 'user', instantRedirects: false }) });
const output = '/tmp/trptools-engagement-visual';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Chromium.app/Contents/MacOS/Chromium' });
const results: unknown[] = [];
let currentPage: import('playwright-core').Page | undefined;
try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addCookies([{ name: 'access_token', value: fixture.token, url: origin, httpOnly: true, sameSite: 'Lax' }]);
    const page = await context.newPage(); currentPage = page; page.setDefaultTimeout(20000);
    page.on('pageerror', error => console.log('BROWSER ERROR', error.message));
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    page.on('console', message => { if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text()); });
    async function check(label: string) {
        const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
        assert.equal(dimensions.width, dimensions.scroll, label + ' has horizontal overflow');
        await page.screenshot({ path: `${output}/${label}.png`, fullPage: true });
        results.push({ label, ...dimensions });
    }
    await page.goto(origin + '/?view=user'); await page.waitForLoadState('networkidle');
    try { await page.getByTestId('home-widgets').waitFor(); } catch (error) { console.log(page.url(), (await page.locator('body').innerText()).slice(0,1600), errors); throw error; }
    assert.ok((await page.locator('[data-widget="my-shifts"]').innerText()).includes('Evening island service'));
    await check('home-user-desktop');
    await page.getByRole('button', { name: 'Customize', exact: true }).click();
    await page.getByRole('button', { name: 'Add widget', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    await check('widget-picker-desktop');
    if (await page.getByRole('dialog').getByRole('button', { name: /Local time/ }).isEnabled()) await page.getByRole('dialog').getByRole('button', { name: /Local time/ }).click(); else await page.getByRole('button', { name: 'Close', exact: true }).click();
    if (await page.getByRole('dialog').isVisible()) await page.getByRole('dialog').getByRole('button', { name: 'Done', exact: true }).click();
    await page.locator('[data-widget="clock"]').waitFor();
    const before = await page.locator('[data-widget]').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-widget')));
    await page.locator('[data-widget="clock"]').getByRole('button', { name: /Move.*up/ }).click();
    const after = await page.locator('[data-widget]').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-widget')));
    assert.notDeepEqual(before, after);
    await page.getByRole('button', { name: 'Save layout', exact: true }).click();
    await page.getByRole('button', { name: 'Customize', exact: true }).waitFor();
    await page.reload();
    assert.deepEqual(await page.locator('[data-widget]').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-widget'))), after);
    await page.getByRole('button', { name: 'Switch to host homepage' }).click();
    await page.locator('[data-widget="summary"]').waitFor(); await check('home-host-desktop');
    await page.goto(origin + '/g/' + fixture.groupSlug);
    const following = page.getByRole('button', { name: 'Following', exact: true }); await following.waitFor();
    await following.click(); await page.getByRole('button', { name: 'Follow group', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Follow group', exact: true }).click(); await following.waitFor();
    await check('group-desktop');
    await page.goto(origin + '/g/' + fixture.groupSlug + '/shift/evening-service');
    await page.getByText('Trolleybus driver', { exact: true }).first().waitFor();
    if (process.env.ENGAGEMENT_PUSH_CONFIGURED === 'false') await page.getByText('Browser reminders are not configured on this instance yet.', { exact: true }).first().waitFor();
    else assert.ok((await page.locator('body').innerText()).includes('10 minutes'));
    assert.equal(await page.getByRole('button', { name: 'Remind me', exact: true }).count(), 2, 'shift header and gentle signup prompt both exist');
    await check('shift-desktop');
    const reminders = page.getByRole('button', { name: 'Remind me', exact: true });
    if (process.env.ENGAGEMENT_PUSH_CONFIGURED !== 'false') { await reminders.first().click(); await page.getByText(/not allowed|browser.*settings/i).first().waitFor(); }
    await page.goto(origin + '/g/' + fixture.groupSlug + '/join/discord');
    await page.getByRole('link', { name: 'Join on Discord', exact: true }).waitFor();
    assert.ok((await page.locator('body').innerText()).includes('own terms'));
    await check('join-desktop');
    await page.goto(origin + '/dashboard/' + fixture.groupSlug + '/settings?section=join');
    // ObjectPage's tab URLs select the section; follow its actual rendered link.
    await page.getByLabel('Discord invite', { exact: true }).waitFor();
    await check('join-settings-desktop');
    await page.goto(origin + '/dashboard/' + fixture.groupSlug + '/statistics');
    await page.getByRole('heading', { name: 'Statistics', exact: true }).waitFor();
    assert.ok((await page.locator('body').innerText()).includes('60% favorites'));
    await check('statistics-desktop');
    for (const width of [375, 320]) {
        await page.setViewportSize({ width, height: 812 });
        for (const [path, label] of [
            ['/?view=user', 'home-user'], ['/?view=host', 'home-host'], ['/g/' + fixture.groupSlug, 'group'],
            ['/g/' + fixture.groupSlug + '/shift/evening-service', 'shift'], ['/g/' + fixture.groupSlug + '/join/discord', 'join'],
            ['/dashboard/' + fixture.groupSlug + '/statistics', 'statistics'], ['/settings', 'account'], ['/settings/notifications', 'notifications'], ['/settings/behavior', 'behavior'], ['/g/' + fixture.groupSlug + '/route/15', 'route']
        ]) {
            await page.goto(origin + path); await page.locator('main').waitFor();
            await check(`${label}-${width}`);
        }
        await page.goto(origin + '/?view=user'); await page.waitForLoadState('networkidle'); await page.getByRole('button', { name: 'Customize', exact: true }).click();
        await page.getByRole('button', { name: 'Add widget', exact: true }).click(); await page.getByRole('dialog').waitFor();
        await check(`widget-picker-${width}`);
        await page.getByRole('button', { name: 'Close', exact: true }).click();
        await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    }
    const { USER_WIDGETS, HOST_WIDGETS } = await import('../../trptools-backend/src/users/homeLayout');
    const allLayouts = { user: USER_WIDGETS.map(id => ({ id, width: ['next', 'week', 'following'].includes(id) ? 2 : 1 })), host: HOST_WIDGETS.map(id => ({ id, width: ['next', 'week', 'groups', 'host-tools'].includes(id) ? 2 : 1 })) };
    await fetch(apiOrigin + '/users/me/preferences', { method: 'PATCH', headers: { cookie: `access_token=${fixture.token}`, origin, 'content-type': 'application/json' }, body: JSON.stringify({ homeLayout: allLayouts }) });
    for (const width of [1440, 375]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const mode of ['user', 'host']) {
            await page.goto(origin + '/?view=' + mode);
            await page.getByTestId('home-widgets').waitFor();
            assert.equal(await page.locator('[data-widget]').count(), mode === 'user' ? USER_WIDGETS.length : HOST_WIDGETS.length);
            await check(`all-widgets-${mode}-${width}`);
        }
    }
    // Verify opt-in browser redirect without actually opening an external site.
    const response = await fetch(apiOrigin + '/users/me/preferences', { method: 'PATCH', headers: { cookie: `access_token=${fixture.token}`, origin, 'content-type': 'application/json' }, body: JSON.stringify({ instantRedirects: true }) });
    assert.equal(response.status, 200);
    let redirected = false;
    await page.route('https://discord.gg/**', route => { redirected = true; return route.fulfill({ status: 200, body: 'External destination intercepted for QA' }); });
    await page.goto(origin + '/g/' + fixture.groupSlug + '/join/discord');
    await page.waitForURL('https://discord.gg/**'); assert.equal(redirected, true);
    await fetch(apiOrigin + '/users/me/preferences', { method: 'PATCH', headers: { cookie: `access_token=${fixture.token}`, origin, 'content-type': 'application/json' }, body: JSON.stringify({ instantRedirects: false }) });
    assert.deepEqual(errors, []);
    await writeFile(output + '/results.json', JSON.stringify({ results, errors }, null, 2));
    console.log(JSON.stringify({ captures: results.length, errors }));
} catch(error) { if(currentPage) { console.log(currentPage.url(), (await currentPage.locator('body').innerText()).slice(0,2500)); await currentPage.screenshot({path:output+'/failure.png',fullPage:true}); } throw error; } finally { await browser.close(); }
