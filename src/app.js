// وشيجة — كود التطبيق
// ملاحظة: هذا الملف يُدمج داخل index.html عن طريق build.py

/* =========================================================
   أدوات عامة
   ========================================================= */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const ar = (v) => String(v).replace(/\d/g, (d) => AR_DIGITS[d]);
const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem('washijah:' + k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem('washijah:' + k, JSON.stringify(v)); } catch { /* التخزين غير متاح */ } },
};

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const DAYS_SHORT = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

const fmtDate = (d) => { d = new Date(d); return `${ar(d.getDate())} ${MONTHS[d.getMonth()]} ${ar(d.getFullYear())}`; };
const fmtMonth = (d) => { d = new Date(d); return `${MONTHS[d.getMonth()]} ${ar(d.getFullYear())}`; };
const isoDate = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const toMin = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const fmtTime = (min) => {
  min = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(min / 60), m = min % 60;
  const h12 = ((h + 11) % 12) + 1;
  return `${ar(h12)}:${ar(String(m).padStart(2, '0'))} ${h < 12 ? 'ص' : 'م'}`;
};
const fmtDuration = (min) => {
  const h = Math.floor(min / 60), m = min % 60;
  const hs = h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : h > 2 ? `${ar(h)} ساعات` : '';
  if (!m) return hs;
  return hs ? `${hs} و${ar(m)} دقيقة` : `${ar(m)} دقيقة`;
};
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const num = (v) => (v === '' || v == null || isNaN(Number(v)) ? null : clamp(Number(v), 0, 100));

let toastTimer;
function toast(msg) {
  const el = $('[data-toast]');
  el.textContent = msg;
  el.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-on'), 2600);
}

/* =========================================================
   الأيقونات والخانات
   ========================================================= */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  ai: '<path d="M12 3v2M12 19v2M5 12H3M21 12h-2"/><rect x="6" y="6" width="12" height="12" rx="3"/><path d="M10 10h.01M14 10h.01M9.5 14c1.5 1 3.5 1 5 0"/>',
  plan: '<path d="M4 20V5"/><path d="M4 5h11l-2 3.5L15 12H4"/><circle cx="18" cy="18" r="2.5"/><path d="M4 20h9"/>',
  schedule: '<rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M3 9.5h18M8 3v3M16 3v3M8 14h3M8 17h6"/>',
  focus: '<path d="M12 21v-7"/><path d="M12 14c-4 0-6-3-6-7 4 0 6 3 6 7Z"/><path d="M12 12c0-3 2-6 6-6 0 4-2 6-6 6Z"/>',
  level: '<path d="M4 20V14M10 20V9M16 20v-4M22 20H2"/><path d="M4 9l6-5 6 6 5-4"/>',
  grades: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5M9 13l2 2 4-4"/>',
  resources: '<path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2z"/><path d="M4 20a2 2 0 0 0 2 2h13v-4M9 8h6"/>',
  community: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-3.5 3.2-5.5 6.5-5.5s6 2 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.5c2.5 0 4.5 1.6 5 4.5"/>',
  messages: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12Z"/><path d="M8.5 11h7M8.5 14h4"/>',
  feedback: '<path d="M12 3v2.5M5.6 5.6l1.8 1.8M3 12h2.5M18.4 5.6l-1.8 1.8M21 12h-2.5"/><path d="M9 18h6M10 21h4M8 13a4 4 0 1 1 8 0c0 1.5-1 2.5-1.5 3.5h-5C9 15.5 8 14.5 8 13Z"/>',
  rewards: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/><path d="m12 6 .9 1.9 2.1.3-1.5 1.4.4 2-1.9-1-1.9 1 .4-2-1.5-1.4 2.1-.3z"/>',
  more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  back: '<path d="m9 6 6 6-6 6"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17l.7 1.8 1.8.7-1.8.7L19 22l-.7-1.8-1.8-.7 1.8-.7z"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.more}</svg>`;

// الخانات — اللي عندها route تفتح صفحتها، والباقي "قريباً"
const MODULES = [
  { id: 'ai', title: 'المساعد الذكي', desc: 'يحل أسئلتك ويصحّح إجاباتك خطوة بخطوة', tone: 'coral', badge: 'AI' },
  { id: 'schedule', title: 'جدولي', desc: 'جدول مذاكرة مبني على أهدافك', tone: 'maroon', route: true },
  { id: 'level', title: 'مستواي', desc: 'تقدير تلقائي لمستواك في كل مادة', tone: 'pink' },
  { id: 'resources', title: 'المصادر', desc: 'ملفات وروابط ينزّلها معلموك', tone: 'beige', badge: '٤ جديد' },
  { id: 'community', title: 'المجتمع', desc: 'شارك محتوى وفيديوهات مع زملائك', tone: 'beige' },
  { id: 'messages', title: 'الرسائل', desc: 'تواصل مع زملائك ومجموعات المواد', tone: 'beige', badge: '٣' },
  { id: 'feedback', title: 'اقتراحات للمعلمين', desc: 'رسائل لتطوير الشرح والحصص', tone: 'pink' },
  { id: 'grades', title: 'الدرجات', desc: 'درجاتك لكل مادة في مكان واحد', tone: 'beige' },
  { id: 'rewards', title: 'المحفزات', desc: 'نقاط وشارات وإنجازات', tone: 'maroon', badge: '٣٢٠ نقطة' },
];
const ROUTES = ['home', 'plan', 'schedule'];
const SIDEBAR = [
  { id: 'home', title: 'الرئيسية' },
  { id: 'plan', title: 'خطتي المستقبلية' },
  { id: 'focus', title: 'ركّز' },
  ...MODULES.map(({ id, title }) => ({ id, title })),
];
const TABS = [
  { id: 'home', title: 'الرئيسية' },
  { id: 'plan', title: 'خطتي' },
  { id: 'schedule', title: 'جدولي' },
  { id: 'focus', title: 'ركّز' },
  { id: 'more', title: 'المزيد' },
];
const navAttr = (id, title) => (ROUTES.includes(id) ? `data-route="${id}"` : id === 'focus' ? 'data-focus' : `data-soon="${title}"`);

function renderChrome() {
  $('[data-modules]').innerHTML = MODULES.map((m) => `
    <a class="module module--${m.tone}" href="#${m.id}" ${navAttr(m.route ? m.id : '_', m.title)}>
      <span class="module__icon">${icon(m.id)}</span>
      ${m.badge ? `<span class="module__badge">${m.badge}</span>` : ''}
      <strong>${m.title}</strong>
      <small>${m.desc}</small>
    </a>`).join('');
  $('[data-nav]').innerHTML = SIDEBAR.map((s) =>
    `<a href="#${s.id}" data-nav-id="${s.id}" ${navAttr(s.id, s.title)}>${icon(s.id)}<span>${s.title}</span></a>`).join('');
  $('[data-tabbar]').innerHTML = TABS.map((t) =>
    `<a href="#${t.id}" data-nav-id="${t.id}" ${navAttr(t.id, t.title)}>${icon(t.id)}<span>${t.title}</span></a>`).join('');
}

/* =========================================================
   بيانات الخطة: التخصصات والجامعات
   ========================================================= */
