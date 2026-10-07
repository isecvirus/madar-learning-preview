export async function ready(page, path) {
  await page.waitForFunction(
    (path) =>
      document.documentElement.dataset.appReady === 'true' &&
      document.querySelector('#main')?.dataset.route === path,
    path.split('?')[0],
  );
  await page.evaluate(() => document.fonts.ready);
}
export async function settleImages(page) {
  const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
  const images = page.locator('#main img');
  for (let index = 0; index < (await images.count()); index++) {
    const img = images.nth(index);
    await img.scrollIntoViewIfNeeded();
    await page.waitForFunction((index) => {
      const img = document.querySelectorAll('#main img')[index];
      return img.complete && img.naturalWidth > 1 && !img.currentSrc.startsWith('data:');
    }, index);
    await img.evaluate((node) => node.decode());
  }
  await page.evaluate(async (scroll) => {
    window.scrollTo({ top: scroll.y, left: scroll.x, behavior: 'instant' });
    await document.fonts.ready;
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
  }, scroll);
}
