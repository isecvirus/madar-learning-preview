import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { courses } from '../src/content.js';
import { emptyState } from '../src/core.js';
import {
  homeView,
  catalogView,
  courseView,
  lessonView,
  quizView,
  myLearningView,
  notFound,
} from '../src/views.js';
import { startImages } from '../src/images.js';

const root = fileURLToPath(new URL('../', import.meta.url));
await build({
  absWorkingDir: root,
  entryPoints: ['src/app.js'],
  outfile: 'assets/app.js',
  bundle: true,
  format: 'iife',
  target: 'es2022',
  minify: true,
  charset: 'utf8',
  legalComments: 'none',
});
const state = emptyState();
const pages = [];
const routes = {};
function add(route, html, title) {
  const id = `page-${pages.length}`;
  routes[route] = { id, title };
  pages.push(`<template id="${id}">${html}</template>`);
}
add('/', homeView(state), 'مهارة جديدة، خطوة أقرب');
add('/courses', catalogView(state), 'اكتشف الدورات');
add('/my-learning', myLearningView(state), 'تعلّمي');
for (const course of courses) {
  add(`/course/${course.id}`, courseView(course, state), course.name);
  for (const lesson of course.lessons)
    add(`/learn/${course.id}/${lesson.id}`, lessonView(course, lesson, state), lesson.title);
  add(`/learn/${course.id}/quiz`, quizView(course, state), 'الاختبار النهائي');
}
add('/404', notFound(), 'صفحة غير موجودة');
function showInitialPage(routes) {
  const main = document.querySelector('#main');
  function show() {
    const raw = location.hash.startsWith('#/') ? location.hash.slice(1) : '/';
    const path = raw.split('?')[0].replace(/\/$/, '') || '/';
    const page = routes[path] || routes['/404'];
    main.replaceChildren(document.getElementById(page.id).content.cloneNode(true));
    if (window.matchMedia('(max-width: 700px)').matches)
      main.querySelector('.lesson-list')?.removeAttribute('open');
    main.dataset.route = path;
    document.title = `مدار | ${page.title}`;
    document.body.classList.toggle(
      'is-learning',
      path.startsWith('/learn/') && Boolean(routes[path]),
    );
  }
  show();
  window.addEventListener('hashchange', show);
  document.addEventListener('madar:ready', () => window.removeEventListener('hashchange', show), {
    once: true,
  });
}
let html = await readFile(new URL('../src/index.template.html', import.meta.url), 'utf8');
const sprite = (await readFile(new URL('../assets/icons/sprite.svg', import.meta.url), 'utf8'))
  .replace(
    '<svg xmlns="http://www.w3.org/2000/svg">',
    '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="display:none">',
  )
  .replaceAll('id="', 'id="icon-');
html = html
  .replace('<!-- icon-sprite -->', sprite)
  .replace('<!-- initial-content -->', homeView(state))
  .replace('<!-- page-templates -->', pages.join('\n'))
  .replace(
    '<!-- page-bootstrap -->',
    `<script>(${startImages.toString()})();(${showInitialPage.toString()})(${JSON.stringify(routes)});</script>`,
  );
await writeFile(new URL('../index.html', import.meta.url), html);
console.log('Built index.html and assets/app.js.');
