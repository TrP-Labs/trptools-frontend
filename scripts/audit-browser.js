async page => {
  await page.goto('http://localhost:54382/settings/appearance');
  await page.getByRole('heading', { name: 'Appearance', exact: true }).waitFor();
  const timezone = page.getByRole('combobox', { name: 'Time zone', exact: true });
  await timezone.waitFor();
  if (!(await timezone.getAttribute('aria-describedby'))) throw new Error('Timezone help is not associated');
  await page.route('**/users/me/preferences', route => route.fulfill({ status: 503, body: 'Internal Server Error' }));
  await page.getByRole('button', { name: 'Light', exact: false }).click();
  await page.getByText('Saved on this device, but could not sync to your account').waitFor();
  await page.unroute('**/users/me/preferences');
  for (const width of [1440, 768, 375, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/settings/appearance', '/tools/dispatch', '/groups', '/shifts']) {
      await page.goto('http://localhost:54382' + path);
      await page.locator('main').waitFor();
      const size = await page.evaluate(() => ({ visible: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
      if (size.content > size.visible) throw new Error('Horizontal overflow ' + path + ' at ' + width + ': ' + JSON.stringify(size));
    }
  }
  console.log('PASS: settings failure feedback, accessible timezone field and five pages at four viewport widths');
}