const MAJORS = {
  medicine: { label: 'الطب والعلوم الصحية', subjects: ['أحياء', 'كيمياء'], target: { gpa: 97, qud: 85, tah: 88 }, passion: 'تطوع صحي أو قراءة علمية' },
  engineering: { label: 'الهندسة', subjects: ['رياضيات', 'فيزياء'], target: { gpa: 92, qud: 80, tah: 82 }, passion: 'مشروع هندسي أو روبوتات' },
  cs: { label: 'علوم الحاسب والبرمجيات', subjects: ['رياضيات', 'حاسب'], target: { gpa: 92, qud: 82, tah: 80 }, passion: 'تعلّم برمجة ومشروع صغير' },
  ai: { label: 'الذكاء الاصطناعي والبيانات', subjects: ['رياضيات', 'حاسب'], target: { gpa: 93, qud: 83, tah: 80 }, passion: 'دورة ذكاء اصطناعي ومشروع بيانات' },
  business: { label: 'إدارة الأعمال والمالية', subjects: ['رياضيات', 'إنجليزي'], target: { gpa: 88, qud: 75, tah: 72 }, passion: 'قراءة عن ريادة الأعمال أو مشروع صغير' },
  law: { label: 'القانون', subjects: ['لغتي', 'إنجليزي'], target: { gpa: 88, qud: 75, tah: 70 }, passion: 'قراءة ومناظرات' },
  science: { label: 'العلوم (فيزياء، كيمياء، أحياء)', subjects: ['فيزياء', 'كيمياء'], target: { gpa: 88, qud: 75, tah: 78 }, passion: 'تجارب علمية ومسابقات' },
  languages: { label: 'اللغات والترجمة', subjects: ['إنجليزي', 'لغتي'], target: { gpa: 85, qud: 72, tah: 68 }, passion: 'قراءة وتعلّم لغة جديدة' },
  design: { label: 'التصميم والعمارة', subjects: ['رياضيات', 'فيزياء'], target: { gpa: 88, qud: 75, tah: 72 }, passion: 'رسم وتصميم ومعرض أعمال' },
  education: { label: 'التعليم', subjects: ['لغتي', 'إنجليزي'], target: { gpa: 85, qud: 70, tah: 68 }, passion: 'تطوع في تدريس زملائك' },
  other: { label: 'تخصص ثاني', subjects: ['رياضيات', 'إنجليزي'], target: { gpa: 85, qud: 72, tah: 70 }, passion: 'شي تحبه ويقرّبك من هدفك' },
};
const UNIVERSITIES = [
  'جامعة الملك سعود', 'جامعة الملك عبدالعزيز', 'جامعة الملك فهد للبترول والمعادن', 'جامعة الإمام عبدالرحمن بن فيصل',
  'جامعة الأميرة نورة بنت عبدالرحمن', 'جامعة أم القرى', 'جامعة القصيم', 'جامعة الملك خالد', 'جامعة طيبة',
  'جامعة الإمام محمد بن سعود الإسلامية', 'جامعة الملك سعود بن عبدالعزيز للعلوم الصحية', 'ما قررت للحين',
];
const SUBJECTS = ['رياضيات', 'فيزياء', 'كيمياء', 'أحياء', 'إنجليزي', 'لغتي', 'حاسب', 'علوم الأرض'];
const PROGRAMS = ['موهبة', 'مسك', 'أكاديمية طويق', 'دورات أونلاين', 'أولمبياد ومسابقات', 'تطوع', 'نادي مدرسي', 'ما عندي للحين'];
const SERIOUS = ['أستكشف', 'مهتم شوي', 'مهتم', 'مهتم جداً', 'متأكد ١٠٠٪'];
const GRADES = ['أول ثانوي', 'ثاني ثانوي', 'ثالث ثانوي'];

/* =========================================================
   مولّد الخطة المبدئية (يشتغل بدون إنترنت)
   ========================================================= */
// النسبة الموزونة الشائعة: ٣٠٪ ثانوية + ٣٠٪ قدرات + ٤٠٪ تحصيلي
const weighted = (gpa, qud, tah) =>
  gpa == null || qud == null || tah == null ? null : Math.round(gpa * 0.3 + qud * 0.3 + tah * 0.4);

function timeline(grade) {
  const now = new Date();
  const yearEnd = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
  const end = new Date(yearEnd + (3 - grade), 5, 15); // منتصف يونيو من سنة التخرج
  const days = Math.max(30, Math.round((end - now) / 864e5));
  return { now, end, days };
}

function localPlan(a) {
  const major = MAJORS[a.major] || MAJORS.other;
  const { now, end, days } = timeline(a.grade);
  const at = (f) => new Date(now.getTime() + (end - now) * f);
  const weak = a.weak.filter((s) => s);
  const focus = [...new Set([...weak, ...major.subjects])];
  const programs = a.programs.filter((p) => p !== 'ما عندي للحين');
  const gap = {
    gpa: a.gpaNow != null ? a.gpaTarget - a.gpaNow : null,
    qud: a.qudNow != null ? a.qudTarget - a.qudNow : null,
    tah: a.tahNow != null ? a.tahTarget - a.tahNow : null,
  };
  const uni = a.university && a.university !== 'ما قررت للحين' ? a.university : 'الجامعة اللي تناسبك';

  const phases = [
    {
      title: 'التأسيس وبناء العادة', from: now, to: at(0.25),
      goals: [
        `ثبّت جدول مذاكرة يومي (${ar(a.hoursWeekday)} ساعة بأيام الدراسة)`,
        `قوِّ أساسك في ${focus.slice(0, 2).join(' و')}`,
        'خلّص واجباتك أول بأول وبدون تأجيل',
      ],
    },
    {
      title: 'التقوية والتعمّق', from: at(0.25), to: at(0.55),
      goals: [
        gap.gpa != null && gap.gpa > 0 ? `ارفع معدلك ${gap.gpa === 1 ? 'درجة وحدة' : gap.gpa === 2 ? 'درجتين' : ar(gap.gpa) + (gap.gpa <= 10 ? ' درجات' : ' درجة')} لين توصل ${ar(a.gpaTarget)}٪` : `حافظ على معدلك فوق ${ar(a.gpaTarget)}٪`,
        a.grade >= 2 ? 'ابدأ تتدرب على القدرات ٣ مرات بالأسبوع' : 'تعرّف على اختبار القدرات وحل نماذج بسيطة',
        programs.length ? `كمّل في ${programs[0]} وسجّل إنجازاتك` : `جرّب برنامج يقربك من ${major.label} (مثل موهبة أو مسك)`,
      ],
    },
    {
      title: 'القدرات والتحصيلي', from: at(0.55), to: at(0.85),
      goals: [
        `هدفك في القدرات ${ar(a.qudTarget)}٪ وفي التحصيلي ${ar(a.tahTarget)}٪`,
        'اختبار تجريبي كل أسبوع وراجع أخطاءك',
        `ركّز التحصيلي على ${major.subjects.join(' و')}`,
      ],
    },
    {
      title: 'التجهيز للقبول', from: at(0.85), to: end,
      goals: [
        `حقق نسبة موزونة ${ar(weighted(a.gpaTarget, a.qudTarget, a.tahTarget))}٪ أو أعلى`,
        `جهّز ملف إنجازاتك وقدّم على ${major.label} في ${uni}`,
        'جهّز خطة بديلة بتخصص قريب احتياطاً',
      ],
    },
  ];

  const milestones = [
    { title: 'أول أسبوع على جدولك الجديد', date: new Date(now.getTime() + 7 * 864e5) },
    { title: a.grade >= 2 ? 'أول اختبار قدرات تجريبي' : 'أول نموذج قدرات تجريبي', date: new Date(now.getTime() + 21 * 864e5) },
    { title: 'اختبار القدرات', date: at(0.65) },
    { title: 'اختبار التحصيلي', date: at(0.8) },
    { title: `التقديم على ${uni}`, date: end },
  ];

  const tips = [];
  if (a.seriousness <= 2) tips.push(`بما إنك للحين تستكشف، جرّب يوم مفتوح أو كلّم طالب يدرس ${major.label} قبل ما تقرر نهائياً.`);
  else tips.push(`حماسك لـ${major.label} واضح، خلّه يكون سبب تذكّره كل ما تعبت.`);
  if (weak.length) tips.push(`ابدأ يومك بالمادة الأصعب (${weak[0]}) وأنت مرتاح، وخلّ السهلة للآخر.`);
  tips.push('استخدم مؤقت «ركّز» لكل جلسة، ٤٥ دقيقة مذاكرة و١٥ راحة.');
  if (!programs.length) tips.push('البرامج والتدريبات تقوّي ملفك، سجّل في واحد على الأقل هذا الفصل.');

  return {
    source: 'local',
    summary: `خطتك توصلك لـ${major.label} في ${uni} خلال ${ar(days)} يوم. قسّمناها لأربع مراحل، وجدولك الأسبوعي يركز على ${focus.slice(0, 3).join(' و')}${a.grade >= 2 ? ' مع تدريب القدرات' : ''}.`,
    phases: phases.map((p) => ({ ...p, from: isoDate(p.from), to: isoDate(p.to) })),
    milestones: milestones.map((m) => ({ ...m, date: isoDate(m.date) })),
    week: localWeek(a, focus, major),
    tips,
  };
}

