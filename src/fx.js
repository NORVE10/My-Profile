// وشيجة — المؤثرات، «وشاج» (شخصية المساعد) وجولته، البروفايل، والانتقالات
// بعض المؤثرات مستوحاة ومنقولة لجافاسكربت عادي من React Bits (SpotlightCard, ShinyText, ClickSpark, CountUp)
// Copyright (c) 2026 David Haz — MIT + Commons Clause (انظر THIRD_PARTY_NOTICES.md)

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* =========================================================
   ١) الإضاءة عند التمرير (Spotlight) — تنور بلون وشيجة
   ========================================================= */
const GLOW_SEL = '.module, .card, .task, .slot__card:not(.slot--free), .more-item, .role, .stat, .news, .post, .res, .level, .day, .phase__card, .intro, .podium, .me-card, .threads button, .people button, .ask, .plan-card, .goal';
let glowEl = null;
document.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch') return;
  const el = e.target.closest && e.target.closest(GLOW_SEL);
  if (glowEl && glowEl !== el) glowEl.classList.remove('is-lit');
  glowEl = el;
  if (!el) return;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${e.clientX - r.left}px`);
  el.style.setProperty('--my', `${e.clientY - r.top}px`);
  el.classList.add('is-lit');
}, { passive: true });
document.addEventListener('pointerleave', () => { if (glowEl) glowEl.classList.remove('is-lit'); glowEl = null; });

/* =========================================================
   ٢) شرارة عند الإنجاز (ClickSpark) — بس للحظات المهمة
   ========================================================= */
function sparkAt(x, y, count = 10) {
  if (reducedMotion()) return;
  const c = document.createElement('canvas');
  const dpr = Math.min(2, devicePixelRatio || 1);
  c.className = 'spark-layer';
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  document.body.appendChild(c);
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  const colors = ['#d5604f', '#f0a090', '#f6eee4'];
  const parts = Array.from({ length: count }, (_, i) => ({ a: (i / count) * Math.PI * 2 + Math.random() * 0.3, c: colors[i % colors.length] }));
  const t0 = performance.now(), dur = 520;
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  (function frame(now) {
    const p = Math.min(1, (now - t0) / dur);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const dist = ease(p) * 34, len = 12 * (1 - p);
    ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    for (const s of parts) {
      ctx.strokeStyle = s.c;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(s.a) * dist, y + Math.sin(s.a) * dist);
      ctx.lineTo(x + Math.cos(s.a) * (dist + len), y + Math.sin(s.a) * (dist + len));
      ctx.stroke();
    }
    if (p < 1) requestAnimationFrame(frame); else c.remove();
  })(t0);
}
// نطلق الشرارة لما الطالب يخلّص جلسة أو يسلّم واجب أو ينشر
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-slot][aria-pressed="false"], [data-submit]:not(.is-done), [data-post-form] button[type=submit], [data-act]:not([disabled])');
  if (t) {
    sparkAt(e.clientX, e.clientY);
    const d = $('[data-wishaj]');
    if (d) { d.classList.remove('is-happy'); void d.offsetWidth; d.classList.add('is-happy'); setTimeout(() => d.classList.remove('is-happy'), 900); }
  }
}, true);

/* =========================================================
   ٣) العدّاد (CountUp) — الأرقام تعد أول مرة تظهر
   ========================================================= */
const counted = new Set();
const cu = (n, suffix = '', key = '') => `<span class="count-up" data-count="${n}" data-suffix="${esc(suffix)}" data-key="${esc(key)}">${ar(n)}${esc(suffix)}</span>`;
function runCountUps(root = document) {
  $$('.count-up', root).forEach((el) => {
    const key = el.dataset.key;
    const n = Number(el.dataset.count);
    if (!key || counted.has(key) || reducedMotion() || !isFinite(n) || n === 0) { counted.add(key); return; }
    counted.add(key);
    const t0 = performance.now(), dur = 900, dec = n % 1 ? 1 : 0;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const v = n * (1 - Math.pow(1 - p, 3));
      el.textContent = ar(dec ? v.toFixed(1) : Math.round(v)) + el.dataset.suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/* =========================================================
   ٤) «وشاج» — شخصية المساعد الذكي
   كرة عنابية هادية بحافة مرجانية وعينين طوليتين، بدون فم ولا خدود.
   ========================================================= */
let wishajSeq = 0;
function wishajSvg(size = 56, mood = '') {
  const id = 'wj' + (++wishajSeq);
  return `<svg class="wishaj ${mood}" width="${size}" height="${size}" style="width:${size}px;height:${size}px" viewBox="0 0 64 64" aria-hidden="true">
    <defs>
      <radialGradient id="${id}b" cx="38%" cy="30%" r="78%"><stop offset="0" stop-color="#8d3d36"/><stop offset="0.55" stop-color="#622a27"/><stop offset="1" stop-color="#3a1715"/></radialGradient>
      <radialGradient id="${id}r" cx="50%" cy="100%" r="62%"><stop offset="0" stop-color="#d5604f" stop-opacity="0.85"/><stop offset="1" stop-color="#d5604f" stop-opacity="0"/></radialGradient>
    </defs>
    <circle class="wishaj__body" cx="32" cy="32" r="27" fill="url(#${id}b)"/>
    <circle cx="32" cy="32" r="27" fill="url(#${id}r)"/>
    <ellipse cx="24.5" cy="17.5" rx="9" ry="4.2" fill="#fff" opacity="0.1"/>
    <circle cx="32" cy="32" r="26.4" fill="none" stroke="#e9806f" stroke-opacity="0.6" stroke-width="1.2"/>
    <g class="wishaj__eyes"><g class="wishaj__look">
      <rect x="21.5" y="22" width="6.5" height="15.5" rx="3.25" fill="#f6eee4"/>
      <rect x="36" y="22" width="6.5" height="15.5" rx="3.25" fill="#f6eee4"/>
    </g></g>
  </svg>`;
}
// العيون تطالع الماوس (وشاج يتفاعل حتى لو «تقليل الحركة» مفعّل، لأنه حركة صغيرة يتحكم فيها المستخدم بالماوس)
let idleTimer = 0;
document.addEventListener('pointermove', (e) => {
  const dock = $('[data-wishaj]');
  if (dock) {
    dock.classList.remove('is-idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => dock.classList.add('is-idle'), 4000); // لو وقفت، يطالع حوله
  }
  $$('.wishaj__look').forEach((g) => {
    const r = g.closest('svg').getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy) || 1, k = Math.min(3, d / 36);
    g.style.transform = `translate(${(dx / d) * k}px, ${(dy / d) * k * 0.8}px)`;
  });
}, { passive: true });

/* ---------- وشاج يلحق الماوس (على الكمبيوتر) ---------- */
const follow = { x: 0, y: 0, tx: 0, ty: 0, on: false, raf: 0, frozen: false, last: 0 };
const canFollow = () => matchMedia('(pointer: fine), (hover: hover)').matches && !db.get('wishajStay', false);
function placeDock() {
  const el = $('[data-wishaj]');
  if (!el) return;
  el.style.transform = `translate(${follow.x}px, ${follow.y}px)`;
}
function followTick(now) {
  follow.raf = 0;
  const el = $('[data-wishaj]');
  if (!el || el.hidden || !follow.on) return;
  const dt = Math.min(0.05, (now - (follow.last || now)) / 1000 || 0.016);
  follow.last = now;
  const k = 1 - Math.exp(-dt / 0.16); // لحاق ناعم بتأخير بسيط
  follow.x += (follow.tx - follow.x) * k;
  follow.y += (follow.ty - follow.y) * k;
  placeDock();
  el.classList.toggle('is-moving', Math.hypot(follow.tx - follow.x, follow.ty - follow.y) > 2);
  if (Math.hypot(follow.tx - follow.x, follow.ty - follow.y) > 0.4) follow.raf = requestAnimationFrame(followTick);
}
function wakeFollow() { if (!follow.raf) { follow.last = 0; follow.raf = requestAnimationFrame(followTick); } }
document.addEventListener('pointermove', (e) => {
  const el = $('[data-wishaj]');
  if (!el || el.hidden || (e.pointerType && e.pointerType !== 'mouse') || !canFollow() || tour) return;
  if (!follow.on) {
    const r = el.getBoundingClientRect();
    follow.x = r.left; follow.y = r.top; follow.on = true;
    el.classList.add('is-following');
    placeDock();
  }
  const size = 48;
  const cx = follow.x + size / 2, cy = follow.y + size / 2;
  const near = Math.hypot(e.clientX - cx, e.clientY - cy) < 46;
  // لما تقرّب منه يوقف عشان تقدر تضغط عليه، ولما القائمة مفتوحة يثبت
  follow.frozen = near || !$('[data-wishaj-menu]').hidden;
  if (follow.frozen) return;
  follow.tx = clamp(e.clientX - 74, 8, innerWidth - size - 8);
  follow.ty = clamp(e.clientY + 22, 8, innerHeight - size - 8);
  wakeFollow();
}, { passive: true });
// لما الماوس يطلع من الصفحة، يرجع لمكانه
document.documentElement.addEventListener('mouseleave', () => {
  const el = $('[data-wishaj]');
  if (!el || !follow.on) return;
  follow.on = false; cancelAnimationFrame(follow.raf); follow.raf = 0;
  el.classList.remove('is-following', 'is-moving');
  el.style.transform = '';
});

function renderWishajDock() {
  let el = $('[data-wishaj]');
  if (!el) {
    el = document.createElement('div');
    el.setAttribute('data-wishaj', '');
    el.className = 'wishaj-dock';
    document.body.appendChild(el);
  }
  const hide = !profile || currentRoute() === 'ai' || db.get('wishajHidden', false);
  el.hidden = hide;
  if (hide) return;
  if (!el.innerHTML) el.innerHTML = `<span class="wishaj-hi" aria-hidden="true">هلا! اضغطني 👋</span><button type="button" class="wishaj-btn" data-wishaj-open aria-label="وشاج، مساعدك">${wishajSvg(48)}</button><div class="wishaj-menu" data-wishaj-menu hidden></div>`;
}
function openWishajMenu() {
  const m = $('[data-wishaj-menu]');
  if (!m) return;
  if (!m.hidden) { m.hidden = true; return; }
  m.innerHTML = `
    <p><b>أنا وشاج</b>، مساعدك في وشيجة.</p>
    <button type="button" class="btn btn--coral btn--sm" data-route="ai">اسألني أي شي</button>
    ${TOURS[tourKey()] ? '<button type="button" class="btn btn--ghost btn--sm" data-tour-start>جولة في الصفحة</button>' : ''}
    <button type="button" class="link" data-wishaj-stay>${db.get('wishajStay', false) ? 'خلني ألحقك' : 'خلني في مكاني'}</button>
    <button type="button" class="link" data-wishaj-hide>اخفيني</button>`;
  m.hidden = false;
  // القائمة تفتح للجهة اللي فيها مكان
  const r = $('[data-wishaj]').getBoundingClientRect();
  m.classList.toggle('is-below', r.top < 240);
  m.classList.toggle('is-start', r.left < 240);
}

/* =========================================================
   ٥) جولة «وشاج»: يتحرك على الخانات ويشرحها
   ========================================================= */
const TOURS = {
  'student:home': [
    ['[data-home-plan]', 'هنا خطتك المستقبلية: تكتب حلمك ونسبك، وأنا أطلع لك خطة من اليوم لين توصل.'],
    ['[data-home-ask]', 'عندك سؤال؟ اكتبه هنا أو صوّره، وأحله لك خطوة بخطوة أو أصحح إجابتك.'],
    ['[data-today]', 'هنا واجباتك واختباراتك. لما تسلّم واجب اضغط «سلّمته؟» وتكسب نقاط.'],
    ['[data-modules]', 'كل خانات وشيجة في مكان واحد: جدولك، مستواك، المصادر، المجتمع والرسائل.'],
    ['#focus', 'وقت المذاكرة! اختر المدة وازرع شجرة. وانتبه: ما تقدر توقف المؤقت 😉'],
    ['.board', 'وهنا المنافسة مع فصلك ومدرستك. كل دقيقة تركيز ترفعك بالترتيب.'],
    ['.tabbar', 'ومن هنا تتنقل بين الصفحات. لو احتجتني أنا دايم في الزاوية 👋'],
  ],
  'student:schedule': [
    ['.days', 'اختر اليوم من هنا.'],
    ['.slots', 'هذي جلساتك. اضغط على الجلسة لما تخلصها، واضغط ⋯ عشان تعدّلها.'],
    ['[data-add="task"]', 'تقدر تضيف أي مهمة أو اختبار بنفسك.'],
  ],
  'student:profile': [
    ['.profile-head', 'هذا بروفايلك: اكتب نبذة عنك.'],
    ['[data-interests]', 'أضف اهتماماتك، وأنا أستخدمها عشان أقترح لك أشياء تناسبك.'],
    ['[data-books]', 'وسجّل الكتب اللي قريتها أو تقراها.'],
  ],
  'teacher:home': [
    ['.stats', 'نظرة سريعة على واجباتك ومصادرك واقتراحات طلابك.'],
    ['.more-grid', 'من هنا تضيف واجبات ومصادر وتحدد مستوى طلابك.'],
    ['[data-home-ask]', 'اطلب مني أي شي: أسئلة، خطة درس، أو حتى ميزة مو موجودة.'],
  ],
  'parent:home': [
    ['.goal', 'هنا ملخص مستوى ولدك ووش يحتاج دعم فيه.'],
    ['.levels', 'ومستواه في كل مادة كما حدده المعلم.'],
  ],
  'admin:home': [
    ['.stats', 'أرقام المدرسة هالأسبوع.'],
    ['.more-grid', 'من هنا تنشر الأخبار والمسابقات وتحط جوائز المنافسة.'],
  ],
};
const tourKey = () => `${role()}:${currentRoute()}`;
let tour = null;
function startTour() {
  const steps = (TOURS[tourKey()] || []).filter(([sel]) => { const el = $(sel); return el && el.offsetParent !== null; });
  if (!steps.length) return;
  closeTour();
  $('[data-wishaj-menu]') && ($('[data-wishaj-menu]').hidden = true);
  const layer = document.createElement('div');
  layer.className = 'tour';
  layer.innerHTML = `<div class="tour__hole"></div><div class="tour__guide">${wishajSvg(64, 'is-talking')}<div class="tour__bubble" role="dialog" aria-live="polite"><p></p><div class="tour__nav"><small></small><button type="button" class="link" data-tour-skip>تخطّي</button><button type="button" class="btn btn--coral btn--sm" data-tour-next>التالي</button></div></div></div>`;
  document.body.appendChild(layer);
  tour = { steps, i: -1, layer };
  db.set('tour2:' + tourKey(), true);
  nextTourStep();
}
function nextTourStep() {
  if (!tour) return;
  tour.i++;
  if (tour.i >= tour.steps.length) { closeTour(); toast('استمتع بوشيجة 👋'); return; }
  const [sel, text] = tour.steps[tour.i];
  const el = $(sel);
  if (!el) { nextTourStep(); return; }
  el.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
  setTimeout(() => {
    if (!tour) return;
    const r = el.getBoundingClientRect();
    const hole = $('.tour__hole', tour.layer), guide = $('.tour__guide', tour.layer);
    const pad = 8;
    Object.assign(hole.style, { top: `${r.top - pad}px`, left: `${r.left - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
    // وشاج ينزل تحت الخانة لو فيه مكان، وإلا فوقها
    const below = r.bottom + 190 < innerHeight;
    const gy = below ? Math.min(innerHeight - 180, r.bottom + 14) : Math.max(10, r.top - 176);
    const gx = Math.max(10, Math.min(innerWidth - Math.min(340, innerWidth - 20) - 10, r.left + r.width / 2 - 170));
    guide.style.transform = `translate(${gx}px, ${gy}px)`;
    guide.classList.toggle('is-above', !below);
    $('.tour__bubble p', tour.layer).textContent = text;
    $('.tour__nav small', tour.layer).textContent = `${ar(tour.i + 1)} / ${ar(tour.steps.length)}`;
    $('[data-tour-next]', tour.layer).textContent = tour.i === tour.steps.length - 1 ? 'تمام 👍' : 'التالي';
    $('[data-tour-next]', tour.layer).focus({ preventScroll: true });
  }, reducedMotion() ? 0 : 380);
}
function closeTour() { if (tour) { tour.layer.remove(); tour = null; } }
function maybeAutoTour() {
  if (!profile || tour || db.get('tour2:' + tourKey(), false) || !TOURS[tourKey()]) return;
  if (currentRoute() !== 'home') return; // التلقائية في الرئيسية بس، وباقي الصفحات من قائمة وشاج
  setTimeout(() => { if (!tour && !$('[data-sheet]:not([hidden])')) startTour(); }, 900);
}
document.addEventListener('keydown', (e) => {
  if (!tour) return;
  if (e.key === 'Escape') closeTour();
});
addEventListener('resize', () => { if (tour) { tour.i--; nextTourStep(); } });

