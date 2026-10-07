import { mkdir, writeFile } from 'node:fs/promises';
import { courses } from '../src/content.js';
import { launch, visit, capture, completeLessons, answerQuiz } from './browser-helpers.mjs';

await mkdir(new URL('../screenshots/', import.meta.url), { recursive: true });
const browser = await launch();
const captures = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1050 },
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  async function shot(name, full = true) {
    if (errors.length) throw Error(errors.join('\n'));
    await capture(page, name, full);
    captures.push({ name, viewport: page.viewportSize(), full });
  }
  await visit(page, '/');
  await shot('00-preview', false);
  await shot('01-home-desktop');
  await visit(page, '/courses');
  await shot('02-courses-desktop');
  await visit(page, '/course/excel');
  await shot('03-course-desktop');
  await visit(page, '/learn/excel/organize');
  await page
    .locator('#lesson-note')
    .fill('أخصص عمودًا لكل نوع من المعلومات، وأستخدم تنسيق العملة بدل كتابة «ريال» داخل الخلية.');
  await shot('04-lesson-desktop');
  await completeLessons(page, courses[0]);
  await shot('05-quiz-desktop');
  await answerQuiz(page, courses[0], true);
  await shot('06-result-desktop');
  await visit(page, '/learn/resume/opportunity');
  await page.locator('#lesson-note').fill('أربط كل متطلب في الإعلان بمثال حقيقي من مشاريعي.');
  await page.locator('[name="practice"][value="1"]').check();
  await page.locator('#practice-form button').click();
  await page.locator('[data-action="complete-lesson"]').click();
  await visit(page, '/my-learning');
  await shot('07-dashboard-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page, '/');
  await shot('08-home-mobile');
  await visit(page, '/course/planning');
  await shot('09-course-mobile');
  await visit(page, '/learn/resume/experience');
  await shot('10-lesson-mobile');
  await visit(page, '/my-learning');
  await shot('11-dashboard-mobile');
  await mkdir(new URL('../test-results/', import.meta.url), { recursive: true });
  await writeFile(
    new URL('../test-results/screenshots.json', import.meta.url),
    JSON.stringify(captures, null, 2),
  );
  console.log(`${captures.length} screenshots ready.`);
} finally {
  await browser.close();
}