function localWeek(a, focus, major) {
  const start = toMin(a.startTime || '16:00');
  const exam = a.grade === 3 ? 'تحصيلي' : 'قدرات';
  let rot = 0;
  const next = () => focus[rot++ % focus.length];
  const week = [];
  for (let d = 0; d < 7; d++) {
    const weekend = d === 5 || d === 6;
    const budget = Math.round((weekend ? a.hoursWeekend : a.hoursWeekday) * 60);
    let items;
    if (d === 5) items = [
      { title: major.passion, minutes: 60, type: 'passion' },
      { title: `مراجعة خفيفة: ${next()}`, minutes: 40, type: 'review' },
      { title: `تدريب ${exam}`, minutes: 40, type: 'exam' },
    ];
    else if (d === 6) items = [
      { title: 'مراجعة الأسبوع', minutes: 60, type: 'review' },
      { title: `اختبار ${exam} تجريبي`, minutes: 50, type: 'exam' },
      { title: next(), minutes: 45, type: 'study' },
      { title: major.passion, minutes: 45, type: 'passion' },
    ];
    else items = [
      { title: 'واجبات اليوم', minutes: 50, type: 'homework' },
      { title: next(), minutes: 45, type: 'study' },
      ...(a.grade >= 2 && d % 2 === 0 ? [{ title: `تدريب ${a.grade === 3 && d === 2 ? 'تحصيلي' : 'قدرات'}`, minutes: 30, type: 'exam' }] : []),
      { title: next(), minutes: 40, type: 'study' },
      { title: 'مراجعة سريعة لدروس اليوم', minutes: 25, type: 'review' },
    ];
    let t = d === 5 ? Math.max(start, toMin('16:30')) : start; // الجمعة بعد العصر
    let used = 0;
    const blocks = [];
    for (const it of items) {
      if (used + it.minutes > budget + 10) {
        const leftover = budget - used;
        if (leftover >= 25) { blocks.push({ ...it, start: t, minutes: leftover }); used += leftover; }
        break;
      }
      blocks.push({ ...it, start: t });
      t += it.minutes + 15;
      used += it.minutes;
    }
    if (blocks.length) {
      const last = blocks[blocks.length - 1];
      blocks.push({ title: 'وقت حر', minutes: 60, type: 'free', start: last.start + last.minutes + 15 });
    }
    week.push({ day: d, blocks });
  }
  return week;
}

/* =========================================================
   الذكاء الاصطناعي (يشتغل لما الصفحة مفتوحة داخل Claude)
   ========================================================= */
let samplePromise = Promise.resolve(null);
try {
  if (window.claude && typeof window.claude.use === 'function') samplePromise = window.claude.use('sample').catch(() => null);
} catch { /* بدون ذكاء اصطناعي */ }

function aiPrompt(a, base) {
  const major = MAJORS[a.major] || MAJORS.other;
  const { days } = timeline(a.grade);
  const facts = {
    الصف: GRADES[a.grade - 1],
    الحلم: a.dream,
    'ليش يحبه': a.passion,
    'مدى الاهتمام (من ٥)': a.seriousness,
    التخصص: a.major === 'other' && a.majorOther ? a.majorOther : major.label,
    الجامعة: a.university || 'ما قرر',
    'المعدل الحالي': a.gpaNow ?? 'غير معروف', 'المعدل المطلوب': a.gpaTarget,
    'القدرات الحالية': a.qudNow ?? 'ما اختبر', 'القدرات المطلوبة': a.qudTarget,
    'التحصيلي الحالي': a.tahNow ?? 'ما اختبر', 'التحصيلي المطلوب': a.tahTarget,
    'مواد يحتاج يقويها': a.weak.join('، ') || 'ما حدد',
    'برامج وتدريبات': [...a.programs, a.programsNote].filter(Boolean).join('، ') || 'لا يوجد',
    'ساعات المذاكرة بأيام الدراسة': a.hoursWeekday,
    'ساعات المذاكرة بالإجازة (الجمعة والسبت)': a.hoursWeekend,
    'يبدأ المذاكرة الساعة': a.startTime,
    'الأيام الباقية للتخرج': days,
    'تاريخ اليوم': isoDate(new Date()),
  };
  return `أنت مرشد أكاديمي سعودي ودود لطلاب الثانوي في منصة «وشيجة». اكتب خطة مستقبلية واقعية وجدول مذاكرة أسبوعي لهذا الطالب، بلغة عربية بسيطة وقريبة (لهجة بيضاء خفيفة).

بيانات الطالب:
${Object.entries(facts).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

القواعد:
- الأسبوع يبدأ الأحد (day=0) وينتهي السبت (day=6). الجمعة والسبت إجازة.
- لا تتجاوز ساعات المذاكرة اليومية المذكورة، وخل بين الجلسات راحة ١٥ دقيقة، والجلسة بين ٢٥ و٦٠ دقيقة.
- اربط الجدول بأهدافه: المواد الضعيفة، مواد التخصص، القدرات/التحصيلي حسب صفه، ووقت لبرامجه أو شغفه.
- أضف آخر كل يوم جلسة نوعها free بعنوان «وقت حر».
- المراحل من اليوم لين ${isoDate(timeline(a.grade).end)} ومتتالية بدون فجوات.
- كن صريح لو الأهداف صعبة مقارنة بمستواه الحالي، واقترح بديل.

رد بـ JSON فقط بهذا الشكل بالضبط:
{"summary":"فقرة قصيرة","phases":[{"title":"","from":"YYYY-MM-DD","to":"YYYY-MM-DD","goals":["","",""]}],"milestones":[{"title":"","date":"YYYY-MM-DD"}],"week":[{"day":0,"blocks":[{"start":"16:00","minutes":45,"title":"","type":"homework|study|exam|passion|review|free"}]}],"tips":["",""]}
- phases: من ٣ إلى ٥ مراحل. milestones: من ٣ إلى ٦. week: ٧ أيام. tips: من ٢ إلى ٤.

مثال على جدول مبدئي محسوب (حسّنه ولا تنسخه حرفياً):
${JSON.stringify(base.week.slice(0, 2).map((d) => ({ day: d.day, blocks: d.blocks.map((b) => ({ start: b.start, minutes: b.minutes, title: b.title, type: b.type })) })))}`;
}

