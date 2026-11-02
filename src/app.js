// وشيجة — كود التطبيق
// ملاحظة: هذا الملف يُدمج داخل index.html عن طريق build.py

/* =========================================================
   أدوات عامة
   ========================================================= */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const ar = (v) => String(v).replace(/(\d)\.(\d)/g, '$1٫$2').replace(/\d/g, (d) => AR_DIGITS[d]);
// العدد مع المعدود بالعربي الصحيح
const countTxt = (n, one, two, few, many) => (n === 1 ? one : n === 2 ? two : n >= 3 && n <= 10 ? `${ar(n)} ${few}` : `${ar(n)} ${many}`);
const daysTxt = (n) => (n === 0 ? 'اليوم' : countTxt(n, 'يوم واحد', 'يومين', 'أيام', 'يوم'));
const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// المعادلات والنصوص الإنجليزية تنعرض من اليسار لليمين داخل النص العربي
const MATH_RUN = /[A-Za-z0-9\u00B2\u00B3\u221A\u03C0(][A-Za-z0-9\u00B2\u00B3\u221A\u03C0+\-/^=().,×÷± ]*[A-Za-z0-9\u00B2\u00B3)]|[A-Za-z0-9]/g;
const bidi = (escaped) => String(escaped).replace(MATH_RUN, (m) => (/[+\-/^=×÷±²³√]|\d[a-z]|[a-z]\d/i.test(m) ? `<bdi class="math" dir="ltr">${m}</bdi>` : m));

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem('washijah:' + k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem('washijah:' + k, JSON.stringify(v)); return true; } catch { return false; /* التخزين ممتلئ أو غير متاح */ } },
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
  const ms = m === 1 ? 'دقيقة' : m === 2 ? 'دقيقتين' : m <= 10 ? `${ar(m)} دقائق` : `${ar(m)} دقيقة`;
  if (!m) return hs;
  return hs ? `${hs} و${ms}` : ms;
};
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const hhmm = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
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
  board: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  send: '<path d="M20 12 4 4l3 8-3 8z"/><path d="M7 12h13"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  ask: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.more}</svg>`;

// الخانات — اللي عندها route تفتح صفحتها، والباقي "قريباً"
const MODULES = [
  { id: 'ai', title: 'المساعد الذكي', desc: 'يحل أسئلتك ويصحّح إجاباتك خطوة بخطوة', tone: 'coral', badge: 'AI', route: true },
  { id: 'schedule', title: 'جدولي', desc: 'جدول مذاكرة مبني على أهدافك', tone: 'maroon', route: true },
  { id: 'level', title: 'مستواي ودرجاتي', desc: 'مستواك ودرجاتك في كل مادة', tone: 'pink' },
  { id: 'resources', title: 'المصادر', desc: 'ملفات وروابط ينزّلها معلموك', tone: 'beige' },
  { id: 'community', title: 'المجتمع', desc: 'شارك محتوى وفيديوهات مع زملائك', tone: 'beige' },
  { id: 'messages', title: 'الرسائل', desc: 'زملاؤك ومعلموك والإدارة', tone: 'beige' },
  { id: 'feedback', title: 'اقتراحات للمعلمين', desc: 'رسائل لتطوير الشرح والحصص', tone: 'pink' },
  { id: 'board', title: 'المنافسة', desc: 'ترتيبك في الفصل والمدرسة', tone: 'beige' },
  { id: 'rewards', title: 'المحفزات', desc: 'نقاط وشارات وإنجازات', tone: 'maroon' },
];
const ROUTES = ['home', 'plan', 'schedule', 'ai', 'board', 'community', 'messages', 'resources', 'grades', 'rewards', 'feedback', 'more', 't-tasks', 't-resources', 't-students', 't-feedback', 'a-news', 'a-reports', 'a-prizes', 'p-child'];
const SIDEBAR = [
  { id: 'home', title: 'الرئيسية' },
  { id: 'plan', title: 'خطتي المستقبلية' },
  { id: 'focus', title: 'ركّز' },
  { id: 'board', title: 'المنافسة' },
  ...MODULES.map(({ id, title }) => ({ id, title })),
];
const TABS = [
  { id: 'home', title: 'الرئيسية' },
  { id: 'plan', title: 'خطتي' },
  { id: 'ai', title: 'المساعد' },
  { id: 'schedule', title: 'جدولي' },
  { id: 'board', title: 'المنافسة' },
];
const navAttr = (id, title) => (ROUTES.includes(id) ? `data-route="${id}"` : id === 'focus' ? 'data-focus' : `data-soon="${title}"`);

/* =========================================================
   بيانات الخطة: التخصصات والجامعات
   ========================================================= */
