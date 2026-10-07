import test from 'node:test';
import assert from 'node:assert/strict';
import { courses } from '../src/content.js';
import {
  emptyState,
  enroll,
  progress,
  sanitizeState,
  gradeQuiz,
  readState,
  saveState,
  filterCourses,
  NOTE_LIMIT,
} from '../src/core.js';

test('Incomplete or invalid quiz submissions cannot receive a result', () => {
  assert.equal(gradeQuiz(courses[0], []), null);
  assert.equal(gradeQuiz(courses[0], [1, 0, 2, 1, 99]), null);
  assert.equal(gradeQuiz(courses[0], ['1', 0, 2, 1, 0]), null);
});
test('The pass threshold is 4 out of 5 answers', () => {
  const course = courses[0];
  const answers = course.quiz.map((question) => question.correct);
  assert.equal(gradeQuiz(course, answers).percent, 100);
  answers[0] = (answers[0] + 1) % 3;
  assert.equal(gradeQuiz(course, answers).passed, true);
  answers[1] = (answers[1] + 1) % 3;
  assert.equal(gradeQuiz(course, answers).passed, false);
});
test('Completing lessons alone does not mark a course as passed', () => {
  const state = emptyState();
  const course = courses[0];
  const saved = enroll(state, course.id);
  saved.completed = course.lessons.map((lesson) => lesson.id);
  saved.practiced = saved.completed.slice();
  assert.deepEqual(progress(course, state), {
    count: 4,
    passed: false,
    percent: 80,
    started: true,
  });
  saved.bestAnswers = course.quiz.map((question) => question.correct);
  assert.equal(progress(course, state).percent, 100);
});
test('Malformed stored data is bounded and unrelated course data is discarded', () => {
  const result = sanitizeState({
    courses: {
      missing: { completed: ['anything'] },
      excel: {
        completed: ['organize', 'organize', 'missing', 'formulas'],
        practiced: ['organize'],
        notes: { organize: 'a'.repeat(6000), missing: 'x' },
        last: 'unknown',
        quizAnswers: [1, 0, 2, 1, 0],
      },
    },
  });
  assert.deepEqual(Object.keys(result.courses), ['excel']);
  assert.deepEqual(result.courses.excel.completed, ['organize']);
  assert.equal(result.courses.excel.notes.organize.length, NOTE_LIMIT);
  assert.equal(result.courses.excel.last, 'organize');
  assert.equal(result.courses.excel.quizAnswers, null);
});
test('Storage failures do not prevent learning', () => {
  const unavailable = {
    getItem() {
      throw Error('Unavailable');
    },
    setItem() {
      throw Error('Unavailable');
    },
  };
  assert.deepEqual(readState(unavailable), emptyState());
  assert.equal(saveState(unavailable, emptyState()), false);
});
test('Search handles Arabic marks and combined category constraints', () => {
  assert.equal(filterCourses('سِيرة').length, 1);
  assert.equal(filterCourses('EXCEL', 'digital').length, 1);
  assert.equal(filterCourses('EXCEL', 'career').length, 0);
});
test('All course questions have valid answers and lesson IDs are unique', () => {
  for (const course of courses) {
    assert.equal(new Set(course.lessons.map((lesson) => lesson.id)).size, course.lessons.length);
    for (const question of [...course.quiz, ...course.lessons.map((lesson) => lesson.practice)]) {
      assert.ok(
        Number.isInteger(question.correct) &&
          question.correct >= 0 &&
          question.correct < question.options.length,
      );
      assert.ok(question.explanation.length > 10);
    }
  }
});