const TYPES = ['homework', 'study', 'exam', 'passion', 'review', 'free'];
const okDate = (s) => typeof s === 'string' && !isNaN(new Date(s).getTime());
const str = (s, max = 160) => String(s ?? '').trim().slice(0, max);

// نتأكد إن رد الذكاء الاصطناعي سليم، وأي جزء ناقص نكمّله من الخطة المبدئية
function mergeAi(ai, base) {
  if (!ai || typeof ai !== 'object') return null;
  const plan = { ...base, source: 'ai' };
  if (str(ai.summary, 600)) plan.summary = str(ai.summary, 600);
  if (Array.isArray(ai.phases) && ai.phases.length >= 2) {
    const ph = ai.phases.slice(0, 6).filter((p) => p && str(p.title) && okDate(p.from) && okDate(p.to))
      .map((p) => ({ title: str(p.title, 60), from: p.from, to: p.to, goals: (Array.isArray(p.goals) ? p.goals : []).map((g) => str(g)).filter(Boolean).slice(0, 5) }));
    if (ph.length >= 2) plan.phases = ph;
  }
  if (Array.isArray(ai.milestones)) {
    const ms = ai.milestones.filter((m) => m && str(m.title) && okDate(m.date)).slice(0, 8).map((m) => ({ title: str(m.title, 80), date: m.date }));
    if (ms.length >= 2) plan.milestones = ms;
  }
  if (Array.isArray(ai.tips)) {
    const tp = ai.tips.map((t) => str(t, 220)).filter(Boolean).slice(0, 5);
    if (tp.length) plan.tips = tp;
  }
  if (Array.isArray(ai.week)) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const day = ai.week.find((w) => w && Number(w.day) === d);
      const blocks = (day && Array.isArray(day.blocks) ? day.blocks : [])
        .filter((b) => b && str(b.title) && /^\d{1,2}:\d{2}$/.test(String(b.start)))
        .map((b) => ({ start: toMin(b.start), minutes: clamp(Math.round(Number(b.minutes) || 30), 10, 180), title: str(b.title, 60), type: TYPES.includes(b.type) ? b.type : 'study' }))
        .sort((x, y) => x.start - y.start)
        .slice(0, 10);
      week.push({ day: d, blocks: blocks.length ? blocks : base.week[d].blocks });
    }
    plan.week = week;
  }
  return plan;
}

/* =========================================================
   الحالة
   ========================================================= */
const state = {
  answers: store.get('answers'),
  plan: store.get('plan'),
  done: store.get('done') || {}, // { 'YYYY-MM-DD|index': true }
  editing: false,
  step: 0,
  draft: null,
  generating: null,
  scheduleDay: new Date().getDay(),
};

const emptyAnswers = () => ({
  name: '', grade: 2, dream: '', passion: '', seriousness: 4,
  major: '', majorOther: '', university: '',
  gpaNow: null, gpaTarget: null, qudNow: null, qudTarget: null, tahNow: null, tahTarget: null,
  weak: [], programs: [], programsNote: '',
  hoursWeekday: 2.5, hoursWeekend: 4, startTime: '16:00',
});

/* =========================================================
   الترويسة والتنقل
   ========================================================= */
const HERO = {
  plan: ['خطتي المستقبلية', 'من اليوم لين توصل هدفك'],
  schedule: ['جدولي', 'نظّم وقتك بنفسك'],
};

function renderHero(route) {
  if (HERO[route]) {
    $('[data-hero-title]').textContent = HERO[route][0];
    $('[data-hero-sub]').textContent = HERO[route][1];
    return;
  }
  const g = new Date().getHours() < 12 ? 'صباح الخير' : 'مساء الخير';
  const name = state.answers?.name?.trim();
  $('[data-hero-title]').textContent = name ? `${g}، ${name}` : g;
  const grade = state.answers ? ` • ${GRADES[state.answers.grade - 1]}` : '';
  $('[data-hero-sub]').textContent = DAYS[new Date().getDay()] + grade;
}

function currentRoute() {
  const h = location.hash.replace('#', '');
  return ROUTES.includes(h) ? h : 'home';
}

function go(route) {
  if (location.hash !== '#' + route) location.hash = route;
  else show();
}

function show() {
  const route = currentRoute();
  $$('[data-view]').forEach((v) => { v.hidden = v.dataset.view !== route; });
  $$('[data-nav-id]').forEach((a) => a.classList.toggle('is-active', a.dataset.navId === route));
  renderHero(route);
  if (route === 'home') renderHomePlan();
  if (route === 'plan') renderPlanView();
  if (route === 'schedule') renderSchedule();
  window.scrollTo({ top: 0 });
}

/* =========================================================
   الرئيسية: بطاقة الخطة
   ========================================================= */
function weekProgress() {
  if (!state.plan) return 0;
  const start = new Date(); start.setDate(start.getDate() - start.getDay());
  let total = 0, done = 0;
  for (let d = 0; d < 7; d++) {
    const date = new Date(start); date.setDate(start.getDate() + d);
    const key = isoDate(date);
    state.plan.week[d].blocks.forEach((b, i) => {
      if (b.type === 'free') return;
      total++;
      if (state.done[`${key}|${i}`]) done++;
    });
  }
  return total ? Math.round((done / total) * 100) : 0;
}

