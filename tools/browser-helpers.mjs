import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { ready, settleImages } from './capture-ready.mjs';
export const base = new URL('../index.html', import.meta.url).href;
export async function launch() {
  return chromium.launch({
    ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}),
    args: ['--no-sandbox'],
  });
}
export async function visit(page, path) {
  await page.goto(base + '#' + path);
  await ready(page, path);
}
export async function completeLessons(page, course) {
  for (const lesson of course.lessons) {
    await visit(page, `/learn/${course.id}/${lesson.id}`);
    const form = page.locator('#practice-form');
    if (await form.locator('button[type="submit"]').count()) {
      await form.locator(`input[value="${lesson.practice.correct}"]`).check();
      await form.locator('button[type="submit"]').click();
    }
    await page.locator('[data-action="complete-lesson"]').click();
  }
  await ready(page, `/learn/${course.id}/quiz`);
}
export async function answerQuiz(page, course, correct = true) {
  for (let index = 0; index < course.quiz.length; index++) {
    const question = course.quiz[index];
    const answer = correct ? question.correct : (question.correct + 1) % question.options.length;
    await page.locator(`[name="question-${index}"][value="${answer}"]`).check();
  }
  await page.locator('#quiz-form button[type="submit"]').click();
  await page.locator('#quiz-result').waitFor();
}
export async function capture(page, name, fullPage = true) {
  await settleImages(page);
  await page.evaluate(() => {
    document.activeElement?.blur();
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.mouse.move(1, 1);
  await page.waitForFunction(() => !document.querySelector('#toast').classList.contains('visible'));
  await page.screenshot({
    path: fileURLToPath(new URL(`../screenshots/${name}.png`, import.meta.url)),
    fullPage,
    animations: 'disabled',
  });
  console.log(`Captured ${name}`);
}
