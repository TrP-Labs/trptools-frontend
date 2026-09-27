import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const fixture = JSON.parse(
	await readFile('/tmp/trptools-host-fixture.json', 'utf8'),
);
const output = fileURLToPath(
	new URL('../output/playwright/host-feature/', import.meta.url),
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
	headless: true,
	executablePath:
		process.env.CHROMIUM_PATH ??
		'/Applications/Chromium.app/Contents/MacOS/Chromium',
});
const results: any[] = [];
try {
	for (const [runtime, origin, backend] of [
		['docker', 'http://localhost:53000', 'http://localhost:53001'],
		['worker', 'http://localhost:53003', 'http://localhost:53002'],
	]) {
		if (runtime !== (process.env.HOST_UI_RUNTIME ?? 'docker')) continue;
		const context = await browser.newContext({
			viewport: { width: 1440, height: 1100 },
		});
		const token = fixture.showcaseToken ?? fixture.token;
		await context.addCookies([
			{
				name: 'access_token',
				value: token,
				url: origin!,
				httpOnly: true,
				sameSite: 'Lax',
			},
		]);
		const page = await context.newPage();
		page.setDefaultTimeout(20000);
		const errors: string[] = [];
		page.on('pageerror', (error) => errors.push(error.message));
		page.on('console', (message) => {
			if (message.type() === 'error') errors.push(message.text());
		});
		const prefix = runtime === 'docker' ? '' : runtime + '-';
		async function request(path: string, body?: unknown, method = 'POST') {
			const response = await fetch(backend + path, {
				method,
				headers: {
					cookie: `access_token=${token}`,
					'content-type': 'application/json',
				},
				body: body === undefined ? undefined : JSON.stringify(body),
			});
			if (!response.ok)
				throw new Error(`${path}: ${response.status} ${await response.text()}`);
			const text = await response.text();
			return text.startsWith('{') || text.startsWith('[')
				? JSON.parse(text)
				: text;
		}
		async function capture(options: { path: string; fullPage: boolean }) {
			await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
			await page.screenshot(options);
		}
		async function overflow() {
			assert.equal(
				await page.evaluate(
					() =>
						document.documentElement.scrollWidth -
						document.documentElement.clientWidth,
				),
				0,
			);
		}
		console.log(runtime, 'opening');
		await page.goto(`${origin}/dashboard/${fixture.groupSlug}/host`);
		await page.getByTestId('shift-timer').waitFor();
		await page
			.getByRole('button', { name: 'Import vehicle JSON', exact: true })
			.click();
		await page
			.locator('dialog[open] textarea')
			.fill(
				JSON.stringify(
					Array.from({ length: 12 }, (_, i) => ({
						Id: 101 + i,
						OwnerId: 200000 + i,
						Name: i < 10 ? 'ZiU-9 Trolleybus' : 'Service van',
						Depot: i % 2 ? 'Hardbass Island Depot' : 'Main Island Depot',
					})),
				),
			);
		await page
			.locator('dialog[open]')
			.getByRole('button', { name: 'Import', exact: true })
			.click();
		await page.locator('dialog[open]').waitFor({ state: 'hidden' });
		const vehicles = await request(
			'/dispatch/' + fixture.roomId,
			undefined,
			'GET',
		);
		assert.equal(vehicles.length, 12);
		await request('/dispatch/' + fixture.roomId + '/solve', {});
		for (const vehicle of vehicles.slice(0, 6))
			await request(
				'/dispatch/' + fixture.roomId + '/vehicle/' + vehicle.id,
				{ assigned: true },
				'PATCH',
			);
		await page
			.locator('#host-note')
			.fill(
				'Main Island and Cat Island services are open. Dispatchers should send drivers back to their depot before the end.',
			);
		await page.locator('#host-owner').fill('123456');
		console.log(runtime, 'saving');
		const saved = page.waitForResponse(
			(response) =>
				response.url().endsWith('/note') &&
				response.request().method() === 'PUT',
		);
		await page
			.getByRole('button', { name: 'Save changes', exact: true })
			.click();
		assert.equal((await saved).status(), 200);
		await page
			.getByRole('button', { name: 'Save changes', exact: true })
			.waitFor({ state: 'visible' });
		// Draw a fixture announcement image in canvas, then exercise the real upload path.
		const png = await page.evaluate(() => {
			const canvas = document.createElement('canvas');
			canvas.width = 720;
			canvas.height = 220;
			const c = canvas.getContext('2d')!;
			c.fillStyle = '#172944';
			c.fillRect(0, 0, 720, 220);
			c.fillStyle = '#edf4ff';
			c.font = 'bold 30px sans-serif';
			c.fillText('Sunday afternoon service', 30, 55);
			c.font = '18px sans-serif';
			c.fillStyle = '#b4c9e9';
			c.fillText('Main Island • Cat Island', 30, 91);
			['10', '14', '16', '6', '9'].forEach((route, i) => {
				c.fillStyle = ['#4287f5', '#b763db', '#38ad87', '#ef9a41', '#d75a6e'][
					i
				]!;
				c.fillRect(30 + i * 80, 125, 64, 54);
				c.fillStyle = '#fff';
				c.font = 'bold 23px sans-serif';
				c.fillText(route, 48 + i * 80, 160);
			});
			return canvas.toDataURL('image/png').split(',')[1]!;
		});
		console.log(runtime, 'uploading', errors);
		const uploaded = page.waitForResponse(
			(response) =>
				response.url().endsWith('/image') &&
				response.request().method() === 'PUT',
		);
		await page
			.locator('input[type=file]')
			.setInputFiles({
				name: 'shift-announcement.png',
				mimeType: 'image/png',
				buffer: Buffer.from(png, 'base64'),
			});
		assert.equal((await uploaded).status(), 200);
		await page
			.getByRole('img', { name: 'Announcement image', exact: true })
			.waitFor();
		await page
			.getByRole('img', { name: 'Announcement image', exact: true })
			.evaluate((image: HTMLImageElement) => image.decode());
		const state = await request('/host/' + fixture.roomId, undefined, 'GET');
		const extension = page.waitForResponse(
			(response) =>
				response.url().endsWith('/extend') &&
				response.request().method() === 'POST',
		);
		await page
			.getByRole('button', { name: 'Add 5 minutes', exact: true })
			.click();
		assert.equal(
			(await (await extension).json()).endsAt,
			state.endsAt + 300000,
		);
		assert.equal(
			await page
				.getByRole('button', { name: 'Close room', exact: true })
				.isDisabled(),
			true,
		);
		for (const button of await page
			.getByRole('button', { name: 'Dismiss', exact: true })
			.all())
			await button.click();
		await page.waitForFunction(() =>
			Array.from(document.querySelectorAll('[aria-live=polite]')).every(
				(element) => element.children.length === 0,
			),
		);
		await overflow();
		await capture({
			path: output + prefix + '01-host-desktop.png',
			fullPage: true,
		});
		await page.setViewportSize({ width: 375, height: 900 });
		await overflow();
		await capture({
			path: output + prefix + '02-host-mobile.png',
			fullPage: true,
		});
		await page.setViewportSize({ width: 320, height: 820 });
		await overflow();
		await page.setViewportSize({ width: 1440, height: 1100 });
		const complete = page.locator('[data-event=complete]');
		await complete
			.getByRole('button', { name: 'Change time', exact: true })
			.click();
		await complete.locator('select').nth(0).selectOption('END');
		await complete.locator('select').nth(1).selectOption('1');
		await complete.locator('input[type=number]').fill('10');
		await capture({
			path: output + prefix + '05-event-timing.png',
			fullPage: true,
		});
		const timing = page.waitForResponse(
			(response) =>
				response.url().endsWith('/events/complete') &&
				response.request().method() === 'POST',
		);
		await complete
			.getByRole('button', { name: 'Set time', exact: true })
			.click();
		assert.equal((await timing).status(), 200);
		const rescheduled = await request(
			'/host/' + fixture.roomId,
			undefined,
			'GET',
		);
		assert.equal(
			rescheduled.timeline.find((item: any) => item.id === 'complete')
				.offsetMinutes,
			10,
		);
		await request('/host/' + fixture.roomId + '/events/return-depot', {
			operation: 'ACTIVATE',
		});
		await page.goto(`${origin}/dashboard/${fixture.groupSlug}/dispatch`);
		await page
			.getByRole('status')
			.filter({ hasText: 'Have drivers return to their depot' })
			.waitFor();
		await overflow();
		await capture({
			path: output + prefix + '06-dispatch-reminder.png',
			fullPage: true,
		});
		await page
			.getByRole('status')
			.filter({ hasText: 'Have drivers return to their depot' })
			.getByRole('button', { name: 'Acknowledge', exact: true })
			.click();
		await page
			.getByRole('status')
			.filter({ hasText: 'Have drivers return to their depot' })
			.waitFor({ state: 'hidden' });
		await page.goto(
			`${origin}/dashboard/${fixture.groupSlug}/settings?section=schedule`,
		);
		await page
			.getByRole('button', { name: 'Add custom reminder', exact: true })
			.waitFor();
		await overflow();
		await capture({
			path: output + prefix + '03-schedule-desktop.png',
			fullPage: true,
		});
		await page.setViewportSize({ width: 375, height: 900 });
		await overflow();
		await capture({
			path: output + prefix + '04-schedule-mobile.png',
			fullPage: true,
		});
		await page.setViewportSize({ width: 320, height: 820 });
		await overflow();
		await page
			.getByRole('button', { name: 'Add custom reminder', exact: true })
			.click();
		const scheduleSaved = page.waitForResponse(
			(response) =>
				response.url().includes('/host/schedule/') &&
				response.request().method() === 'PUT',
		);
		console.log(runtime, 'saving');
		await page
			.getByRole('button', { name: 'Save changes', exact: true })
			.click();
		assert.equal((await scheduleSaved).status(), 200);
		await context.addCookies([{ name: 'theme', value: 'light', url: origin! }]);
		await page.goto(`${origin}/dashboard/${fixture.groupSlug}/host`);
		await page.getByTestId('shift-timer').waitFor();
		await overflow();
		await capture({
			path: output + prefix + '07-host-light-mobile.png',
			fullPage: true,
		});
		await context.addCookies([
			{ name: 'theme', value: 'midnight', url: origin! },
		]);
		await page.setViewportSize({ width: 1440, height: 1100 });
		await page.goto(`${origin}/dashboard/${fixture.groupSlug}/host`);
		await page.getByTestId('shift-timer').waitFor();
		await overflow();
		await capture({
			path: output + prefix + '08-host-midnight.png',
			fullPage: true,
		});
		results.push({
			runtime,
			errors,
			import: true,
			imageUpload: true,
			extension: true,
			closePermission: true,
			reschedule: true,
			dispatcherAcknowledgment: true,
			scheduleSave: true,
			overflow320: 0,
			overflow375: 0,
		});
		await context.close();
	}
} finally {
	await browser.close();
}
await writeFile(
	output + (process.env.HOST_UI_RUNTIME ?? 'docker') + '-browser-results.json',
	JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results));
assert.equal(results.flatMap((row) => row.errors).length, 0);