function renderHomePlan() {
  const el = $('[data-home-plan]');
  if (!state.plan || !state.answers) {
    el.innerHTML = `
      <div class="plan-card__body">
        <span class="chip chip--light">✦ بالذكاء الاصطناعي</span>
        <h2 id="plan-title">خطتي المستقبلية</h2>
        <p>قلّنا وش حلمك، ونسوي لك خطة من اليوم لين توصل له، مع جدول مذاكرة على وقتك.</p>
      </div>
      <a class="btn btn--white" href="#plan" data-route="plan">ابدأ خطتك</a>`;
    return;
  }
  const a = state.answers;
  const major = MAJORS[a.major] || MAJORS.other;
  const { days } = timeline(a.grade);
  const p = weekProgress();
  el.innerHTML = `
    <div class="plan-card__body">
      <span class="chip chip--light">✦ ${state.plan.source === 'ai' ? 'بالذكاء الاصطناعي' : 'خطة مبدئية'}</span>
      <h2 id="plan-title">خطتي المستقبلية</h2>
      <p>هدفك: <strong>${esc(a.major === 'other' && a.majorOther ? a.majorOther : major.label)}</strong> • نسبة موزونة ${ar(weighted(a.gpaTarget, a.qudTarget, a.tahTarget))}٪</p>
      <div class="progress" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100" aria-label="إنجاز جدول هذا الأسبوع">
        <span style="width:${p}%"></span>
      </div>
      <div class="plan-card__meta">
        <span>أنجزت ${ar(p)}٪ من جدول هذا الأسبوع</span>
        <span>باقي ${ar(days)} يوم</span>
      </div>
    </div>
    <a class="btn btn--white" href="#plan" data-route="plan">افتح خطتي</a>`;
}

/* =========================================================
   خطتي المستقبلية: المعالج (خطوات التعبئة)
   ========================================================= */
const STEPS = [
  { title: 'حلمك وشغفك', hint: 'وش تبي تصير؟ وليش؟' },
  { title: 'التخصص والجامعة', hint: 'وين تبي توصل' },
  { title: 'النسب', hint: 'وين أنت الحين ووين تبي توصل' },
  { title: 'البرامج والتدريبات', hint: 'وش اللي قاعد تسويه برا المدرسة' },
  { title: 'وقتك الفاضي', hint: 'كم تقدر تذاكر' },
];

const chipGroup = (name, options, selected, multi) => `
  <div class="chips" role="group" data-chips="${name}" data-multi="${multi ? 1 : 0}">
    ${options.map((o, i) => {
      const val = typeof o === 'object' ? o.value : o;
      const label = typeof o === 'object' ? o.label : o;
      const on = multi ? selected.includes(val) : String(selected) === String(val);
      return `<button type="button" class="chip-opt${on ? ' is-on' : ''}" aria-pressed="${on}" data-value="${esc(val)}">${esc(label)}</button>`;
    }).join('')}
  </div>`;

const pctField = (label, key, a, hint) => `
  <div class="pct">
    <span class="pct__label">${label}</span>
    <label><small>الحالي</small><input type="number" inputmode="numeric" min="0" max="100" placeholder="${hint}" data-field="${key}Now" value="${a[key + 'Now'] ?? ''}" /></label>
    <label><small>هدفك</small><input type="number" inputmode="numeric" min="0" max="100" data-field="${key}Target" value="${a[key + 'Target'] ?? ''}" /></label>
  </div>`;

function stepBody(i, a) {
  if (i === 0) return `
    <label class="field"><span>اسمك</span><input type="text" data-field="name" value="${esc(a.name)}" placeholder="مثلاً: عبدالله" maxlength="30" /></label>
    <div class="field"><span>أنت في أي صف؟</span>${chipGroup('grade', GRADES.map((g, k) => ({ value: k + 1, label: g })), a.grade, false)}</div>
    <label class="field"><span>وش حلمك أو هدفك الكبير؟ <b>*</b></span><textarea data-field="dream" rows="2" maxlength="200" placeholder="مثلاً: أصير مهندس برمجيات وأسوي تطبيقات تخدم الناس">${esc(a.dream)}</textarea></label>
    <label class="field"><span>ليش تحب هالشي؟ وش اللي يشدك له؟</span><textarea data-field="passion" rows="2" maxlength="200" placeholder="مثلاً: أحب أحل المشاكل وأبني أشياء من الصفر">${esc(a.passion)}</textarea></label>
    <div class="field"><span>كم أنت مهتم فيه صدق؟</span>${chipGroup('seriousness', SERIOUS.map((s, k) => ({ value: k + 1, label: s })), a.seriousness, false)}</div>`;
  if (i === 1) return `
    <div class="field"><span>التخصص اللي تبيه <b>*</b></span>${chipGroup('major', Object.entries(MAJORS).map(([value, m]) => ({ value, label: m.label })), a.major, false)}</div>
    ${a.major === 'other' ? `<label class="field"><span>اكتب التخصص</span><input type="text" data-field="majorOther" value="${esc(a.majorOther)}" maxlength="50" /></label>` : ''}
    <label class="field"><span>الجامعة اللي تحلم فيها</span>
      <input type="text" list="unis" data-field="university" value="${esc(a.university)}" placeholder="اختر أو اكتب اسم الجامعة" maxlength="60" />
      <datalist id="unis">${UNIVERSITIES.map((u) => `<option value="${u}"></option>`).join('')}</datalist>
    </label>`;
  if (i === 2) return `
    <p class="note">حطينا لك نسب مقترحة حسب تخصصك، عدّلها لو تعرف المطلوب بالضبط. لو ما اختبرت للحين خلّ «الحالي» فاضي.</p>
    ${pctField('معدل الثانوية', 'gpa', a, 'مثلاً ٨٨')}
    ${pctField('القدرات', 'qud', a, 'ما اختبرت')}
    ${pctField('التحصيلي', 'tah', a, 'ما اختبرت')}
    <div class="weighted" data-weighted></div>
    <div class="field"><span>مواد تحس إنك تحتاج تقويها (اختياري)</span>${chipGroup('weak', SUBJECTS, a.weak, true)}</div>`;
  if (i === 3) return `
    <div class="field"><span>عندك برامج أو تدريبات؟</span>${chipGroup('programs', PROGRAMS, a.programs, true)}</div>
    <label class="field"><span>تفاصيل (اختياري)</span><textarea data-field="programsNote" rows="2" maxlength="200" placeholder="مثلاً: دورة بايثون على منصة سطر، ومشارك في أولمبياد الرياضيات">${esc(a.programsNote)}</textarea></label>`;
  return `
    <label class="field range"><span>أيام الدراسة (الأحد للخميس): <b data-out="hoursWeekday">${ar(a.hoursWeekday)} ساعة</b></span>
      <input type="range" min="1" max="6" step="0.5" data-field="hoursWeekday" value="${a.hoursWeekday}" /></label>
    <label class="field range"><span>الإجازة (الجمعة والسبت): <b data-out="hoursWeekend">${ar(a.hoursWeekend)} ساعة</b></span>
      <input type="range" min="1" max="8" step="0.5" data-field="hoursWeekend" value="${a.hoursWeekend}" /></label>
    <div class="field"><span>متى تبدأ تذاكر عادةً؟</span>
      ${chipGroup('startTime', ['14:00', '15:00', '16:00', '17:00', '19:00', '20:00'].map((t) => ({ value: t, label: fmtTime(toMin(t)) })), a.startTime, false)}
    </div>`;
}

