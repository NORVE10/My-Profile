// وشيجة — الأدوار (طالب/معلم/ولي أمر/إدارة)، الجدول الحر، الدورات، المؤقت، المجتمع، الرسائل
// كل البيانات تجريبية وتنحفظ في نفس المتصفح، فاللي يضيفه المعلم يطلع للطالب على نفس الجهاز.

/* =========================================================
   أدوات
   ========================================================= */
const uid = () => Math.random().toString(36).slice(2, 9);
const db = {
  get(k, def) { const v = store.get(k); return v == null ? def : v; },
  set(k, v) { store.set(k, v); },
};
const todayISO = () => isoDate(new Date());
const addDays = (n, from = new Date()) => { const d = new Date(from); d.setDate(d.getDate() + n); return d; };
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
const weekDates = () => { const s = addDays(-new Date().getDay()); return DAYS.map((_, k) => addDays(k, s)); };
const relDay = (iso) => {
  const n = daysBetween(todayISO(), iso);
  if (n === 0) return 'اليوم';
  if (n === 1) return 'بكرة';
  if (n === -1) return 'أمس';
  if (n > 1 && n < 7) return DAYS[new Date(iso).getDay()];
  return fmtDate(iso);
};

// نصغّر صورة السؤال قبل نرسلها (أسرع وأقل من حد الحجم)
async function compressImage(file) {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const out = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.85));
    return out && out.size < file.size ? out : file;
  } catch { return file; }
}
async function blobToB64(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return btoa(bin);
}
function parseJsonLoose(text) {
  const t = String(text || '').trim();
  try { return JSON.parse(t); } catch { /* نكمّل */ }
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1]); } catch { /* نكمّل */ } }
  const a = t.search(/[[{]/), b = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch { /* نكمّل */ } }
  throw { code: 'invalid_json', text: t };
}

// سيرفر وشيجة (Vercel): يشتغل لما يكون فيه مفتاح ذكاء اصطناعي في إعدادات الموقع
async function serverAi() {
  if (!/^https?:$/.test(location.protocol)) return null;
  try {
    const r = await fetch('/api/ai', { method: 'GET' });
    if (!r.ok) return null;
    const j = await r.json();
    if (!j.ok) return null;
  } catch { return null; }
  const call = async (input, opts = {}) => {
    const messages = typeof input === 'string' ? [{ role: 'user', content: input }] : input;
    const images = [];
    for (const blob of opts.images || []) images.push({ media_type: blob.type || 'image/jpeg', data: await blobToB64(blob) });
    let res;
    try {
      res = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages, images }), signal: opts.signal });
    } catch (e) {
      throw { code: e && e.name === 'AbortError' ? 'cancelled' : 'unavailable' };
    }
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw { code: j.code || (res.status === 429 ? 'rate_limited' : 'unavailable'), message: j.error };
    if (opts.onText) opts.onText({ text: j.text, delta: j.text });
    return { text: j.text, truncated: !!j.truncated };
  };
  call.json = async (input, opts = {}) => parseJsonLoose((await call(input, opts)).text);
  call.limits = async () => ({ images: { maxCount: 4 } });
  return call;
}

/* =========================================================
   المستخدم والأدوار (تجريبي: بدون بريد ولا كلمة مرور)
   ========================================================= */
const ROLES = {
  student: { label: 'طالب', icon: 'plan', desc: 'خطتك، جدولك، المساعد، والمنافسة' },
  teacher: { label: 'معلم', icon: 'resources', desc: 'الواجبات، المصادر، ومستوى طلابك' },
  parent: { label: 'ولي أمر', icon: 'community', desc: 'مستوى ولدك والمسابقات' },
  admin: { label: 'إدارة المدرسة', icon: 'board', desc: 'الأخبار، الجوائز، والتقارير' },
};
const CLASSES = ['أ', 'ب', 'ج', 'د'];
const SUBJECT_LIST = ['رياضيات', 'فيزياء', 'كيمياء', 'أحياء', 'إنجليزي', 'لغتي'];
let profile = db.get('profile', null);
const role = () => (profile && profile.role) || null;
const myClass = () => (profile ? `${ar(profile.grade || 2)}/${profile.cls || 'ب'}` : '٢/ب');
const myClassName = () => `${GRADES[(profile?.grade || 2) - 1]} ${profile?.cls || 'ب'}`;

const TEACHERS = [
  { id: 't1', name: 'أ. سامي العتيبي', role: 'معلم الرياضيات', subject: 'رياضيات' },
  { id: 't2', name: 'أ. فهد القحطاني', role: 'معلم الفيزياء', subject: 'فيزياء' },
  { id: 't3', name: 'أ. ماجد الشهري', role: 'معلم الكيمياء', subject: 'كيمياء' },
  { id: 't4', name: 'أ. خالد الدوسري', role: 'معلم الإنجليزي', subject: 'إنجليزي' },
  { id: 't5', name: 'أ. بندر الغامدي', role: 'معلم الأحياء', subject: 'أحياء' },
  { id: 't6', name: 'أ. ياسر الشمري', role: 'معلم لغتي', subject: 'لغتي' },
];
const STAFF = [
  { id: 'a1', name: 'أ. عبدالعزيز المطيري', role: 'مدير المدرسة' },
  { id: 'a2', name: 'أ. نايف الحربي', role: 'وكيل شؤون الطلاب' },
  { id: 'a3', name: 'أ. سعد الزهراني', role: 'المرشد الطلابي' },
];
// زملاء الفصل (بدون اسم الطالب نفسه عشان ما يتكرر)
const classmates = () => BOYS.map((n, k) => ({ id: 's' + k, name: n, role: `طالب ${myClass()}` })).filter((p) => p.name !== db.get('studentName', '')).slice(0, 12);
const boardNames = () => BOYS.filter((n) => n !== (profile?.name || db.get('studentName', '')));
const me = () => ({ id: myId(), name: profile?.name || 'أنت', role: role() === 'student' ? `طالب ${myClass()}` : ROLES[role()]?.label || '' });
// هويات الحسابات على نفس الجهاز (تجريبي)
const STUDENT_ID = 'me-student';
const PARENT_ID = 'parent';
const ADMIN_IDS = { 'مدير المدرسة': 'a1', 'وكيل المدرسة': 'a2', 'المرشد الطلابي': 'a3' };
const myTeacherId = () => (TEACHERS.find((t) => t.subject === profile?.subject) || TEACHERS[0]).id;
function myId() {
  const r = role();
  if (r === 'student') return STUDENT_ID;
  if (r === 'teacher') return myTeacherId();
  if (r === 'admin') return ADMIN_IDS[profile?.position] || 'a1';
  return PARENT_ID;
}
function person(id) {
  const names = db.get('names', {});
  const studentName = db.get('studentName', 'عبدالله');
  if (id === STUDENT_ID) return { id, name: studentName, role: `طالب ${myClass()}` };
  if (id === PARENT_ID) return { id, name: names[id] || 'ولي الأمر', role: `ولي أمر ${studentName}` };
  const p = [...TEACHERS, ...STAFF, ...classmates()].find((x) => x.id === id);
  return p ? { ...p, name: names[id] || p.name } : { id, name: 'مستخدم', role: '' };
}

/* =========================================================
   البيانات التجريبية (تنزرع أول مرة بس)
   ========================================================= */
function seed() {
  if (db.get('seeded', 0) >= 2) return;
  const t = new Date();
  db.set('schoolTasks', [
    { id: uid(), title: 'رياضيات: حل تمارين الوحدة ٣ وسلّمها', subject: 'رياضيات', kind: 'واجب', due: isoDate(t), by: 't1' },
    { id: uid(), title: 'إنجليزي: كتابة فقرة عن هواياتك', subject: 'إنجليزي', kind: 'واجب', due: isoDate(addDays(-2)), by: 't4' },
    { id: uid(), title: 'اختبار فيزياء قصير: الفصل الثالث', subject: 'فيزياء', kind: 'اختبار', due: isoDate(addDays(1)), by: 't2' },
    { id: uid(), title: 'كيمياء: تقرير المختبر (المقدمة والنتائج)', subject: 'كيمياء', kind: 'واجب', due: isoDate(addDays(3)), by: 't3' },
  ]);
  db.set('resources', [
    { id: uid(), title: 'ملخص الوحدة ٣: المعادلات', subject: 'رياضيات', kind: 'ملف', url: '', by: 't1', at: isoDate(addDays(-1)) },
    { id: uid(), title: 'شرح قانون نيوتن الثاني (فيديو)', subject: 'فيزياء', kind: 'فيديو', url: 'https://www.youtube.com/results?search_query=قانون+نيوتن+الثاني', by: 't2', at: isoDate(addDays(-2)) },
    { id: uid(), title: 'أسئلة تحصيلي محلولة — كيمياء', subject: 'كيمياء', kind: 'رابط', url: 'https://www.etec.gov.sa', by: 't3', at: isoDate(addDays(-3)) },
    { id: uid(), title: 'Vocabulary list — Unit 4', subject: 'إنجليزي', kind: 'ملف', url: '', by: 't4', at: isoDate(addDays(-4)) },
  ]);
  db.set('news', [
    { id: uid(), kind: 'مسابقة', title: 'مسابقة العلوم', body: 'التسجيل مفتوح لطلاب الثانوي، والجوائز للمراكز الثلاثة الأولى.', deadline: isoDate(addDays(28)), at: isoDate(t) },
    { id: uid(), kind: 'إعلان', title: 'اختبارات منتصف الفصل', body: 'تبدأ الأسبوع الجاي، الجدول في المصادر.', deadline: '', at: isoDate(addDays(-1)) },
    { id: uid(), kind: 'خبر', title: 'تكريم المتميزين', body: 'نبارك لطلاب ٢/ب حصولهم على المركز الأول في المنافسة الشهرية.', deadline: '', at: isoDate(addDays(-3)) },
  ]);
  db.set('prizes', DEFAULT_PRIZES);
  db.set('levels', { رياضيات: 'ممتاز', فيزياء: 'يحتاج دعم', كيمياء: 'جيد جداً', أحياء: 'جيد جداً', إنجليزي: 'جيد', لغتي: 'ممتاز' });
  db.set('grades', { رياضيات: [18, 19, 17], فيزياء: [12, 14, 11], كيمياء: [16, 17, 15], أحياء: [17, 16, 18], إنجليزي: [14, 15, 13], لغتي: [19, 20, 19] });
  db.set('posts', [
    { id: uid(), group: 'class', author: 'فيصل', role: `طالب ${myClass()}`, kind: 'ملخص', text: 'ملخص الفصل الثالث فيزياء بخط واضح، إن شاء الله يفيدكم قبل الاختبار 🙏', link: '', likes: 7, liked: false, comments: [{ who: 'خالد', text: 'جزاك الله خير!' }], at: Date.now() - 36e5 },
    { id: uid(), group: 'grade', author: 'عبدالرحمن', role: 'طالب ٢/أ', kind: 'سؤال', text: 'أحد يعرف كيف نحل x² - 5x + 6 = 0 بالتحليل؟', link: '', likes: 3, liked: false, comments: [{ who: 'سعود', text: '(x-2)(x-3) = 0 يعني x = 2 أو x = 3' }], at: Date.now() - 2 * 36e5 },
    { id: uid(), group: 'school', author: 'أ. سعد الزهراني', role: 'المرشد الطلابي (مشرف)', kind: 'فيديو', text: 'فيديو قصير يشرح الحركة الدائرية بطريقة سهلة.', link: 'https://www.youtube.com/results?search_query=الحركة+الدائرية', likes: 15, liked: false, comments: [], at: Date.now() - 5 * 36e5 },
    { id: uid(), group: 'class', author: 'تركي', role: `طالب ${myClass()}`, kind: 'ملف', text: 'نماذج قدرات كمي حليتها مع الحل، ٢٠ سؤال.', link: '', likes: 9, liked: false, comments: [], at: Date.now() - 26 * 36e5 },
  ]);
  db.set('threads', [
    { id: 'g-class', group: true, name: `قروب ${myClassName()}`, msgs: [
      { from: 's0', text: 'شباب لا تنسون واجب الرياضيات الليلة', at: Date.now() - 3 * 36e5 },
      { from: 's6', text: 'أحد خلص تقرير الكيمياء؟', at: Date.now() - 2 * 36e5 },
      { from: 's7', text: 'باقي لي النتائج بس 👍', at: Date.now() - 1.5 * 36e5 },
    ] },
    { id: 'dm-me-student-t2', members: [STUDENT_ID, 't2'], msgs: [
      { from: 't2', text: 'أهلاً، أي سؤال عن الاختبار القصير أنا موجود.', at: Date.now() - 20 * 36e5 },
    ] },
    { id: 'dm-a3-me-student', members: [STUDENT_ID, 'a3'], msgs: [
      { from: 'a3', text: 'مرحبا، لو تحتاج مساعدة في اختيار التخصص كلمني.', at: Date.now() - 48 * 36e5 },
    ] },
  ]);
  db.set('feedback', [
    { id: uid(), to: 't2', text: 'لو تكثر أمثلة محلولة في الحصة يكون الشرح أوضح.', anon: true, at: isoDate(addDays(-2)) },
    { id: uid(), to: 't1', text: 'الملخصات اللي تنزلها مرة مفيدة، شكراً أستاذ.', anon: false, from: 'نواف', at: isoDate(addDays(-5)) },
  ]);
  db.set('seeded', 2);
}