/* =========================================================
   ٦) بروفايل الطالب
   ========================================================= */
const INTEREST_SUGGEST = ['برمجة', 'روبوتات', 'ذكاء اصطناعي', 'قراءة', 'كتابة', 'رياضة', 'كرة قدم', 'تصميم', 'رسم', 'تصوير', 'علوم', 'فضاء', 'طب', 'تطوع', 'لغات', 'تاريخ', 'ريادة أعمال', 'شطرنج'];
const BOOK_STATUS = ['قرأته', 'أقرأه الحين', 'أبي أقرأه'];
const defaultStudentProfile = () => ({ bio: '', interests: [], books: [], skills: [], visible: true });
const sp = () => ({ ...defaultStudentProfile(), ...db.get('studentProfile', {}) });
const saveSp = (p) => db.set('studentProfile', p);
const stars = (n) => `<span class="stars" aria-label="${ar(n)} من ٥">${[1, 2, 3, 4, 5].map((k) => `<i class="${k <= n ? 'on' : ''}">★</i>`).join('')}</span>`;

function pageProfile() {
  const p = sp();
  const programs = (state.answers?.programs || []).filter((x) => x !== 'ما عندي للحين');
  const { total } = pointsBreakdown();
  const read = p.books.filter((b) => b.status === 'قرأته').length;
  return `
    <section class="profile-head card">
      <div class="profile-head__top">
        <span class="profile-avatar">${esc((profile.name || '؟')[0])}</span>
        <div><h2>${esc(profile.name)}</h2><small>طالب ${myClass()}${state.answers?.dream ? ` • ${esc(state.answers.dream)}` : ''}</small></div>
      </div>
      <div class="profile-stats">
        <div><strong>${cu(total, '', 'pp-points')}</strong><small>نقطة</small></div>
        <div><strong>${cu(db.get('trees', 0), '', 'pp-trees')}</strong><small>شجرة</small></div>
        <div><strong>${cu((db.get('streak', { days: 0 }) || {}).days || 0, '', 'pp-streak')}</strong><small>يوم متتالي</small></div>
        <div><strong>${cu(read, '', 'pp-books')}</strong><small>كتاب قريته</small></div>
      </div>
      <label class="field"><span>نبذة عنك</span><textarea id="pf-bio" class="input" rows="2" maxlength="300" placeholder="مثلاً: أحب البرمجة وأحلم أسوي تطبيقات تخدم الناس">${esc(p.bio)}</textarea></label>
      <label class="toggle"><input type="checkbox" id="pf-visible" ${p.visible ? 'checked' : ''} /> <span>زملائي يقدرون يشوفون بروفايلي (بدون الخطة والدرجات)</span></label>
      <button type="button" class="btn btn--coral btn--sm" data-pf-save>احفظ</button>
    </section>

    <section class="card" data-interests>
      ${sectionHead('اهتماماتي', `<span class="count">${ar(p.interests.length)}</span>`)}
      <div class="chips">${p.interests.map((x) => `<span class="chip-opt is-on chip-x">${esc(x)}<button type="button" aria-label="شيل ${esc(x)}" data-pf-del-int="${esc(x)}">×</button></span>`).join('') || '<span class="field__hint">ما أضفت اهتمامات للحين.</span>'}</div>
      <form class="inline-add" data-pf-int-form><input type="text" id="pf-int" class="input" maxlength="30" placeholder="أضف اهتمام…" /><button type="submit" class="btn btn--ghost btn--sm">أضف</button></form>
      <div class="chips chips--sm">${INTEREST_SUGGEST.filter((x) => !p.interests.includes(x)).slice(0, 10).map((x) => `<button type="button" class="chip-opt chip-opt--ghost" data-pf-add-int="${esc(x)}">+ ${esc(x)}</button>`).join('')}</div>
    </section>

    <section class="card" data-books>
      ${sectionHead('كتبي', `<button type="button" class="link" data-pf-suggest>${icon('spark')} اقترح لي كتب</button>`)}
      ${p.books.length ? `<ul class="books">${p.books.map((b) => `
        <li class="book"><span class="book__spine" aria-hidden="true">${esc(b.title[0])}</span>
          <div><strong>${esc(b.title)}</strong><small>${b.author ? esc(b.author) + ' • ' : ''}${esc(b.status)}</small>${b.status === 'قرأته' ? stars(b.rating || 0) : ''}${b.note ? `<p>${bidi(esc(b.note))}</p>` : ''}</div>
          <button type="button" class="slot__more" data-pf-del-book="${b.id}" aria-label="احذف الكتاب">×</button></li>`).join('')}</ul>` : '<p class="empty">ما سجّلت كتب للحين. أضف أول كتاب 👇</p>'}
      <form class="sheet__form book-form" data-pf-book-form>
        <div class="pct">
          <label><small>اسم الكتاب</small><input type="text" id="pf-b-title" class="input" maxlength="80" required /></label>
          <label><small>المؤلف (اختياري)</small><input type="text" id="pf-b-author" class="input" maxlength="60" /></label>
        </div>
        <div class="field"><span>الحالة</span>${chipGroupSimple('pf-b-status', BOOK_STATUS.map((x) => [x, x]), 'قرأته')}</div>
        <div class="field"><span>تقييمك</span>${chipGroupSimple('pf-b-rate', [1, 2, 3, 4, 5].map((n) => [n, '★'.repeat(n)]), 4)}</div>
        <label class="field"><span>وش استفدت منه؟ (اختياري)</span><input type="text" id="pf-b-note" class="input" maxlength="140" /></label>
        <button type="submit" class="btn btn--coral btn--sm">أضف الكتاب</button>
      </form>
    </section>

    <section class="card">
      ${sectionHead('مهاراتي وإنجازاتي')}
      <div class="chips">${[...programs, ...p.skills].map((x) => `<span class="chip-opt is-on chip-x">${esc(x)}${p.skills.includes(x) ? `<button type="button" aria-label="شيل ${esc(x)}" data-pf-del-skill="${esc(x)}">×</button>` : ''}</span>`).join('') || '<span class="field__hint">أضف مهاراتك أو برامجك (مثل: بايثون، موهبة، أولمبياد).</span>'}</div>
      <form class="inline-add" data-pf-skill-form><input type="text" id="pf-skill" class="input" maxlength="40" placeholder="أضف مهارة أو إنجاز…" /><button type="submit" class="btn btn--ghost btn--sm">أضف</button></form>
    </section>`;
}

