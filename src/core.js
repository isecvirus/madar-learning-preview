import { courses, courseById } from './content.js';

export const STORAGE_KEY = 'madar-learning:v1';
export const PASS_PERCENT = 80;
export const NOTE_LIMIT = 5000;
export const emptyState = () => ({ courses: {} });
export const escapeHTML = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
export const normalizeSearch = (value) =>
  String(value)
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .toLowerCase()
    .trim();
export function gradeQuiz(course, answers) {
  if (
    !Array.isArray(answers) ||
    answers.length !== course.quiz.length ||
    answers.some(
      (answer, i) =>
        !Number.isInteger(answer) || answer < 0 || answer >= course.quiz[i].options.length,
    )
  )
    return null;
  const correct = answers.reduce(
    (count, answer, i) => count + Number(answer === course.quiz[i].correct),
    0,
  );
  const percent = Math.round((correct / course.quiz.length) * 100);
  return { correct, total: course.quiz.length, percent, passed: percent >= PASS_PERCENT };
}
export function sanitizeState(input) {
  const state = emptyState();
  if (!input || typeof input !== 'object' || !input.courses || typeof input.courses !== 'object')
    return state;
  for (const course of courses) {
    const saved = input.courses[course.id];
    if (!saved || typeof saved !== 'object') continue;
    const ids = course.lessons.map((lesson) => lesson.id);
    const practiced = Array.isArray(saved.practiced)
      ? [...new Set(saved.practiced.filter((id) => ids.includes(id)))]
      : [];
    const completed = Array.isArray(saved.completed)
      ? [...new Set(saved.completed.filter((id) => ids.includes(id) && practiced.includes(id)))]
      : [];
    const notes = {};
    if (saved.notes && typeof saved.notes === 'object')
      for (const id of ids)
        if (typeof saved.notes[id] === 'string') notes[id] = saved.notes[id].slice(0, NOTE_LIMIT);
    const quiz = gradeQuiz(course, saved.quizAnswers);
    const bestQuiz = gradeQuiz(course, saved.bestAnswers);
    state.courses[course.id] = {
      completed,
      practiced,
      notes,
      last: ids.includes(saved.last) ? saved.last : ids[0],
      quizAnswers: completed.length === ids.length && quiz ? saved.quizAnswers.slice() : null,
      bestAnswers: completed.length === ids.length && bestQuiz ? saved.bestAnswers.slice() : null,
    };
  }
  return state;
}
export function readState(storage) {
  try {
    return sanitizeState(JSON.parse(storage.getItem(STORAGE_KEY)));
  } catch {
    return emptyState();
  }
}
export function saveState(storage, state) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(sanitizeState(state)));
    return true;
  } catch {
    return false;
  }
}
export function enroll(state, id) {
  const course = courseById(id);
  if (!course) return null;
  if (!state.courses[id])
    state.courses[id] = {
      completed: [],
      practiced: [],
      notes: {},
      last: course.lessons[0].id,
      quizAnswers: null,
      bestAnswers: null,
    };
  return state.courses[id];
}
export function progress(course, state) {
  const saved = state.courses[course.id];
  const count = saved?.completed.length || 0;
  const result = saved?.bestAnswers ? gradeQuiz(course, saved.bestAnswers) : null;
  const passed = count === course.lessons.length && Boolean(result?.passed);
  return {
    count,
    passed,
    percent: Math.round(((count + Number(passed)) / (course.lessons.length + 1)) * 100),
    started: Boolean(saved),
  };
}
export function continueRoute(course, state) {
  const saved = state.courses[course.id];
  if (saved?.completed.length === course.lessons.length && !progress(course, state).passed)
    return `#/learn/${course.id}/quiz`;
  return `#/learn/${course.id}/${saved?.last || course.lessons[0].id}`;
}
export function filterCourses(query = '', category = 'all') {
  const search = normalizeSearch(query);
  return courses.filter(
    (course) =>
      (category === 'all' || course.category === category) &&
      (!search ||
        normalizeSearch(`${course.name} ${course.subtitle} ${course.description}`).includes(
          search,
        )),
  );
}