const MAJORS = {
  medicine: { label: 'الطب والعلوم الصحية', subjects: ['أحياء', 'كيمياء'], target: { gpa: 97, qud: 85, tah: 88 }, passion: 'قراءة علمية: مقال طبي واحد ولخّصه بنقاط' },
  engineering: { label: 'الهندسة', subjects: ['رياضيات', 'فيزياء'], target: { gpa: 92, qud: 80, tah: 82 }, passion: 'مشروع هندسي: خطوة وحدة في مشروع روبوت أو تصميم' },
  cs: { label: 'علوم الحاسب والبرمجيات', subjects: ['رياضيات', 'حاسب'], target: { gpa: 92, qud: 82, tah: 80 }, passion: 'برمجة: درسين بايثون وتمرين واحد' },
  ai: { label: 'الذكاء الاصطناعي والبيانات', subjects: ['رياضيات', 'حاسب'], target: { gpa: 93, qud: 83, tah: 80 }, passion: 'ذكاء اصطناعي: درس من دورة وتمرين بيانات صغير' },
  business: { label: 'إدارة الأعمال والمالية', subjects: ['رياضيات', 'إنجليزي'], target: { gpa: 88, qud: 75, tah: 72 }, passion: 'ريادة أعمال: فصل من كتاب أو فكرة مشروع' },
  law: { label: 'القانون', subjects: ['لغتي', 'إنجليزي'], target: { gpa: 88, qud: 75, tah: 70 }, passion: 'قراءة: ٢٠ صفحة وتدرّب على مناظرة' },
  science: { label: 'العلوم (فيزياء، كيمياء، أحياء)', subjects: ['فيزياء', 'كيمياء'], target: { gpa: 88, qud: 75, tah: 78 }, passion: 'علوم: تجربة بسيطة أو أسئلة أولمبياد' },
  languages: { label: 'اللغات والترجمة', subjects: ['إنجليزي', 'لغتي'], target: { gpa: 85, qud: 72, tah: 68 }, passion: 'لغات: ٢٠ كلمة جديدة وقراءة قصة قصيرة' },
  design: { label: 'التصميم والعمارة', subjects: ['رياضيات', 'فيزياء'], target: { gpa: 88, qud: 75, tah: 72 }, passion: 'تصميم: اسكتش وحد لملف أعمالك' },
  education: { label: 'التعليم', subjects: ['لغتي', 'إنجليزي'], target: { gpa: 85, qud: 70, tah: 68 }, passion: 'تعليم: اشرح درس لزميل أو سجّله فيديو' },
  other: { label: 'تخصص ثاني', subjects: ['رياضيات', 'إنجليزي'], target: { gpa: 85, qud: 72, tah: 70 }, passion: 'هدفك: خطوة صغيرة تقربك من حلمك' },
};
// جامعات السعودية + أشهر جامعات العالم (والطالب يقدر يكتب أي جامعة ثانية)
const UNIVERSITIES_SA = ["جامعة الملك سعود", "جامعة الملك عبدالعزيز", "جامعة الملك فهد للبترول والمعادن", "جامعة الملك عبدالله للعلوم والتقنية (كاوست)", "جامعة الإمام عبدالرحمن بن فيصل", "جامعة الأميرة نورة بنت عبدالرحمن", "جامعة أم القرى", "جامعة القصيم", "جامعة الملك خالد", "جامعة طيبة", "جامعة الإمام محمد بن سعود الإسلامية", "جامعة الملك سعود بن عبدالعزيز للعلوم الصحية", "جامعة الملك فيصل", "جامعة الفيصل", "جامعة الأمير سلطان", "جامعة الأمير سطام بن عبدالعزيز", "جامعة جدة", "جامعة الطائف", "جامعة جازان", "جامعة تبوك", "جامعة حائل", "جامعة نجران", "جامعة الجوف", "جامعة الحدود الشمالية", "جامعة المجمعة", "جامعة شقراء", "جامعة الباحة", "جامعة بيشة", "جامعة حفر الباطن", "الجامعة الإسلامية بالمدينة المنورة", "الجامعة السعودية الإلكترونية", "جامعة عفت", "جامعة دار الحكمة", "جامعة اليمامة"];
const UNIVERSITIES_WORLD = ["Massachusetts Institute of Technology (MIT)", "Stanford University", "Harvard University", "University of Cambridge", "University of Oxford", "Imperial College London", "ETH Zurich", "University College London (UCL)", "California Institute of Technology (Caltech)", "University of Chicago", "Princeton University", "Yale University", "Columbia University", "University of Pennsylvania", "Cornell University", "Johns Hopkins University", "University of California, Berkeley", "University of California, Los Angeles (UCLA)", "University of Michigan", "New York University (NYU)", "Carnegie Mellon University", "Duke University", "Northwestern University", "Brown University", "Dartmouth College", "Rice University", "Vanderbilt University", "Washington University in St. Louis", "Georgia Institute of Technology", "University of Texas at Austin", "University of Washington", "University of Illinois Urbana-Champaign", "University of Wisconsin-Madison", "University of California, San Diego", "University of California, Davis", "University of California, Irvine", "University of California, Santa Barbara", "University of Southern California", "Boston University", "Purdue University", "Pennsylvania State University", "Ohio State University", "University of Minnesota", "University of North Carolina at Chapel Hill", "University of Virginia", "University of Florida", "University of Maryland", "Emory University", "Georgetown University", "Texas A&M University", "Arizona State University", "University of Rochester", "Case Western Reserve University", "Rensselaer Polytechnic Institute", "Northeastern University", "Tufts University", "University of Pittsburgh", "Michigan State University", "Virginia Tech", "University of Colorado Boulder", "Colorado School of Mines", "Rutgers University", "University of Toronto", "McGill University", "University of British Columbia", "University of Waterloo", "University of Alberta", "McMaster University", "Université de Montréal", "Queen's University", "Western University", "King's College London", "London School of Economics (LSE)", "University of Edinburgh", "University of Manchester", "University of Bristol", "University of Warwick", "University of Glasgow", "Durham University", "University of Birmingham", "University of Leeds", "University of Sheffield", "University of Nottingham", "University of Southampton", "Queen Mary University of London", "Lancaster University", "University of York", "University of St Andrews", "University of Exeter", "Newcastle University", "Cardiff University", "University of Bath", "Loughborough University", "EPFL", "University of Zurich", "Technical University of Munich (TUM)", "LMU Munich", "Heidelberg University", "Humboldt University of Berlin", "Free University of Berlin", "Technical University of Berlin", "RWTH Aachen University", "Karlsruhe Institute of Technology (KIT)", "University of Freiburg", "University of Tübingen", "University of Göttingen", "University of Bonn", "University of Hamburg", "Sorbonne University", "PSL University", "Institut Polytechnique de Paris", "Université Paris-Saclay", "Sciences Po", "KU Leuven", "Ghent University", "University of Amsterdam", "Delft University of Technology", "Leiden University", "Utrecht University", "Erasmus University Rotterdam", "Eindhoven University of Technology", "Wageningen University", "University of Groningen", "University of Copenhagen", "Technical University of Denmark (DTU)", "Aarhus University", "Lund University", "KTH Royal Institute of Technology", "Karolinska Institutet", "Uppsala University", "Stockholm University", "Chalmers University of Technology", "University of Oslo", "University of Helsinki", "Aalto University", "Trinity College Dublin", "University College Dublin", "University of Vienna", "TU Wien", "Politecnico di Milano", "University of Bologna", "Sapienza University of Rome", "University of Padua", "University of Barcelona", "Autonomous University of Madrid", "Complutense University of Madrid", "University of Lisbon", "University of Porto", "Charles University", "University of Warsaw", "Khalifa University", "United Arab Emirates University", "American University of Sharjah", "New York University Abu Dhabi", "Mohamed bin Zayed University of Artificial Intelligence (MBZUAI)", "American University of Beirut", "Qatar University", "Hamad Bin Khalifa University", "Sultan Qaboos University", "Kuwait University", "University of Bahrain", "University of Jordan", "Cairo University", "American University in Cairo", "Middle East Technical University", "Boğaziçi University", "Koç University", "Sabancı University", "University of Tokyo", "Kyoto University", "Osaka University", "Tohoku University", "Institute of Science Tokyo", "Tsinghua University", "Peking University", "Fudan University", "Shanghai Jiao Tong University", "Zhejiang University", "University of Science and Technology of China", "Nanjing University", "National University of Singapore (NUS)", "Nanyang Technological University (NTU)", "University of Hong Kong", "Hong Kong University of Science and Technology", "Chinese University of Hong Kong", "City University of Hong Kong", "Hong Kong Polytechnic University", "Seoul National University", "KAIST", "Yonsei University", "Korea University", "POSTECH", "Sungkyunkwan University", "National Taiwan University", "IIT Bombay", "IIT Delhi", "IIT Madras", "Indian Institute of Science", "University of Malaya", "Universiti Teknologi Malaysia", "Chulalongkorn University", "University of Melbourne", "University of Sydney", "UNSW Sydney", "Australian National University", "Monash University", "University of Queensland", "University of Western Australia", "University of Adelaide", "University of Technology Sydney", "University of Auckland", "University of Buenos Aires", "University of São Paulo", "National Autonomous University of Mexico (UNAM)", "Pontifical Catholic University of Chile", "Tecnológico de Monterrey", "University of Cape Town", "University of the Witwatersrand"];
const UNIVERSITIES = [...UNIVERSITIES_SA, ...UNIVERSITIES_WORLD, 'ما قررت للحين'];
// مصادر المذاكرة — الطالب يختار، أو يكتب مصدره
const QUD_SOURCES = ['المفكر', 'المعاصر', 'المنصف', 'يلو', 'أ. إياد', 'أ. إيهاب', 'نون أكاديمي', 'عين', 'أخرى'];
const SCHOOL_SOURCES = ['كتاب المدرسة', 'عين', 'مدرستي', 'نون أكاديمي', 'يوتيوب', 'أخرى'];
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
  const days = Math.max(0, Math.round((new Date(isoDate(end)) - new Date(isoDate(now))) / 864e5));
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
  const qp = coursePlan(a, 'qud');
  const tp = a.grade >= 2 ? coursePlan(a, 'tah') : null;
  const qudDate = qp ? new Date(qp.exam) : at(0.65);
  const tahDate = tp ? new Date(tp.exam) : at(0.8);

  let phases = [
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

  // لو حدد موعد اختبار القدرات، نبني المراحل حوله
  if (qp && qudDate < at(0.85)) {
    const finish = new Date(qp.finish);
    const afterQ = new Date(Math.max(qudDate.getTime() + 864e5, now.getTime() + 2 * 864e5));
    const tEnd = tahDate > afterQ ? tahDate : at(0.9) > afterQ ? at(0.9) : new Date(afterQ.getTime() + 864e5);
    phases = [
      { title: `دورة القدرات (${qp.source})`, from: now, to: finish > now ? finish : new Date(now.getTime() + 864e5),
        goals: [`خلّص ${lessonsTxt(qp.remaining)} الباقية: ${lessonsTxt(qp.perDay)} بكل يوم مذاكرة`, `قوِّ أساسك في ${focus.slice(0, 2).join(' و')}`, 'خلّص واجباتك أول بأول وبدون تأجيل'] },
      { title: 'مراجعة القدرات', from: finish > now ? finish : now, to: qudDate,
        goals: [`نماذج واختبارات تجريبية لين ${fmtDate(qudDate)}`, `هدفك في القدرات ${ar(a.qudTarget)}٪`, 'راجع كل سؤال غلطت فيه'] },
      { title: a.grade >= 2 ? 'التحصيلي والمعدل' : 'المعدل والتأسيس للتحصيلي', from: afterQ, to: tEnd,
        goals: [a.grade >= 2 ? `هدفك في التحصيلي ${ar(a.tahTarget)}٪` : `ابدأ تأسيس ${major.subjects.join(' و')} للتحصيلي`, phases[1].goals[0], `ركّز على ${major.subjects.join(' و')}`] },
      { title: 'التجهيز للقبول', from: tEnd, to: end, goals: phases[3].goals },
    ];
  }
  const mock = new Date(Math.min(now.getTime() + 21 * 864e5, Math.max(now.getTime() + 864e5, qudDate.getTime() - 7 * 864e5)));
  const milestones = [
    { title: 'أول أسبوع على جدولك الجديد', date: new Date(now.getTime() + 7 * 864e5) },
    { title: a.grade >= 2 ? 'أول اختبار قدرات تجريبي' : 'أول نموذج قدرات تجريبي', date: mock },
    { title: `اختبار القدرات${qp && qp.examGiven ? '' : ' (موعد تقريبي)'}`, date: qudDate },
    { title: `اختبار التحصيلي${tp && tp.examGiven ? '' : ' (موعد تقريبي)'}`, date: tahDate },
    { title: `التقديم على ${uni}`, date: end },
  ].sort((x, y) => x.date - y.date);

  const tips = [];
  if (a.seriousness <= 2) tips.push(`بما إنك للحين تستكشف، جرّب يوم مفتوح أو كلّم طالب يدرس ${major.label} قبل ما تقرر نهائياً.`);
  else tips.push(`حماسك لتخصص ${major.label} واضح، خلّه يكون سبب تذكّره كل ما تعبت.`);
  if (weak.length) tips.push(`ابدأ يومك بالمادة الأصعب (${weak[0]}) وأنت مرتاح، وخلّ السهلة للآخر.`);
  tips.push('استخدم مؤقت «ركّز» لكل جلسة، ٤٥ دقيقة مذاكرة و١٥ راحة.');
  if (!programs.length) tips.push('البرامج والتدريبات تقوّي ملفك، سجّل في واحد على الأقل هذا الفصل.');

  return {
    source: 'local',
    summary: `خطتك توصلك لتخصص ${major.label} في ${uni}، وباقي ${daysTxt(days)} لين تتخرج. قسّمناها لأربع مراحل، وجدولك الأسبوعي يركز على ${focus.slice(0, 3).join(' و')}${a.grade >= 2 ? ' مع تدريب القدرات' : ''}.`,
    phases: phases.map((p) => ({ ...p, from: isoDate(p.from), to: isoDate(p.to) })),
    milestones: milestones.map((m) => ({ ...m, date: isoDate(m.date) })),
    week: localWeek(a, focus, major),
    tips,
  };
}

