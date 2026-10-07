import { courses, courseById } from './content.js';
import {
  STORAGE_KEY,
  emptyState,
  readState,
  saveState,
  enroll,
  gradeQuiz,
  progress,
  NOTE_LIMIT,
} from './core.js';
import {
  homeView,
  catalogView,
  catalogResults,
  courseView,
  lessonView,
  quizView,
  myLearningView,
  notFound,
} from './views.js';
import { startImages } from './images.js';

let storage;
try {
  storage = window.localStorage;
} catch {
  /* Keep the session usable when storage is unavailable. */
}
let state = storage ? readState(storage) : emptyState();
const main = document.querySelector('#main');
let current = {};
let learningFilter = 'all';
let retryQuiz = false;
let searchTimer;
let toastTimer;
let storageWarningShown = false;

function notify(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 4000);
}
function persist() {
  const saved = storage && saveState(storage, state);
  if (!saved && !storageWarningShown) {
    document.querySelector('#storage-notice').hidden = false;
    storageWarningShown = true;
  }
  return Boolean(saved);
}
function route() {
  const raw = location.hash.startsWith('#/') ? location.hash.slice(1) : '/';
  const [path, query = ''] = raw.split('?');
  return { path: path.replace(/\/$/, '') || '/', params: new URLSearchParams(query) };
}
function setContent(html) {
  // Preserve images that have already started loading across page updates.
  const images = new Map();
  for (const img of main.querySelectorAll('img[data-image]')) {
    const list = images.get(img.dataset.image) || [];
    list.push(img);
    images.set(img.dataset.image, list);
  }
  main.innerHTML = html;
  for (const img of main.querySelectorAll('img[data-image]')) {
    const existing = images.get(img.dataset.image)?.shift();
    if (existing) {
      existing.className = img.className;
      existing.alt = img.alt;
      img.replaceWith(existing);
    }
  }
}
function render({ initial = false, keepScroll = false } = {}) {
  clearTimeout(searchTimer);
  const { path, params } = route();
  let html;
  let title = 'مهارة جديدة، خطوة أقرب';
  let nav = 'home';
  current = { path, params };
  if (path === '/') html = homeView(state);
  else if (path === '/courses') {
    html = catalogView(state, params);
    title = 'اكتشف الدورات';
    nav = 'courses';
  } else if (path === '/my-learning') {
    html = myLearningView(state, learningFilter);
    title = 'تعلّمي';
    nav = 'learning';
  } else {
    const parts = path.split('/').filter(Boolean);
    const course = courseById(parts[1]);
    if (parts[0] === 'course' && course && parts.length === 2) {
      current.course = course;
      html = courseView(course, state);
      title = course.name;
      nav = 'courses';
    } else if (parts[0] === 'learn' && course && parts.length === 3) {
      const lesson = course.lessons.find((item) => item.id === parts[2]);
      if (lesson || parts[2] === 'quiz') {
        const saved = enroll(state, course.id);
        if (lesson) saved.last = lesson.id;
        persist();
        current = { ...current, course, lesson, quiz: parts[2] === 'quiz' };
        html = lesson ? lessonView(course, lesson, state) : quizView(course, state, retryQuiz);
        title = `${lesson?.title || 'الاختبار النهائي'} | ${course.name}`;
        nav = 'learning';
      }
    }
  }
  if (!html) {
    html = notFound();
    title = 'صفحة غير موجودة';
    nav = '';
  }
  const scrollY = window.scrollY;
  setContent(html);
  if (window.matchMedia('(max-width: 700px)').matches)
    main.querySelector('.lesson-list')?.removeAttribute('open');
  main.dataset.route = path;
  document.title = `مدار | ${title}`;
  document.body.classList.toggle(
    'is-learning',
    path.startsWith('/learn/') && Boolean(current.course),
  );
  document.querySelectorAll('[data-nav]').forEach((link) => {
    if (link.dataset.nav === nav) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.querySelector('#mobile-nav').hidden = true;
  document.querySelector('#menu-button').setAttribute('aria-expanded', 'false');
  document.documentElement.dataset.appReady = 'true';
  if (keepScroll) window.scrollTo({ top: scrollY, behavior: 'instant' });
  else if (!initial) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const heading = main.querySelector('h1');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus({ preventScroll: true });
  }
}
function updateCatalog() {
  if (current.path !== '/courses') return;
  const query = main.querySelector('#course-search').value;
  const category =
    main.querySelector('[data-category][aria-pressed="true"]')?.dataset.category || 'all';
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (category !== 'all') params.set('category', category);
  const hash = `#/courses${params.size ? '?' + params.toString() : ''}`;
  try {
    history.replaceState(null, '', hash);
  } catch {
    /* Filtering remains available for direct file viewing. */
  }
  current.params = params;
  document.querySelector('#catalog-results').innerHTML = catalogResults(state, query, category);
}
document.addEventListener('click', (event) => {
  const link = event.target.closest('a');
  if (link?.classList.contains('skip-link')) {
    event.preventDefault();
    main.focus();
    main.scrollIntoView({ block: 'start' });
    return;
  }
  if (link?.closest('#mobile-nav')) {
    document.querySelector('#mobile-nav').hidden = true;
    document.querySelector('#menu-button').setAttribute('aria-expanded', 'false');
  }
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if (button.id === 'menu-button') {
    const nav = document.querySelector('#mobile-nav');
    nav.hidden = !nav.hidden;
    button.setAttribute('aria-expanded', String(!nav.hidden));
    return;
  }
  if (button.dataset.category) {
    main.querySelectorAll('[data-category]').forEach((item) => {
      const selected = item === button;
      item.classList.toggle('selected', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    clearTimeout(searchTimer);
    updateCatalog();
    return;
  }
  if (button.dataset.learningFilter) {
    learningFilter = button.dataset.learningFilter;
    render({ keepScroll: true });
    main
      .querySelector(`[data-learning-filter="${learningFilter}"]`)
      ?.focus({ preventScroll: true });
    return;
  }
  switch (button.dataset.action) {
    case 'reset-filters':
      main.querySelector('#course-search').value = '';
      main.querySelectorAll('[data-category]').forEach((item) => {
        const all = item.dataset.category === 'all';
        item.classList.toggle('selected', all);
        item.setAttribute('aria-pressed', String(all));
      });
      updateCatalog();
      main.querySelector('#course-search').focus();
      break;
    case 'complete-lesson': {
      const { course, lesson } = current;
      if (!course || !lesson) break;
      const saved = state.courses[course.id];
      if (!saved?.practiced.includes(lesson.id)) break;
      if (!saved.completed.includes(lesson.id)) saved.completed.push(lesson.id);
      persist();
      const next = course.lessons[course.lessons.indexOf(lesson) + 1];
      location.hash = `#/learn/${course.id}/${next?.id || 'quiz'}`;
      notify('خطوة جميلة! تم إكمال الدرس.');
      break;
    }
    case 'retry-quiz':
      retryQuiz = true;
      render();
      break;
    case 'open-reset':
      document.querySelector('#reset-dialog').showModal();
      break;
    case 'close-reset':
      document.querySelector('#reset-dialog').close();
      break;
    case 'confirm-reset': {
      state = emptyState();
      let removed = false;
      try {
        storage?.removeItem(STORAGE_KEY);
        removed = Boolean(storage);
      } catch {
        /* Show the storage limitation below. */
      }
      document.querySelector('#reset-dialog').close();
      learningFilter = 'all';
      render();
      notify(
        removed
          ? 'مُسحت بيانات التعلّم من هذا المتصفح.'
          : 'مُسحت بيانات الجلسة؛ تعذر الوصول إلى التخزين المحلي.',
      );
      break;
    }
  }
});
main.addEventListener('input', (event) => {
  if (event.target.id === 'course-search') {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(updateCatalog, 120);
  }
  if (event.target.id === 'lesson-note' && current.course && current.lesson) {
    const value = event.target.value.slice(0, NOTE_LIMIT);
    state.courses[current.course.id].notes[current.lesson.id] = value;
    const saved = persist();
    main.querySelector('#note-status').textContent = saved ? 'تم الحفظ' : 'متاحة في هذه الجلسة فقط';
    main.querySelector('#note-count').textContent = `${value.length} / ${NOTE_LIMIT}`;
  }
});
main.addEventListener('submit', (event) => {
  if (event.target.id === 'practice-form') {
    event.preventDefault();
    if (!event.target.reportValidity()) return;
    const answer = Number(new FormData(event.target).get('practice'));
    const { course, lesson } = current;
    if (!course || !lesson) return;
    if (answer !== lesson.practice.correct) {
      const message = document.querySelector('#practice-feedback');
      message.innerHTML =
        '<p class="feedback error">ليست هذه الإجابة الأدق. راجع الفكرة في الدرس ثم جرّب مرة أخرى.</p>';
      return;
    }
    const saved = state.courses[course.id];
    if (!saved.practiced.includes(lesson.id)) saved.practiced.push(lesson.id);
    persist();
    render({ keepScroll: true });
    main.querySelector('[data-action="complete-lesson"]')?.focus({ preventScroll: true });
  }
  if (event.target.id === 'quiz-form') {
    event.preventDefault();
    if (!event.target.reportValidity()) return;
    const { course } = current;
    if (!course || state.courses[course.id]?.completed.length !== course.lessons.length) return;
    const form = new FormData(event.target);
    const answers = course.quiz.map((_, i) => Number(form.get(`question-${i}`)));
    const result = gradeQuiz(course, answers);
    if (!result) return;
    const saved = state.courses[course.id];
    saved.quizAnswers = answers;
    const best = gradeQuiz(course, saved.bestAnswers);
    if (!best || result.percent >= best.percent) saved.bestAnswers = answers.slice();
    persist();
    retryQuiz = false;
    render();
    main.querySelector('#quiz-result')?.focus({ preventScroll: true });
  }
});
window.addEventListener('hashchange', () => {
  retryQuiz = false;
  render();
});
window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  // Avoid replacing a note while it is being edited in this tab.
  if (document.activeElement?.id === 'lesson-note') return;
  state = storage ? readState(storage) : state;
  render({ keepScroll: true });
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !document.querySelector('#mobile-nav').hidden) {
    document.querySelector('#mobile-nav').hidden = true;
    document.querySelector('#menu-button').setAttribute('aria-expanded', 'false');
    document.querySelector('#menu-button').focus();
  }
});
startImages();
render({ initial: true });
document.dispatchEvent(new Event('madar:ready'));