function renderWizard() {
  const a = state.draft;
  const i = state.step;
  const view = $('[data-view="plan"]');
  view.innerHTML = `
    <section class="wizard" aria-labelledby="wiz-title">
      <div class="wizard__top">
        <div class="steps" aria-label="الخطوة ${ar(i + 1)} من ${ar(STEPS.length)}">
          ${STEPS.map((s, k) => `<span class="${k < i ? 'is-done' : k === i ? 'is-on' : ''}"></span>`).join('')}
        </div>
        <span class="count">${ar(i + 1)} / ${ar(STEPS.length)}</span>
      </div>
      <h2 id="wiz-title">${STEPS[i].title}</h2>
      <p class="wizard__hint">${STEPS[i].hint}</p>
      <form class="wizard__form" data-wizard novalidate>${stepBody(i, a)}</form>
      <div class="wizard__nav">
        ${i > 0 ? '<button type="button" class="btn btn--ghost" data-wiz="back">رجوع</button>' : state.plan ? '<button type="button" class="btn btn--ghost" data-wiz="cancel">إلغاء</button>' : '<span></span>'}
        <button type="button" class="btn btn--coral" data-wiz="next">${i === STEPS.length - 1 ? '✦ سوّ خطتي' : 'التالي'}</button>
      </div>
    </section>`;
  updateWeighted();
}

function updateWeighted() {
  const el = $('[data-weighted]');
  if (!el) return;
  const a = state.draft;
  const t = weighted(a.gpaTarget, a.qudTarget, a.tahTarget);
  const n = weighted(a.gpaNow, a.qudNow, a.tahNow);
  el.innerHTML = t == null ? '' : `النسبة الموزونة المستهدفة: <strong>${ar(t)}٪</strong>${n != null ? ` • الحالية: ${ar(n)}٪` : ''}`;
}

function applyMajorTargets(a) {
  const m = MAJORS[a.major];
  if (!m) return;
  if (a.gpaTarget == null) a.gpaTarget = m.target.gpa;
  if (a.qudTarget == null) a.qudTarget = m.target.qud;
  if (a.tahTarget == null) a.tahTarget = m.target.tah;
}

function validateStep() {
  const a = state.draft;
  if (state.step === 0 && a.dream.trim().length < 3) return 'اكتب حلمك أو هدفك عشان نقدر نبني خطتك';
  if (state.step === 1 && !a.major) return 'اختر التخصص اللي تبيه';
  if (state.step === 1 && a.major === 'other' && !a.majorOther.trim()) return 'اكتب اسم التخصص';
  if (state.step === 2 && (a.gpaTarget == null || a.qudTarget == null || a.tahTarget == null)) return 'حط هدفك في كل النسب';
  return null;
}

/* =========================================================
   خطتي المستقبلية: توليد الخطة
   ========================================================= */
async function generatePlan() {
  const a = { ...state.draft, programs: [...state.draft.programs], weak: [...state.draft.weak] };
  const base = localPlan(a);
  const ctl = new AbortController();
  state.generating = ctl;
  renderLoading();

  let plan = base;
  const sample = await Promise.race([samplePromise, new Promise((r) => setTimeout(() => r(null), 1500))]);
  if (sample && !ctl.signal.aborted) {
    try {
      const ai = await sample.json(aiPrompt(a, base), { signal: ctl.signal, modelTier: 'default' });
      plan = mergeAi(ai, base) || base;
      if (plan.source !== 'ai') toast('ما قدرنا نقرأ رد الذكاء الاصطناعي، جهزنا لك خطة مبدئية');
    } catch (e) {
      if (e && e.code !== 'cancelled') toast('الذكاء الاصطناعي مو متاح الحين، جهزنا لك خطة مبدئية');
    }
  } else {
    await new Promise((r) => setTimeout(r, 1400)); // لحظة قصيرة عشان تبان الخطوات
  }

  if (state.generating !== ctl) return; // انلغى
  state.generating = null;
  plan.createdAt = new Date().toISOString();
  state.answers = a;
  state.plan = plan;
  state.editing = false;
  store.set('answers', a);
  store.set('plan', plan);
  toast(plan.source === 'ai' ? 'خطتك جاهزة ✦' : 'خطتك المبدئية جاهزة');
  renderHero('plan');
  renderPlanView();
  window.scrollTo({ top: 0 });
}

function renderLoading() {
  $('[data-view="plan"]').innerHTML = `
    <section class="loading" aria-live="polite">
      <div class="loading__orb">${icon('spark')}</div>
      <h2>نجهّز خطتك…</h2>
      <ul class="loading__steps">
        <li>نقرأ حلمك وأهدافك</li>
        <li>نحسب الفرق بين نسبك الحالية واللي تبيها</li>
        <li>نقسّم الطريق لمراحل</li>
        <li>نرتّب جدولك على وقتك الفاضي</li>
      </ul>
      <button type="button" class="btn btn--ghost" data-skip-ai>استخدم الخطة السريعة</button>
    </section>`;
}

/* =========================================================
   خطتي المستقبلية: عرض الخطة
   ========================================================= */
function bar(label, now, target) {
  const pNow = now ?? 0;
  return `
    <div class="gap">
      <div class="gap__head"><span>${label}</span><span>${now != null ? `${ar(now)}٪ ← ` : ''}<strong>${ar(target)}٪</strong></span></div>
      <div class="gap__bar"><span class="gap__target" style="width:${target}%"></span><span class="gap__now" style="width:${pNow}%"></span></div>
      ${now == null ? '<small>ما اختبرت للحين</small>' : now >= target ? '<small class="ok">وصلت هدفك 👏</small>' : `<small>باقي ${target - now === 1 ? 'درجة وحدة' : target - now === 2 ? 'درجتين' : ar(target - now) + (target - now <= 10 ? ' درجات' : ' درجة')}</small>`}
    </div>`;
}