const DEFAULT_PRIZES = ['قسيمة شرائية بقيمة ٢٠٠ ريال', 'قسيمة مكتبة بقيمة ١٠٠ ريال', 'شهادة تميّز من مدير المدرسة'];
// جوائز تخالف تعليمات وزارة التعليم (غياب، خروج/انصراف، إعفاء، درجات إضافية، إلغاء أو تأجيل اختبار…)
const normAr = (t) => String(t || '').toLowerCase().replace(/[\u064B-\u0652\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
const BAD_PRIZE_RE = new RegExp([
  'خروج', 'انصراف', 'مغادره', 'مبكر', 'طلعه', 'بدري', 'يطلع', 'غياب', 'يغيب', 'غيبه', 'اعفاء', 'معفي', 'يعفي', 'استئذان', 'اذن',
  'درجه', 'درجات', 'علامه', 'علامات', 'بونص', 'الغاء', 'تاجيل', 'فراغ', 'اجازه', 'راحه من',
  'بدون واجب', 'بدون اختبار', 'تاخير', 'early', 'leave', 'absen', 'skip', 'bonus', 'mark', 'grade', 'day off', 'exempt',
].join('|'));
// «شهادة تقدير لعدم الغياب» مسموحة
const badPrize = (t) => BAD_PRIZE_RE.test(normAr(t).replace(/(عدم|بدون) (ال)?غياب/g, '').replace(/الانضباط/g, ''));
const BAD_PRIZE = { test: badPrize };

// تحديث البيانات القديمة المحفوظة في المتصفح
function migrate() {
  const prizes = db.get('prizes', null);
  if (prizes && prizes.some((x) => BAD_PRIZE.test(x))) db.set('prizes', DEFAULT_PRIZES);
  const posts = db.get('posts', null);
  if (posts && posts.some((x) => x.author === 'أ. فهد القحطاني')) {
    posts.forEach((x) => { if (x.author === 'أ. فهد القحطاني') { x.author = 'أ. سعد الزهراني'; x.role = 'المرشد الطلابي (مشرف)'; } });
    db.set('posts', posts);
  }
  // الرسائل: نحوّلها لصيغة فيها الطرفين عشان توصل للثاني
  const ID_RE = /^(s\d+|me-student|a\d|t\d|parent)$/;
  const threads = db.get('threads', null);
  if (threads && threads.some((t) => (!t.group && !t.members) || (t.group && t.msgs.some((m) => !ID_RE.test(m.from))))) {
    const byName = (n) => (classmates().find((c) => c.name === n) || {}).id || STUDENT_ID;
    const out = threads.map((t) => {
      if (t.group) return { id: t.id, group: true, name: t.name, msgs: t.msgs.map((m) => ({ ...m, from: ID_RE.test(m.from) ? m.from : byName(m.from) })) };
      if (t.members) return t;
      const other = t.with;
      return { id: `dm-${[STUDENT_ID, other].sort().join('-')}`, members: [STUDENT_ID, other], msgs: t.msgs.map((m) => ({ ...m, from: m.from === t.name ? other : STUDENT_ID })) };
    });
    db.set('threads', out);
  }
  // اللي أضافه المعلم كان محفوظ باسم «me» — نربطه بمعلم المادة
  const subj2t = (sub) => (TEACHERS.find((x) => x.subject === sub) || TEACHERS[0]).id;
  for (const k of ['schoolTasks', 'resources']) {
    const l = db.get(k, null);
    if (l && l.some((x) => x.by === 'me')) { l.forEach((x) => { if (x.by === 'me') x.by = subj2t(x.subject); }); db.set(k, l); }
  }
  const prizes2 = db.get('prizes', null);
  if (prizes2 && prizes2.some((x) => x && badPrize(x))) db.set('prizes', DEFAULT_PRIZES);
}

function getSchoolTasks() {
  const week = weekDates().map(isoDate);
  return db.get('schoolTasks', []).filter((x) => x.due >= todayISO() || week.includes(x.due)).map((x) => {
    const teacher = TEACHERS.find((tt) => tt.id === x.by);
    return { ...x, note: `${x.kind === 'اختبار' ? 'الاختبار' : 'التسليم'} ${relDay(x.due)}${teacher ? ` • ${teacher.name}` : ''}`, when: week.includes(x.due) ? new Date(x.due).getDay() : null };
  }).sort((a, b) => a.due.localeCompare(b.due));
}

/* =========================================================
   الدورات (القدرات / التحصيلي)
   ========================================================= */
// عدد الدروس تقديري لأننا ما لقينا قوائم رسمية منشورة — الطالب يعدّله
const COURSES = {
  'المفكر': 60, 'المعاصر': 48, 'المنصف': 50, 'يلو': 40, 'أ. إياد': 45, 'أ. إيهاب': 50, 'نون أكاديمي': 40, 'عين': 30,
};
const lessonsTxt = (n) => (n === 1 ? 'درس واحد' : n === 2 ? 'درسين' : n <= 10 ? `${ar(n)} دروس` : `${ar(n)} درس`);
const hasCourseSrc = (a, k) => !!a[k + 'Source'];
const courseTotal = (a, k) => a[k + 'Total'] || COURSES[a[k + 'Source']] || 40;
const courseReached = (a, k) => (a[k + 'Started'] ? Math.min(courseTotal(a, k), a[k + 'Reached'] || 0) : 0);
const hasCourse = (a) => hasCourseSrc(a, 'qud') || (a.grade >= 2 && hasCourseSrc(a, 'tah'));

function studyDaysOf(a) {
  const n = clamp(a.studyDays || 5, 1, 7);
  const order = [0, 1, 2, 3, 6, 4, 5]; // الأحد للأربعاء، السبت، الخميس، الجمعة
  return order.slice(0, n).sort((x, y) => x - y);
}

const examOf = (a, k) => (a[k + 'Exam'] && a[k + 'Exam'] >= todayISO() ? a[k + 'Exam'] : defaultExam(a, k));
// الدورات مرتبة حسب أقرب اختبار
const courseKinds = (a) => ['qud', 'tah'].filter((k) => hasCourseSrc(a, k) && (k === 'qud' || a.grade >= 2)).sort((x, y) => examOf(a, x).localeCompare(examOf(a, y)));
// لو ما حدد موعد الاختبار: القدرات/التحصيلي عادةً في ثالث ثانوي
function defaultExam(a, k) {
  if (a.grade === 3) return isoDate(addDays(k === 'qud' ? 75 : 120));
  return isoDate(new Date(timeline(a.grade).end.getTime() - (k === 'qud' ? 240 : 150) * 864e5));
}
function coursePlan(a, k) {
  if (!hasCourseSrc(a, k)) return null;
  const total = courseTotal(a, k);
  const reached = courseReached(a, k);
  const remaining = Math.max(0, total - reached);
  const given = !!a[k + 'Exam'] && a[k + 'Exam'] >= todayISO();
  const exam = examOf(a, k);
  const daysLeft = Math.max(0, daysBetween(todayISO(), exam));
  // لو فيه اختبار ثاني قبله، دروس هذي الدورة تبدأ بعده
  const kinds = courseKinds(a);
  const prev = kinds.indexOf(k) > 0 ? examOf(a, kinds[kinds.indexOf(k) - 1]) : null;
  const startOffset = prev && prev < exam ? Math.max(0, daysBetween(todayISO(), prev) + 1) : 0;
  const span = Math.max(0, daysLeft - startOffset);
  const review = span >= 45 ? 14 : span >= 21 ? 7 : Math.floor(span * 0.2);
  const studyCal = Math.max(1, span - review);
  const studyDays = Math.max(1, Math.floor(studyCal * (studyDaysOf(a).length / 7)));
  const perDay = remaining ? Math.max(1, Math.ceil(remaining / studyDays)) : 0;
  return {
    kind: k, source: sourceOf(a, k) || (k === 'qud' ? 'دورة القدرات' : 'دورة التحصيلي'), total, reached, remaining, perDay, exam, daysLeft,
    examGiven: given, finish: isoDate(addDays(Math.min(startOffset + studyCal, daysLeft))), startsAfter: startOffset ? isoDate(addDays(startOffset)) : '', reviewDays: review, estimated: !a[k + 'Total'],
  };
}
const coursePlanText = (a, k) => {
  const p = coursePlan(a, k);
  if (!p) return 'لا يوجد';
  return `${p.source}: ${p.total} درس (تقديري لو ما حدده الطالب)، خلّص ${p.reached}، باقي ${p.remaining}، ${p.perDay} دروس بكل يوم مذاكرة، يخلّص الدروس ${p.finish}، وبعدها مراجعة ${p.reviewDays} يوم قبل الاختبار ${p.exam}`;
};

// مهمة الدورة لهاليوم من أيام الأسبوع: أرقام الدروس بالضبط
// هل خلّص جلسة الدورة (k) في يوم d من هالأسبوع؟
function courseDoneOn(d, k) {
  if (!state.plan) return false;
  const date = isoDate(weekDates()[d]);
  return state.plan.week[d].blocks.some((b) => b.course === k && state.done[`${date}|${b.id}`]);
}
function courseTask(a, d, min) {
  const kinds = courseKinds(a);
  if (!kinds.length || !studyDaysOf(a).includes(d)) return null;
  const today = new Date().getDay();
  const sd = studyDaysOf(a);
  const dayISO = isoDate(weekDates()[d]);
  const k = kinds.find((x) => examOf(a, x) >= dayISO) || kinds[kinds.length - 1];
  const p = coursePlan(a, k);
  const label = k === 'qud' ? 'قدرات' : 'تحصيلي';
  if (!p.remaining || todayISO() > p.finish) return { course: k, lessons: 0, title: `${label}: مراجعة ونماذج في ${p.source}`, note: `فترة المراجعة قبل الاختبار (${relDay(p.exam)})`, minutes: min, type: 'exam' };
  if (d < today) return { course: k, lessons: 0, title: `${label}: دروس ${p.source}`, minutes: min, type: 'exam' };
  // الأيام اللي قبله (من اليوم) وما خلّصها للحين
  const owner = (x) => kinds.find((y) => examOf(a, y) >= isoDate(weekDates()[x])) || kinds[kinds.length - 1];
  const before = sd.filter((x) => x >= today && x < d && owner(x) === k && !courseDoneOn(x, k)).length;
  const from = p.reached + before * p.perDay + 1;
  const to = Math.min(p.total, from + p.perDay - 1);
  if (from > p.total) return { course: k, lessons: 0, title: `${label}: مراجعة ما خلصته في ${p.source}`, minutes: min, type: 'exam' };
  return {
    course: k, lessons: to - from + 1,
    title: `${label}: خلّص ${from === to ? `الدرس ${ar(from)}` : `الدروس ${ar(from)}–${ar(to)}`} في ${p.source}`,
    note: `${lessonsTxt(to - from + 1)} • باقي ${lessonsTxt(Math.max(0, p.total - to))} بعدها • حل تمارين كل درس`,
    minutes: Math.max(min, Math.min(120, (to - from + 1) * 15)), type: 'exam',
  };
}

function courseFields(k, a) {
  if (!a[k + 'Source']) return '';
  const total = a[k + 'Total'] ?? '';
  const est = COURSES[a[k + 'Source']];
  return `
    <div class="course-box">
      <div class="field"><span>بديت في ${esc(sourceOf(a, k))}؟</span>
        ${chipGroup(k + 'Started', [{ value: 'no', label: 'لا، بأبدأ' }, { value: 'yes', label: 'إيه بديت' }], a[k + 'Started'] ? 'yes' : 'no', false)}
      </div>
      <div class="pct">
        ${a[k + 'Started'] ? `<label><small>وصلت للدرس رقم</small><input type="number" inputmode="numeric" min="0" data-field="${k}Reached" value="${a[k + 'Reached'] ?? ''}" placeholder="مثلاً ١٢" /></label>` : ''}
        <label><small>كم درس في الدورة؟</small><input type="number" inputmode="numeric" min="1" data-field="${k}Total" value="${total}" placeholder="${est ? `تقريباً ${ar(est)}` : 'مثلاً ٤٠'}" /></label>
      </div>
      <label class="field"><span>متى اختبار ${k === 'qud' ? 'القدرات' : 'التحصيلي'}؟</span>
        <input type="date" class="input" data-field="${k}Exam" value="${esc(a[k + 'Exam'] || '')}" min="${todayISO()}" />
        <small class="field__hint">${est && !a[k + 'Total'] ? `عدد الدروس تقديري (${ar(est)})، عدّله لو تعرف العدد بالضبط. ` : ''}لو ما تعرف موعد الاختبار خله فاضي ونفترض بعد شهرين ونص.</small>
      </label>
    </div>`;
}

function coursesCard(a) {
  const plans = ['qud', 'tah'].map((k) => coursePlan(a, k)).filter(Boolean).filter((p) => p.kind === 'qud' || a.grade >= 2);
  if (!plans.length) return '';
  return `
    <section class="block">
      <div class="block__head"><h2>خطة الدورات</h2></div>
      <div class="courses">
        ${plans.map((p) => `
          <div class="course card">
            <div class="course__head"><strong>${p.kind === 'qud' ? 'القدرات' : 'التحصيلي'} • ${esc(p.source)}</strong><span class="tag tag--coral">${lessonsTxt(p.perDay)} باليوم</span></div>
            <div class="gap__bar"><span class="gap__now" style="width:${Math.round((p.reached / p.total) * 100)}%"></span></div>
            ${p.perDay > 6 ? `<p class="warn">⚠️ الوقت قصير: ${lessonsTxt(p.perDay)} باليوم كثير. زد أيام المذاكرة، أو ركّز على أهم الدروس والنماذج.</p>` : ''}
            ${p.startsAfter ? `<p class="field__hint">تبدأ دروسها بعد اختبارك الأقرب (${fmtDate(p.startsAfter)}).</p>` : ''}
            <ul class="course__facts">
              <li><span>الدروس</span><b>${ar(p.reached)} / ${ar(p.total)}${p.estimated ? ' (تقديري)' : ''}</b></li>
              <li><span>تخلّص الدروس</span><b>${fmtDate(p.finish)}</b></li>
              <li><span>المراجعة</span><b>${p.reviewDays ? `آخر ${daysTxt(p.reviewDays)}` : 'ما فيه وقت للمراجعة'}</b></li>
              <li><span>الاختبار</span><b>${fmtDate(p.exam)}${p.examGiven ? '' : ' (تقريبي)'}</b></li>
            </ul>
          </div>`).join('')}
      </div>
    </section>`;
}

// أقرب موعد مهم (اختبار القدرات/التحصيلي لو حدده الطالب، وإلا التخرج) — يتحسب من تاريخ اليوم
function nextGoal(a) {
  const list = [];
  for (const k of ['qud', 'tah']) if (a[k + 'Exam'] && a[k + 'Exam'] >= todayISO()) list.push({ date: a[k + 'Exam'], label: k === 'qud' ? 'اختبار القدرات' : 'اختبار التحصيلي' });
  list.push({ date: isoDate(timeline(a.grade).end), label: 'التخرج' });
  list.sort((x, y) => x.date.localeCompare(y.date));
  return { ...list[0], days: Math.max(0, daysBetween(todayISO(), list[0].date)) };
}

/* =========================================================
   الوضع الداكن
   ========================================================= */
const isDark = () => document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
const themeBtn = (cls = 'btn btn--ghost') => `<button type="button" class="${cls} theme-btn" data-theme-toggle>${icon(isDark() ? 'sun' : 'moon')} ${isDark() ? 'الوضع الفاتح' : 'الوضع الداكن'}</button>`;
function toggleTheme() {
  const next = isDark() ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  db.set('theme', next);
  renderChrome();
  show();
}

/* =========================================================
   التنقل حسب الدور
   ========================================================= */
const NAV = {
  student: {
    tabs: [['home', 'الرئيسية', 'home'], ['schedule', 'جدولي', 'schedule'], ['ai', 'المساعد', 'ai'], ['community', 'المجتمع', 'community'], ['more', 'المزيد', 'more']],
    side: [['home', 'الرئيسية', 'home'], ['plan', 'خطتي المستقبلية', 'plan'], ['schedule', 'جدولي', 'schedule'], ['ai', 'المساعد الذكي', 'ai'], ['focus', 'ركّز', 'focus'], ['board', 'المنافسة', 'board'],
      ['community', 'المجتمع', 'community'], ['messages', 'الرسائل', 'messages'], ['resources', 'المصادر', 'resources'], ['grades', 'مستواي ودرجاتي', 'level'], ['rewards', 'المحفزات', 'rewards'], ['feedback', 'اقتراحات للمعلمين', 'feedback']],
  },
  teacher: {
    tabs: [['home', 'الرئيسية', 'home'], ['t-tasks', 'الواجبات', 'grades'], ['t-resources', 'المصادر', 'resources'], ['t-students', 'طلابي', 'level'], ['ai', 'المساعد', 'ai']],
    side: [['home', 'الرئيسية', 'home'], ['t-tasks', 'الواجبات والاختبارات', 'grades'], ['t-resources', 'المصادر', 'resources'], ['t-students', 'مستوى طلابي', 'level'], ['t-feedback', 'اقتراحات الطلاب', 'feedback'], ['messages', 'الرسائل', 'messages'], ['ai', 'المساعد الذكي', 'ai']],
  },
  parent: {
    tabs: [['home', 'الرئيسية', 'home'], ['p-child', 'مستوى ولدي', 'level'], ['messages', 'الرسائل', 'messages'], ['ai', 'المساعد', 'ai']],
    side: [['home', 'الرئيسية', 'home'], ['p-child', 'مستوى ولدي', 'level'], ['messages', 'الرسائل', 'messages'], ['ai', 'المساعد الذكي', 'ai']],
  },
  admin: {
    tabs: [['home', 'الرئيسية', 'home'], ['a-news', 'الأخبار', 'messages'], ['a-prizes', 'الجوائز', 'rewards'], ['a-reports', 'التقارير', 'level'], ['ai', 'المساعد', 'ai']],
    side: [['home', 'الرئيسية', 'home'], ['a-news', 'الأخبار والمسابقات', 'messages'], ['a-prizes', 'جوائز المنافسة', 'rewards'], ['a-reports', 'تقارير المدرسة', 'level'], ['community', 'قروبات الطلاب (إشراف)', 'community'], ['messages', 'الرسائل', 'messages'], ['ai', 'المساعد الذكي', 'ai']],
  },
};
const navLink = ([id, title, ic]) => `<a href="#${id}" data-nav-id="${id}" ${id === 'focus' ? 'data-focus' : `data-route="${id}"`}>${icon(ic)}<span>${title}</span></a>`;

function renderChrome() {
  const r = role() || 'student';
  const mods = MODULES.map((m) => ({ ...m, route: true, id: m.id === 'level' ? 'grades' : m.id }));
  const modsEl = $('[data-modules]');
  if (modsEl) modsEl.innerHTML = mods.map((m) => `
    <a class="module module--${m.tone}" href="#${m.id}" data-route="${m.id}">
      <span class="module__icon">${icon(m.id === 'grades' ? 'level' : m.id)}</span>
      ${m.badge ? `<span class="module__badge">${m.badge}</span>` : ''}
      <strong>${m.title}</strong>
      <small>${m.desc}</small>
    </a>`).join('');
  $('[data-nav]').innerHTML = NAV[r].side.map(navLink).join('') +
    `<button type="button" class="sidebar__switch" data-theme-toggle>${icon(isDark() ? 'sun' : 'moon')}<span>${isDark() ? 'الوضع الفاتح' : 'الوضع الداكن'}</span></button>` +
    `<button type="button" class="sidebar__switch" data-switch>${icon('back')}<span>تبديل الحساب</span></button>`;
  $('[data-tabbar]').innerHTML = NAV[r].tabs.map(navLink).join('');
  $('[data-tabbar]').style.gridTemplateColumns = `repeat(${NAV[r].tabs.length}, 1fr)`;
  const priv = $('.sidebar__private strong');
  if (priv) priv.textContent = `${profile?.name || ''} • ${r === 'student' ? `طالب ${myClass()}` : ROLES[r].label}`;
}

const HERO_MORE = {
  community: ['المجتمع', 'شارك وتعلّم مع زملائك'], messages: ['الرسائل', 'زملاؤك ومعلموك والإدارة'], resources: ['المصادر', 'كل اللي نزّله معلموك'],
  grades: ['مستواي', 'درجاتك ومستواك في كل مادة'], rewards: ['المحفزات', 'نقاطك، غابتك، وشاراتك'], feedback: ['اقتراحات للمعلمين', 'ساعد معلمك يطوّر الشرح'],
  more: ['المزيد', 'كل خانات وشيجة'], news: ['أخبار المدرسة', 'الأخبار والمسابقات والإعلانات'], 't-tasks': ['الواجبات والاختبارات', 'تطلع لطلابك مباشرة'], 't-resources': ['المصادر', 'ملفات وروابط وفيديوهات لطلابك'],
  't-students': ['مستوى طلابي', 'حدّد مستوى كل طالب في مادتك'], 't-feedback': ['اقتراحات الطلاب', 'وش يقولون عن الشرح'], 'a-news': ['الأخبار والمسابقات', 'تطلع للطلاب وأولياء الأمور'],
  'a-reports': ['تقارير المدرسة', 'نظرة سريعة على المدرسة'], 'a-prizes': ['جوائز المنافسة', 'وش يكسب الأوائل'], 'p-child': ['مستوى ولدي', ''],
};

const ALLOWED = {
  student: ['home', 'plan', 'schedule', 'ai', 'board', 'community', 'messages', 'resources', 'grades', 'rewards', 'feedback', 'more', 'news'],
  teacher: ['home', 't-tasks', 't-resources', 't-students', 't-feedback', 'messages', 'ai'],
  parent: ['home', 'p-child', 'messages', 'ai', 'news'],
  admin: ['home', 'a-news', 'a-prizes', 'a-reports', 'community', 'messages', 'ai', 'board'],
};
const can = (route) => (ALLOWED[role()] || []).includes(route);
function show() {
  if (!profile) { renderWelcome(); return; }
  $('[data-welcome]').hidden = true;
  if (!can(currentRoute())) history.replaceState(null, '', '#home');
  const route = currentRoute();
  const r = role();
  const own = { plan: 'plan', schedule: 'schedule', ai: 'ai', board: 'board' };
  let view = own[route] || 'page';
  if (route === 'home' && r === 'student') view = 'home';
  $$('[data-view]').forEach((v) => { v.hidden = v.dataset.view !== view; });
  const navId = route === 'grades' ? 'grades' : route;
  $$('[data-nav-id]').forEach((a) => a.classList.toggle('is-active', a.dataset.navId === navId));
  // الترويسة
  if (route === 'home' && r !== 'student') {
    const g = new Date().getHours() < 12 ? 'صباح الخير' : 'مساء الخير';
    $('[data-hero-title]').textContent = `${g}، ${profile.name}`;
    $('[data-hero-sub]').textContent = `${DAYS[new Date().getDay()]} • ${r === 'teacher' ? `معلم ${profile.subject}` : ROLES[r].label}`;
  } else if (HERO_MORE[route]) {
    $('[data-hero-title]').textContent = HERO_MORE[route][0];
    $('[data-hero-sub]').textContent = route === 'p-child' ? (profile.child || 'ولدك')
      : route === 'messages' ? { student: 'زملاؤك ومعلموك والإدارة', teacher: 'طلابك وزملاؤك والإدارة', parent: 'المعلمين والإدارة', admin: 'الطلاب والمعلمين' }[r]
        : HERO_MORE[route][1];
  } else if (route === 'ai' && r !== 'student') {
    $('[data-hero-title]').textContent = 'المساعد الذكي';
    $('[data-hero-sub]').textContent = { teacher: 'يساعدك تجهّز دروسك وواجباتك', parent: 'يساعدك تدعم ولدك', admin: 'يساعدك تدير المدرسة' }[r];
  } else {
    renderHero(route);
    if (route === 'home' && profile.name) {
      const g = new Date().getHours() < 12 ? 'صباح الخير' : 'مساء الخير';
      $('[data-hero-title]').textContent = `${g}، ${profile.name}`;
      $('[data-hero-sub]').textContent = `${DAYS[new Date().getDay()]} • طالب ${myClass()}`;
    }
  }
  if (view === 'home') renderStudentHome();
  if (route === 'plan') renderPlanView();
  if (route === 'schedule') renderSchedule();
  if (route === 'ai') renderAi();
  if (route === 'board') renderBoardView();
  if (view === 'page') renderPage(route);
  window.scrollTo({ top: 0 });
}

/* =========================================================
   شاشة الدخول (تجريبي)
   ========================================================= */
let welcomeRole = null;
function renderWelcome() {
  const el = $('[data-welcome]');
  el.hidden = false;
  $$('[data-view]').forEach((v) => { v.hidden = true; });
  const r = welcomeRole;
  el.innerHTML = `
    <div class="welcome__card">
      <img class="welcome__logo" src="${$('.sidebar__brand img').src}" alt="وشيجة" />
      <h1>هلا فيك في وشيجة</h1>
      <p>منصة مدرسية واحدة تجمع كل شيء لطلاب الثانوي. ${r ? '' : 'اختر كيف تبي تدخل:'}</p>
      ${!r ? `<div class="roles">${Object.entries(ROLES).map(([k, v]) => `
        <button type="button" class="role" data-pick-role="${k}">${icon(v.icon)}<strong>${v.label}</strong><small>${v.desc}</small></button>`).join('')}</div>
        <p class="welcome__note">${icon('lock')} نسخة تجريبية: بدون بريد ولا كلمة مرور</p>
        ${themeBtn('btn btn--ghost btn--sm')}` : `
      <form class="welcome__form" data-welcome-form>
        <span class="chip chip--soft">${ROLES[r].label}</span>
        <label class="field"><span>${r === 'parent' ? 'اسمك' : 'اسمك'}</span><input type="text" id="w-name" class="input" maxlength="30" required placeholder="${r === 'teacher' ? 'مثلاً: أ. سامي' : r === 'admin' ? 'مثلاً: أ. عبدالعزيز' : 'مثلاً: عبدالله'}" /></label>
        ${r === 'student' ? `
          <div class="field"><span>صفك</span>${chipGroupSimple('w-grade', GRADES.map((g, k) => [k + 1, g]), 2)}</div>
          <div class="field"><span>فصلك</span>${chipGroupSimple('w-cls', CLASSES.map((c) => [c, c]), 'ب')}</div>` : ''}
        ${r === 'teacher' ? `<div class="field"><span>مادتك</span>${chipGroupSimple('w-subject', SUBJECT_LIST.map((x) => [x, x]), 'رياضيات')}</div>` : ''}
        ${r === 'parent' ? `<label class="field"><span>اسم ولدك</span><input type="text" id="w-child" class="input" maxlength="30" placeholder="مثلاً: عبدالله" /></label>` : ''}
        ${r === 'admin' ? `<div class="field"><span>منصبك</span>${chipGroupSimple('w-pos', ['مدير المدرسة', 'وكيل المدرسة', 'المرشد الطلابي'].map((x) => [x, x]), 'مدير المدرسة')}</div>` : ''}
        <div class="welcome__actions">
          <button type="button" class="btn btn--ghost" data-pick-role="">رجوع</button>
          <button type="submit" class="btn btn--coral">ادخل</button>
        </div>
      </form>`}
    </div>`;
  const n = $('#w-name');
  if (n) n.focus();
}
const chipGroupSimple = (id, opts, sel) => `<div class="chips" data-simple="${id}">${opts.map(([v, l]) =>
  `<button type="button" class="chip-opt${String(v) === String(sel) ? ' is-on' : ''}" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</div>`;
const simpleVal = (id) => $(`[data-simple="${id}"] .is-on`)?.dataset.v;

function enter(e) {
  e.preventDefault();
  const name = $('#w-name').value.trim();
  if (!name) { toast('اكتب اسمك'); return; }
  const r = welcomeRole;
  profile = { role: r, name };
  if (r === 'student') { profile.grade = Number(simpleVal('w-grade') || 2); profile.cls = simpleVal('w-cls') || 'ب'; }
  if (r === 'teacher') profile.subject = simpleVal('w-subject') || 'رياضيات';
  if (r === 'parent') profile.child = $('#w-child').value.trim() || 'عبدالله';
  if (r === 'admin') profile.position = simpleVal('w-pos') || 'مدير المدرسة';
  db.set('profile', profile);
  seed();
  migrate();
  if (r === 'student') {
    const prev = db.get('studentName', null);
    if (prev && prev !== name && state.answers) {
      for (const k of ['answers', 'plan', 'done', 'tasks', 'exams', 'moves', 'chat:student', 'focusMinutes', 'focusLog', 'trees', 'streak', 'submitted', 'registered', 'focusRun']) store.set(k, null);
      state.answers = null; state.plan = null; state.done = {}; state.draft = null; state.editing = false; state.step = 0;
      focus = null; clearInterval(focusTick);
    }
    db.set('studentName', name);
  }
  if (r === 'parent') db.set('studentName', profile.child);
  if (r !== 'student') { const n = db.get('names', {}); n[myId()] = name; db.set('names', n); }
  // الطالب: نعبّي اسمه وصفه في الخطة لو ما عنده خطة
  if (r === 'student' && !state.answers) state.draftPreset = { name, grade: profile.grade };
  chat.turns = db.get('chat:' + r, []);
  state.thread = null;
  renderChrome();
  location.hash = 'home';
  show();
  toast(`أهلاً ${name} 👋`);
}

/* =========================================================
   رئيسية الطالب: «اليوم» والأخبار
   ========================================================= */
function todayItems() {
  const items = [];
  const sub = db.get('submitted', []);
  // واجبات متأخرة ما تسلّمت (آخر أسبوعين)
  for (const t of db.get('schoolTasks', []).filter((x) => x.kind === 'واجب' && x.due < todayISO() && daysBetween(x.due, todayISO()) <= 14 && !sub.includes(x.id))) {
    items.push({ id: t.id, hw: true, done: false, title: t.title, sub: `متأخر • كان التسليم ${relDay(t.due)}`, tag: 'متأخر', tone: 'maroon' });
  }
  for (const t of getSchoolTasks().filter((x) => x.due >= todayISO() && daysBetween(todayISO(), x.due) <= 7)) {
    items.push({ id: t.id, hw: t.kind === 'واجب', done: sub.includes(t.id), title: t.title, sub: t.note, tag: t.kind, tone: t.kind === 'اختبار' ? 'maroon' : 'coral' });
  }
  for (const x of db.get('exams', []).filter((x) => x.date >= todayISO() && daysBetween(todayISO(), x.date) <= 14)) {
    items.push({ title: `اختبار ${x.subject}`, sub: `${relDay(x.date)}${x.note ? ` • ${x.note}` : ''}`, tag: 'اختبار', tone: 'maroon' });
  }
  const d = new Date().getDay();
  for (const c of customForDay(d, todayISO())) items.push({ title: c.title, sub: `${fmtTime(c.start)} • ${fmtDuration(c.minutes)}`, tag: 'مهمتي', tone: 'coral' });
  return items;
}

function renderStudentHome() {
  renderHomePlan();
  const items = todayItems();
  $('[data-today]').innerHTML = items.length ? items.map((t) => `
    <li class="task task--${t.tone}"><div><strong>${esc(t.title)}</strong><small>${esc(t.sub)}</small>${t.hw ? `<button type="button" class="submit-btn${t.done ? ' is-done' : ''}" data-submit="${t.id}">${t.done ? '✓ سلّمته' : 'سلّمته؟'}</button>` : ''}</div><span class="tag tag--${t.tone}">${esc(t.tag)}</span></li>`).join('')
    : '<li class="empty">ما عندك شي اليوم 🎉</li>';
  $('[data-today-count]').textContent = items.length ? countTxt(items.length, 'مهمة وحدة', 'مهمتين', 'مهام', 'مهمة') : '';
  const news = db.get('news', []).slice(0, 3);
  $('[data-news]').innerHTML = news.map((n, k) => `
    <div class="news${k ? ' news--soft' : ''}">
      <div><span class="eyebrow eyebrow--light">${esc(n.kind)}</span><h3>${esc(n.title)}</h3><p>${bidi(esc(n.body))}${n.deadline ? ` • حتى ${fmtDate(n.deadline)}` : ''}</p></div>
      ${n.kind === 'مسابقة' ? `<button class="btn btn--white btn--sm" type="button" data-register="${n.id}">${db.get('registered', []).includes(n.id) ? 'مسجّل ✓' : 'سجّل'}</button>` : ''}
    </div>`).join('') + (db.get('news', []).length > 3 ? '<a class="link link--block" href="#news" data-route="news">كل الأخبار ←</a>' : '');
  // هذا الأسبوع (من بياناتك الفعلية)
  const week = weekDates().map(isoDate);
  const hw = db.get('schoolTasks', []).filter((x) => x.kind === 'واجب' && week.includes(x.due));
  const doneHw = hw.filter((x) => db.get('submitted', []).includes(x.id)).length;
  const exams = getSchoolTasks().filter((x) => x.kind === 'اختبار' && x.due >= todayISO()).length + db.get('exams', []).filter((x) => x.date >= todayISO() && daysBetween(todayISO(), x.date) <= 14).length;
  const grades = Object.values(db.get('grades', {})).flat();
  const avg = grades.length ? Math.round((grades.reduce((a, b) => a + b, 0) / (grades.length * 20)) * 100) : 0;
  const hours = Math.round((weekFocusMinutes() / 60) * 10) / 10;
  $('[data-stats]').innerHTML = `
    <div class="stat"><small>الواجبات المسلّمة</small><strong>${ar(doneHw)} / ${ar(hw.length)}</strong></div>
    <div class="stat"><small>اختبارات قادمة</small><strong>${ar(exams)}</strong></div>
    <div class="stat"><small>ساعات التركيز هالأسبوع</small><strong>${ar(hours)}</strong></div>
    <div class="stat"><small>معدل درجاتك</small><strong>${ar(avg)}٪</strong></div>`;
  renderBoard(boardKind);
  drawTimer();
}

/* =========================================================
   جدولي: الجدول الحر + جدول الخطة + الاختبارات
   ========================================================= */
// المهام الخاصة: [{id,title,day,start,minutes,repeat,date,type}]
function customForDay(d, dateISO) {
  return db.get('tasks', []).filter((t) => (t.repeat ? t.day === d : t.date === dateISO));
}
function ensureIds() {
  if (!state.plan) return;
  let changed = false;
  state.plan.week.forEach((day) => day.blocks.forEach((b) => { if (!b.id) { b.id = 'g' + uid(); changed = true; } }));
  if (changed) store.set('plan', state.plan);
}

// التعويض يكون لهالأسبوع بس (ما يغيّر جدول الأسابيع الجاية)
const weekKey = () => isoDate(weekDates()[0]);
const weekMoves = () => (db.get('moves', {})[weekKey()] || []);
const findPlanBlock = (id) => { for (const day of state.plan?.week || []) { const b = day.blocks.find((x) => x.id === id); if (b) return b; } return null; };
function livePlanBlock(b, d, dateISO) {
  const rec = state.done[`${dateISO}|${b.id}`];
  if (rec && typeof rec === 'object' && rec.t) return { ...b, title: rec.t, note: rec.note || b.note };
  if (b.course && state.answers) {
    const live = courseTask(state.answers, d, b.minutes);
    if (live && live.course === b.course) return { ...b, title: live.title, note: live.note, lessons: live.lessons };
  }
  return b;
}
function dayBlocks(d, dateISO) {
  const moves = weekMoves();
  const movedAway = new Set(moves.filter((m) => m.from === d).map((m) => m.id));
  let plan = state.plan ? state.plan.week[d].blocks.filter((b) => !movedAway.has(b.id)).map((b) => ({ ...livePlanBlock(b, d, dateISO), src: 'plan' })) : [];
  for (const m of moves.filter((x) => x.to === d)) {
    const orig = findPlanBlock(m.id);
    if (orig) plan.push({ ...livePlanBlock(orig, m.from, dateISO), start: m.start, note: m.note, src: 'plan', moved: true });
  }
  const custom = customForDay(d, dateISO).map((t) => ({ ...t, src: 'mine' }));
  return [...plan, ...custom].sort((x, y) => x.start - y.start || (x.type === 'free') - (y.type === 'free'));
}
// فيه جلسة ثانية بنفس الوقت؟
function clashWith(d, dateISO, start, minutes, ignoreId) {
  return dayBlocks(d, dateISO).find((b) => b.type !== 'free' && b.id !== ignoreId && start < b.start + b.minutes && b.start < start + minutes);
}

function renderSchedule() {
  ensureIds();
  const view = $('[data-view="schedule"]');
  const todayIdx = new Date().getDay();
  const dates = weekDates();
  const sel = state.scheduleDay;
  const key = isoDate(dates[sel]);
  const blocks = dayBlocks(sel, key);
  const study = blocks.filter((b) => b.type !== 'free');
  const total = study.reduce((s, b) => s + b.minutes, 0);
  const doneCount = study.filter((b) => state.done[`${key}|${b.id}`]).length;
  const due = getSchoolTasks().filter((x) => x.due === key);
  const exams = db.get('exams', []).filter((x) => x.date === key);
  const examDays = new Set(db.get('exams', []).map((x) => x.date));

  view.innerHTML = `
    <section class="days" role="tablist" aria-label="أيام الأسبوع">
      ${dates.map((d, k) => `
        <button type="button" role="tab" class="day${k === sel ? ' is-on' : ''}${k === todayIdx ? ' is-today' : ''}" aria-selected="${k === sel}" data-day="${k}">
          <small>${DAYS_SHORT[k]}</small><strong>${ar(d.getDate())}</strong>${examDays.has(isoDate(d)) ? '<i class="day__dot"></i>' : ''}
        </button>`).join('')}
    </section>

    ${!state.plan ? `<section class="note">${icon('plan')} ما عندك خطة للحين. تقدر تضيف مهامك بنفسك، أو <a href="#plan" data-route="plan"><b>سوّ خطتك</b></a> وبيتسوى لك جدول كامل.</section>` : ''}

    ${exams.map((x) => `<section class="reminder">${icon('ask')}<div><strong>تذكير: اختبار ${esc(x.subject)} ${relDay(x.date)}</strong>${x.note ? `<small>${esc(x.note)}</small>` : ''}</div><button type="button" class="slot__more" data-edit-exam="${x.id}" aria-label="عدّل الاختبار">⋯</button></section>`).join('')}
    ${due.map((x) => `<section class="reminder reminder--soft">${icon('grades')}<div><strong>${esc(x.title)}</strong><small>${esc(x.kind)} من ${esc(person(x.by).name)} • ${x.kind === 'اختبار' ? 'الاختبار' : 'التسليم'} يوم ${DAYS[new Date(x.due).getDay()]}</small></div></section>`).join('')}

    <section class="block">
      <div class="block__head">
        <h2>${DAYS[sel]}${sel === todayIdx ? ' • اليوم' : ''}</h2>
        <span class="count">${ar(doneCount)} / ${ar(study.length)}${total ? ` • ${fmtDuration(total)}` : ''}</span>
      </div>
      <ul class="slots">
        ${blocks.length ? blocks.map((b) => {
          const done = !!state.done[`${key}|${b.id}`];
          return `
          <li class="slot">
            <span class="slot__time">${fmtTime(b.start)}</span>
            ${b.type === 'free'
              ? `<div class="slot__card slot--free"><span>${esc(b.title)}</span></div>`
              : `<div class="slot__card slot--${b.type}${done ? ' is-done' : ''}">
                  <button type="button" class="slot__main" aria-pressed="${done}" data-slot="${b.id}">
                    <span class="slot__check">${icon('check')}</span>
                    <span><strong>${bidi(esc(b.title))}</strong>${b.note ? `<em>${bidi(esc(b.note))}</em>` : ''}<small>${fmtDuration(b.minutes)}${b.src === 'mine' ? ` • مهمتي${b.repeat ? ' (كل أسبوع)' : ''}` : ' • من الخطة'}</small></span>
                  </button>
                  <button type="button" class="slot__ask" aria-label="اسأل المساعد عن هذي الجلسة" data-ask-slot="${b.id}">${icon('ai')}</button>
                  <button type="button" class="slot__more" aria-label="عدّل" data-edit-slot="${b.id}" data-src="${b.src}">⋯</button>
                </div>`}
          </li>`;
        }).join('') : '<li class="empty">ما فيه شي بهاليوم. أضف مهمة 👇</li>'}
      </ul>
      <p class="hint">اضغط على الجلسة لما تخلصها ✓ • ${icon('ai')} المساعد يساعدك فيها • ⋯ تعديل</p>
    </section>

    <div class="actions">
      <button type="button" class="btn btn--coral" data-add="task">+ أضف مهمة</button>
      <button type="button" class="btn btn--ghost" data-add="exam">+ أضف اختبار</button>
    </div>

    ${state.plan ? `<section class="card ai-edit">
      <div class="block__head"><h2>${icon('spark')} اطلب من الذكاء الاصطناعي يعدّل جدولك</h2></div>
      <textarea id="sched-req" class="input" data-sched-req rows="2" maxlength="300" placeholder="مثلاً: أبي أخفف يوم الخميس، أو زد وقت الفيزياء">${esc(state.schedReq || '')}</textarea>
      <button type="button" class="btn btn--coral" data-sched-ai ${state.schedBusy ? 'disabled' : ''}>${state.schedBusy ? 'يعدّل جدولك…' : 'عدّل جدولي'}</button>
    </section>` : ''}

    <section class="private">
      <span class="eyebrow">${icon('lock')} خاص</span>
      <strong>جدولك يظهر لك بس</strong>
    </section>`;
}

/* ---------- النوافذ (sheet) ---------- */
function openSheet(html) {
  let el = $('[data-sheet]');
  if (!el) { el = document.createElement('div'); el.setAttribute('data-sheet', ''); el.className = 'sheet'; document.body.appendChild(el); }
  el.innerHTML = `<div class="sheet__backdrop" data-close-sheet></div><div class="sheet__panel" role="dialog" aria-modal="true">${html}</div>`;
  el.hidden = false;
  const first = el.querySelector('input, textarea');
  if (first) setTimeout(() => first.focus(), 50);
}
function closeSheet() { const el = $('[data-sheet]'); if (el) { el.hidden = true; el.innerHTML = ''; } }

const dayChips = (sel) => chipGroupSimple('s-day', DAYS.map((d, k) => [k, DAYS_SHORT[k]]), sel);
const timeOpts = (sel) => {
  const out = [];
  for (let m = 6 * 60; m <= 23 * 60 + 30; m += 15) out.push(`<option value="${m}"${m === sel ? ' selected' : ''}>${fmtTime(m)}</option>`);
  return out.join('');
};

function taskSheet(t) {
  const isNew = !t;
  t = t || { title: '', day: state.scheduleDay, start: 17 * 60, minutes: 45, repeat: false };
  openSheet(`
    <h2>${isNew ? 'مهمة جديدة' : 'عدّل مهمتك'}</h2>
    <form class="sheet__form" data-task-form="${t.id || ''}">
      <label class="field"><span>وش المهمة؟</span><input type="text" id="s-title" class="input" maxlength="80" required value="${esc(t.title)}" placeholder="مثلاً: درس خصوصي رياضيات" /></label>
      <div class="field"><span>اليوم</span>${dayChips(t.day ?? state.scheduleDay)}</div>
      <div class="pct">
        <label><small>الوقت</small><select id="s-start" class="input">${timeOpts(t.start)}</select></label>
        <label><small>المدة (دقيقة)</small><input type="number" id="s-min" class="input" min="10" max="240" value="${t.minutes}" /></label>
      </div>
      <label class="toggle"><input type="checkbox" id="s-repeat" ${t.repeat ? 'checked' : ''} /> <span>كررها كل أسبوع</span></label>
      <div class="sheet__actions">
        ${isNew ? '' : `<button type="button" class="btn btn--ghost danger" data-del-task="${t.id}">احذف</button>`}
        <button type="button" class="btn btn--ghost" data-close-sheet>إلغاء</button>
        <button type="submit" class="btn btn--coral">${isNew ? 'أضف' : 'احفظ'}</button>
      </div>
    </form>`);
}

function examSheet(x) {
  const isNew = !x;
  x = x || { subject: '', date: isoDate(addDays(1)), note: '' };
  openSheet(`
    <h2>${isNew ? 'اختبار جديد' : 'عدّل الاختبار'}</h2>
    <form class="sheet__form" data-exam-form="${x.id || ''}">
      <label class="field"><span>المادة</span><input type="text" id="e-subject" class="input" list="subj-list" maxlength="40" required value="${esc(x.subject)}" placeholder="مثلاً: فيزياء" />
        <datalist id="subj-list">${SUBJECTS.map((s) => `<option value="${s}"></option>`).join('')}<option value="قدرات"></option><option value="تحصيلي"></option></datalist></label>
      <label class="field"><span>التاريخ</span><input type="date" id="e-date" class="input" required value="${x.date}" min="${todayISO()}" /></label>
      <label class="field"><span>ملاحظة (اختياري)</span><input type="text" id="e-note" class="input" maxlength="80" value="${esc(x.note)}" placeholder="مثلاً: الفصل الثالث والرابع" /></label>
      <p class="field__hint">يطلع لك كتذكير في الجدول والرئيسية.</p>
      <div class="sheet__actions">
        ${isNew ? '' : `<button type="button" class="btn btn--ghost danger" data-del-exam="${x.id}">احذف</button>`}
        <button type="button" class="btn btn--ghost" data-close-sheet>إلغاء</button>
        <button type="submit" class="btn btn--coral">${isNew ? 'أضف' : 'احفظ'}</button>
      </div>
    </form>`);
}

// تعديل جلسة سوّاها الذكاء الاصطناعي: يسألك ليش ومتى نعوّضها
const REASONS = ['ما عندي وقت', 'عندي اختبار أو واجب ثاني', 'خلصتها قبل', 'تعبان اليوم', 'سبب ثاني'];
function planSlotSheet(b) {
  openSheet(`
    <h2>${icon('spark')} تبي تغيّر هالجلسة؟</h2>
    <p class="sheet__lead">«${esc(b.title)}» من خطتك. قبل ما نغيّرها، قلّي:</p>
    <form class="sheet__form" data-move-form="${b.id}">
      <div class="field"><span>ليش؟</span>${chipGroupSimple('m-reason', REASONS.map((r) => [r, r]), '')}</div>
      <input type="text" id="m-other" class="input" maxlength="100" placeholder="اكتب السبب (اختياري)" />
      <div class="field"><span>متى نعوّضها؟</span>${dayChips(-1)}</div>
      <label class="field"><span>الساعة</span><select id="s-start" class="input">${timeOpts(b.start)}</select></label>
      <p class="field__hint">لازم نعوّضها عشان ما تتأخر عن هدفك. ولو خلصتها قبل، اختر «خلصتها قبل».</p>
      <div class="sheet__actions">
        <button type="button" class="btn btn--ghost" data-close-sheet>خلّها مثل ما هي</button>
        <button type="submit" class="btn btn--coral">عوّضها</button>
      </div>
    </form>`);
}

/* =========================================================
   مؤقت «ركّز»: تختار المدة، وما تقدر توقفه (لو استسلمت تذبل الشجرة)
   ========================================================= */
const CIRC = 2 * Math.PI * 52;
let focus = db.get('focusRun', null); // {endAt, minutes}
let focusTick = null;
let focusPick = 25;

function drawTimer() {
  const box = $('[data-focus-box]');
  if (!box) return;
  const ring = $('[data-ring]');
  ring.style.strokeDasharray = CIRC;
  if (focus) {
    box.innerHTML = `
      <p>ركّز! المؤقت ما يتوقف. لو استسلمت، شجرتك تذبل 🥀</p>
      <div class="focus__btns"><button class="btn btn--ghost" type="button" data-giveup>استسلم</button></div>`;
    tickTimer();
  } else {
    $('[data-timer]').textContent = clockTxt(focusPick * 60);
    $('[data-timer-label]').textContent = 'اختر المدة';
    ring.style.strokeDashoffset = 0;
    const trees = db.get('trees', 0);
    box.innerHTML = `
      <p>اختر المدة (من ٥ دقايق لين ٣ ساعات) وابدأ. ما تقدر توقف المؤقت، فركّز لين يخلص 💪 وكل ٢٥ دقيقة = شجرة.</p>
      <div class="focus__step">
        <div class="chips chips--sm">${[25, 45, 60, 90].map((n) => `<button type="button" class="chip-opt${focusPick === n ? ' is-on' : ''}" data-pick-min="${n}">${ar(n)} د</button>`).join('')}</div>
        <div class="stepper" aria-label="المدة"><button type="button" data-step="-5" aria-label="أنقص ٥ دقايق">−</button><span>${ar(focusPick)} د</span><button type="button" data-step="5" aria-label="زِد ٥ دقايق">+</button></div>
      </div>
      <div class="focus__plants" aria-label="غابتك">${'🌳'.repeat(Math.min(trees, 8)) || '🌱'}${trees > 8 ? ` +${ar(trees - 8)}` : ''}</div>
      <div class="focus__btns"><button class="btn btn--coral" type="button" data-focus-start>ابدأ ${fmtDuration(focusPick)}</button></div>`;
  }
}
// يحدّث الوقت والدائرة بس (بدون ما يعيد بناء الأزرار عشان الضغط ما يضيع)
const clockTxt = (sec) => {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), x = sec % 60;
  return ar(h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`);
};
// دقايق التركيز في هالأسبوع (للمنافسة الأسبوعية)
function weekFocusMinutes() {
  const start = weekKey();
  return db.get('focusLog', []).filter((x) => x.d >= start).reduce((a, x) => a + x.m, 0);
}
function tickTimer() {
  if (!focus) return;
  const leftS = Math.max(0, Math.ceil((focus.endAt - Date.now()) / 1000));
  const t = $('[data-timer]');
  if (t) {
    t.textContent = clockTxt(leftS);
    $('[data-timer-label]').textContent = 'نبتتك تكبر 🌱';
    $('[data-ring]').style.strokeDashoffset = CIRC * (leftS / (focus.minutes * 60));
  }
  if (leftS === 0) finishFocus();
}
function startFocus() {
  focus = { endAt: Date.now() + focusPick * 60000, minutes: focusPick };
  db.set('focusRun', focus);
  runFocusTick();
  drawTimer();
}
function runFocusTick() {
  clearInterval(focusTick);
  if (!focus) return;
  focusTick = setInterval(tickTimer, 500);
}
function finishFocus() {
  if (!focus) return;
  const mins = focus.minutes;
  focus = null; db.set('focusRun', null); clearInterval(focusTick);
  // كل ٢٥ دقيقة = شجرة، والدقايق كلها تنحسب في المنافسة
  const total = (store.get('focusMinutes') || 0) + mins;
  const grown = Math.floor(total / 25) - Math.floor((store.get('focusMinutes') || 0) / 25);
  db.set('trees', db.get('trees', 0) + grown);
  store.set('focusMinutes', total);
  const log = db.get('focusLog', []); log.push({ d: todayISO(), m: mins }); db.set('focusLog', log.slice(-200));
  bumpStreak();
  toast(grown ? `أحسنت! زرعت ${grown === 1 ? 'شجرة' : grown === 2 ? 'شجرتين' : `${ar(grown)} أشجار`} 🌳 وزاد ترتيبك بالمنافسة` : `أحسنت! ${fmtDuration(mins)} تركيز 👏 باقي ${fmtDuration(25 - (total % 25))} على الشجرة الجاية`);
  if (!$('[data-view="home"]').hidden && role() === 'student') renderStudentHome(); else { renderBoard(boardKind); drawTimer(); }
}
function giveUp() {
  openSheet(`
    <h2>متأكد تبي تستسلم؟ 🥀</h2>
    <p class="sheet__lead">لو استسلمت، شجرتك تذبل وما تنحسب دقايق هالجلسة.</p>
    <div class="sheet__actions">
      <button type="button" class="btn btn--ghost danger" data-giveup-yes>إيه، استسلم</button>
      <button type="button" class="btn btn--coral" data-close-sheet>لا، بكمّل 💪</button>
    </div>`);
}
function bumpStreak() {
  const s = db.get('streak', { days: 4, last: isoDate(addDays(-1)) });
  if (s.last === todayISO()) return;
  s.days = s.last === isoDate(addDays(-1)) ? s.days + 1 : 1;
  s.last = todayISO();
  db.set('streak', s);
}

