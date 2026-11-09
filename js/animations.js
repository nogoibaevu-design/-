// Анимации на событиях: mousemove / click / scroll / invalid.
// Если в системе включено «уменьшить движение», анимации не запускаются.

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 1. Событие mousemove / mouseleave: наклон карточки ---------- */

document.addEventListener('mousemove', (e) => {
    if (reduceMotion) return;
    const card = e.target.closest('.poster, .cat-card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;   // от -0.5 до 0.5
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.classList.add('tilt');
    card.style.setProperty('--ry', (x * 12).toFixed(1) + 'deg');
    card.style.setProperty('--rx', (-y * 12).toFixed(1) + 'deg');
});

document.addEventListener('mouseout', (e) => {
    const card = e.target.closest('.poster, .cat-card');
    if (!card || card.contains(e.relatedTarget)) return;
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
});

/* ---------- 2. Событие click: волна от места нажатия ---------- */

document.addEventListener('click', (e) => {
    if (reduceMotion) return;
    const target = e.target.closest('.btn, .poster, .cat-card, button');
    if (!target) return;
    const r = target.getBoundingClientRect();
    const size = Math.max(r.width, r.height);
    const wave = document.createElement('span');
    wave.className = 'wave';
    wave.style.width = wave.style.height = size + 'px';
    wave.style.left = (e.clientX - r.left - size / 2) + 'px';
    wave.style.top = (e.clientY - r.top - size / 2) + 'px';
    target.classList.add('has-wave');
    target.appendChild(wave);
    wave.addEventListener('animationend', () => wave.remove());
});

/* ---------- 3. Событие scroll: появление блоков, шапка, кнопка «Наверх» ---------- */

const revealItems = document.querySelectorAll(
    'main .wrap > *, .poster, table tbody tr, .quiz-q, fieldset'
);
if (!reduceMotion) revealItems.forEach(el => el.classList.add('js-reveal'));

const header = document.querySelector('.header');
const toTop = document.createElement('button');
toTop.className = 'to-top';
toTop.type = 'button';
toTop.setAttribute('aria-label', 'Наверх');
toTop.textContent = '↑';
toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
document.body.appendChild(toTop);

function onScroll() {
    const y = window.scrollY;
    if (header) header.classList.toggle('scrolled', y > 20);
    toTop.classList.toggle('show', y > 500);

    const limit = window.innerHeight * 0.92;
    document.querySelectorAll('.js-reveal:not(.is-in)').forEach((el, i) => {
        if (el.getBoundingClientRect().top < limit) {
            el.style.transitionDelay = Math.min(i, 5) * 60 + 'ms';
            el.classList.add('is-in');
        }
    });
}
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('load', onScroll);
// карточки каталога появляются позже, после загрузки JSON
new MutationObserver(() => {
    if (reduceMotion) return;
    document.querySelectorAll('.cat-card:not(.js-reveal)').forEach(el => el.classList.add('js-reveal'));
    onScroll();
}).observe(document.body, { childList: true, subtree: true });
onScroll();

/* ---------- 4. Событие invalid: поле формы «трясётся» при ошибке ---------- */

document.addEventListener('invalid', (e) => {
    const field = e.target;
    field.classList.remove('shake');
    void field.offsetWidth;            // перезапуск анимации
    field.classList.add('shake');
    field.addEventListener('animationend', () => field.classList.remove('shake'), { once: true });
}, true);