// المصادر اللي اختارها الطالب
const sourceOf = (a, kind) => {
  const v = a[kind + 'Source'];
  if (v === 'أخرى') return (a[kind + 'SourceOther'] || '').trim() || (kind === 'school' ? 'كتاب المدرسة' : '');
  return v || (kind === 'school' ? 'كتاب المدرسة' : '');
};

// واجبات المدرسة (نفس مهام «اليوم» في الرئيسية) — لاحقاً تجي من المعلم
function localWeek(a, focus, major) {
  const start = toMin(a.startTime || '16:00');
  const qud = sourceOf(a, 'qud');
  const tah = sourceOf(a, 'tah');
  const school = sourceOf(a, 'school');
  const programs = a.programs.filter((p) => p !== 'ما عندي للحين');
  let rot = 0, part = 0;
  const next = () => focus[rot++ % focus.length];
  const qudTask = (min) => {
    const lessons = Math.max(2, Math.round(min / 7));
    const kind = part++ % 2 === 0 ? 'كمي' : 'لفظي';
    return { title: `قدرات: ${qud ? `خلّص ${lessonsTxt(lessons)} ${kind} في ${qud}` : `حل ${ar(Math.round(min / 2))} سؤال ${kind}`}`, note: 'وقف كل شوي وراجع أخطاءك', minutes: min, type: 'exam' };
  };
  const tahTask = (min) => {
    const subj = major.subjects[part++ % major.subjects.length];
    return { title: `تحصيلي: حل ${ar(Math.round(min / 2))} سؤال ${subj}${tah ? ` من ${tah}` : ''}`, note: 'علّم الأسئلة اللي غلطت فيها وارجع لها', minutes: min, type: 'exam' };
  };
  const studyTask = (min, weakFirst) => {
    const subj = next();
    const weak = a.weak.includes(subj);
    return {
      title: weak || weakFirst ? `تأسيس ${subj}: ذاكر درس وحل ${ar(Math.round(min / 5))} أسئلة من ${school}` : `${subj}: حضّر الدرس الجاي وحل ${ar(Math.round(min / 5))} أسئلة من ${school}`,
      minutes: min, type: 'study',
    };
  };
  const passionTask = (min, k) => programs[k % (programs.length || 1)] && programs.length
    ? { title: `${programs[k % programs.length]}: كمّل مهام هالأسبوع`, minutes: min, type: 'passion' }
    : { title: major.passion, minutes: min, type: 'passion' };
  const homework = (d) => {
    const all = getSchoolTasks().filter((x) => x.when != null);
    // الواجب في يوم تسليمه أو قبله، والاختبار نذاكر له اليوم اللي قبله
    const due = all.filter((x) => (x.kind === 'اختبار' ? Math.max(0, x.when - 1) : x.when) === d);
    if (due.length) return due.map((t) => ({ title: t.kind === 'اختبار' ? `ذاكر لـ${t.title}` : t.title, note: `${t.kind === 'اختبار' ? 'الاختبار' : 'التسليم'} يوم ${DAYS[t.when]}`, minutes: 45, type: 'homework' }));
    return [{ title: `واجبات المدرسة: حل أسئلة درس اليوم في ${next()} من ${school}`, minutes: 45, type: 'homework' }];
  };
  const exam = (min, d) => courseTask(a, d, min) || (a.grade === 3 && part % 3 === 2 ? tahTask(min) : qudTask(min));

  const week = [];
  for (let d = 0; d < 7; d++) {
    const weekend = d === 5 || d === 6;
    const budget = Math.round((weekend ? a.hoursWeekend : a.hoursWeekday) * 60);
    let items;
    if (d === 5) items = [
      passionTask(60, 0),
      { title: 'مراجعة خفيفة: اقرأ ملخصاتك وحل ١٠ أسئلة', minutes: 40, type: 'review' },
      exam(40, d),
    ];
    else if (d === 6) items = [
      { title: 'مراجعة الأسبوع: حل ١٠ أسئلة من كل مادة درستها', minutes: 60, type: 'review' },
      { title: a.grade === 3 ? `اختبار تحصيلي تجريبي${tah ? ` في ${tah}` : ''}` : `اختبار قدرات تجريبي${qud ? ` في ${qud}` : ''}`, note: 'بعده راجع كل سؤال غلطت فيه', minutes: 50, type: 'exam' },
      studyTask(45, true),
      passionTask(45, 1),
    ];
    else items = [
      ...homework(d),
      ...(hasCourse(a) ? [exam(40, d)] : a.grade >= 2 && d % 2 === 0 ? [exam(35, d)] : []),
      studyTask(45),
      studyTask(40),
      { title: 'مراجعة: لخّص دروس اليوم في ورقة وحدة', minutes: 20, type: 'review' },
    ];
    if (!studyDaysOf(a).includes(d)) items = weekend ? [] : homework(d);
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
// الذكاء الاصطناعي: داخل Claude نستخدم حساب المستخدم، وبرا Claude نستخدم سيرفر وشيجة (/api/ai)
let samplePromise = (async () => {
  try {
    if (window.claude && typeof window.claude.use === 'function') {
      const s = await window.claude.use('sample');
      if (s) return s;
    }
  } catch { /* نكمّل للسيرفر */ }
  return serverAi();
})();

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
    'يذاكر القدرات من': sourceOf(a, 'qud'),
    'خطة دورة القدرات': coursePlanText(a, 'qud'),
    'خطة دورة التحصيلي': coursePlanText(a, 'tah'),
    'أيام المذاكرة بالأسبوع': `${a.studyDays || 5} (${studyDaysOf(a).map((d) => DAYS[d]).join('، ')})`,
    'يذاكر التحصيلي من': sourceOf(a, 'tah'),
    'يذاكر مواد المدرسة من': sourceOf(a, 'school'),
    'واجبات واختبارات المدرسة هالأسبوع': getSchoolTasks().map((t) => `${t.title} (${t.note})`).join(' | '),
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
- كل جلسة لازم تكون مهمة محددة فيها رقم ومصدر، مثل: «قدرات: خلّص ٦ دروس كمي في المفكر» أو «فيزياء: حل ١٥ سؤال من الفصل الثالث من كتاب المدرسة». ممنوع عناوين عامة مثل «واجبات اليوم» أو «مذاكرة».
- استخدم المصادر اللي اختارها الطالب بالاسم، وحط واجبات المدرسة في الأيام المناسبة قبل موعدها.
- لو عنده خطة دورة (قدرات/تحصيلي)، وزّع دروسها بأرقام الدروس بالضبط حسب «خطة الدورة» (مثل «قدرات: خلّص الدروس ١٣–١٨ في المفكر»)، وخل الأيام اللي ما يذاكر فيها بدون دروس دورة.
- title قصير (أقل من ٧٠ حرف)، وnote اختياري لتوضيح أو نصيحة للجلسة (أقل من ١٢٠ حرف).
- أضف آخر كل يوم جلسة نوعها free بعنوان «وقت حر».
- المراحل من اليوم لين ${isoDate(timeline(a.grade).end)} ومتتالية بدون فجوات.
- كن صريح لو الأهداف صعبة مقارنة بمستواه الحالي، واقترح بديل.

رد بـ JSON فقط بهذا الشكل بالضبط:
{"summary":"فقرة قصيرة","phases":[{"title":"","from":"YYYY-MM-DD","to":"YYYY-MM-DD","goals":["","",""]}],"milestones":[{"title":"","date":"YYYY-MM-DD"}],"week":[{"day":0,"blocks":[{"start":"16:00","minutes":45,"title":"","note":"","type":"homework|study|exam|passion|review|free"}]}],"tips":["",""]}
- phases: من ٣ إلى ٥ مراحل. milestones: من ٣ إلى ٦. week: ٧ أيام. tips: من ٢ إلى ٤.

مثال على جدول مبدئي محسوب (حسّنه ولا تنسخه حرفياً):
${JSON.stringify(base.week.slice(0, 2).map((d) => ({ day: d.day, blocks: d.blocks.map((b) => ({ start: hhmm(b.start), minutes: b.minutes, title: b.title, type: b.type })) })))}`;
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
  if (Array.isArray(ai.week)) plan.week = parseWeek(ai.week, base.week);
  return plan;
}

// جدول من الذكاء الاصطناعي: نقبل الجلسات السليمة بس، واليوم الفاضي ياخذ الجدول القديم
function parseWeek(aiWeek, fallback) {
  const week = [];
  for (let d = 0; d < 7; d++) {
    const day = Array.isArray(aiWeek) ? aiWeek.find((w) => w && Number(w.day) === d) : null;
    const blocks = (day && Array.isArray(day.blocks) ? day.blocks : [])
      .filter((b) => b && str(b.title) && /^\d{1,2}:\d{2}$/.test(String(b.start)))
      .map((b) => {
        const out = { start: toMin(b.start), minutes: clamp(Math.round(Number(b.minutes) || 30), 10, 180), title: str(b.title, 80), type: TYPES.includes(b.type) ? b.type : 'study' };
        if (str(b.note)) out.note = str(b.note, 140);
        return out;
      })
      .sort((x, y) => x.start - y.start)
      .slice(0, 10);
    week.push({ day: d, blocks: blocks.length ? blocks : fallback[d].blocks });
  }
  return week;
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
  name: profile?.name || '', grade: profile?.grade || 2, dream: '', passion: '', seriousness: 4,
  major: '', majorOther: '', university: '',
  gpaNow: null, gpaTarget: null, qudNow: null, qudTarget: null, tahNow: null, tahTarget: null,
  weak: [], programs: [], programsNote: '',
  qudSource: '', qudSourceOther: '', qudStarted: false, qudReached: null, qudTotal: null, qudExam: '', tahStarted: false, tahReached: null, tahTotal: null, tahExam: '', studyDays: 5, tahSource: '', tahSourceOther: '', schoolSource: 'كتاب المدرسة', schoolSourceOther: '',
  hoursWeekday: 2.5, hoursWeekend: 4, startTime: '16:00',
});

/* =========================================================
   الترويسة والتنقل
   ========================================================= */
const HERO = {
  plan: ['خطتي المستقبلية', 'من اليوم لين توصل هدفك'],
  schedule: ['جدولي', 'نظّم وقتك بنفسك'],
  ai: ['المساعد الذكي', 'يحل ويصحّح ويشرح لك'],
  board: ['المنافسة', 'مين أكثر واحد ركّز هالأسبوع؟'],
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
    state.plan.week[d].blocks.forEach((b) => {
      if (b.type === 'free') return;
      total++;
      if (state.done[`${key}|${b.id}`]) done++;
    });
  }
  return total ? Math.round((done / total) * 100) : 0;
}

function renderHomePlan() {
  const el = $('[data-home-plan]');
  if (!state.plan || !state.answers) {
    el.innerHTML = `
      <div class="plan-card__body">
        <span class="chip chip--light">✦ خطتك الذكية</span>
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
        <span>باقي ${daysTxt(nextGoal(a).days)} على ${nextGoal(a).label}</span>
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
  { title: 'المصادر والبرامج', hint: 'من وين تذاكر، ووش تسوي برا المدرسة' },
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
      <input type="text" list="unis" data-field="university" value="${esc(a.university)}" placeholder="اكتب أي جامعة في العالم" maxlength="80" />
      <small class="field__hint">فيها جامعات السعودية وأشهر جامعات العالم، وتقدر تكتب أي جامعة ثانية</small>
      <datalist id="unis">${UNIVERSITIES.map((u) => `<option value="${u}"></option>`).join('')}</datalist>
    </label>`;
  if (i === 2) return `
    <p class="note">حطينا لك نسب مقترحة حسب تخصصك، عدّلها لو تعرف المطلوب بالضبط. لو ما اختبرت للحين خلّ «الحالي» فاضي.</p>
    ${pctField('معدل الثانوية', 'gpa', a, 'مثلاً ٨٨')}
    ${pctField('القدرات', 'qud', a, 'ما اختبرت')}
    ${pctField('التحصيلي', 'tah', a, 'ما اختبرت')}
    <div class="weighted" data-weighted></div>
    <div class="field"><span>مواد تحس إنك تحتاج تقويها (اختياري)</span>${chipGroup('weak', SUBJECTS, a.weak, true)}</div>`;
  if (i === 3) {
    const other = (kind) => a[kind + 'Source'] === 'أخرى'
      ? `<input type="text" data-field="${kind}SourceOther" value="${esc(a[kind + 'SourceOther'])}" placeholder="اكتب اسم المصدر أو المعلم" maxlength="40" />` : '';
    return `
    <div class="field"><span>تذاكر القدرات من وين؟</span>${chipGroup('qudSource', QUD_SOURCES, a.qudSource, false)}${other('qud')}</div>
    ${courseFields('qud', a)}
    ${a.grade >= 2 ? `<div class="field"><span>والتحصيلي؟</span>${chipGroup('tahSource', QUD_SOURCES, a.tahSource, false)}${other('tah')}</div>${courseFields('tah', a)}` : ''}
    <div class="field"><span>ومواد المدرسة؟</span>${chipGroup('schoolSource', SCHOOL_SOURCES, a.schoolSource, false)}${other('school')}</div>
    <div class="field"><span>عندك برامج أو تدريبات؟</span>${chipGroup('programs', PROGRAMS, a.programs, true)}</div>
    <label class="field"><span>تفاصيل (اختياري)</span><textarea data-field="programsNote" rows="2" maxlength="200" placeholder="مثلاً: دورة بايثون على منصة سطر، ومشارك في أولمبياد الرياضيات">${esc(a.programsNote)}</textarea></label>`;
  }
  return `
    <label class="field range"><span>أيام الدراسة (الأحد للخميس): <b data-out="hoursWeekday">${ar(a.hoursWeekday)} ساعة</b></span>
      <input type="range" min="1" max="6" step="0.5" data-field="hoursWeekday" value="${a.hoursWeekday}" /></label>
    <label class="field range"><span>الإجازة (الجمعة والسبت): <b data-out="hoursWeekend">${ar(a.hoursWeekend)} ساعة</b></span>
      <input type="range" min="1" max="8" step="0.5" data-field="hoursWeekend" value="${a.hoursWeekend}" /></label>
    <div class="field"><span>كم يوم بالأسبوع تبي تذاكر؟</span>
      ${chipGroup('studyDays', [3, 4, 5, 6, 7].map((n) => ({ value: n, label: `${ar(n)} أيام` })), a.studyDays || 5, false)}
    </div>
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
      <p>${esc(a.major === 'other' && a.majorOther ? a.majorOther : major.label)}${a.university && a.university !== 'ما قررت للحين' ? ` • ${esc(a.university)}` : ''} • تتخرج ${fmtMonth(timeline(a.grade).end)}</p>
      <div class="goal__stats">
        <div><strong>${daysTxt(nextGoal(a).days)}</strong><small>باقي على ${nextGoal(a).label}</small></div>
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

    ${coursesCard(a)}

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
/* =========================================================
   المنافسة: لوحة ترتيب (فصلي / مدرستي — منفصلة)
   ========================================================= */
const BOYS = ['فيصل', 'خالد', 'عبدالرحمن', 'محمد', 'سعود', 'تركي', 'نواف', 'عمر', 'يوسف', 'بدر', 'ماجد', 'راكان', 'سلطان', 'عبدالعزيز',
  'حمد', 'مشاري', 'زياد', 'فهد', 'ناصر', 'سلمان', 'إبراهيم', 'مازن', 'ريان', 'أحمد', 'علي', 'حسن', 'وليد', 'طلال', 'هشام', 'عادل',
  'مهند', 'ياسر', 'أنس', 'بندر', 'عمار', 'سامي', 'نايف', 'مساعد', 'لؤي', 'غازي', 'معاذ', 'صالح'];
const fmtHM = (min) => `${ar(Math.floor(min / 60))} س ${ar(min % 60)} د`;
let boardKind = 'class';

// بيانات تجريبية ثابتة للطلاب، وأنت تطلع بالترتيب حسب دقائق تركيزك الفعلية
function boardRows(kind) {
  let x = kind === 'class' ? 11 : 29;
  const rnd = () => (x = (x * 9301 + 49297) % 233280) / 233280;
  const count = kind === 'class' ? 23 : 39;
  const offset = kind === 'class' ? 0 : 5;
  let mins = kind === 'class' ? 540 : 820;
  const rows = [];
  for (let k = 0; k < count; k++) {
    mins -= Math.round(6 + rnd() * (kind === 'class' ? 28 : 22));
    rows.push({
      name: boardNames()[(k + offset) % boardNames().length],
      cls: kind === 'school' ? `${ar(1 + Math.floor(rnd() * 3))}/${['أ', 'ب', 'ج', 'د'][Math.floor(rnd() * 4)]}` : '',
      minutes: Math.max(20, mins),
      streak: 1 + Math.floor(rnd() * 12),
    });
  }
  const meMinutes = weekFocusMinutes();
  rows.push({ name: profile?.name || 'أنت', cls: kind === 'school' ? myClass() : '', minutes: meMinutes, streak: (db.get('streak', { days: 0 }) || {}).days || 0, me: true });
  rows.sort((a, b) => b.minutes - a.minutes);
  rows.forEach((r, k) => { r.rank = k + 1; r.trees = Math.floor(r.minutes / 25); });
  return rows;
}

const boardRow = (r) => `
  <li class="${r.me ? 'me' : ''}">
    <span class="rank">${ar(r.rank)}</span>
    <span class="avatar">${esc(r.name[0])}</span>
    <span class="name">${esc(r.name)}${r.me ? ' <small>(أنت)</small>' : ''}${r.cls ? `<small>${r.cls}</small>` : ''}</span>
    <span class="trees" title="أشجار">🌳 ${ar(r.trees)}</span>
    <span class="pts">${fmtHM(r.minutes)}</span>
  </li>`;

// المعاينة في الرئيسية: أول ٣ + مكانك
function renderBoard(kind) {
  boardKind = kind;
  $$('[data-board]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.board === boardKind)));
  const rows = boardRows(boardKind);
  const me = rows.find((r) => r.me);
  const show = rows.slice(0, 3);
  if (me.rank > 3) show.push(me);
  const el = $('[data-leaders]');
  if (el) el.innerHTML = show.map(boardRow).join('');
  if ($('[data-view="board"]') && !$('[data-view="board"]').hidden) renderBoardView();
}

function renderBoardView() {
  const rows = boardRows(boardKind);
  const me = rows.find((r) => r.me);
  const ahead = rows[me.rank - 2];
  const [first, second, third] = rows;
  const podium = (r, place) => `
    <div class="podium__col podium--${place}${r.me ? ' is-me' : ''}">
      <span class="podium__avatar">${esc(r.name[0])}${place === 1 ? '<i>👑</i>' : ''}</span>
      <strong>${esc(r.name)}</strong>
      <small>${fmtHM(r.minutes)}</small>
      <div class="podium__step">${ar(place)}</div>
    </div>`;
  $('[data-view="board"]').innerHTML = `
    <section class="board-head">
      <div class="seg seg--lg" role="tablist" aria-label="نوع المنافسة">
        <button type="button" role="tab" aria-selected="${boardKind === 'class'}" data-board="class">فصلي</button>
        <button type="button" role="tab" aria-selected="${boardKind === 'school'}" data-board="school">مدرستي</button>
      </div>
      <p>الترتيب حسب دقائق التركيز في «ركّز» هالأسبوع. كل ٢٥ دقيقة = شجرة 🌳</p>
    </section>

    <section class="podium" aria-label="المراكز الأولى">
      ${podium(second, 2)}${podium(first, 1)}${podium(third, 3)}
    </section>

    <section class="me-card">
      <div><small>ترتيبك ${boardKind === 'class' ? 'في الفصل' : 'في المدرسة'}</small><strong>#${ar(me.rank)} من ${ar(rows.length)}</strong></div>
      <p>${ahead ? `باقي لك <b>${fmtDuration(ahead.minutes - me.minutes + 1)}</b> وتتجاوز ${esc(ahead.name)} 💪` : 'أنت الأول! حافظ على مركزك 👑'}</p>
      <button type="button" class="btn btn--white btn--sm" data-focus>ابدأ جلسة</button>
    </section>

    ${db.get('prizes', []).length ? `<section class="card">${sectionHead('جوائز الأوائل من المدرسة')}<ol class="prizes">${db.get('prizes', []).map((p, k) => `<li><span class="rank">${['🥇', '🥈', '🥉'][k] || ar(k + 1)}</span>${esc(p)}</li>`).join('')}</ol></section>` : ''}

    <section class="block">
      <div class="block__head"><h2>الترتيب كامل</h2><span class="count">${ar(rows.length)} طالب</span></div>
      <ol class="leaders leaders--full">${rows.slice(3).map(boardRow).join('')}</ol>
    </section>`;
}

/* =========================================================
   المساعد الذكي (يحل ويصحّح ويشرح، ويعرف خطتك وجدولك)
   ========================================================= */
const chat = { turns: (store.get('chat') || []).slice(-30), busy: false, ctl: null, image: null, sample: undefined, canImages: false };
samplePromise.then(async (smp) => {
  chat.sample = smp;
  if (smp) { try { chat.canImages = !!(await smp.limits()).images; } catch { chat.canImages = false; } }
  if (currentRoute() === 'ai') renderAi();
});

function studentContext() {
  const a = state.answers;
  if (!a) return 'الطالب ما عبّى خطته المستقبلية للحين (اقترح عليه يعبيها من «خطتي»).';
  const major = MAJORS[a.major] || MAJORS.other;
  const d = new Date().getDay();
  const today = state.plan ? state.plan.week[d].blocks.filter((b) => b.type !== 'free').map((b) => `${hhmm(b.start)} ${b.title}`).join('، ') : '';
  return [
    `الاسم: ${a.name || 'غير معروف'}`, `الصف: ${GRADES[a.grade - 1]}`, `الحلم: ${a.dream}`,
    `التخصص: ${a.major === 'other' && a.majorOther ? a.majorOther : major.label}`, `الجامعة: ${a.university || 'ما قرر'}`,
    `النسب الحالية/المطلوبة: ثانوية ${a.gpaNow ?? '؟'}/${a.gpaTarget}، قدرات ${a.qudNow ?? '؟'}/${a.qudTarget}، تحصيلي ${a.tahNow ?? '؟'}/${a.tahTarget}`,
    `مواد يحتاج يقويها: ${a.weak.join('، ') || 'ما حدد'}`,
    `يذاكر القدرات من ${sourceOf(a, 'qud')}، ومواد المدرسة من ${sourceOf(a, 'school')}`,
    `واجبات المدرسة: ${getSchoolTasks().map((t) => `${t.title} (${t.note})`).join(' | ')}`,
    `اليوم ${DAYS[d]}، وجدوله اليوم: ${today || 'ما فيه'}`,
  ].join('\n');
}

const aiRules = () => `أنت «وشيجة»، مساعد دراسي ذكي لطلاب الثانوي في السعودية (المنهج السعودي، والقدرات والتحصيلي). تكلّم بعربي بسيط وقريب وودود.
- لو طلب حل سؤال: اشرح الحل بخطوات مرقمة قصيرة، وبعدها اكتب «**الجواب النهائي:**».
- لو أعطاك إجابته عشان تصححها: ابدأ بالحكم (✅ صح / ⚠️ صح جزئياً / ❌ خطأ)، وقل وين الخطأ بالضبط وكيف يصححه، وبعدها الإجابة النموذجية.
- لو طلب تلميح: أعطه تلميح بس بدون الحل.
- لو طلب شرح درس: اشرح بأمثلة بسيطة، وآخر شي اعطه سؤال واحد يتدرب عليه.
- لو سأل عن جدوله أو خطته أو وش يذاكر: استخدم بياناته تحت، وخلك محدد (أرقام ومصادر).
- خل الرد قصير وواضح بسطور قصيرة. استخدم **للعريض** و- للقوائم. لا تستخدم جداول ولا LaTeX؛ اكتب المعادلات عادي مثل x² + 3x = 10.
- لو مو متأكد من معلومة قل إنك مو متأكد.

بيانات الطالب:
${studentContext()}`;

const aiErrorText = (code) => ({
  not_granted: 'ما سمحت لوشيجة تستخدم الذكاء الاصطناعي. افتح الصفحة من جديد واضغط «سماح».',
  rate_limited: 'وصلت الحد المسموح حالياً، جرّب بعد شوي.',
  unavailable: 'الذكاء الاصطناعي مو متاح الحين، جرّب بعد شوي.',
}[code] || 'صار خطأ، جرّب مرة ثانية.');

const fmtAi = (t) => bidi(esc(t))
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/^\s*[-•]\s+(.*)$/gm, '<span class="li">$1</span>')
  .replace(/\n/g, '<br>');

const QUICK = [
  { label: 'حل سؤال', fill: 'حل هذا السؤال خطوة بخطوة:\n' },
  { label: 'صحّح إجابتي', fill: 'صحّح إجابتي.\nالسؤال: \nإجابتي: ' },
  { label: 'تلميح بس', fill: 'أبغى تلميح بدون الحل:\n' },
  { label: 'اشرح لي درس', fill: 'اشرح لي درس ' },
  { label: 'وش أذاكر اليوم؟', send: 'وش أذاكر اليوم؟ رتّب لي جلسات اليوم وقل لي من وين أبدأ.' },
];

function bubble(t, k) {
  if (t.role === 'user') return `<div class="msg msg--me">${t.image ? `<span class="msg__img">${icon('image')} صورة</span>` : ''}${fmtAi(t.content)}</div>`;
  if (t.pending) return '<div class="msg msg--ai"><span class="typing"><i></i><i></i><i></i></span></div>';
  const { clean, acts } = parseActions(t.content);
  return `<div class="msg msg--ai${t.error ? ' is-error' : ''}">${fmtAi(clean)}${acts.map((x, i) => {
    const done = (t.applied || []).includes(i);
    return `<button type="button" class="act${done ? ' is-done' : ''}" data-act="${k}" data-k="${i}" ${done ? 'disabled' : ''}>${done ? '✓ تم' : '+ ' + esc(actionLabel(x))}</button>`;
  }).join('')}</div>`;
}

function renderAi() {
  const view = $('[data-view="ai"]');
  const name = state.answers?.name?.trim();
  const off = chat.sample === null;
  const draft = $('[data-chat-input]')?.value ?? chat.draft ?? '';
  view.innerHTML = `
    <section class="ai">
      ${off ? `<div class="note note--warn">${icon('spark')} المساعد الذكي مو مفعّل هنا للحين: يحتاج مفتاح الذكاء الاصطناعي في إعدادات الموقع، أو تفتح وشيجة من رابط Claude.</div>` : ''}
      <div class="chat" data-chat aria-live="polite">
        <div class="msg msg--ai">هلا${(profile?.name || name) ? ` ${esc(profile?.name || name)}` : ''}! أنا وشيجة 👋<br>${aiWelcome()}${chat.canImages && role() === 'student' ? '<br>صوّر السؤال من الكتاب أو اكتبه.' : ''}</div>
        ${chat.turns.map((t, k) => bubble(t, k)).join('')}
      </div>
      <div class="quick" role="group" aria-label="اختصارات">
        ${quickFor().map((q, k) => `<button type="button" class="chip-opt" data-quick="${k}">${q.label}</button>`).join('')}
        ${chat.turns.length ? '<button type="button" class="chip-opt chip-opt--ghost" data-chat-clear>محادثة جديدة</button>' : ''}
      </div>
      <form class="composer" data-composer>
        ${chat.image ? `<div class="composer__img"><img src="${URL.createObjectURL(chat.image)}" alt="الصورة المرفقة" /><button type="button" data-img-remove aria-label="شيل الصورة">×</button></div>` : ''}
        <div class="composer__row">
          ${chat.canImages ? `<label class="icon-btn icon-btn--soft" aria-label="أرفق صورة السؤال">${icon('image')}<input type="file" accept="image/*" data-img-input hidden /></label>` : ''}
          <textarea id="chat-input" data-chat-input rows="1" placeholder="اكتب سؤالك أو إجابتك…" ${off ? 'disabled' : ''}>${esc(draft)}</textarea>
          ${chat.busy
            ? `<button type="button" class="icon-btn icon-btn--coral" data-chat-stop aria-label="وقّف">${icon('stop')}</button>`
            : `<button type="submit" class="icon-btn icon-btn--coral" aria-label="أرسل" ${off ? 'disabled' : ''}>${icon('send')}</button>`}
        </div>
      </form>
    </section>`;
  chat.draft = '';
  const c = $('[data-chat]');
  c.scrollTop = c.scrollHeight;
  if (chat.turns.length) window.scrollTo({ top: document.body.scrollHeight });
}

function updateLastBubble() {
  const msgs = $$('[data-chat] .msg');
  const last = msgs[msgs.length - 1];
  const t = chat.turns[chat.turns.length - 1];
  if (last && t) { last.outerHTML = bubble(t, chat.turns.length - 1); window.scrollTo({ top: document.body.scrollHeight }); }
}

async function sendChat(text) {
  text = (text || '').trim();
  if ((!text && !chat.image) || chat.busy) return;
  if (chat.sample === undefined) chat.sample = await samplePromise;
  if (!chat.sample) { toast('المساعد الذكي مو مفعّل هنا للحين'); return; }
  const img = chat.image;
  chat.image = null;
  chat.turns.push({ role: 'user', content: text || 'حل السؤال اللي في الصورة خطوة بخطوة', image: !!img });
  const reply = { role: 'assistant', content: '', pending: true };
  chat.turns.push(reply);
  chat.busy = true;
  chat.ctl = new AbortController();
  if (currentRoute() === 'ai') { $('[data-chat-input]') && ($('[data-chat-input]').value = ''); renderAi(); }

  let history = chat.turns.slice(0, -1).filter((t) => !t.error && t.content).slice(-12)
    .map((t) => ({ role: t.role, content: t.image ? `[أرفقت صورة]\n${t.content}` : t.content }));
  while (history.length && history[0].role !== 'user') history.shift();
  const input = [{ role: 'user', content: roleRules() }, { role: 'assistant', content: 'تمام، جاهز أساعدك.' }, ...history];
  const opts = { cache: false, signal: chat.ctl.signal, onText: ({ text: tx }) => { reply.content = tx; reply.pending = false; if (currentRoute() === 'ai') updateLastBubble(); } };
  if (img) opts.images = [img];
  try {
    const res = await chat.sample(input, opts);
    reply.content = res.text;
    if (res.truncated) reply.content += '\n\n(انقطع الرد لأنه طويل — اطلب الباقي)';
  } catch (e) {
    if (e && e.code === 'cancelled') reply.content = e.text || reply.content || 'وقّفت الرد.';
    else { reply.content = (e && e.text) || aiErrorText(e && e.code); reply.error = !(e && e.text); }
  }
  reply.pending = false;
  chat.busy = false;
  chat.ctl = null;
  store.set('chat:' + (role() || 'student'), chat.turns.filter((t) => !t.pending && !t.error).slice(-30));
  if (currentRoute() === 'ai') renderAi();
}

function askAbout(text) {
  go('ai');
  setTimeout(() => sendChat(text), 50);
}

// تعديل الجدول بطلب من الطالب
async function editScheduleAi() {
  const req = (state.schedReq || '').trim();
  if (req.length < 3) { toast('اكتب وش تبي تغيّر في جدولك'); return; }
  const sample = await samplePromise;
  if (!sample) { toast('الذكاء الاصطناعي مو مفعّل هنا للحين'); return; }
  state.schedBusy = true; renderSchedule();
  const week = state.plan.week.map((d) => ({ day: d.day, blocks: d.blocks.map((b) => ({ start: hhmm(b.start), minutes: b.minutes, title: b.title, note: b.note || '', type: b.type })) }));
  const prompt = `أنت مرشد أكاديمي في منصة «وشيجة». عدّل جدول المذاكرة الأسبوعي لهذا الطالب حسب طلبه، وخل باقي الجدول مثل ما هو قدر الإمكان.

بيانات الطالب:
${studentContext()}
ساعات المذاكرة: ${state.answers.hoursWeekday} ساعة بأيام الدراسة و${state.answers.hoursWeekend} بالإجازة.

طلب الطالب: «${req}»

الجدول الحالي (day=0 الأحد ... day=6 السبت):
${JSON.stringify(week)}

القواعد: كل جلسة مهمة محددة فيها رقم ومصدر (مثل «قدرات: خلّص ٦ دروس كمي في المفكر»)، راحة ١٥ دقيقة بين الجلسات، وآخر كل يوم جلسة free بعنوان «وقت حر».
رد بـ JSON فقط: {"message":"جملة قصيرة للطالب عن وش غيرت","week":[{"day":0,"blocks":[{"start":"16:00","minutes":45,"title":"","note":"","type":"homework|study|exam|passion|review|free"}]}]}`;
  try {
    const ai = await sample.json(prompt, { modelTier: 'default' });
    const old = state.plan.week;
    state.plan.week = parseWeek(ai && ai.week, state.plan.week);
    // الجلسات اللي ما تغيرت تحتفظ بعلامة الإنجاز
    state.plan.week.forEach((d, k) => d.blocks.forEach((b) => { const same = old[k].blocks.find((o) => o.title === b.title && o.start === b.start); if (same && same.id) b.id = same.id; }));
    store.set('plan', state.plan);
    // نمسح علامات الإنجاز لهالأسبوع لأن الجلسات تغيرت
    const ws = new Date(); ws.setDate(ws.getDate() - ws.getDay());
    void ws;
    state.schedReq = '';
    toast(str(ai && ai.message, 120) || 'عدّلت جدولك ✦');
  } catch (e) {
    toast(e && e.code === 'invalid_json' ? 'ما قدرت أقرأ الرد، جرّب تكتب طلبك بشكل ثاني' : aiErrorText(e && e.code));
  }
  state.schedBusy = false;
  if (currentRoute() === 'schedule') renderSchedule();
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
    setTimeout(() => $('#focus') && $('#focus').scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
    return;
  }
  const soon = t.closest('[data-soon]');
  if (soon) { e.preventDefault(); toast(`«${soon.dataset.soon}» — قريباً ✨`); return; }

  const board = t.closest('[data-board]');
  if (board) return renderBoard(board.dataset.board);

  // المعالج
  if (t.closest('[data-start-wizard]')) { state.step = 0; state.draft = emptyAnswers(); state.editing = true; renderWizard(); return; }
  if (t.closest('[data-edit-plan]')) { state.step = 0; state.draft = { ...state.answers, weak: [...state.answers.weak], programs: [...state.answers.programs], _lastMajor: state.answers.major }; state.editing = true; renderWizard(); window.scrollTo({ top: 0 }); return; }
  const chip = t.closest('[data-chips] .chip-opt');
  if (chip) {
    const group = chip.closest('[data-chips]');
    const name = group.dataset.chips;
    const multi = group.dataset.multi === '1';
    let val = chip.dataset.value;
    if (name === 'grade' || name === 'seriousness' || name === 'studyDays') val = Number(val);
    if (/Started$/.test(name)) { state.draft[name] = val === 'yes'; renderWizard(); return; }
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
    if (/Source$/.test(name)) { renderWizard(); return; }
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

  // المساعد
  const quick = t.closest('[data-quick]');
  if (quick) {
    const q = quickFor()[Number(quick.dataset.quick)];
    if (q.send) { sendChat(q.send); return; }
    const box = $('[data-chat-input]');
    if (box && !box.disabled) { box.value = q.fill; box.focus(); box.setSelectionRange(box.value.length, box.value.length); autoGrow(box); }
    return;
  }
  if (t.closest('[data-chat-clear]')) { chat.turns = []; store.set('chat:' + (role() || 'student'), []); renderAi(); return; }
  if (t.closest('[data-chat-stop]')) { chat.ctl?.abort(); return; }
  if (t.closest('[data-img-remove]')) { chat.image = null; renderAi(); return; }
});

document.addEventListener('input', (e) => {
  const f = e.target.closest('[data-field]');
  if (!f || !state.draft) return;
  const k = f.dataset.field;
  if (/Now$|Target$/.test(k)) { state.draft[k] = num(f.value); updateWeighted(); }
  else if (/Reached$|Total$/.test(k)) { state.draft[k] = f.value === '' ? null : Math.max(0, Math.round(Number(f.value) || 0)); }
  else if (f.type === 'range') { state.draft[k] = Number(f.value); const o = $(`[data-out="${k}"]`); if (o) o.textContent = `${ar(f.value)} ساعة`; }
  else state.draft[k] = f.value;
});

document.addEventListener('input', (e) => {
  if (e.target.matches('[data-sched-req]')) state.schedReq = e.target.value;
  if (e.target.matches('[data-chat-input]')) autoGrow(e.target);
});
function autoGrow(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 180) + 'px'; }

document.addEventListener('submit', (e) => {
  if (e.target.matches('[data-composer]')) {
    e.preventDefault();
    sendChat($('[data-chat-input]').value);
  }
  if (e.target.matches('[data-home-ask]')) {
    e.preventDefault();
    const box = e.target.querySelector('input');
    const q = box.value.trim();
    if (!q) { go('ai'); return; }
    box.value = '';
    askAbout(q);
  }
});

document.addEventListener('change', (e) => {
  if (!e.target.matches('[data-img-input]')) return;
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  if (!f.type.startsWith('image/')) { toast('أرفق صورة بس'); return; }
  chat.draft = $('[data-chat-input]')?.value || '';
  compressImage(f).then((img) => { chat.image = img; renderAi(); });
});

window.addEventListener('hashchange', show);