/* =========================================================
   النقاط والشارات (تنحسب من الالتزام)
   ========================================================= */
function pointsBreakdown() {
  const doneTasks = Object.keys(state.done).length;
  const streak = db.get('streak', { days: 4 }).days;
  const minutes = store.get('focusMinutes') || 0;
  const hw = db.get('submitted', []).length;
  const items = [
    ['جلسات خلّصتها من جدولك', doneTasks, 10],
    ['أيام متتالية «ستريك»', streak, 15],
    ['كل ٥ دقايق تركيز', Math.floor(minutes / 5), 1],
    ['واجبات سلّمتها', hw, 20],
  ];
  return { items, total: items.reduce((s, [, n, p]) => s + n * p, 0) + 120 };
}

/* =========================================================
   الصفحات العامة
   ========================================================= */
function renderPage(route) {
  const el = $('[data-view="page"]');
  const r = role();
  const fn = {
    home: { teacher: teacherHome, parent: parentHome, admin: adminHome }[r],
    community: pageCommunity, messages: pageMessages, resources: pageResources, grades: pageGrades, rewards: pageRewards,
    feedback: pageFeedback, more: pageMore, news: pageNews, 't-tasks': pageTeacherTasks, 't-resources': pageResources, 't-students': pageTeacherStudents,
    't-feedback': pageTeacherFeedback, 'a-news': pageAdminNews, 'a-reports': pageAdminReports, 'a-prizes': pageAdminPrizes, 'p-child': pageParentChild,
  }[route];
  el.innerHTML = fn ? fn() : '<section class="intro"><h2>هالصفحة مو متاحة لهالحساب</h2><a class="btn btn--coral" href="#home" data-route="home">الرئيسية</a></section>';
  if (route === 'messages' && state.thread) { const c = $('[data-thread-body]'); if (c) c.scrollTop = c.scrollHeight; }
}

