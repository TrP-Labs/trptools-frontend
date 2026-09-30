import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { DEFAULT_HOME_LAYOUT } from '../../trptools-backend/src/users/homeLayout';
const fixture = await Bun.file('/tmp/trptools-engagement-fixture.json').json();
const origin = process.env.ENGAGEMENT_UI_ORIGIN ?? 'http://localhost:54100';
const apiOrigin = process.env.ENGAGEMENT_API_ORIGIN ?? 'http://localhost:54101';
const headers = { cookie: `access_token=${fixture.token}`, origin, 'content-type': 'application/json' };
const output = 'output/playwright/widget-ux';
await mkdir(output, { recursive: true });
async function clearRoutePreference() { const response = await fetch(apiOrigin + '/users/me/routes/' + fixture.routeId, { method: 'PUT', headers, body: JSON.stringify({ preference: 'NONE' }) }); assert.equal(response.status, 200); }
async function preferences(body: object) { const response = await fetch(apiOrigin + '/users/me/preferences', { method: 'PATCH', headers, body: JSON.stringify(body) }); assert.equal(response.status, 200); }
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Chromium.app/Contents/MacOS/Chromium' });
const results: string[] = [], errors: string[] = [];
let current: Page;
function order(page: Page) { return page.locator('[data-widget]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-widget'))); }
async function capture(page: Page, label: string) {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const size = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    assert.equal(size.viewport, size.content, label + ' overflow');
    await page.screenshot({ path: `${output}/${label}.png`, fullPage: true });
}
try {
    await clearRoutePreference();
    for (const path of ['/settings/notifications', '/settings/behavior']) { const response = await fetch(origin + path, { redirect: 'manual' }); assert.equal(response.status, 303); assert.equal(new URL(response.headers.get('location')!, origin).pathname, '/login'); }
    await preferences({ homeLayout: DEFAULT_HOME_LAYOUT, homeMode: 'user', instantRedirects: false, primaryGroupId: null });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addCookies([{ name: 'access_token', value: fixture.token, url: origin, httpOnly: true, sameSite: 'Lax' }]);
    const page = current = await context.newPage(); page.setDefaultTimeout(15000);
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/?view=user');
    const customize = page.getByRole('button', { name: 'Customize', exact: true });
    await customize.click();
    const original = await order(page);
    await page.getByRole('button', { name: 'Add widget', exact: true }).click();
    const dialog = page.getByRole('dialog'), search = dialog.getByRole('textbox', { name: 'Find a widget' });
    await search.fill('nonexistent'); await page.getByText('No widgets match your search.').waitFor();
    await search.fill('Local time'); await dialog.getByRole('button', { name: /Local time/ }).click();
    assert.equal(await dialog.getByRole('button', { name: /Local time/ }).isEnabled(), false);
    assert.equal(await search.evaluate(node => document.activeElement === node), true);
    await search.fill('Week'); await dialog.getByRole('button', { name: /^Your week/ }).click();
    await search.fill(''); await capture(page, 'picker-desktop');
    await dialog.getByRole('button', { name: 'Done', exact: true }).click();
    assert.equal(await page.locator('[data-widget="clock"]').count(), 1);
    assert.equal(await page.locator('[data-widget="week"]').count(), 1);
    results.push('Search, empty results, multi-add, duplicates and focus');
    const clock = page.locator('[data-widget="clock"]');
    const up = clock.getByRole('button', { name: /Move.*up/ }); await up.click();
    assert.equal(await up.evaluate(node => document.activeElement === node), true);
    await clock.getByRole('combobox').selectOption('0');
    assert.equal((await order(page))[0], 'clock');
    await clock.getByRole('button', { name: /Resize/ }).click();
    assert.equal(await clock.getAttribute('data-width'), '2');
    await capture(page, 'editor-desktop');
    await page.locator('[data-widget="week"]').getByRole('button', { name: /Remove/ }).click();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.deepEqual(await order(page), original);
    results.push('Keyboard reorder, position select, resize, remove and cancel');
    await customize.click();
    const source = page.locator('[data-widget="tools"]');
    await source.locator('[data-drag-handle]').scrollIntoViewIfNeeded();
    await source.locator('[data-drag-handle]').dragTo(page.locator('[data-widget="next"]'), { targetPosition: { x: 180, y: 180 } });
    assert.equal((await order(page))[0], 'tools', 'Drop on the body of a card should reorder');
    const afterDrag = await order(page);
    let fail = true, writes = 0;
    await page.route(apiOrigin + '/users/me/preferences', async route => {
        if (route.request().method() !== 'PATCH') { await route.continue(); return; }
        writes++;
        if (fail) { fail = false; await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'QA save failure' }), headers: { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true' } }); return; }
        await new Promise(resolve => setTimeout(resolve, 800)); await route.continue();
    });
    const save = page.getByRole('button', { name: 'Save layout', exact: true }); await save.click();
    await page.getByRole('alert').waitFor(); assert.deepEqual(await order(page), afterDrag);
    await save.click();
    assert.equal(await save.isDisabled(), true); assert.equal(await page.getByRole('button', { name: 'Cancel', exact: true }).isDisabled(), true);
    assert.equal(await page.getByRole('button', { name: 'Add widget', exact: true }).isDisabled(), true);
    assert.equal(await source.getByRole('combobox').isDisabled(), true);
    await customize.waitFor(); assert.equal(writes, 2);
    await page.unroute(apiOrigin + '/users/me/preferences');
    await page.reload(); assert.deepEqual(await order(page), afterDrag);
    results.push('Whole-card desktop drag, failed save retry, pending controls, reload persistence');
    await customize.click(); await page.locator('[data-widget="tools"]').getByRole('button', { name: /Move.*down/ }).click();
    page.once('dialog', dialog => dialog.dismiss()); await page.locator('header').getByRole('link', { name: 'Shifts', exact: true }).first().click();
    assert.equal(new URL(page.url()).pathname, '/'); await page.getByTestId('widget-editor').waitFor();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.deepEqual(await order(page), afterDrag);
    await page.getByRole('button', { name: 'Switch to host homepage' }).click();
    await page.locator('[data-widget="summary"]').waitFor();
    assert.deepEqual(await order(page), DEFAULT_HOME_LAYOUT.host.map(item => item.id));
    assert.equal(await page.getByRole('button', { name: 'Switch to user homepage' }).locator('svg').count(), 1);
    const staffGroups = page.locator('[data-widget="groups"]');
    await staffGroups.getByRole('button', { name: 'Make North Island Transit your primary group', exact: true }).click();
    await staffGroups.getByRole('button', { name: 'Unpin North Island Transit', exact: true }).waitFor();
    await page.reload(); await staffGroups.getByRole('button', { name: 'Unpin North Island Transit', exact: true }).click();
    await staffGroups.getByRole('button', { name: 'Make North Island Transit your primary group', exact: true }).waitFor();
    await page.goto(origin + '/'); await page.locator('[data-widget="summary"]').waitFor();
    await page.getByRole('button', { name: 'Switch to user homepage' }).click();
    await page.locator('[data-widget="tools"]').waitFor(); assert.deepEqual(await order(page), afterDrag);
    results.push('Unsaved navigation guard and independent user/host layouts with persisted mode');
    await preferences({ homeLayout: { user: [{ id: 'week', width: 2 }, { id: 'my-shifts', width: 1 }, { id: 'reminders', width: 1 }], host: DEFAULT_HOME_LAYOUT.host } });
    await page.reload();
    const week = page.locator('[data-widget="week"]'), days = week.getByRole('button');
    await days.nth(1).click(); assert.equal(await days.nth(1).getAttribute('aria-pressed'), 'true');
    assert.ok(await week.getByRole('link', { name: /Evening island service/ }).count());
    const signupLink = page.locator('[data-widget="my-shifts"]').getByRole('link', { name: /Evening island service/ });
    const href = await signupLink.getAttribute('href'); assert.ok(href?.includes('#occurrence-')); await signupLink.click(); await page.waitForURL('**#occurrence-*');
    const allAnchors = await page.locator('[id^="occurrence-"]').evaluateAll(nodes => nodes.map(node => node.id)); assert.equal(allAnchors.length, new Set(allAnchors).size, 'Occurrence anchors must be unique');
    const target = page.locator(page.url().slice(page.url().indexOf('#'))); await target.waitFor();
    assert.equal(await target.count(), 1); assert.ok((await target.innerText()).includes('Trolleybus driver'));
    await page.goto(origin + '/shifts?signedUp=1'); assert.equal(await page.getByRole('link', { name: /Cat Island connections/ }).count(), 0);
    await page.goto(origin + '/?view=user'); await page.locator('[data-widget="reminders"]').getByRole('link', { name: 'Notification settings' }).click();
    await page.waitForURL('**/settings/notifications'); await page.getByRole('heading', { name: 'Notifications', exact: true }).waitFor();
    await page.goto(origin + '/g/' + fixture.groupSlug + '/join/discord'); await page.getByRole('link', { name: 'Behavior', exact: true }).click();
    await page.getByRole('heading', { name: 'Behavior', exact: true }).waitFor();
    const redirectSwitch = page.getByRole('switch', { name: 'Go directly to external sites' });
    assert.equal(await redirectSwitch.getAttribute('aria-checked'), 'false'); await redirectSwitch.click(); await page.getByRole('button', { name: 'Save', exact: true }).click(); await page.getByText('Settings saved', { exact: true }).waitFor();
    await page.reload(); assert.equal(await redirectSwitch.getAttribute('aria-checked'), 'true');
    await redirectSwitch.click(); await page.getByRole('button', { name: 'Save', exact: true }).click(); await page.getByText('Settings saved', { exact: true }).waitFor();
    await capture(page, 'behavior-desktop');
    assert.equal(await page.locator('header a[href="/bot"]').count(), 0);
    results.push('Calendar days, exact signup anchors, signed-up filter, notification and Behavior links, header navigation');
    await page.goto(origin + '/g/' + fixture.groupSlug + '/route/15');
    await page.getByRole('button', { name: 'Favorite or dislike route 15', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Favorite', exact: true }).click();
    await page.getByRole('button', { name: 'You favorited route 15 — press to clear it', exact: true }).waitFor();
    await preferences({ homeLayout: { user: [{ id: 'favorites', width: 1 }], host: DEFAULT_HOME_LAYOUT.host } });
    await page.goto(origin + '/?view=user'); await page.locator('[data-widget="favorites"] li').getByText('15', { exact: true }).waitFor();
    assert.equal(await page.locator('[data-widget="favorites"]').getByRole('link', { name: 'Use your route preferences in solo dispatch' }).getAttribute('href'), '/tools/dispatch');
    await page.goto(origin + '/g/' + fixture.groupSlug + '/route/15'); await page.getByRole('button', { name: 'You favorited route 15 — press to clear it', exact: true }).click();
    await page.getByRole('button', { name: 'Favorite or dislike route 15', exact: true }).waitFor();
    results.push('Persisted primary group pin and actionable favorite route widget');
    await preferences({ homeLayout: { user: [], host: DEFAULT_HOME_LAYOUT.host } });
    await page.goto(origin + '/?view=user'); await page.getByRole('button', { name: 'Add widget', exact: true }).click();
    await dialog.getByRole('button', { name: /Local time/ }).click(); await dialog.getByRole('button', { name: 'Done', exact: true }).click();
    await save.click(); await customize.waitFor(); assert.deepEqual(await order(page), ['clock']);
    await customize.click(); await page.getByRole('button', { name: 'Reset layout', exact: true }).click();
    assert.deepEqual(await order(page), DEFAULT_HOME_LAYOUT.user.map(item => item.id));
    await save.click(); await customize.waitFor();
    results.push('Empty homepage recovery and reset in preview');
    const mobile = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
    await mobile.addCookies([{ name: 'access_token', value: fixture.token, url: origin, httpOnly: true, sameSite: 'Lax' }]);
    const phone = current = await mobile.newPage(); phone.setDefaultTimeout(15000); phone.on('pageerror', error => errors.push(error.message));
    await preferences({ homeLayout: { user: [{ id: 'account', width: 1 }, { id: 'clock', width: 1 }, { id: 'tools', width: 1 }], host: DEFAULT_HOME_LAYOUT.host } });
    await phone.goto(origin + '/?view=user'); await phone.getByRole('button', { name: 'Customize', exact: true }).click();
    await capture(phone, 'editor-mobile');
    const handle = phone.locator('[data-widget="account"] [data-drag-handle]');
    await handle.scrollIntoViewIfNeeded();
    const from = (await handle.boundingBox())!, to = (await phone.locator('[data-widget="clock"]').boundingBox())!;
    const cdp = await mobile.newCDPSession(phone);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x + 20, y: from.y + 20 }] });
    for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + 20 + (to.x + 150 - from.x - 20) * i / 10, y: from.y + 20 + (to.y + 30 - from.y - 20) * i / 10 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.deepEqual(await order(phone), ['clock', 'account', 'tools'], 'Touch dragging should reorder');
    await phone.locator('[data-widget="tools"]').getByRole('combobox').selectOption('0');
    await phone.locator('[data-widget="tools"]').getByRole('button', { name: /Resize/ }).click();
    await phone.getByRole('button', { name: 'Save layout', exact: true }).click(); await phone.getByRole('button', { name: 'Customize', exact: true }).waitFor();
    await phone.reload(); assert.deepEqual(await order(phone), ['tools', 'clock', 'account']); assert.equal(await phone.locator('[data-widget="tools"]').getAttribute('data-width'), '2');
    await capture(phone, 'home-mobile');
    await phone.setViewportSize({ width: 320, height: 812 }); await phone.getByRole('button', { name: 'Customize', exact: true }).click(); assert.equal(await phone.locator('[data-widget] fieldset button').evaluateAll(nodes => nodes.every(node => { const icon = node.querySelector('svg'); return icon && icon.getBoundingClientRect().width > 0 && icon.querySelectorAll('path[d]').length > 0 && node.getBoundingClientRect().height >= 36; })), true, 'Reopened editor controls must render icons and usable targets'); await capture(phone, 'editor-320'); await phone.getByRole('button', { name: 'Cancel', exact: true }).click();
    for (const width of [375, 320]) {
        await phone.setViewportSize({ width, height: 812 });
        for (const [path, label] of [[`/g/${fixture.groupSlug}`, 'group'], [`/g/${fixture.groupSlug}/shift/evening-service`, 'shift'], [`/g/${fixture.groupSlug}/route/15`, 'route'], ['/settings/notifications', 'notifications'], ['/settings/behavior', 'behavior']]) {
            await phone.goto(origin + path); await phone.locator('main').waitFor(); if (label === 'group') await phone.getByRole('button', { name: 'Following', exact: true }).waitFor(); await capture(phone, `${label}-${width}`);
            if (label === 'route') { await phone.getByRole('button', { name: 'Favorite or dislike route 15', exact: true }).click(); const menu = phone.getByRole('menu'); await menu.waitFor(); const box = (await menu.boundingBox())!; assert.ok(box.x >= 0 && box.x + box.width <= width, 'Route preference menu must fit the viewport'); await phone.keyboard.press('Escape'); }
        }
    }
    results.push('Real mobile touch drag, position select, saved width and 375/320px layouts');
    assert.deepEqual(errors, []);
    await writeFile(`${output}/results.json`, JSON.stringify({ results, errors }, null, 2));
    console.log(JSON.stringify({ passed: results.length, results, errors }));
} catch(error) { console.log(current!.url(), (await current!.locator('body').innerText()).slice(0, 2500)); await current!.screenshot({ path: `${output}/failure.png`, fullPage: true }); throw error; }
finally { await clearRoutePreference(); await preferences({ homeLayout: DEFAULT_HOME_LAYOUT, homeMode: 'user', instantRedirects: false, primaryGroupId: null }); await browser.close(); }