function renderPlanView() {
  const view = $('[data-view="plan"]');
  if (state.generating) return;
  if (!state.plan || state.editing) {
    if (!state.draft) state.draft = state.answers ? { ...state.answers } : emptyAnswers();
    if (!state.plan && !state.editing && state.step === 0 && !state.answers) {
      view.innerHTML = `
        <section class="intro">
          <div class="intro__icon">${icon('plan')}</div>
          <h2>خطتك من اليوم لين توصل حلمك</h2>
          <p>جاوب على ٥ أسئلة بسيطة عن حلمك ونسبك ووقتك، والذكاء الاصطناعي يسوي لك:</p>
          <ul>
            <li>${icon('check')} خطة مقسّمة لمراحل بتواريخ واضحة</li>
            <li>${icon('check')} الفرق بين نسبك الحالية واللي تحتاجها</li>
            <li>${icon('check')} جدول مذاكرة أسبوعي على وقتك الفاضي</li>
          </ul>
          <button type="button" class="btn btn--coral" data-start-wizard>يلا نبدأ</button>
          <p class="intro__private">${icon('lock')} خطتك خاصة وتظهر لك بس</p>
        </section>`;
      return;
    }
    renderWizard();
    return;
  }

  const a = state.answers;
  const p = state.plan;
  const major = MAJORS[a.major] || MAJORS.other;
  const { days } = timeline(a.grade);
  const today = isoDate(new Date());
  const tNow = weighted(a.gpaNow, a.qudNow, a.tahNow);
  const tGoal = weighted(a.gpaTarget, a.qudTarget, a.tahTarget);

  view.innerHTML = `
    <section class="goal">
      <span class="chip chip--light">✦ ${p.source === 'ai' ? 'صممها الذكاء الاصطناعي' : 'خطة مبدئية'}</span>
      <h2>${esc(a.dream)}</h2>
      <p>${esc(a.major === 'other' && a.majorOther ? a.majorOther : major.label)}${a.university && a.university !== 'ما قررت للحين' ? ` • ${esc(a.university)}` : ''}</p>
      <div class="goal__stats">
        <div><strong>${ar(days)}</strong><small>يوم باقي</small></div>
        <div><strong>${ar(tGoal)}٪</strong><small>الموزونة المطلوبة</small></div>
        <div><strong>${tNow != null ? ar(tNow) + '٪' : '—'}</strong><small>الموزونة الحالية</small></div>
      </div>
    </section>

    <section class="block">
      <div class="block__head"><h2>ملخص خطتك</h2></div>
      <p class="summary">${esc(p.summary)}</p>
    </section>

    <section class="block">
      <div class="block__head"><h2>وين أنت ووين تبي توصل</h2></div>
      <div class="gaps card">
        ${bar('معدل الثانوية', a.gpaNow, a.gpaTarget)}
        ${bar('القدرات', a.qudNow, a.qudTarget)}
        ${bar('التحصيلي', a.tahNow, a.tahTarget)}
      </div>
    </section>

    <section class="block">
      <div class="block__head"><h2>مراحل خطتك</h2><span class="count">${ar(p.phases.length)} مراحل</span></div>
      <ol class="phases">
        ${p.phases.map((ph, k) => {
          const st = today > ph.to ? 'is-done' : today >= ph.from ? 'is-now' : '';
          return `
          <li class="phase ${st}">
            <span class="phase__dot">${st === 'is-done' ? icon('check') : ar(k + 1)}</span>
            <div class="phase__card">
              <div class="phase__head"><strong>${esc(ph.title)}</strong>${st === 'is-now' ? '<span class="tag tag--coral">أنت هنا</span>' : ''}</div>
              <small>${fmtMonth(ph.from)} ← ${fmtMonth(ph.to)}</small>
              <ul>${ph.goals.map((g) => `<li>${esc(g)}</li>`).join('')}</ul>
            </div>
          </li>`;
        }).join('')}
      </ol>
    </section>

    <div class="split split--even">
      <section class="card">
        <div class="block__head"><h2>محطات مهمة</h2></div>
        <ul class="milestones">
          ${p.milestones.map((m) => `<li class="${m.date < today ? 'is-past' : ''}"><span>${esc(m.title)}</span><small>${fmtDate(m.date)}</small></li>`).join('')}
        </ul>
      </section>
      <section class="card">
        <div class="block__head"><h2>نصايح لك</h2></div>
        <ul class="tips">${p.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      </section>
    </div>

    <div class="actions">
      <a class="btn btn--coral" href="#schedule" data-route="schedule">${icon('schedule')} شوف جدولي الأسبوعي</a>
      <button type="button" class="btn btn--ghost" data-edit-plan>عدّل أهدافي</button>
    </div>
    <p class="private-note">${icon('lock')} خطتك خاصة وتظهر لك بس</p>`;
}

/* =========================================================
   جدولي
   ========================================================= */
function renderSchedule() {
  const view = $('[data-view="schedule"]');
  if (!state.plan) {
    view.innerHTML = `
      <section class="intro">
        <div class="intro__icon">${icon('schedule')}</div>
        <h2>ما عندك جدول للحين</h2>
        <p>عبّ خطتك المستقبلية، وجدولك الأسبوعي بيتسوى تلقائياً على أهدافك ووقتك الفاضي.</p>
        <a class="btn btn--coral" href="#plan" data-route="plan">سوّ خطتي</a>
      </section>`;
    return;
  }
  const todayIdx = new Date().getDay();
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - todayIdx);
  const dates = DAYS.map((_, d) => { const x = new Date(weekStart); x.setDate(weekStart.getDate() + d); return x; });
  const sel = state.scheduleDay;
  const key = isoDate(dates[sel]);
  const blocks = state.plan.week[sel].blocks;
  const study = blocks.filter((b) => b.type !== 'free');
  const total = study.reduce((s, b) => s + b.minutes, 0);
  const doneCount = study.filter((b) => state.done[`${key}|${blocks.indexOf(b)}`]).length;

  view.innerHTML = `
    <section class="days" role="tablist" aria-label="أيام الأسبوع">
      ${dates.map((d, k) => `
        <button type="button" role="tab" class="day${k === sel ? ' is-on' : ''}${k === todayIdx ? ' is-today' : ''}" aria-selected="${k === sel}" data-day="${k}">
          <small>${DAYS_SHORT[k]}</small><strong>${ar(d.getDate())}</strong>
        </button>`).join('')}
    </section>

    <section class="block">
      <div class="block__head">
        <h2>${DAYS[sel]}${sel === todayIdx ? ' • اليوم' : ''}</h2>
        <span class="count">${ar(doneCount)} / ${ar(study.length)} • ${fmtDuration(total)}</span>
      </div>
      <ul class="slots">
        ${blocks.map((b, i) => {
          const done = !!state.done[`${key}|${i}`];
          return `
          <li class="slot">
            <span class="slot__time">${fmtTime(b.start)}</span>
            ${b.type === 'free'
              ? `<div class="slot__card slot--free"><span>${esc(b.title)}</span></div>`
              : `<button type="button" class="slot__card slot--${b.type}${done ? ' is-done' : ''}" aria-pressed="${done}" data-slot="${i}">
                  <span><strong>${esc(b.title)}</strong><small>${fmtDuration(b.minutes)}</small></span>
                  <span class="slot__check">${icon('check')}</span>
                </button>`}
          </li>`;
        }).join('')}
      </ul>
      <p class="hint">اضغط على الجلسة لما تخلصها ✓</p>
    </section>

    <section class="private">
      <span class="eyebrow">${icon('lock')} خاص</span>
      <strong>جدولك يظهر لك بس</strong>
    </section>

    <div class="actions">
      <button type="button" class="btn btn--coral" data-focus>${icon('focus')} ابدأ جلسة تركيز</button>
      <a class="btn btn--ghost" href="#plan" data-route="plan">خطتي المستقبلية</a>
    </div>`;
}

/* =========================================================
   المنافسة (فصلي / مدرستي — منفصلة)
   ========================================================= */