const sectionHead = (title, extra = '') => `<div class="block__head"><h2>${title}</h2>${extra}</div>`;

/* ---------- المزيد ---------- */
function pageMore() {
  return `<section class="more-grid">${NAV.student.side.filter(([id]) => id !== 'home').map(([id, title, ic]) =>
    `<a class="more-item" href="#${id}" ${id === 'focus' ? 'data-focus' : `data-route="${id}"`}>${icon(ic)}<span>${title}</span></a>`).join('')}
    <button type="button" class="more-item" data-theme-toggle>${icon(isDark() ? 'sun' : 'moon')}<span>${isDark() ? 'الوضع الفاتح' : 'الوضع الداكن'}</span></button>
    <button type="button" class="more-item" data-switch>${icon('back')}<span>تبديل الحساب</span></button></section>`;
}

/* ---------- المجتمع ---------- */
const GROUPS = () => [['class', `فصلي (${myClassName()})`], ['grade', `صفي (${GRADES[(profile?.grade || 2) - 1]})`], ['school', 'المدرسة كاملة']];
let communityGroup = 'class';
const ago = (ts) => { const m = Math.round((Date.now() - ts) / 6e4); return m < 60 ? `قبل ${ar(Math.max(1, m))} د` : m < 1440 ? `قبل ${ar(Math.round(m / 60))} س` : `قبل ${ar(Math.round(m / 1440))} يوم`; };
function pageCommunity() {
  if (!['student', 'admin'].includes(role())) return `<section class="intro">${icon('lock')}<h2>القروبات للطلاب والمشرفين بس</h2><p>تقدر تتواصل مع الطلاب والإدارة من «الرسائل».</p><a class="btn btn--coral" href="#messages" data-route="messages">الرسائل</a></section>`;
  const posts = db.get('posts', []).filter((p) => p.group === communityGroup).sort((a, b) => b.at - a.at);
  return `
    <div class="seg seg--lg seg--wrap" role="tablist">${GROUPS().map(([k, l]) => `<button type="button" role="tab" aria-selected="${communityGroup === k}" data-group="${k}">${l}</button>`).join('')}</div>
    <form class="card composer-post" data-post-form>
      <div class="chips chips--sm">${['ملخص', 'ملف', 'فيديو', 'سؤال'].map((k, i) => `<button type="button" class="chip-opt${i === 0 ? ' is-on' : ''}" data-post-kind="${k}">${k}</button>`).join('')}</div>
      <textarea id="post-text" class="input" rows="2" maxlength="600" placeholder="شارك ملخص أو اسأل زملائك…"></textarea>
      <div class="composer-post__row">
        <input type="url" id="post-link" class="input" placeholder="رابط (فيديو أو ملف) — اختياري" />
        <label class="btn btn--ghost btn--sm file-btn">${icon('image')} ملف<input type="file" id="post-file" hidden /></label>
        <button type="submit" class="btn btn--coral">انشر</button>
      </div>
      <small class="field__hint" data-post-file-name></small>
    </form>
    <section class="posts">
      ${posts.length ? posts.map(postCard).join('') : '<p class="empty">ما فيه منشورات هنا للحين، كن أول واحد!</p>'}
    </section>`;
}
function postCard(p) {
  return `
    <article class="post card">
      <header><span class="avatar">${esc(p.author[0])}</span><div><strong>${esc(p.author)}</strong><small>${esc(p.role)} • ${ago(p.at)}</small></div><span class="tag tag--${p.kind === 'سؤال' ? 'maroon' : 'coral'}">${esc(p.kind)}</span></header>
      <p>${bidi(esc(p.text))}</p>
      ${p.file ? `<a class="post__file" ${p.fileData ? `href="${p.fileData}" download="${esc(p.file)}"` : ''}>${icon('resources')} ${esc(p.file)}</a>` : ''}
      ${p.link ? `<a class="post__file" href="${esc(p.link)}" target="_blank" rel="noopener">${icon(p.kind === 'فيديو' ? 'image' : 'resources')} افتح الرابط</a>` : ''}
      <footer>
        <button type="button" class="like${p.liked ? ' is-on' : ''}" data-like="${p.id}">❤ ${ar(p.likes)}</button>
        <span>💬 ${ar(p.comments.length)}</span>
      </footer>
      ${p.comments.length ? `<ul class="comments">${p.comments.map((c) => `<li><b>${esc(c.who)}:</b> ${bidi(esc(c.text))}</li>`).join('')}</ul>` : ''}
      <form class="comment-form" data-comment-form="${p.id}"><input type="text" class="input" maxlength="300" placeholder="اكتب تعليق…" /><button type="submit" class="btn btn--ghost btn--sm">علّق</button></form>
    </article>`;
}

