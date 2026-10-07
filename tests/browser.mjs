import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { courses } from '../src/content.js';
import { STORAGE_KEY } from '../src/core.js';
import { launch, visit, completeLessons, answerQuiz } from '../tools/browser-helpers.mjs';
import { settleImages, ready } from '../tools/capture-ready.mjs';

const browser = await launch();
const report = { flows: [], accessibility: [], layouts: [], errors: [] };
const axeSource = await readFile(
  new URL('../node_modules/axe-core/axe.min.js', import.meta.url),
  'utf8',
);
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  });
  page.on('pageerror', (error) => report.errors.push(error.message));
  await visit(page, '/');
  await settleImages(page);
  assert.equal(await page.locator('#main h1').count(), 1);
  assert.equal(await page.locator('#main .course-card').count(), 3);
  assert.ok(
    await page
      .locator('#main img')
      .evaluateAll((images) =>
        images.every((img) => img.getBoundingClientRect().height > 100 && img.naturalWidth > 1),
      ),
  );
  report.flows.push('Home and local images');

  await visit(page, '/courses');
  await page.locator('#course-search').fill('سِيرة');
  await page.waitForFunction(
    () => document.querySelectorAll('#catalog-results .course-card').length === 1,
  );
  assert.match(await page.locator('.course-card h3').textContent(), /سيرة/);
  await page.locator('[data-category="digital"]').click();
  assert.equal(await page.locator('.course-card').count(), 0);
  await page.locator('[data-action="reset-filters"]').click();
  assert.equal(await page.locator('.course-card').count(), 3);
  report.flows.push('Search, category filter and reset');

  await visit(page, '/learn/excel/quiz');
  assert.equal(await page.locator('#quiz-form').count(), 0);
  assert.match(await page.locator('.quiz-locked').textContent(), /أكمل الدروس/);
  await visit(page, '/learn/excel/organize');
  assert.equal(await page.locator('[data-action="complete-lesson"]').isDisabled(), true);
  await page.locator('[name="practice"][value="0"]').check();
  await page.locator('#practice-form button').click();
  assert.equal(await page.locator('[data-action="complete-lesson"]').isDisabled(), true);
  assert.match(await page.locator('#practice-feedback').textContent(), /جرّب/);
  const note = 'أحافظ على عمود مستقل لكل معلومة. <img src=x onerror=alert(1)>';
  await page.locator('#lesson-note').fill(note);
  await page.reload();
  await ready(page, '/learn/excel/organize');
  assert.equal(await page.locator('#lesson-note').inputValue(), note);
  report.flows.push('Practice gating, wrong feedback and note persistence');

  await completeLessons(page, courses[0]);
  await answerQuiz(page, courses[0], false);
  assert.match(await page.locator('.result-score').textContent(), /0%/);
  await page.locator('[data-action="retry-quiz"]').click();
  await answerQuiz(page, courses[0], true);
  assert.match(await page.locator('.result-score').textContent(), /100%/);
  await page.reload();
  await ready(page, '/learn/excel/quiz');
  assert.equal(await page.locator('.quiz-result.passed').count(), 1);
  await page.locator('[data-action="retry-quiz"]').click();
  await answerQuiz(page, courses[0], false);
  await visit(page, '/my-learning');
  assert.equal(
    await page.locator('.course-card [role="progressbar"]').getAttribute('aria-valuenow'),
    '100',
  );
  assert.equal(await page.locator('.note-card img').count(), 0);
  assert.match(await page.locator('.note-card p').textContent(), /<img src=x/);
  report.flows.push('Failed quiz, retake, persisted pass and safe notes');
  await page.locator('[data-learning-filter="active"]').click();
  assert.equal(await page.locator('.course-card').count(), 0);
  await page.locator('[data-learning-filter="completed"]').click();
  assert.equal(await page.locator('.course-card').count(), 1);
  report.flows.push('Dashboard status filters');

  const routes = [
    '/',
    '/courses',
    '/course/excel',
    '/course/resume',
    '/course/planning',
    '/my-learning',
    '/learn/excel/organize',
    '/learn/excel/quiz',
    '/learn/resume/experience',
    '/learn/planning/focus',
    '/missing',
  ];
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of routes) {
      await visit(page, path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      assert.equal(overflow, false, `Horizontal overflow: ${width} ${path}`);
      const digits = await page.locator('#main').innerText();
      assert.equal(/[٠-٩۰-۹]/.test(digits), false, `Non-Latin digits: ${path}`);
      report.layouts.push({ path, width });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page, '/');
  await page.locator('#menu-button').click();
  assert.equal(await page.locator('#mobile-nav').isVisible(), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#mobile-nav').isVisible(), false);
  report.flows.push('Mobile menu and Escape');

  for (const path of [
    '/',
    '/courses',
    '/course/excel',
    '/learn/excel/organize',
    '/learn/excel/quiz',
    '/my-learning',
  ]) {
    await visit(page, path);
    await page.addScriptTag({ content: axeSource });
    const violations = await page.evaluate(async () =>
      (
        await window.axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
        })
      ).violations.map((item) => ({
        id: item.id,
        impact: item.impact,
        nodes: item.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })),
      })),
    );
    report.accessibility.push({ path, violations });
  }
  await visit(page, '/my-learning');
  await page.locator('[data-action="open-reset"]').click();
  assert.equal(await page.locator('#reset-dialog').isVisible(), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#reset-dialog').isVisible(), false);
  await page.locator('[data-action="open-reset"]').click();
  await page.locator('[data-action="confirm-reset"]').click();
  assert.equal(await page.locator('.course-card').count(), 0);
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY), null);
  report.flows.push('Reset confirmation and cancellation');
  assert.deepEqual(report.errors, []);
  await mkdir(new URL('../test-results/', import.meta.url), { recursive: true });
  await writeFile(
    new URL('../test-results/browser.json', import.meta.url),
    JSON.stringify(report, null, 2),
  );
  const violations = report.accessibility.flatMap((item) =>
    item.violations.map((violation) => ({ path: item.path, ...violation })),
  );
  if (violations.length) console.log(JSON.stringify(violations, null, 2));
  assert.equal(violations.length, 0, 'Accessibility violations');
  console.log(
    `${report.flows.length} flows, ${report.layouts.length} responsive states, ${report.accessibility.length} accessibility checks passed.`,
  );
} finally {
  await browser.close();
}