/* ---------- أحداث البروفايل ووشاج ---------- */
document.addEventListener('click', (e) => {
  const t = e.target;
  if (t.closest('[data-wishaj-open]')) { openWishajMenu(); return; }
  if (t.closest('[data-wishaj-stay]')) {
    const stay = !db.get('wishajStay', false); db.set('wishajStay', stay);
    if (stay) { const el = $('[data-wishaj]'); follow.on = false; el.classList.remove('is-following', 'is-moving'); el.style.transform = ''; }
    $('[data-wishaj-menu]').hidden = true; toast(stay ? 'بقعد هنا 👍' : 'بلحقك 👀'); return;
  }
  if (t.closest('[data-wishaj-hide]')) { db.set('wishajHidden', true); renderWishajDock(); toast('تقدر ترجّعني من «المزيد» 👋'); return; }
  if (t.closest('[data-wishaj-show]')) { db.set('wishajHidden', false); renderWishajDock(); toast('رجعت 👋'); return; }
  if (t.closest('[data-tour-start]')) { startTour(); return; }
  if (t.closest('[data-tour-next]')) { nextTourStep(); return; }
  if (t.closest('[data-tour-skip]')) { closeTour(); return; }
  if (!t.closest('[data-wishaj]')) { const m = $('[data-wishaj-menu]'); if (m && !m.hidden) m.hidden = true; }
  if (role() !== 'student') return;
  if (t.closest('[data-pf-save]')) { const p = sp(); p.bio = $('#pf-bio').value.trim(); p.visible = $('#pf-visible').checked; saveSp(p); toast('انحفظ بروفايلك ✓'); return; }
  const ai = t.closest('[data-pf-add-int]');
  if (ai) { const p = sp(); if (!p.interests.includes(ai.dataset.pfAddInt) && p.interests.length < 20) p.interests.push(ai.dataset.pfAddInt); saveSp(p); renderPage('profile'); return; }
  const di = t.closest('[data-pf-del-int]');
  if (di) { const p = sp(); p.interests = p.interests.filter((x) => x !== di.dataset.pfDelInt); saveSp(p); renderPage('profile'); return; }
  const ds = t.closest('[data-pf-del-skill]');
  if (ds) { const p = sp(); p.skills = p.skills.filter((x) => x !== ds.dataset.pfDelSkill); saveSp(p); renderPage('profile'); return; }
  const db_ = t.closest('[data-pf-del-book]');
  if (db_) {
    if (!db_.dataset.armed) { db_.dataset.armed = '1'; db_.textContent = 'احذف؟'; db_.classList.add('is-armed'); return; }
    const p = sp(); p.books = p.books.filter((x) => x.id !== db_.dataset.pfDelBook); saveSp(p); renderPage('profile'); return;
  }
  if (t.closest('[data-pf-suggest]')) {
    const p = sp();
    askAbout(`اقترح لي ٥ كتب عربية مناسبة لطالب ثانوي حسب اهتماماتي (${p.interests.join('، ') || 'ما حددت'})${p.books.length ? `، وأنا قريت: ${p.books.map((b) => b.title).join('، ')}` : ''}. لكل كتاب: اسمه، مؤلفه، وليش يناسبني بجملة.`);
  }
});
document.addEventListener('submit', (e) => {
  const f = e.target;
  if (!f.matches('[data-pf-int-form], [data-pf-skill-form], [data-pf-book-form]')) return;
  e.preventDefault();
  if (role() !== 'student') return;
  const p = sp();
  if (f.matches('[data-pf-int-form]')) {
    const v = $('#pf-int').value.trim();
    if (v && !p.interests.includes(v) && p.interests.length < 20) p.interests.push(v);
  } else if (f.matches('[data-pf-skill-form]')) {
    const v = $('#pf-skill').value.trim();
    if (v && !p.skills.includes(v) && p.skills.length < 20) p.skills.push(v);
  } else {
    const title = $('#pf-b-title').value.trim();
    if (!title) { toast('اكتب اسم الكتاب'); return; }
    p.books.unshift({ id: uid(), title, author: $('#pf-b-author').value.trim(), status: simpleVal('pf-b-status') || 'قرأته', rating: Number(simpleVal('pf-b-rate') || 4), note: $('#pf-b-note').value.trim() });
    toast('انضاف الكتاب 📚');
  }
  saveSp(p);
  renderPage('profile');
});

/* =========================================================
   ٧) الانتقال بين الصفحات (View Transitions)
   ========================================================= */
function navShow() {
  closeTour();
  if (document.startViewTransition && !reducedMotion()) {
    const vt = document.startViewTransition(() => show());
    // لو المستخدم تنقّل بسرعة، الانتقال القديم يتلغى — عادي
    vt.ready.catch(() => {}); vt.finished.catch(() => {}); vt.updateCallbackDone.catch(() => {});
  } else show();
}

/* =========================================================
   البداية
   ========================================================= */
if (state.plan && (!Array.isArray(state.plan.week) || state.plan.week.length !== 7 || !state.answers)) { state.plan = null; }
if (profile) { seed(); migrate(); }
chat.turns = db.get('chat:' + (role() || 'student'), chat.turns);
renderChrome();
if (focus) { if (Date.now() >= focus.endAt) finishFocus(); else runFocusTick(); }
show();