/* ---------- الرسائل ---------- */
function directory() {
  const r = role();
  if (r === 'parent') return [...TEACHERS, ...STAFF].map((p) => person(p.id));
  if (r === 'teacher') return [STUDENT_ID, ...classmates().map((c) => c.id), PARENT_ID, ...STAFF.map((x) => x.id)].map(person);
  if (r === 'admin') return [STUDENT_ID, ...classmates().map((c) => c.id), ...TEACHERS.map((x) => x.id), PARENT_ID].map(person);
  return [...classmates().map((c) => c.id), ...TEACHERS.map((x) => x.id), ...STAFF.map((x) => x.id)].map(person);
}
// القروبات للطلاب والمشرفين بس، والرسائل الخاصة توصل للطرف الثاني
const myThreads = () => db.get('threads', []).filter((t) => (t.group ? ['student', 'admin'].includes(role()) : (t.members || []).includes(myId())))
  .sort((a, b) => (b.msgs[b.msgs.length - 1]?.at || 0) - (a.msgs[a.msgs.length - 1]?.at || 0));
const groupName = () => `قروب ${myClassName()}`;
const threadOther = (t) => (t.group ? { name: groupName(), role: 'طلاب الفصل والمشرف بس' } : person(t.members.find((x) => x !== myId()) || t.members[0]));
const initial = (n) => esc(String(n).replace(/^(قروب|أ\.)\s*/, '')[0] || '؟');
function pageMessages() {
  const threads = myThreads();
  if (state.thread) {
    const th = threads.find((t) => t.id === state.thread);
    if (th) {
      const o = threadOther(th);
      return `
      <section class="thread card">
        <header><button type="button" class="icon-btn icon-btn--soft" data-thread-back aria-label="رجوع">${icon('back')}</button>
          <span class="avatar${th.group ? ' avatar--coral' : ''}">${initial(o.name)}</span><div><strong>${esc(o.name)}</strong><small>${esc(o.role)}</small></div></header>
        <div class="thread__body" data-thread-body>
          ${th.msgs.length ? th.msgs.map((m) => {
            const mine = m.from === myId();
            return `<div class="msg ${mine ? 'msg--me' : 'msg--ai'}">${th.group && !mine ? `<b class="msg__from">${esc(person(m.from).name)} • ${esc(person(m.from).role)}</b>` : ''}${bidi(esc(m.text))}<small class="msg__time">${ago(m.at)}</small></div>`;
          }).join('') : '<p class="empty">ابدأ المحادثة 👋</p>'}
        </div>
        <form class="composer composer--inline" data-msg-form="${th.id}">
          <div class="composer__row"><textarea class="input" rows="1" maxlength="1000" placeholder="اكتب رسالة…"></textarea>
          <button type="submit" class="icon-btn icon-btn--coral" aria-label="أرسل">${icon('send')}</button></div>
        </form>
      </section>`;
    }
  }
  const people = directory();
  return `
    <section class="card">
      ${sectionHead('محادثاتك')}
      ${threads.length ? '' : '<p class="empty">ما عندك محادثات للحين. ابدأ وحدة من تحت 👇</p>'}
      <ul class="threads">${threads.map((t) => {
        const o = threadOther(t);
        const last = t.msgs[t.msgs.length - 1];
        return `
        <li><button type="button" data-open-thread="${t.id}"><span class="avatar${t.group ? ' avatar--coral' : ''}">${initial(o.name)}</span>
          <div><strong>${esc(o.name)}</strong><small>${esc(o.role)}</small><p>${last ? `${last.from === myId() ? 'أنت: ' : ''}${esc(last.text)}` : ''}</p></div><span class="pts">${last ? ago(last.at) : ''}</span></button></li>`;
      }).join('')}</ul>
    </section>
    <section class="card">
      ${sectionHead('رسالة جديدة')}
      <p class="field__hint">كل واحد اسمه وصفته واضحة.</p>
      <ul class="people">${people.map((p) => `<li><button type="button" data-new-thread="${p.id}"><span class="avatar">${initial(p.name)}</span><div><strong>${esc(p.name)}</strong><small>${esc(p.role)}</small></div></button></li>`).join('')}</ul>
    </section>`;
}

/* ---------- أخبار المدرسة ---------- */
function pageNews() {
  const all = db.get('news', []);
  return `<section class="block news-list">${all.length ? all.map((n) => `
    <div class="news${n.kind === 'مسابقة' ? '' : ' news--soft'}">
      <div><span class="eyebrow eyebrow--light">${esc(n.kind)} • ${relDay(n.at)}</span><h3>${esc(n.title)}</h3><p>${bidi(esc(n.body))}${n.deadline ? ` • حتى ${fmtDate(n.deadline)}` : ''}</p></div>
      ${n.kind === 'مسابقة' && role() === 'student' ? `<button class="btn btn--white btn--sm" type="button" data-register="${n.id}">${db.get('registered', []).includes(n.id) ? 'مسجّل ✓' : 'سجّل'}</button>` : ''}
    </div>`).join('') : '<p class="empty">ما فيه أخبار للحين.</p>'}</section>`;
}

/* ---------- المصادر ---------- */
function pageResources() {
  const r = role();
  const list = db.get('resources', []).filter((x) => r !== 'teacher' || x.by === myTeacherId() || x.subject === profile.subject);
  const subjects = [...new Set(db.get('resources', []).map((x) => x.subject))];
  return `
    ${r === 'teacher' ? `
    <form class="card sheet__form" data-res-form>
      ${sectionHead('أضف مصدر لطلابك')}
      <label class="field"><span>العنوان</span><input type="text" id="r-title" class="input" maxlength="80" required placeholder="مثلاً: ملخص الفصل الرابع" /></label>
      <div class="field"><span>النوع</span>${chipGroupSimple('r-kind', [['ملف', 'ملف'], ['رابط', 'رابط'], ['فيديو', 'فيديو']], 'ملف')}</div>
      <label class="field"><span>الرابط (اختياري)</span><input type="url" id="r-url" class="input" placeholder="https://…" /></label>
      <label class="field"><span>أو ارفع ملف صغير (حتى ٥٠٠ كيلوبايت)</span><input type="file" id="r-file" class="input" /></label>
      <button type="submit" class="btn btn--coral">أضف المصدر</button>
    </form>` : ''}
    <section class="block">
      ${sectionHead(r === 'teacher' ? 'مصادرك' : 'مصادر معلميك', `<span class="count">${ar(list.length)}</span>`)}
      ${(r === 'teacher' ? [profile.subject] : subjects).map((s) => {
        const items = list.filter((x) => x.subject === s);
        if (!items.length) return '';
        return `<h3 class="subhead">${esc(s)}</h3><ul class="res-list">${items.map((x) => {
          const t = TEACHERS.find((tt) => tt.id === x.by);
          const href = x.fileData || x.url;
          return `<li class="res card"><span class="res__icon">${icon(x.kind === 'فيديو' ? 'image' : 'resources')}</span>
            <div><strong>${esc(x.title)}</strong><small>${esc(x.kind)} • ${t ? esc(person(t.id).name) : ''} • ${relDay(x.at)}</small></div>
            ${href ? `<a class="btn btn--ghost btn--sm" href="${esc(href)}" ${x.fileData ? `download="${esc(x.fileName || x.title)}"` : 'target="_blank" rel="noopener"'}>افتح</a>` : '<span class="pts">ملف تجريبي</span>'}
            ${r === 'teacher' && x.by === myTeacherId() ? `<button type="button" class="slot__more" data-del-res="${x.id}" aria-label="احذف">×</button>` : ''}</li>`;
        }).join('')}</ul>`;
      }).join('') || '<p class="empty">ما فيه مصادر للحين.</p>'}
    </section>`;
}

