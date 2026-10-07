import { courses, categories, categoryName, duration } from './content.js';
import {
  escapeHTML as esc,
  progress,
  continueRoute,
  filterCourses,
  gradeQuiz,
  NOTE_LIMIT,
  PASS_PERCENT,
} from './core.js';
import { icon, image, progressBar } from './ui.js';

const tag = (course) => `<span class="tag ${course.color}">${categoryName(course.category)}</span>`;
const lessonCount = (course) => `${course.lessons.length} دروس`;
const meta = (course) =>
  `<div class="course-meta"><span>${icon('clock3')}${duration(course)} دقيقة</span><span>${icon('book-open')}${lessonCount(course)}</span><span>${course.level}</span></div>`;
export function courseCard(course, state, learning = false) {
  const p = progress(course, state);
  return `<article class="course-card ${learning ? 'learning-card' : ''}">
    <a class="course-cover ${course.color}" href="#/course/${course.id}" tabindex="-1" aria-hidden="true">${image(course.image, '')}<span class="cover-label">${icon('book-open')} دورة قصيرة</span></a>
    <div class="course-card-body"><div class="card-tags">${tag(course)}<span class="free-label">متاحة للجميع</span></div>
      <h3><a href="#/course/${course.id}">${course.name}</a></h3><p>${course.subtitle}</p>${meta(course)}
      ${learning ? `<div class="card-progress"><div><span>${p.passed ? 'اكتملت الدورة' : `${p.count} من ${course.lessons.length} دروس مكتملة`}</span><b>${p.percent}%</b></div>${progressBar(p.percent)}</div>` : ''}
      <div class="card-bottom"><span>${p.passed ? `${icon('check-circle2')} مكتملة` : p.started ? 'تعلّم على وقتك' : 'درس اليوم يصنع فرقًا'}</span><a class="text-link" href="${learning ? continueRoute(course, state) : `#/course/${course.id}`}">${learning ? (p.passed ? 'مراجعة الدورة' : 'متابعة التعلّم') : 'تفاصيل الدورة'}</a></div>
    </div></article>`;
}
export function homeView(state) {
  const started = courses.find(
    (course) => state.courses[course.id] && !progress(course, state).passed,
  );
  return `<section class="home-hero container">
    <div class="hero-copy"><div class="eyebrow"><span class="short-line"></span> معرفة تستخدمها، كل يوم</div>
      <h1>مهارة جديدة،<br><span>خطوة أقرب.</span></h1>
      <p class="hero-description">من أول جدول إلى أول فرصة.<br>دورات عربية قصيرة، تترك لك شيئًا تعرف كيف تفعله.</p>
      <div class="hero-actions"><a class="button primary large" href="${started ? continueRoute(started, state) : '#/courses'}">${started ? 'أكمل من حيث توقفت' : 'اكتشف الدورات'}</a><a class="button quiet large" href="#/my-learning">مساحتي للتعلّم</a></div>
      <div class="hero-facts"><span>${icon('book-open')} 3 دورات عملية</span><span>${icon('clock3')} أقل من 30 دقيقة للدورة</span></div>
    </div>
    <a class="hero-feature" href="#/course/excel" aria-label="استكشف دورة Excel للعمل اليومي"><div class="hero-image">${image('excel', 'تكوين من أعمدة خضراء وورقة جدول', '', true)}<span class="hero-image-label">بداية صغيرة. مهارة تبقى.</span></div><div class="feature-caption"><div><span class="small-label">ابدأ بمهارة رقمية</span><h2>Excel للعمل اليومي</h2><span>${courses[0].lessons.length} دروس قصيرة · ${duration(courses[0])} دقيقة</span></div><span class="feature-icon">${icon('book-open')}</span></div></a>
  </section>
  <section class="container courses-section"><div class="section-heading"><div><div class="eyebrow">اختر خطوتك القادمة</div><h2>مهارات تستحق وقتك</h2></div><a href="#/courses" class="text-link">تصفّح جميع الدورات</a></div><div class="course-grid">${courses.map((course) => courseCard(course, state)).join('')}</div></section>
  <section class="container learning-way"><div class="way-intro"><span class="eyebrow">مساحة للتقدّم</span><h2>تعلّم قليلًا.<br>طبّق كثيرًا.</h2><p>خذ من يومك وقتًا لمهارة تحتاجها.<br>تجد مكانك محفوظًا حين تعود.</p></div><div class="way-steps"><div><span>01</span><h3>اختر ما تحتاجه</h3><p>ثلاثة مجالات قريبة من يومك وعملك.</p></div><div><span>02</span><h3>اقرأ وجرّب</h3><p>دروس مختصرة، وأمثلة، وتدريب في كل درس.</p></div><div><span>03</span><h3>لاحظ تقدّمك</h3><p>راجع فهمك باختبار، وارجع إلى ملاحظاتك.</p></div></div></section>`;
}
export function catalogResults(state, query, category) {
  const found = filterCourses(query, category);
  return `<p class="results-count" role="status">${found.length ? `عدد الدورات: ${found.length}` : 'لم نعثر على دورات مطابقة'}</p>${found.length ? `<div class="course-grid">${found.map((course) => courseCard(course, state)).join('')}</div>` : `<div class="empty-state">${icon('search')}<h2>جرّب كلمة أخرى</h2><p>ابحث مثلًا عن Excel أو السيرة الذاتية، أو اعرض جميع المجالات.</p><button class="button primary" data-action="reset-filters">إعادة ضبط البحث</button></div>`}`;
}
export function catalogView(state, params = new URLSearchParams()) {
  const query = params.get('q') || '';
  const category = categories.some((c) => c.id === params.get('category'))
    ? params.get('category')
    : 'all';
  return `<section class="container page-section"><div class="page-heading"><span class="eyebrow">خطوة جديدة تبدأ هنا</span><h1>اكتشف الدورات</h1><p>معرفة مختصرة تساعدك في العمل وما حوله.</p></div><div class="catalog-toolbar"><label class="search-field">${icon('search')}<span class="sr-only">ابحث عن دورة</span><input id="course-search" type="search" placeholder="عن أي مهارة تبحث؟" value="${esc(query)}" autocomplete="off"></label><div class="filter-chips" aria-label="مجالات الدورات">${[{ id: 'all', name: 'كل المجالات' }, ...categories].map((c) => `<button class="filter-chip ${category === c.id ? 'selected' : ''}" data-category="${c.id}" aria-pressed="${category === c.id}">${c.name}</button>`).join('')}</div></div><div id="catalog-results">${catalogResults(state, query, category)}</div><div class="catalog-note">${icon('info')} كل دورة تضم دروسًا مكتوبة، وتدريبات قصيرة، واختبارًا نهائيًا.</div></section>`;
}
export function courseView(course, state) {
  const p = progress(course, state);
  return `<div class="course-detail"><section class="course-top"><div class="container"><nav class="breadcrumbs" aria-label="مسار الصفحة"><a href="#/courses">الدورات</a>${icon('chevron-left')}<span>${course.name}</span></nav><div class="course-intro-grid"><div>${tag(course)}<h1>${course.name}</h1><p class="detail-description">${course.description}</p>${meta(course)}<div class="intro-note">${icon('check-circle2')} دروس قصيرة · تطبيق مباشر · تعلّم بالوتيرة التي تناسبك</div></div><div class="detail-cover ${course.color}">${image(course.image, `غلاف دورة ${course.name}`, '', true)}</div></div></div></section>
    <div class="container detail-layout"><div class="detail-main"><section class="detail-section"><h2>ماذا ستتعلم؟</h2><div class="outcomes">${course.outcomes.map((item) => `<div>${icon('check-circle2')}<span>${item}</span></div>`).join('')}</div></section>
    <section class="detail-section"><div class="section-heading compact"><h2>محتوى الدورة</h2><span>${lessonCount(course)} واختبار</span></div><div class="curriculum">${course.lessons.map((lesson, i) => `<details ${i === 0 ? 'open' : ''}><summary><span class="lesson-number">${String(i + 1).padStart(2, '0')}</span><span class="curriculum-title">${lesson.title}</span><span class="lesson-duration">${lesson.minutes} دقائق</span>${icon('chevron-down')}</summary><div class="curriculum-description"><p>${lesson.intro}</p><a class="text-link" href="#/learn/${course.id}/${lesson.id}">افتح الدرس</a></div></details>`).join('')}<div class="curriculum-quiz">${icon('check-check')}<strong>اختبر ما تعلمته</strong><span>5 أسئلة · الاجتياز ${PASS_PERCENT}%</span></div></div></section>
    <section class="detail-section requirements"><h2>قبل أن تبدأ</h2><p>${course.requirement}</p></section></div>
    <aside class="enroll-card"><div class="enroll-title">مهارة جديدة تنتظرك</div><h2>${p.started ? 'أكمل خطوتك' : 'ابدأ من هنا'}</h2><p>${p.started ? 'تجد دروسك وملاحظاتك محفوظة في هذا المتصفح.' : 'الدورة كاملة متاحة لك، ويمكنك العودة إليها في أي وقت.'}</p>${p.started ? `<div class="card-progress"><div><span>تقدّمك في الدورة</span><b>${p.percent}%</b></div>${progressBar(p.percent)}</div>` : ''}<a class="button primary full" href="${continueRoute(course, state)}">${p.started ? (p.passed ? 'مراجعة الدورة' : 'متابعة التعلّم') : 'ابدأ التعلّم'}</a><ul class="enroll-features"><li>${icon('book-open')} ${lessonCount(course)} مع أمثلة عملية</li><li>${icon('check-check')} تدريب بعد كل درس</li><li>${icon('clock3')} ${duration(course)} دقيقة قراءة تقريبًا</li></ul><div class="local-note">تُحفظ ملاحظاتك وتقدّمك على هذا المتصفح.</div></aside></div></div>`;
}
function exampleView(example) {
  let body = '';
  if (example.type === 'table')
    body = `<div class="table-scroll" tabindex="0" role="region" aria-label="${esc(example.title)}"><table><thead><tr>${example.headers.map((h) => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${example.rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  if (example.type === 'code')
    body = `<pre dir="ltr"><code>${esc(example.code)}</code></pre><p class="example-caption">${example.caption}</p>`;
  if (example.type === 'quote') body = `<blockquote>${example.text}</blockquote>`;
  if (example.type === 'comparison')
    body = `<div class="comparison"><div><span>قبل</span><p>${example.before}</p></div><div><span>أوضح</span><p>${example.after}</p></div></div>`;
  return `<div class="lesson-example"><div class="example-title">مثال عملي <span>·</span> ${example.title}</div>${body}</div>`;
}
function lessonSidebar(course, state, lessonId) {
  const saved = state.courses[course.id];
  const p = progress(course, state);
  return `<aside class="lesson-sidebar"><a class="back-link" href="#/course/${course.id}">${icon('chevron-right')} عن الدورة</a><h2>${course.name}</h2><div class="sidebar-progress"><span>${p.count} من ${course.lessons.length} دروس مكتملة</span><b>${p.percent}%</b></div>${progressBar(p.percent)}<details class="lesson-list" open><summary>محتوى الدورة<span>${course.lessons.length} دروس واختبار</span>${icon('chevron-down')}</summary><nav class="lesson-nav" aria-label="دروس الدورة">${course.lessons.map((lesson, i) => `<a href="#/learn/${course.id}/${lesson.id}" ${lesson.id === lessonId ? 'aria-current="page"' : ''}><span class="lesson-status ${saved?.completed.includes(lesson.id) ? 'done' : ''}">${saved?.completed.includes(lesson.id) ? icon('check') : String(i + 1).padStart(2, '0')}</span><span>${lesson.title}<small>${lesson.minutes} دقائق</small></span></a>`).join('')}<a href="#/learn/${course.id}/quiz" ${lessonId === 'quiz' ? 'aria-current="page"' : ''}><span class="lesson-status ${p.passed ? 'done' : ''}">${icon('check-check')}</span><span>الاختبار النهائي<small>5 أسئلة</small></span></a></nav></details><div class="sidebar-hint">${icon('info')} كل خطوة صغيرة تُحسب.</div></aside>`;
}
export function lessonView(course, lesson, state) {
  const saved = state.courses[course.id];
  const index = course.lessons.indexOf(lesson);
  const practiced = Boolean(saved?.practiced.includes(lesson.id));
  const complete = Boolean(saved?.completed.includes(lesson.id));
  const note = saved?.notes[lesson.id] || '';
  return `<div class="learning-layout container">${lessonSidebar(course, state, lesson.id)}<div class="lesson-main"><div class="lesson-topline"><span>${categoryName(course.category)} <span class="separator">/</span> الدرس ${index + 1} من ${course.lessons.length}</span><span>${icon('clock3')} ${lesson.minutes} دقائق</span></div><article class="lesson-article"><div class="eyebrow">${lesson.eyebrow}</div><h1>${lesson.title}</h1><p class="lesson-intro">${lesson.intro}</p>${lesson.sections.map((section) => `<section><h2>${section.title}</h2>${section.text ? `<p>${section.text}</p>` : `<ul>${section.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>`}</section>`).join('')}${exampleView(lesson.example)}<div class="takeaway">${icon('sparkles')}<div><strong>الفكرة التي تأخذها معك</strong><p>${lesson.takeaway}</p></div></div></article>
    <section class="practice-panel" aria-labelledby="practice-heading"><div class="eyebrow">دقيقة للتطبيق</div><h2 id="practice-heading">${lesson.practice.question}</h2><form id="practice-form"><div class="answer-options">${lesson.practice.options.map((option, i) => `<label class="answer-option ${practiced && i === lesson.practice.correct ? 'correct' : ''}"><input type="radio" name="practice" value="${i}" required ${practiced ? 'disabled' : ''} ${practiced && i === lesson.practice.correct ? 'checked' : ''}><span>${option}</span></label>`).join('')}</div><div id="practice-feedback" role="status">${practiced ? `<p class="feedback success">${icon('check-circle2')} ${lesson.practice.explanation}</p>` : ''}</div>${!practiced ? '<button class="button secondary" type="submit">تحقّق من إجابتي</button>' : ''}</form></section>
    <section class="notes-panel"><div class="section-heading compact"><h2><label for="lesson-note">ملاحظاتي</label></h2><span id="note-status" role="status">${note ? 'محفوظة في هذا المتصفح' : 'مساحة لأفكارك'}</span></div><textarea id="lesson-note" rows="4" maxlength="${NOTE_LIMIT}" placeholder="ما الفكرة التي تريد تذكّرها؟ اكتبها بطريقتك…">${esc(note)}</textarea><div class="note-footer"><span>تُحفظ تلقائيًا على هذا المتصفح.</span><span id="note-count" dir="ltr">${note.length} / ${NOTE_LIMIT}</span></div></section>
    <div class="lesson-actions"><div><span class="small-label">${complete ? 'أكملت هذا الدرس' : 'خطوة ثم خطوة'}</span><p>${practiced ? 'جاهز للخطوة التالية؟' : 'أجب عن التدريب بشكل صحيح لإكمال الدرس.'}</p></div><button class="button primary" data-action="complete-lesson" ${practiced ? '' : 'disabled'}>${complete ? (index === course.lessons.length - 1 ? 'إلى الاختبار النهائي' : 'الدرس التالي') : 'أكملت الدرس، لنواصل'}</button></div></div></div>`;
}
export function quizView(course, state, retry = false) {
  const saved = state.courses[course.id];
  const unlocked = saved?.completed.length === course.lessons.length;
  const result =
    unlocked && !retry && saved?.quizAnswers ? gradeQuiz(course, saved.quizAnswers) : null;
  const p = progress(course, state);
  const nextLesson =
    course.lessons.find((lesson) => !saved?.completed.includes(lesson.id)) || course.lessons[0];
  const content = !unlocked
    ? `<div class="quiz-locked">${icon('book-open')}<h2>بقيت خطوات قبل الاختبار</h2><p>أكمل الدروس وتدريباتها أولًا، ثم عد لاختبار فهمك.</p><a class="button primary" href="#/learn/${course.id}/${nextLesson.id}">متابعة الدروس</a></div>`
    : result
      ? `<div class="quiz-result ${result.passed ? 'passed' : ''}" tabindex="-1" id="quiz-result"><span class="result-symbol">${icon(result.passed ? 'check-check' : 'rotate-ccw')}</span><div class="result-score">${result.percent}<span>%</span></div><h2>${result.passed ? 'أحسنت، أتممت الدورة!' : 'محاولة مفيدة، ولديك فرصة أخرى'}</h2><p>أجبت عن ${result.correct} من ${result.total} أسئلة بشكل صحيح.${!result.passed && p.passed ? ' اجتيازك السابق محفوظ.' : ''}</p><div class="result-actions"><a class="button primary" href="#/my-learning">إلى تعلّمي</a><button class="button secondary" data-action="retry-quiz">إعادة الاختبار</button></div></div><section class="quiz-review"><h2>راجع إجاباتك</h2>${course.quiz
          .map((question, i) => {
            const ok = saved.quizAnswers[i] === question.correct;
            return `<div class="review-item"><div class="review-heading">${icon(ok ? 'check-circle2' : 'info')}<h3>${i + 1}. ${question.question}</h3><span class="review-label ${ok ? 'success-text' : 'error-text'}">${ok ? 'صحيحة' : 'تحتاج مراجعة'}</span></div><p>إجابتك: ${question.options[saved.quizAnswers[i]]}</p>${!ok ? `<p><strong>الإجابة الصحيحة:</strong> ${question.options[question.correct]}</p>` : ''}<p class="review-explanation">${question.explanation}</p></div>`;
          })
          .join('')}</section>`
      : `<div class="quiz-guidance">${icon('info')} اختر إجابة واحدة لكل سؤال. درجة الاجتياز ${PASS_PERCENT}%، ويمكنك إعادة المحاولة.</div><form id="quiz-form">${course.quiz.map((question, i) => `<fieldset class="quiz-question"><legend><span>السؤال ${i + 1} من ${course.quiz.length}</span>${question.question}</legend><div class="answer-options">${question.options.map((option, index) => `<label class="answer-option"><input type="radio" name="question-${i}" value="${index}" required><span>${option}</span></label>`).join('')}</div></fieldset>`).join('')}<button class="button primary large" type="submit">عرض النتيجة</button></form>`;
  return `<div class="learning-layout container">${lessonSidebar(course, state, 'quiz')}<div class="lesson-main"><div class="lesson-topline"><span>${course.name}</span><span>5 أسئلة</span></div><div class="page-heading quiz-heading"><span class="eyebrow">المعرفة تثبت بالتطبيق</span><h1>اختبر ما تعلمته</h1></div>${content}</div></div>`;
}
export function myLearningView(state, filter = 'all') {
  const enrolled = courses.filter((course) => state.courses[course.id]);
  const finished = enrolled.filter((course) => progress(course, state).passed);
  const countLessons = enrolled.reduce((sum, course) => sum + progress(course, state).count, 0);
  const filtered = enrolled.filter(
    (course) =>
      filter === 'all' ||
      (filter === 'completed' ? progress(course, state).passed : !progress(course, state).passed),
  );
  const next = enrolled.find((course) => !progress(course, state).passed);
  return `<section class="container page-section dashboard"><div class="page-heading"><span class="eyebrow">مساحتك، وعلى وقتك</span><h1>أهلًا بعودتك إلى التعلّم</h1><p>${enrolled.length ? 'خطواتك الصغيرة تتراكم. أكمل من حيث توقفت.' : 'كل مهارة تبدأ بخطوة. اختر دورتك الأولى.'}</p></div><div class="stats-grid"><div class="stat-card"><span class="stat-icon">${icon('book-open')}</span><div><b>${enrolled.length}</b><span>دورات بدأت بها</span></div></div><div class="stat-card"><span class="stat-icon green">${icon('check-check')}</span><div><b>${countLessons}</b><span>دروس أكملتها</span></div></div><div class="stat-card"><span class="stat-icon orange">${icon('check-circle2')}</span><div><b>${finished.length}</b><span>دورات أتممتها</span></div></div></div>
    ${next ? `<div class="continue-banner"><div>${tag(next)}<h2>خطوتك التالية في ${next.name}</h2><p>${state.courses[next.id].completed.length === next.lessons.length ? 'الاختبار النهائي' : next.lessons.find((l) => l.id === state.courses[next.id].last)?.title}</p></div><a class="button primary" href="${continueRoute(next, state)}">متابعة التعلّم</a></div>` : ''}
    <div class="section-heading learning-heading"><h2>دوراتي</h2><div class="filter-chips" aria-label="حالة الدورات">${[
      { id: 'all', name: 'الكل' },
      { id: 'active', name: 'قيد التعلّم' },
      { id: 'completed', name: 'مكتملة' },
    ]
      .map(
        (item) =>
          `<button class="filter-chip ${filter === item.id ? 'selected' : ''}" data-learning-filter="${item.id}" aria-pressed="${filter === item.id}">${item.name}</button>`,
      )
      .join('')}</div></div>
    ${filtered.length ? `<div class="course-grid">${filtered.map((course) => courseCard(course, state, true)).join('')}</div>` : `<div class="empty-state">${icon('book-open')}<h2>${!enrolled.length ? 'مساحة لمهارتك القادمة' : filter === 'completed' ? 'أول إنجاز في الطريق' : 'لا توجد دورات في هذه القائمة'}</h2><p>${!enrolled.length ? 'ابدأ دورة لتجد هنا تقدّمك ودروسك وملاحظاتك.' : 'يمكنك متابعة دوراتك الحالية أو استكشاف مهارة أخرى.'}</p><a class="button primary" href="#/courses">استكشف الدورات</a></div>`}
    ${enrolled.length ? `<section class="saved-notes"><div class="section-heading"><h2>ملاحظاتي المحفوظة</h2><span class="small-label">أفكارك تستحق العودة إليها</span></div>${enrolled.flatMap((course) => course.lessons.filter((lesson) => state.courses[course.id].notes[lesson.id]?.trim()).map((lesson) => `<article class="note-card"><span class="small-label">${course.name}</span><h3><a href="#/learn/${course.id}/${lesson.id}">${lesson.title}</a></h3><p>${esc(state.courses[course.id].notes[lesson.id])}</p></article>`)).join('') || '<p class="muted">دوّن فكرة داخل أي درس، وستجدها هنا.</p>'}</section><div class="data-controls"><span>${icon('info')} التقدم والملاحظات محفوظة في هذا المتصفح فقط.</span><button class="text-button" data-action="open-reset">مسح بيانات التعلّم</button></div>` : ''}</section>`;
}
export const notFound = () =>
  `<section class="container empty-state not-found"><span class="eyebrow">404</span><h1>هذه الصفحة غير موجودة</h1><p>يمكنك العودة إلى الدورات واختيار خطوتك التالية.</p><a class="button primary" href="#/courses">تصفّح الدورات</a></section>`;
