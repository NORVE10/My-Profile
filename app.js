// وشيجة — الصفحة الرئيسية
// كل خانة هنا لها مفتاح (id) نستخدمه لاحقاً لما نبني صفحتها الخاصة.

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
};

// الخانات اللي بنفصّلها بعدين
const MODULES = [
  { id: 'ai',        title: 'المساعد الذكي',    desc: 'يحل أسئلتك ويصحّح إجاباتك خطوة بخطوة', tone: 'coral', badge: 'AI' },
  { id: 'schedule',  title: 'جدولي',            desc: 'جدول مذاكرة مبني على أهدافك',          tone: 'maroon' },
  { id: 'level',     title: 'مستواي',           desc: 'تقدير تلقائي لمستواك في كل مادة',      tone: 'pink' },
  { id: 'resources', title: 'المصادر',          desc: 'ملفات وروابط ينزّلها معلموك',           tone: 'beige', badge: '٤ جديد' },
  { id: 'community', title: 'المجتمع',          desc: 'شارك محتوى وفيديوهات مع زملائك',       tone: 'beige' },
  { id: 'messages',  title: 'الرسائل',          desc: 'تواصل مع زملائك ومجموعات المواد',      tone: 'beige', badge: '٣' },
  { id: 'feedback',  title: 'اقتراحات للمعلمين', desc: 'رسائل لتطوير الشرح والحصص',           tone: 'pink' },
  { id: 'grades',    title: 'الدرجات',          desc: 'درجاتك لكل مادة في مكان واحد',          tone: 'beige' },
  { id: 'rewards',   title: 'المحفزات',         desc: 'نقاط وشارات وإنجازات',                 tone: 'maroon', badge: '٣٢٠ نقطة' },
];

const SIDEBAR = [
  { id: 'home', title: 'الرئيسية' },
  { id: 'plan', title: 'خطتي المستقبلية' },
  { id: 'focus', title: 'ركّز' },
  ...MODULES.map(({ id, title }) => ({ id, title })),
];

const TABS = [
  { id: 'home', title: 'الرئيسية' },
  { id: 'schedule', title: 'جدولي' },
  { id: 'focus', title: 'ركّز' },
  { id: 'level', title: 'مستواي' },
  { id: 'more', title: 'المزيد' },
];

const icon = (name) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.more}</svg>`;

function render() {
  document.querySelector('[data-modules]').innerHTML = MODULES.map(
    (m) => `
      <a class="module module--${m.tone}" href="#${m.id}" data-soon="${m.title}">
        <span class="module__icon">${icon(m.id)}</span>
        ${m.badge ? `<span class="module__badge">${m.badge}</span>` : ''}
        <strong>${m.title}</strong>
        <small>${m.desc}</small>
      </a>`
  ).join('');

  document.querySelector('[data-nav]').innerHTML = SIDEBAR.map(
    (s) => `
      <a href="#${s.id}" class="${s.id === 'home' ? 'is-active' : ''}" ${s.id === 'home' ? '' : `data-soon="${s.title}"`}>
        ${icon(s.id)}<span>${s.title}</span>
      </a>`
  ).join('');

  document.querySelector('[data-tabbar]').innerHTML = TABS.map(
    (t) => `
      <a href="#${t.id}" class="${t.id === 'home' ? 'is-active' : ''}" ${t.id === 'home' ? '' : `data-soon="${t.title}"`}>
        ${icon(t.id)}<span>${t.title}</span>
      </a>`
  ).join('');
}

// التحية والتاريخ
function setGreeting() {
  const h = new Date().getHours();
  document.querySelector('[data-greeting]').textContent = h < 12 ? 'صباح الخير' : 'مساء الخير';
  document.querySelector('[data-today]').textContent = new Intl.DateTimeFormat('ar-SA', {
    weekday: 'long',
  }).format(new Date());
}

// تنبيه "قريباً" للخانات اللي لسا ما بنيناها
let toastTimer;
function toast(msg) {
  const el = document.querySelector('[data-toast]');
  el.textContent = msg;
  el.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-on'), 2200);
}

document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-soon]');
  if (!target) return;
  e.preventDefault();
  if (target.dataset.soon === 'ركّز') {
    document.querySelector('.focus').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  toast(`«${target.dataset.soon}» — قريباً ✨`);
});

// مؤقت التركيز (نسخة أولية)
const FOCUS_SECONDS = 25 * 60;
const ring = document.querySelector('[data-ring]');
const CIRC = 2 * Math.PI * 52;
let left = FOCUS_SECONDS;
let running = null;

const toArabicDigits = (s) => s.replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

function drawTimer() {
  const m = String(Math.floor(left / 60)).padStart(2, '0');
  const s = String(left % 60).padStart(2, '0');
  document.querySelector('[data-timer]').textContent = toArabicDigits(`${m}:${s}`);
  ring.style.strokeDasharray = CIRC;
  ring.style.strokeDashoffset = CIRC * (left / FOCUS_SECONDS);
}

document.querySelector('[data-timer-toggle]').addEventListener('click', (e) => {
  if (running) {
    clearInterval(running);
    running = null;
    e.currentTarget.textContent = 'كمّل';
    document.querySelector('[data-timer-label]').textContent = 'متوقف مؤقتاً';
    return;
  }
  e.currentTarget.textContent = 'إيقاف';
  document.querySelector('[data-timer-label]').textContent = 'نبتتك تكبر 🌱';
  running = setInterval(() => {
    left = Math.max(0, left - 1);
    drawTimer();
    if (left === 0) {
      clearInterval(running);
      running = null;
      toast('أحسنت! زرعت شجرة جديدة 🌳 +٢٥ نقطة');
    }
  }, 1000);
});

document.querySelector('[data-timer-reset]').addEventListener('click', () => {
  clearInterval(running);
  running = null;
  left = FOCUS_SECONDS;
  document.querySelector('[data-timer-toggle]').textContent = 'ابدأ';
  document.querySelector('[data-timer-label]').textContent = 'جلسة مذاكرة';
  drawTimer();
});

render();
setGreeting();
drawTimer();