/* ---------- مستواي ودرجاتي ---------- */
const LEVELS = ['ممتاز', 'جيد جداً', 'جيد', 'يحتاج دعم'];
const levelTone = (l) => ({ 'ممتاز': 'ok', 'جيد جداً': 'good', 'جيد': 'mid', 'يحتاج دعم': 'low' }[l] || 'mid');
function levelsTable(levels, grades) {
  return `<ul class="levels">${SUBJECT_LIST.map((s) => {
    const g = grades[s] || [];
    const avg = g.length ? Math.round((g.reduce((a, b) => a + b, 0) / (g.length * 20)) * 100) : null;
    return `<li class="level card"><div><strong>${s}</strong><small>${g.length ? `درجات: ${g.map((x) => ar(x)).join('، ')} من ٢٠` : ''}</small></div>
      ${avg != null ? `<span class="level__pct">${ar(avg)}٪</span>` : ''}<span class="lvl lvl--${levelTone(levels[s])}">${esc(levels[s] || '—')}</span></li>`;
  }).join('')}</ul>`;
}
function aiCheckStats() {
  const all = db.get('chat:student', []).filter((t) => t.role === 'assistant').map((t) => t.content);
  return { ok: all.filter((t) => t.includes('✅')).length, part: all.filter((t) => t.includes('⚠️')).length, bad: all.filter((t) => t.includes('❌')).length };
}
function pageGrades() {
  const st = aiCheckStats();
  return `
    <section class="card">
      ${sectionHead('مستواك في كل مادة', '<span class="count">يحدده معلمك</span>')}
      ${levelsTable(db.get('levels', {}), db.get('grades', {}))}
    </section>
    <section class="card">
      ${sectionHead('التصحيح الذكي', '<span class="count">من المساعد</span>')}
      <p class="field__hint">لما تعطي المساعد إجابتك، يقارنها بالإجابة النموذجية.</p>
      <div class="stats stats--3"><div class="stat"><small>✅ صح</small><strong>${ar(st.ok)}</strong></div><div class="stat"><small>⚠️ صح جزئياً</small><strong>${ar(st.part)}</strong></div><div class="stat"><small>❌ خطأ</small><strong>${ar(st.bad)}</strong></div></div>
      <a class="btn btn--coral" href="#ai" data-route="ai">صحّح إجابة جديدة</a>
    </section>`;
}

/* ---------- المحفزات ---------- */
function pageRewards() {
  const { items, total } = pointsBreakdown();
  const trees = db.get('trees', 0);
  const streak = db.get('streak', { days: 4 }).days;
  const badges = [
    ['🔥', 'ستريك ٧ أيام', streak >= 7], ['🌳', 'أول شجرة', trees >= 1], ['🌲', 'غابة صغيرة (١٠ أشجار)', trees >= 10],
    ['✅', '١٠ جلسات من جدولك', Object.keys(state.done).length >= 10], ['🧭', 'سوّيت خطتك المستقبلية', !!state.plan], ['🤝', 'شاركت في المجتمع', db.get('posts', []).some((p) => p.mine)],
  ];
  return `
    <section class="points card">
      <div><small>نقاطك</small><strong>${ar(total)}</strong></div>
      <div><small>الستريك</small><strong>🔥 ${ar(streak)}</strong></div>
      <div><small>غابتك</small><strong>🌳 ${ar(trees)}</strong></div>
    </section>
    <section class="card">
      ${sectionHead('كيف تنحسب نقاطك؟')}
      <ul class="course__facts">${items.map(([l, n, p]) => `<li><span>${l} (${ar(n)} × ${ar(p)})</span><b>${ar(n * p)}</b></li>`).join('')}<li><span>نقاط البداية</span><b>${ar(120)}</b></li></ul>
      <p class="field__hint">النقاط تنحسب من التزامك: الستريك، الواجبات، والجلسات اللي تخلّصها.</p>
    </section>
    <section class="card">
      ${sectionHead('غابتك 🌳', `<a class="link" href="#focus" data-focus>ازرع شجرة</a>`)}
      <div class="forest">${trees ? '🌳'.repeat(Math.min(trees, 60)) : '<span class="empty">ابدأ جلسة «ركّز» وازرع أول شجرة</span>'}</div>
    </section>
    <section class="card">
      ${sectionHead('شاراتك')}
      <ul class="badges">${badges.map(([e, l, on]) => `<li class="${on ? 'is-on' : ''}"><span>${e}</span><small>${l}</small></li>`).join('')}</ul>
    </section>
    <section class="card">
      ${sectionHead('جوائز المنافسة من المدرسة')}
      <ol class="prizes">${db.get('prizes', []).map((p, k) => (p ? `<li><span class="rank">${['🥇', '🥈', '🥉'][k] || ar(k + 1)}</span>${esc(p)}</li>` : '')).join('')}</ol>
    </section>`;
}

/* ---------- اقتراحات للمعلمين (الطالب) ---------- */
function pageFeedback() {
  const mine = db.get('feedback', []).filter((f) => f.mine);
  return `
    <form class="card sheet__form" data-fb-form>
      ${sectionHead('اقتراح لمعلمك')}
      <div class="field"><span>لمين؟</span>${chipGroupSimple('f-to', TEACHERS.map((t) => [t.id, `${t.name} (${t.subject})`]), 't1')}</div>
      <label class="field"><span>اقتراحك</span><textarea id="f-text" class="input" rows="3" maxlength="500" required placeholder="مثلاً: لو نحل أسئلة أكثر في آخر الحصة"></textarea></label>
      <label class="toggle"><input type="checkbox" id="f-anon" checked /> <span>أرسله بدون اسمي</span></label>
      <button type="submit" class="btn btn--coral">أرسل</button>
    </form>
    ${mine.length ? `<section class="card">${sectionHead('اقتراحاتك')}<ul class="fb-list">${mine.map((f) => `<li><strong>${esc(TEACHERS.find((t) => t.id === f.to)?.name || '')}</strong><p>${bidi(esc(f.text))}</p><small>${relDay(f.at)}${f.anon ? ' • بدون اسم' : ''}</small></li>`).join('')}</ul></section>` : ''}`;
}

/* ---------- المعلم ---------- */
function teacherHome() {
  const tasks = db.get('schoolTasks', []).filter((t) => t.by === myTeacherId());
  const fb = db.get('feedback', []).filter((f) => f.to === myTeacherId());
  return `
    <section class="stats">
      <div class="stat"><small>واجبات واختبارات</small><strong>${ar(tasks.length)}</strong></div>
      <div class="stat"><small>مصادرك</small><strong>${ar(db.get('resources', []).filter((x) => x.by === myTeacherId() || x.subject === profile.subject).length)}</strong></div>
      <div class="stat"><small>اقتراحات الطلاب</small><strong>${ar(fb.length)}</strong></div>
      <div class="stat"><small>طلاب فصلك</small><strong>${ar(classmates().length + 1)}</strong></div>
    </section>
    <section class="more-grid">
      ${NAV.teacher.side.filter(([id]) => id !== 'home').map(([id, title, ic]) => `<a class="more-item" href="#${id}" data-route="${id}">${icon(ic)}<span>${title}</span></a>`).join('')}
    </section>
    <form class="ask" data-home-ask>
      <span class="ask__icon">${icon('spark')}</span>
      <input type="text" id="home-ask" placeholder="اطلب من المساعد… مثلاً: سوّ لي ١٠ أسئلة عن ${esc(profile.subject)}" maxlength="500" autocomplete="off" />
      <button type="submit" class="btn btn--coral btn--sm">اطلب</button>
    </form>
    <section class="card">${sectionHead('آخر الواجبات', `<a class="link" href="#t-tasks" data-route="t-tasks">الكل</a>`)}${taskList(tasks.slice(-3).reverse())}</section>
    <div class="actions actions--center">${themeBtn()}<button type="button" class="btn btn--ghost switch-btn" data-switch>${icon('back')} تبديل الحساب</button></div>`;
}
const taskList = (tasks, del) => tasks.length ? `<ul class="res-list">${tasks.map((t) => `
  <li class="res card"><span class="res__icon">${icon('grades')}</span><div><strong>${esc(t.title)}</strong><small>${esc(t.kind)} • ${esc(t.subject)} • ${relDay(t.due)}</small></div>
  ${del && t.by === myTeacherId() ? `<button type="button" class="slot__more" data-del-hw="${t.id}" aria-label="احذف">×</button>` : ''}</li>`).join('')}</ul>` : '<p class="empty">ما فيه شي للحين.</p>';
function pageTeacherTasks() {
  const tasks = db.get('schoolTasks', []).filter((t) => t.by === myTeacherId()).sort((a, b) => a.due.localeCompare(b.due));
  return `
    <form class="card sheet__form" data-hw-form>
      ${sectionHead('واجب أو اختبار جديد')}
      <div class="field"><span>النوع</span>${chipGroupSimple('h-kind', [['واجب', 'واجب'], ['اختبار', 'اختبار']], 'واجب')}</div>
      <label class="field"><span>العنوان</span><input type="text" id="h-title" class="input" maxlength="90" required placeholder="مثلاً: حل تمارين صفحة ٤٥" /></label>
      <label class="field"><span>الموعد</span><input type="date" id="h-due" class="input" required value="${isoDate(addDays(2))}" min="${todayISO()}" /></label>
      <p class="field__hint">يطلع للطلاب في «اليوم» وفي جدولهم.</p>
      <button type="submit" class="btn btn--coral">أضف</button>
    </form>
    <section class="block">${sectionHead('واجباتك واختباراتك')}${taskList(tasks, true)}</section>`;
}
function pageTeacherStudents() {
  const levels = db.get('classLevels', {});
  const students = [{ id: 'me-student', name: db.get('studentName', 'عبدالله') }, ...classmates()];
  return `
    <section class="card">
      ${sectionHead(`طلاب ${myClassName()} — ${esc(profile.subject)}`)}
      <p class="field__hint">اختر مستوى كل طالب. «${esc(db.get('studentName', 'عبدالله'))}» هو حساب الطالب التجريبي، ومستواه يطلع له ولولي أمره.</p>
      <ul class="levels">${students.map((s) => {
        const cur = s.id === 'me-student' ? db.get('levels', {})[profile.subject] : levels[`${profile.subject}:${s.id}`];
        return `<li class="level card"><span class="avatar">${esc(s.name[0])}</span><div><strong>${esc(s.name)}</strong></div>
          <select class="input input--sm" data-set-level="${s.id}">${['—', ...LEVELS].map((l) => `<option${l === cur ? ' selected' : ''}>${l}</option>`).join('')}</select></li>`;
      }).join('')}</ul>
    </section>`;
}
function pageTeacherFeedback() {
  const fb = db.get('feedback', []).filter((f) => f.to === myTeacherId());
  return `<section class="card">${sectionHead('اقتراحات طلابك', `<span class="count">${ar(fb.length)}</span>`)}
    ${fb.length ? `<ul class="fb-list">${fb.map((f) => `<li><p>${bidi(esc(f.text))}</p><small>${f.anon ? 'بدون اسم' : esc(f.from || '')} • ${relDay(f.at)}</small></li>`).join('')}</ul>` : '<p class="empty">ما فيه اقتراحات للحين.</p>'}
    <button type="button" class="btn btn--ghost" data-ask-fb>${icon('spark')} لخّصها لي بالذكاء الاصطناعي</button></section>`;
}

/* ---------- ولي الأمر ---------- */
function parentHome() {
  const levels = db.get('levels', {});
  const weak = SUBJECT_LIST.filter((s) => levels[s] === 'يحتاج دعم');
  const late = lateHomework();
  const news = db.get('news', []).slice(0, 4);
  return `
    <section class="goal">
      <span class="chip chip--light">ولدك</span>
      <h2>${esc(profile.child || 'عبدالله')} • ${myClassName()}</h2>
      <p>${weak.length ? `يحتاج دعم في: ${weak.join('، ')}` : 'ما فيه مادة يحتاج فيها دعم 👏'}${late.length ? ` • ${ar(late.length)} واجب متأخر` : ''}</p>
    </section>
    <section class="card">${sectionHead('مستواه في المواد', `<a class="link" href="#p-child" data-route="p-child">التفاصيل</a>`)}${levelsTable(levels, {})}</section>
    <section class="card">${sectionHead('أخبار المدرسة والمسابقات', db.get('news', []).length > 4 ? '<a class="link" href="#news" data-route="news">الكل</a>' : '')}${newsList(news)}</section>
    <p class="private-note">${icon('lock')} الخطة المستقبلية والجدول خاصة بالطالب ولا تظهر لولي الأمر</p>
    <div class="actions actions--center">${themeBtn()}<button type="button" class="btn btn--ghost switch-btn" data-switch>${icon('back')} تبديل الحساب</button></div>`;
}
const lateHomework = () => db.get('schoolTasks', []).filter((t) => t.kind === 'واجب' && t.title.trim() && t.due < todayISO() && !db.get('submitted', []).includes(t.id));
function pageParentChild() {
  const levels = db.get('levels', {});
  const missing = SUBJECT_LIST.filter((s) => levels[s] === 'يحتاج دعم');
  const late = lateHomework();
  return `
    <section class="card">${sectionHead('المستوى والدرجات')}${levelsTable(levels, db.get('grades', {}))}</section>
    <section class="card">${sectionHead('وش ناقص فيه')}
      <ul class="fb-list">
        ${missing.map((s) => `<li><strong>${s}</strong><p>مستواه «يحتاج دعم». ننصح بمراجعة المصادر اللي نزّلها المعلم.</p></li>`).join('')}
        ${late.map((t) => `<li><strong>واجب متأخر</strong><p>${esc(t.title)}</p><small>${fmtDate(t.due)}</small></li>`).join('')}
        ${!missing.length && !late.length ? '<li><p>ما فيه شي ناقص 👏</p></li>' : ''}
      </ul></section>`;
}
const newsList = (news) => news.length ? `<ul class="res-list">${news.map((n) => `<li class="res card"><span class="res__icon">${icon(n.kind === 'مسابقة' ? 'rewards' : 'messages')}</span><div><strong>${esc(n.title)}</strong><small>${esc(n.kind)}${n.deadline ? ` • حتى ${fmtDate(n.deadline)}` : ''}</small><p>${bidi(esc(n.body))}</p></div>${role() === 'admin' ? `<button type="button" class="slot__more" data-del-news="${n.id}" aria-label="احذف">×</button>` : ''}</li>`).join('')}</ul>` : '<p class="empty">ما فيه شي للحين.</p>';