const BOARDS = {
  class: [[1, 'سارة', '٧ س ٢٠ د'], [2, 'أنت', '٦ س ٤٥ د', true], [3, 'فيصل', '٥ س ١٠ د'], [4, 'نورة', '٤ س ٣٠ د']],
  school: [[1, 'ريم • ٣/٢', '١١ س ٥ د'], [2, 'خالد • ٢/١', '٩ س ٤٠ د'], [3, 'سارة • ٢/٣', '٧ س ٢٠ د'], [12, 'أنت • ٢/٣', '٦ س ٤٥ د', true]],
};
function renderBoard(kind) {
  $$('[data-board]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.board === kind)));
  $('[data-leaders]').innerHTML = BOARDS[kind].map(([rank, name, pts, me]) => `
    <li class="${me ? 'me' : ''}"><span class="rank">${ar(rank)}</span><span class="avatar">${name[0]}</span><span class="name">${name}</span><span class="pts">${pts}</span></li>`).join('');
}

/* =========================================================
   مؤقت التركيز
   ========================================================= */
const FOCUS_SECONDS = 25 * 60;
const CIRC = 2 * Math.PI * 52;
let left = FOCUS_SECONDS, running = null, endAt = 0;

function drawTimer() {
  const m = String(Math.floor(left / 60)).padStart(2, '0');
  const s = String(left % 60).padStart(2, '0');
  $('[data-timer]').textContent = ar(`${m}:${s}`);
  const ring = $('[data-ring]');
  ring.style.strokeDasharray = CIRC;
  ring.style.strokeDashoffset = CIRC * (left / FOCUS_SECONDS);
}
function toggleTimer() {
  const btn = $('[data-timer-toggle]');
  if (running) {
    clearInterval(running); running = null;
    btn.textContent = 'كمّل';
    $('[data-timer-label]').textContent = 'متوقف مؤقتاً';
    return;
  }
  btn.textContent = 'إيقاف';
  $('[data-timer-label]').textContent = 'نبتتك تكبر 🌱';
  endAt = Date.now() + left * 1000; // من الساعة الفعلية عشان يبقى دقيق بالخلفية
  running = setInterval(() => {
    left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
    drawTimer();
    if (left === 0) {
      clearInterval(running); running = null;
      btn.textContent = 'ابدأ';
      $('[data-timer-label]').textContent = 'خلصت الجلسة 🌳';
      toast('أحسنت! زرعت شجرة جديدة 🌳 +٢٥ نقطة');
    }
  }, 250);
}
function resetTimer() {
  clearInterval(running); running = null; left = FOCUS_SECONDS;
  $('[data-timer-toggle]').textContent = 'ابدأ';
  $('[data-timer-label]').textContent = 'جلسة مذاكرة';
  drawTimer();
}

/* =========================================================
   الأحداث
   ========================================================= */
document.addEventListener('click', (e) => {
  const t = e.target;
  const route = t.closest('[data-route]');
  if (route) { e.preventDefault(); go(route.dataset.route); return; }

  if (t.closest('[data-focus]')) {
    e.preventDefault();
    if (currentRoute() !== 'home') go('home');
    setTimeout(() => $('#focus').scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
    return;
  }
  const soon = t.closest('[data-soon]');
  if (soon) { e.preventDefault(); toast(`«${soon.dataset.soon}» — قريباً ✨`); return; }

  if (t.closest('[data-timer-toggle]')) return toggleTimer();
  if (t.closest('[data-timer-reset]')) return resetTimer();
  const board = t.closest('[data-board]');
  if (board) return renderBoard(board.dataset.board);

  // المعالج
  if (t.closest('[data-start-wizard]')) { state.step = 0; state.draft = emptyAnswers(); state.editing = true; renderWizard(); return; }
  if (t.closest('[data-edit-plan]')) { state.step = 0; state.draft = { ...state.answers, weak: [...state.answers.weak], programs: [...state.answers.programs], _lastMajor: state.answers.major }; state.editing = true; renderWizard(); window.scrollTo({ top: 0 }); return; }
  const chip = t.closest('.chip-opt');
  if (chip) {
    const group = chip.closest('[data-chips]');
    const name = group.dataset.chips;
    const multi = group.dataset.multi === '1';
    let val = chip.dataset.value;
    if (name === 'grade' || name === 'seriousness') val = Number(val);
    if (multi) {
      let list = state.draft[name];
      if (val === 'ما عندي للحين') list = list.includes(val) ? [] : [val];
      else list = list.includes(val) ? list.filter((x) => x !== val) : [...list.filter((x) => x !== 'ما عندي للحين'), val];
      state.draft[name] = list;
    } else {
      state.draft[name] = val;
    }
    if (name === 'major') {
      const prev = MAJORS[state.draft._lastMajor];
      // لو النسب هي المقترحة من التخصص السابق، نحدّثها للتخصص الجديد
      if (prev && state.draft.gpaTarget === prev.target.gpa && state.draft.qudTarget === prev.target.qud && state.draft.tahTarget === prev.target.tah) {
        state.draft.gpaTarget = state.draft.qudTarget = state.draft.tahTarget = null;
      }
      applyMajorTargets(state.draft);
      state.draft._lastMajor = val;
      renderWizard();
      return;
    }
    $$('.chip-opt', group).forEach((c) => {
      const on = multi ? state.draft[name].includes(c.dataset.value) : String(state.draft[name]) === c.dataset.value;
      c.classList.toggle('is-on', on);
      c.setAttribute('aria-pressed', String(on));
    });
    return;
  }
  const wiz = t.closest('[data-wiz]');
  if (wiz) {
    const act = wiz.dataset.wiz;
    if (act === 'cancel') { state.editing = false; state.draft = null; renderPlanView(); return; }
    if (act === 'back') { state.step = Math.max(0, state.step - 1); renderWizard(); window.scrollTo({ top: 0 }); return; }
    const err = validateStep();
    if (err) { toast(err); return; }
    if (state.step === 1) applyMajorTargets(state.draft);
    if (state.step < STEPS.length - 1) { state.step++; renderWizard(); window.scrollTo({ top: 0 }); return; }
    state.step = 0;
    delete state.draft._lastMajor;
    generatePlan();
    return;
  }
  if (t.closest('[data-skip-ai]')) { state.generating?.abort(); return; }

  // الجدول
  const day = t.closest('[data-day]');
  if (day) { state.scheduleDay = Number(day.dataset.day); renderSchedule(); return; }
  const slot = t.closest('[data-slot]');
  if (slot) {
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay() + state.scheduleDay);
    const k = `${isoDate(weekStart)}|${slot.dataset.slot}`;
    if (state.done[k]) delete state.done[k]; else { state.done[k] = true; toast('أحسنت! كمّل 💪'); }
    store.set('done', state.done);
    renderSchedule();
  }
});

document.addEventListener('input', (e) => {
  const f = e.target.closest('[data-field]');
  if (!f || !state.draft) return;
  const k = f.dataset.field;
  if (/Now$|Target$/.test(k)) { state.draft[k] = num(f.value); updateWeighted(); }
  else if (f.type === 'range') { state.draft[k] = Number(f.value); const o = $(`[data-out="${k}"]`); if (o) o.textContent = `${ar(f.value)} ساعة`; }
  else state.draft[k] = f.value;
});

window.addEventListener('hashchange', show);

/* =========================================================
   البداية
   ========================================================= */
// لو المستخدم عنده بيانات من نسخة قديمة ناقصة، نتجاهلها
if (state.plan && (!Array.isArray(state.plan.week) || state.plan.week.length !== 7 || !state.answers)) { state.plan = null; }
renderChrome();
renderBoard('class');
drawTimer();
show();