/* ---------- الإدارة ---------- */
const REPORT_ROWS = [['٣/أ', 91, 14.2], ['٢/ب', 88, 12.8], ['٢/أ', 84, 11.5], ['١/ج', 79, 9.1], ['١/أ', 73, 8.4]];
function adminHome() {
  return `
    <section class="stats">
      <div class="stat"><small>طلاب المدرسة</small><strong>${ar(312)}</strong></div>
      <div class="stat"><small>إنجاز الواجبات</small><strong>${ar(Math.round(REPORT_ROWS.reduce((a, r) => a + r[1], 0) / REPORT_ROWS.length))}٪</strong></div>
      <div class="stat"><small>ساعات تركيز هالأسبوع</small><strong>${ar(1240)}</strong></div>
      <div class="stat"><small>منشورات المجتمع</small><strong>${ar(db.get('posts', []).length + 140)}</strong></div>
    </section>
    <section class="more-grid">${NAV.admin.side.filter(([id]) => id !== 'home').map(([id, title, ic]) => `<a class="more-item" href="#${id}" data-route="${id}">${icon(ic)}<span>${title}</span></a>`).join('')}</section>
    <section class="card">${sectionHead('آخر الأخبار', `<a class="link" href="#a-news" data-route="a-news">إدارة</a>`)}${newsList(db.get('news', []).slice(0, 3))}</section>
    <div class="actions actions--center">${themeBtn()}<button type="button" class="btn btn--ghost switch-btn" data-switch>${icon('back')} تبديل الحساب</button></div>`;
}
function pageAdminNews() {
  return `
    <form class="card sheet__form" data-news-form>
      ${sectionHead('أضف خبر أو مسابقة أو إعلان')}
      <div class="field"><span>النوع</span>${chipGroupSimple('n-kind', [['خبر', 'خبر'], ['مسابقة', 'مسابقة'], ['إعلان', 'إعلان']], 'مسابقة')}</div>
      <label class="field"><span>العنوان</span><input type="text" id="n-title" class="input" maxlength="80" required /></label>
      <label class="field"><span>التفاصيل</span><textarea id="n-body" class="input" rows="2" maxlength="400"></textarea></label>
      <label class="field"><span>آخر موعد (اختياري)</span><input type="date" id="n-deadline" class="input" min="${todayISO()}" /></label>
      <button type="submit" class="btn btn--coral">انشر</button>
    </form>
    <section class="block">${sectionHead('المنشور')}${newsList(db.get('news', []))}</section>`;
}
function pageAdminPrizes() {
  const prizes = db.get('prizes', ['', '', '']);
  return `
    <form class="card sheet__form" data-prizes-form>
      ${sectionHead('جوائز الأوائل في المنافسة')}
      ${[0, 1, 2].map((k) => `<label class="field"><span>${['🥇 المركز الأول', '🥈 المركز الثاني', '🥉 المركز الثالث'][k]}</span><input type="text" class="input" id="p-${k}" maxlength="80" value="${esc(prizes[k] || '')}" /></label>`).join('')}
      <p class="field__hint">تطلع للطلاب في المنافسة والمحفزات. لازم تكون متوافقة مع تعليمات وزارة التعليم: شهادات تقدير، قسائم شرائية، هدايا، أو مبالغ مالية. ممنوع جوائز فيها غياب أو خروج مبكر أو إعفاء أو درجات إضافية.</p>
      <button type="submit" class="btn btn--coral">احفظ</button>
    </form>
    <section class="card">${sectionHead('الأوائل هالأسبوع (المدرسة)')}<ol class="leaders">${boardRows('school').slice(0, 3).map(boardRow).join('')}</ol></section>`;
}
function pageAdminReports() {
  const rows = REPORT_ROWS;
  return `
    <section class="card">${sectionHead('الفصول', '<span class="count">بيانات تجريبية</span>')}
      <ul class="report">${rows.map(([c, hw, h]) => `<li><b>${c}</b><div class="gap__bar"><span class="gap__now" style="width:${hw}%"></span></div><span>${ar(hw)}٪ واجبات</span><span>${ar(String(h).replace('.', '٫'))} س تركيز/طالب</span></li>`).join('')}</ul>
    </section>
    <section class="card">${sectionHead('المواد اللي تحتاج دعم')}
      <ul class="fb-list"><li><strong>فيزياء</strong><p>٣٨٪ من طلاب ثاني ثانوي مستواهم «يحتاج دعم».</p></li><li><strong>إنجليزي</strong><p>٢٢٪ من طلاب أول ثانوي مستواهم «يحتاج دعم».</p></li></ul>
      <button type="button" class="btn btn--ghost" data-ask-report>${icon('spark')} اقترح خطة تحسين بالذكاء الاصطناعي</button>
    </section>`;
}

/* =========================================================
   المساعد حسب الدور + إجراءات يضيفها للتطبيق
   ========================================================= */
const ACTION_RULES = {
  student: `- لو طلب يضيف شي لجدوله أو اختبار، أضف في آخر ردك سطر بالشكل: [[إجراء]]{"type":"task","title":"","day":0,"start":"17:00","minutes":45,"repeat":false}[[/إجراء]] أو [[إجراء]]{"type":"exam","subject":"","date":"YYYY-MM-DD","note":""}[[/إجراء]] (day: 0 الأحد ... 6 السبت).`,
  teacher: `- لو طلب يضيف واجب أو اختبار أو مصدر لطلابه، أضف في آخر ردك سطر بالشكل: [[إجراء]]{"type":"homework","kind":"واجب","title":"","due":"YYYY-MM-DD"}[[/إجراء]] أو [[إجراء]]{"type":"resource","title":"","kind":"رابط","url":""}[[/إجراء]].
- لو طلب ميزة مو موجودة في التطبيق، سوّها له بنفسك قدر الإمكان (مثلاً جدول، أسئلة، خطة درس، رسالة لأولياء الأمور) واقترح كيف تنضاف لوشيجة.`,
  admin: `- لو طلب ينشر خبر أو مسابقة أو إعلان، أضف في آخر ردك سطر بالشكل: [[إجراء]]{"type":"news","kind":"مسابقة","title":"","body":"","deadline":"YYYY-MM-DD"}[[/إجراء]].`,
  parent: '',
};
function roleRules() {
  const r = role() || 'student';
  const today = `تاريخ اليوم ${todayISO()} (${DAYS[new Date().getDay()]}).`;
  if (r === 'student') return aiRules() + '\n' + ACTION_RULES.student + '\n' + today;
  const who = r === 'teacher' ? `معلم ${profile.subject} اسمه ${profile.name} في مدرسة ثانوية سعودية`
    : r === 'admin' ? `${profile.position || 'مدير المدرسة'} اسمه ${profile.name} في مدرسة ثانوية سعودية`
      : `ولي أمر اسمه ${profile.name}، وولده ${profile.child || 'عبدالله'} في ${myClassName()}. مستوى ولده: ${JSON.stringify(db.get('levels', {}))}. لا تعطيه تفاصيل خطة ولده المستقبلية لأنها خاصة.`;
  return `أنت «وشيجة»، مساعد ذكي داخل منصة مدرسية سعودية. تكلّم بعربي بسيط وودود، وخل الرد قصير وواضح بسطور قصيرة، واستخدم **للعريض** و- للقوائم، وبدون جداول.
المستخدم: ${who}.
${ACTION_RULES[r]}
${today}`;
}
function parseActions(text) {
  const acts = [];
  const clean = String(text || '').replace(/\[\[إجراء\]\]([\s\S]*?)\[\[\/إجراء\]\]/g, (_, j) => { try { acts.push(JSON.parse(j)); } catch { /* نتجاهل */ } return ''; });
  return { clean: clean.trim(), acts };
}
const ROLE_ACTIONS = { student: ['task', 'exam'], teacher: ['homework', 'resource'], admin: ['news'], parent: [] };
const allowedAction = (x) => x && (ROLE_ACTIONS[role()] || []).includes(x.type);
const safeDate = (d) => (okDate(d) ? fmtDate(d) : '');
const actionLabel = (x) => ({
  task: `أضف «${x.title}» لجدولك (${DAYS[x.day] || ''} ${x.start ? fmtTime(toMin(x.start)) : ''})`, exam: `أضف اختبار ${x.subject} (${safeDate(x.date)})`,
  homework: `أضف ${x.kind || 'واجب'}: «${x.title}» (${safeDate(x.due)})`, resource: `أضف المصدر «${x.title}»`, news: `انشر ${x.kind || 'خبر'}: «${x.title}»`,
}[x.type] || 'نفّذ');
function applyAction(x) {
  const r = role();
  if (x.type === 'task' && r === 'student' && str(x.title)) {
    const list = db.get('tasks', []);
    list.push({ id: uid(), title: str(x.title, 80), day: clamp(Number(x.day) || 0, 0, 6), start: toMin(x.start || '17:00'), minutes: clamp(Number(x.minutes) || 45, 10, 240), repeat: !!x.repeat, date: isoDate(weekDates()[clamp(Number(x.day) || 0, 0, 6)]), type: 'study' });
    db.set('tasks', list); return 'انضافت لجدولك ✓';
  }
  if (x.type === 'exam' && r === 'student' && okDate(x.date) && x.date >= todayISO() && str(x.subject)) {
    const list = db.get('exams', []); list.push({ id: uid(), subject: str(x.subject, 40), date: x.date, note: str(x.note, 80) }); db.set('exams', list); return 'انضاف الاختبار كتذكير ✓';
  }
  if (x.type === 'homework' && r === 'teacher' && okDate(x.due) && x.due >= todayISO() && str(x.title)) {
    const list = db.get('schoolTasks', []); list.push({ id: uid(), title: str(x.title, 90), subject: profile.subject, kind: x.kind === 'اختبار' ? 'اختبار' : 'واجب', due: x.due, by: myTeacherId() }); db.set('schoolTasks', list); return 'انضاف وطلع للطلاب ✓';
  }
  if (x.type === 'resource' && r === 'teacher' && str(x.title)) {
    const list = db.get('resources', []); list.unshift({ id: uid(), title: str(x.title, 80), subject: profile.subject, kind: ['ملف', 'رابط', 'فيديو'].includes(x.kind) ? x.kind : 'رابط', url: /^https?:\/\//.test(x.url || '') ? x.url : '', by: myTeacherId(), at: todayISO() }); db.set('resources', list); return 'انضاف المصدر ✓';
  }
  if (x.type === 'news' && r === 'admin' && str(x.title)) {
    const list = db.get('news', []); list.unshift({ id: uid(), kind: ['خبر', 'مسابقة', 'إعلان'].includes(x.kind) ? x.kind : 'خبر', title: str(x.title, 80), body: str(x.body, 400), deadline: okDate(x.deadline) ? x.deadline : '', at: todayISO() }); db.set('news', list); return 'انتشر ✓';
  }
  return null;
}


/* ---------- اختصارات المساعد حسب الدور ---------- */
function quickFor() {
  const r = role() || 'student';
  if (r === 'teacher') return [
    { label: 'سوّ أسئلة', fill: `سوّ لي ١٠ أسئلة اختيار من متعدد في ${profile.subject} عن درس: ` },
    { label: 'خطة درس', fill: 'سوّ لي خطة درس ٤٥ دقيقة عن: ' },
    { label: 'أضف واجب', fill: 'أضف واجب لطلابي: ' },
    { label: 'رسالة لأولياء الأمور', fill: 'اكتب رسالة قصيرة لأولياء الأمور عن: ' },
    { label: 'ميزة جديدة', fill: 'أبي ميزة مو موجودة في وشيجة: ' },
  ];
  if (r === 'admin') return [
    { label: 'انشر مسابقة', fill: 'انشر مسابقة: ' },
    { label: 'إعلان', fill: 'اكتب إعلان للطلاب عن: ' },
    { label: 'خطة تحسين', fill: 'اقترح خطة لتحسين مستوى الطلاب في: ' },
  ];
  if (r === 'parent') return [
    { label: 'كيف أساعد ولدي؟', send: 'ولدي يحتاج دعم في بعض المواد، كيف أساعده في البيت؟' },
    { label: 'وش المسابقات؟', send: 'وش المسابقات والأنشطة اللي تفيد ولدي؟' },
  ];
  return [...QUICK, { label: 'أضف لجدولي', fill: 'أضف لجدولي: ' }];
}
function aiWelcome() {
  const r = role() || 'student';
  if (r === 'teacher') return 'أقدر أسوي لك أسئلة وخطط دروس، أضيف واجبات ومصادر لطلابك، وأي شي ثاني تحتاجه حتى لو مو موجود في التطبيق.';
  if (r === 'admin') return 'أقدر أكتب الإعلانات، أنشر المسابقات، وأقترح خطط تحسين للمدرسة.';
  if (r === 'parent') return 'أقدر أساعدك تعرف كيف تدعم ولدك في دراسته.';
  return 'أقدر أحل لك أي سؤال خطوة بخطوة، أصحح إجابتك، أشرح لك درس، أضيف مهام لجدولك، أو أقولك وش تذاكر اليوم.';
}

/* =========================================================
   الأحداث
   ========================================================= */
document.addEventListener('click', (e) => {
  const t = e.target;
  // الدخول
  const pr = t.closest('[data-pick-role]');
  if (pr) { welcomeRole = pr.dataset.pickRole || null; renderWelcome(); return; }
  const simple = t.closest('[data-simple] .chip-opt');
  if (simple) { $$('.chip-opt', simple.parentElement).forEach((c) => c.classList.toggle('is-on', c === simple)); return; }
  if (t.closest('[data-switch]')) { profile = null; db.set('profile', null); welcomeRole = null; closeSheet(); renderWelcome(); return; }

  if (t.closest('[data-theme-toggle]')) { toggleTheme(); if (!profile) renderWelcome(); return; }
  // النوافذ
  if (t.closest('[data-close-sheet]')) { closeSheet(); return; }
  const sb = t.closest('[data-submit]');
  if (sb) { let l = db.get('submitted', []); l = l.includes(sb.dataset.submit) ? l.filter((x) => x !== sb.dataset.submit) : [...l, sb.dataset.submit]; db.set('submitted', l); if (l.includes(sb.dataset.submit)) toast('أحسنت! +٢٠ نقطة ✓'); renderStudentHome(); return; }

  // الجدول
  const day = t.closest('[data-day]');
  if (day) { state.scheduleDay = Number(day.dataset.day); renderSchedule(); return; }
  const slot = t.closest('[data-slot]');
  if (slot) {
    const date = isoDate(weekDates()[state.scheduleDay]);
    const k = `${date}|${slot.dataset.slot}`;
    const b = dayBlocks(state.scheduleDay, date).find((x) => x.id === slot.dataset.slot);
    const a = state.answers;
    if (state.done[k]) {
      const rec = state.done[k];
      if (rec && rec.n && rec.k && a) { a[rec.k + 'Reached'] = Math.max(0, (a[rec.k + 'Reached'] || 0) - rec.n); store.set('answers', a); }
      delete state.done[k];
    } else {
      const rec = { t: b ? b.title : '', note: b ? b.note : '' };
      // جلسة دورة: نقدّم مكانك في الدورة بعدد دروسها
      if (b && b.course && b.lessons && a) {
        rec.k = b.course; rec.n = b.lessons;
        a[b.course + 'Started'] = true;
        a[b.course + 'Reached'] = Math.min(courseTotal(a, b.course), (a[b.course + 'Reached'] || 0) + b.lessons);
        store.set('answers', a);
      }
      state.done[k] = rec; bumpStreak(); toast(rec.n ? `أحسنت! خلّصت ${lessonsTxt(rec.n)} 💪 +١٠ نقاط` : 'أحسنت! +١٠ نقاط 💪');
    }
    store.set('done', state.done);
    renderSchedule();
    return;
  }
  const askSlot = t.closest('[data-ask-slot]');
  if (askSlot) {
    const b = dayBlocks(state.scheduleDay, isoDate(weekDates()[state.scheduleDay])).find((x) => x.id === askSlot.dataset.askSlot);
    if (b) askAbout(`ساعدني أخلص هذي الجلسة: «${b.title}»${b.note ? ` (${b.note})` : ''} ومدتها ${fmtDuration(b.minutes)}. قسّمها لي خطوات صغيرة بالدقايق، واعطني أول سؤال أبدأ فيه.`);
    return;
  }
  const add = t.closest('[data-add]');
  if (add) { add.dataset.add === 'exam' ? examSheet() : taskSheet(); return; }
  const ed = t.closest('[data-edit-slot]');
  if (ed) {
    const id = ed.dataset.editSlot;
    if (ed.dataset.src === 'mine') taskSheet(db.get('tasks', []).find((x) => x.id === id));
    else { const b = dayBlocks(state.scheduleDay, isoDate(weekDates()[state.scheduleDay])).find((x) => x.id === id); if (b) planSlotSheet(b); }
    return;
  }
  const ee = t.closest('[data-edit-exam]');
  if (ee) { examSheet(db.get('exams', []).find((x) => x.id === ee.dataset.editExam)); return; }
  const dt = t.closest('[data-del-task]');
  if (dt) { db.set('tasks', db.get('tasks', []).filter((x) => x.id !== dt.dataset.delTask)); closeSheet(); renderSchedule(); toast('انحذفت'); return; }
  const dx = t.closest('[data-del-exam]');
  if (dx) { db.set('exams', db.get('exams', []).filter((x) => x.id !== dx.dataset.delExam)); closeSheet(); renderSchedule(); toast('انحذف'); return; }
  if (t.closest('[data-sched-ai]')) { editScheduleAi(); return; }

  // المؤقت
  const pm = t.closest('[data-pick-min]');
  if (pm) { focusPick = Number(pm.dataset.pickMin); drawTimer(); return; }
  const stp = t.closest('[data-step]');
  if (stp) { focusPick = clamp(focusPick + Number(stp.dataset.step), 5, 180); drawTimer(); return; }
  if (t.closest('[data-focus-start]')) { startFocus(); return; }
  if (t.closest('[data-giveup]')) { giveUp(); return; }
  if (t.closest('[data-giveup-yes]')) { focus = null; db.set('focusRun', null); clearInterval(focusTick); closeSheet(); drawTimer(); toast('ذبلت الشجرة 🥀 جرّب مرة ثانية'); return; }

  // الأخبار
  const reg = t.closest('[data-register]');
  if (reg) { const l = db.get('registered', []); if (!l.includes(reg.dataset.register)) { l.push(reg.dataset.register); db.set('registered', l); toast('سجّلناك ✓'); } if (currentRoute() === 'news') renderPage('news'); else renderStudentHome(); return; }

  // المجتمع
  const g = t.closest('[data-group]');
  if (g) { communityGroup = g.dataset.group; renderPage('community'); return; }
  const pk = t.closest('[data-post-kind]');
  if (pk) { $$('[data-post-kind]').forEach((c) => c.classList.toggle('is-on', c === pk)); return; }
  const lk = t.closest('[data-like]');
  if (lk) { const posts = db.get('posts', []); const p = posts.find((x) => x.id === lk.dataset.like); if (p) { p.liked = !p.liked; p.likes += p.liked ? 1 : -1; db.set('posts', posts); renderPage('community'); } return; }

  // الرسائل
  const ot = t.closest('[data-open-thread]');
  if (ot) { state.thread = ot.dataset.openThread; renderPage('messages'); window.scrollTo({ top: 0 }); return; }
  if (t.closest('[data-thread-back]')) { state.thread = null; renderPage('messages'); return; }
  const nt = t.closest('[data-new-thread]');
  if (nt) {
    const pid = nt.dataset.newThread;
    const threads = db.get('threads', []);
    let th = threads.find((x) => !x.group && x.members && x.members.includes(pid) && x.members.includes(myId()));
    if (!th) { th = { id: `dm-${[myId(), pid].sort().join('-')}`, members: [myId(), pid], msgs: [] }; threads.unshift(th); db.set('threads', threads); }
    state.thread = th.id; renderPage('messages'); return;
  }

  // المعلم والإدارة (الحذف يحتاج ضغطتين)
  const delBtn = t.closest('[data-del-res],[data-del-hw],[data-del-news]');
  if (delBtn && !delBtn.dataset.armed) { delBtn.dataset.armed = '1'; delBtn.textContent = 'احذف؟'; delBtn.classList.add('is-armed'); setTimeout(() => { if (delBtn.isConnected) { delete delBtn.dataset.armed; delBtn.textContent = '×'; delBtn.classList.remove('is-armed'); } }, 3000); return; }
  if (t.closest('[data-del-res],[data-del-hw]') && role() !== 'teacher') return;
  if (t.closest('[data-del-news]') && role() !== 'admin') return;
  const dr = t.closest('[data-del-res]');
  if (dr) { db.set('resources', db.get('resources', []).filter((x) => x.id !== dr.dataset.delRes)); renderPage(currentRoute()); return; }
  const dh = t.closest('[data-del-hw]');
  if (dh) { db.set('schoolTasks', db.get('schoolTasks', []).filter((x) => x.id !== dh.dataset.delHw)); renderPage(currentRoute()); return; }
  const dn = t.closest('[data-del-news]');
  if (dn) { db.set('news', db.get('news', []).filter((x) => x.id !== dn.dataset.delNews)); renderPage(currentRoute()); return; }
  if (t.closest('[data-ask-fb]')) { const fb = db.get('feedback', []).filter((f) => f.to === myTeacherId()).map((f) => '- ' + f.text).join('\n'); askAbout(`لخّص لي اقتراحات طلابي هذي، وقل لي وش أبدأ أحسّن:\n${fb || 'ما فيه اقتراحات'}`); return; }
  if (t.closest('[data-ask-report]')) { askAbout('عندنا ٣٨٪ من طلاب ثاني ثانوي مستواهم «يحتاج دعم» في الفيزياء، و٢٢٪ من أول ثانوي في الإنجليزي. اقترح خطة تحسين عملية لمدة ٤ أسابيع للمدرسة.'); return; }

  // إجراءات المساعد
  const act = t.closest('[data-act]');
  if (act) {
    const turn = chat.turns[Number(act.dataset.act)];
    const x = parseActions(turn?.content).acts[Number(act.dataset.k)];
    const msg = allowedAction(x) ? applyAction(x) : null;
    if (!msg) { toast('ما قدرت أضيفه: تأكد إن التاريخ ما فات والبيانات كاملة'); return; }
    if (x) { toast(msg); turn.applied = [...(turn.applied || []), Number(act.dataset.k)]; db.set('chat:' + role(), chat.turns.filter((tt) => !tt.pending && !tt.error).slice(-30)); renderAi(); }
  }
});

const FORM_ROLES = {
  'data-task-form': ['student'], 'data-exam-form': ['student'], 'data-move-form': ['student'], 'data-fb-form': ['student'],
  'data-post-form': ['student', 'admin'], 'data-comment-form': ['student', 'admin'], 'data-hw-form': ['teacher'], 'data-res-form': ['teacher'],
  'data-news-form': ['admin'], 'data-prizes-form': ['admin'],
};
document.addEventListener('submit', async (e) => {
  const f = e.target;
  if (f.matches('[data-welcome-form]')) { enter(e); return; }
  for (const [attr, roles] of Object.entries(FORM_ROLES)) {
    if (f.hasAttribute(attr) && !roles.includes(role())) { e.preventDefault(); toast('هالإجراء مو متاح لحسابك'); return; }
  }
  if (f.matches('[data-task-form]')) {
    e.preventDefault();
    const list = db.get('tasks', []);
    const day = Number(simpleVal('s-day') ?? state.scheduleDay);
    const item = { id: f.dataset.taskForm || uid(), title: $('#s-title').value.trim(), day, start: Number($('#s-start').value), minutes: clamp(Number($('#s-min').value) || 45, 10, 240), repeat: $('#s-repeat').checked, date: isoDate(weekDates()[day]), type: 'study' };
    if (!item.title) { toast('اكتب المهمة'); return; }
    if (!item.repeat && item.date < todayISO()) { toast('هاليوم فات. اختر يوم جاي، أو خلها تتكرر كل أسبوع'); return; }
    const c = clashWith(day, item.date, item.start, item.minutes, item.id);
    if (c) { toast(`فيه «${c.title.slice(0, 30)}» بنفس الوقت، اختر وقت ثاني`); return; }
    const i = list.findIndex((x) => x.id === item.id);
    if (i >= 0) list[i] = item; else list.push(item);
    db.set('tasks', list); closeSheet(); state.scheduleDay = day; renderSchedule(); toast(i >= 0 ? 'انحفظت ✓' : 'انضافت لجدولك ✓');
    return;
  }
  if (f.matches('[data-exam-form]')) {
    e.preventDefault();
    const list = db.get('exams', []);
    const item = { id: f.dataset.examForm || uid(), subject: $('#e-subject').value.trim(), date: $('#e-date').value, note: $('#e-note').value.trim() };
    if (!item.subject || !item.date) { toast('اكتب المادة والتاريخ'); return; }
    if (item.date < todayISO()) { toast('التاريخ فات، اختر تاريخ جاي'); return; }
    const i = list.findIndex((x) => x.id === item.id);
    if (i >= 0) list[i] = item; else list.push(item);
    db.set('exams', list); closeSheet(); renderSchedule(); toast('انضاف كتذكير ✓');
    return;
  }
  if (f.matches('[data-move-form]')) {
    e.preventDefault();
    const reason = simpleVal('m-reason');
    if (!reason) { toast('قلّي ليش تبي تغيّرها'); return; }
    const id = f.dataset.moveForm;
    const fromDay = state.scheduleDay;
    const b = dayBlocks(fromDay, isoDate(weekDates()[fromDay])).find((x) => x.id === id);
    if (!b) { closeSheet(); return; }
    if (reason === 'خلصتها قبل') {
      state.done[`${isoDate(weekDates()[fromDay])}|${id}`] = { t: b.title, note: b.note }; store.set('done', state.done);
      closeSheet(); renderSchedule(); toast('ممتاز! علّمناها خلصانة ✓'); return;
    }
    const toDay = Number(simpleVal('s-day'));
    if (isNaN(toDay) || toDay < 0) { toast('اختر يوم التعويض'); return; }
    if (toDay < new Date().getDay()) { toast('هاليوم فات، اختر يوم جاي'); return; }
    const start = Number($('#s-start').value);
    const toDate = isoDate(weekDates()[toDay]);
    const c = clashWith(toDay, toDate, start, b.minutes, id);
    if (c) { toast(`فيه «${c.title.slice(0, 30)}» بنفس الوقت، اختر وقت ثاني`); return; }
    const all = db.get('moves', {});
    const list = (all[weekKey()] || []).filter((m) => m.id !== id);
    const origin = list.find((m) => m.id === id)?.from ?? (b.moved ? weekMoves().find((m) => m.id === id)?.from : fromDay);
    list.push({ id, from: origin ?? fromDay, to: toDay, start, note: `تعويض عن ${DAYS[origin ?? fromDay]} (${reason}${$('#m-other').value.trim() ? `: ${$('#m-other').value.trim()}` : ''})` });
    all[weekKey()] = list;
    db.set('moves', all);
    closeSheet(); state.scheduleDay = toDay; renderSchedule(); toast(`نقلناها ليوم ${DAYS[toDay]} ✓ (لهالأسبوع بس)`);
    return;
  }
  if (f.matches('[data-post-form]')) {
    e.preventDefault();
    const text = $('#post-text').value.trim();
    if (!text) { toast('اكتب شي قبل تنشر'); return; }
    const file = $('#post-file').files[0];
    let fileData = '';
    if (file) { if (file.size > 500 * 1024) { toast('الملف أكبر من ٥٠٠ كيلوبايت، حط رابط بداله'); return; } fileData = await new Promise((res) => { const rd = new FileReader(); rd.onload = () => res(rd.result); rd.onerror = () => res(''); rd.readAsDataURL(file); }); }
    const posts = db.get('posts', []);
    posts.push({ id: uid(), group: communityGroup, author: profile.name, role: me().role, kind: $('[data-post-kind].is-on')?.dataset.postKind || 'ملخص', text, link: /^https?:\/\//.test($('#post-link').value) ? $('#post-link').value : '', file: file ? file.name : '', fileData, likes: 0, liked: false, comments: [], at: Date.now(), mine: true });
    if (!db.set('posts', posts)) { toast('المساحة ممتلئة: جرّب بدون ملف'); return; }
    renderPage('community'); toast('انتشر ✓');
    return;
  }
  if (f.matches('[data-comment-form]')) {
    e.preventDefault();
    const input = f.querySelector('input'); const text = input.value.trim(); if (!text) return;
    const posts = db.get('posts', []); const p = posts.find((x) => x.id === f.dataset.commentForm);
    if (p) { p.comments.push({ who: profile.name, text }); db.set('posts', posts); renderPage('community'); }
    return;
  }
  if (f.matches('[data-msg-form]')) {
    e.preventDefault();
    const box = f.querySelector('textarea'); const text = box.value.trim(); if (!text) return;
    const threads = db.get('threads', []); const th = threads.find((x) => x.id === f.dataset.msgForm);
    if (th) { th.msgs.push({ from: myId(), text, at: Date.now() }); db.set('threads', threads); renderPage('messages'); }
    return;
  }
  if (f.matches('[data-res-form]')) {
    e.preventDefault();
    const file = $('#r-file').files[0];
    let fileData = '';
    if (file) { if (file.size > 500 * 1024) { toast('الملف أكبر من ٥٠٠ كيلوبايت، حط رابط بداله'); return; } fileData = await new Promise((res) => { const rd = new FileReader(); rd.onload = () => res(rd.result); rd.onerror = () => res(''); rd.readAsDataURL(file); }); }
    const url = $('#r-url').value.trim();
    if (!$('#r-title').value.trim()) { toast('اكتب عنوان المصدر'); return; }
    const list = db.get('resources', []);
    list.unshift({ id: uid(), title: $('#r-title').value.trim(), subject: profile.subject, kind: simpleVal('r-kind') || 'ملف', url: /^https?:\/\//.test(url) ? url : '', fileData, fileName: file ? file.name : '', by: myTeacherId(), at: todayISO() });
    if (!db.set('resources', list)) { toast('المساحة ممتلئة: ارفع ملف أصغر أو حط رابط بدل الملف'); return; }
    renderPage('t-resources'); toast('انضاف المصدر وطلع للطلاب ✓');
    return;
  }
  if (f.matches('[data-hw-form]')) {
    e.preventDefault();
    if (!$('#h-title').value.trim()) { toast('اكتب عنوان الواجب'); return; }
    if (!$('#h-due').value || $('#h-due').value < todayISO()) { toast('اختر موعد من اليوم وطالع'); return; }
    const list = db.get('schoolTasks', []);
    list.push({ id: uid(), title: $('#h-title').value.trim(), subject: profile.subject, kind: simpleVal('h-kind') || 'واجب', due: $('#h-due').value, by: myTeacherId() });
    db.set('schoolTasks', list); renderPage('t-tasks'); toast('انضاف وطلع للطلاب ✓');
    return;
  }
  if (f.matches('[data-fb-form]')) {
    e.preventDefault();
    const text = $('#f-text').value.trim(); if (!text) return;
    const list = db.get('feedback', []);
    list.unshift({ id: uid(), to: simpleVal('f-to') || 't1', text, anon: $('#f-anon').checked, from: profile.name, at: todayISO(), mine: true });
    db.set('feedback', list); renderPage('feedback'); toast('وصل اقتراحك للمعلم ✓');
    return;
  }
  if (f.matches('[data-news-form]')) {
    e.preventDefault();
    if (!$('#n-title').value.trim()) { toast('اكتب العنوان'); return; }
    const list = db.get('news', []);
    list.unshift({ id: uid(), kind: simpleVal('n-kind') || 'خبر', title: $('#n-title').value.trim(), body: $('#n-body').value.trim(), deadline: $('#n-deadline').value, at: todayISO() });
    db.set('news', list); renderPage('a-news'); toast('انتشر للطلاب وأولياء الأمور ✓');
    return;
  }
  if (f.matches('[data-prizes-form]')) {
    e.preventDefault();
    const list = [0, 1, 2].map((k) => $(`#p-${k}`).value.trim().slice(0, 80));
    if (!list.some(Boolean)) { toast('اكتب جائزة وحدة على الأقل'); return; }
    if (list.some((x) => x && badPrize(x))) { toast('هالجائزة تخالف تعليمات الوزارة. اختر شهادة أو قسيمة أو هدية أو مبلغ'); return; }
    db.set('prizes', list); toast('انحفظت الجوائز ✓');
  }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.matches('[data-set-level]') && role() === 'teacher') {
    const v = t.value === '—' ? undefined : t.value;
    if (t.dataset.setLevel === 'me-student') { const l = db.get('levels', {}); l[profile.subject] = v; db.set('levels', l); }
    else { const l = db.get('classLevels', {}); l[`${profile.subject}:${t.dataset.setLevel}`] = v; db.set('classLevels', l); }
    toast('انحفظ المستوى ✓');
  }
  if (t.matches('#post-file')) { const n = $('[data-post-file-name]'); if (n) n.textContent = t.files[0] ? `📎 ${t.files[0].name}` : ''; }
});

/* =========================================================
   البداية
   ========================================================= */
if (state.plan && (!Array.isArray(state.plan.week) || state.plan.week.length !== 7 || !state.answers)) { state.plan = null; }
if (profile) { seed(); migrate(); }
chat.turns = db.get('chat:' + (role() || 'student'), chat.turns);
renderChrome();
if (focus) { if (Date.now() >= focus.endAt) finishFocus(); else runFocusTick(); }
show();
