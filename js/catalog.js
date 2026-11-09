// Каталог фильмов: List, Detail и CRUD (создание, просмотр, изменение, удаление).
// Начальные данные берём из data/films.json через fetch, как на уроке.
// Изменения сохраняются в localStorage браузера, потому что у сайта нет сервера.

const DATA_URL = 'data/films.json';
const STORAGE_KEY = 'reestr_films_v1';
const NO_COVER = 'img/favicon.svg';

const filmGrid = document.getElementById('film-grid');
const searchInput = document.getElementById('search');
const countEl = document.getElementById('count');
const detailSection = document.getElementById('detail-section');
const detailCard = document.getElementById('detail-card');
const closeBtn = document.getElementById('close-btn');

const formSection = document.getElementById('form-section');
const filmForm = document.getElementById('film-form');
const formTitle = document.getElementById('form-title');
const formClose = document.getElementById('form-close');
const addBtn = document.getElementById('add-btn');
const resetBtn = document.getElementById('reset-btn');
const toastEl = document.getElementById('toast');

let filmsData = [];
let editingId = null;      // null — создаём новый фильм, число — изменяем существующий

/* ---------- защита от вставки HTML ---------- */

function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
    ));
}

/* ---------- хранилище ---------- */

function saveFilms() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filmsData));
    } catch (e) {
        console.error('Не удалось сохранить', e);
        showToast('Не удалось сохранить изменения в браузере');
    }
}

function readSaved() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const list = raw ? JSON.parse(raw) : null;
        return Array.isArray(list) ? list : null;
    } catch (e) {
        return null;
    }
}

async function loadSeed() {
    try {
        const response = await fetch(DATA_URL);
        if (!response.ok) throw new Error(`Ошибка: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Ошибка JSON', error);
        // Если страницу открыли двойным щелчком (file://), fetch не работает.
        // Тогда берём запасную копию данных из data/films-data.js.
        return window.FILMS_FALLBACK ? JSON.parse(JSON.stringify(window.FILMS_FALLBACK)) : null;
    }
}

async function loadFilms() {
    const saved = readSaved();
    if (saved) {
        filmsData = saved;
    } else {
        const seed = await loadSeed();
        if (!seed) {
            filmGrid.innerHTML = '<p class="cat-error">Не удалось загрузить данные. Откройте сайт через Live Server.</p>';
            return;
        }
        filmsData = seed;
    }
    renderCurrent();
}

/* ---------- уведомление ---------- */

let toastTimer;
function showToast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

/* ---------- Read: список ---------- */

function renderCurrent() {
    const q = searchInput.value.trim().toLowerCase();
    const result = filmsData.filter(film =>
        film.name.toLowerCase().includes(q) ||
        (film.original || '').toLowerCase().includes(q) ||
        (film.specs?.['Режиссёр'] || '').toLowerCase().includes(q)
    );
    renderFilmsList(result);
}

function renderFilmsList(films, newId = null) {
    filmGrid.innerHTML = '';
    countEl.textContent = `Найдено: ${films.length} из ${filmsData.length}`;

    if (films.length === 0) {
        filmGrid.innerHTML = '<p class="cat-error">Ничего не нашлось. Попробуйте другое слово.</p>';
        return;
    }

    films.forEach(film => {
        const card = document.createElement('div');
        card.className = 'cat-card' + (film.id === newId ? ' is-new' : '');
        card.tabIndex = 0;
        card.dataset.id = film.id;
        card.innerHTML = `
        <div class="cat-pic">
            <img src="${esc(film.image || NO_COVER)}" alt="Обложка: ${esc(film.name)}" loading="lazy" onerror="this.src='${NO_COVER}'">
            <span class="cat-badge">${esc(film.wins)}</span>
        </div>
        <div class="cat-info">
            <h3 class="cat-title">${esc(film.name)}</h3>
            <p class="cat-sub">${esc(film.year)} · ${esc(film.specs?.['Режиссёр'] || 'режиссёр не указан')}</p>
            <p class="cat-rating">IMDb ${Number(film.rating).toFixed(1)}</p>
        </div>
        `;
        card.addEventListener('click', () => showFilmDetail(film.id));
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') showFilmDetail(film.id);
        });
        filmGrid.appendChild(card);
    });
}

searchInput.addEventListener('input', renderCurrent);

/* ---------- Read: подробности (модальное окно) ---------- */

function showFilmDetail(film_id) {
    const film = filmsData.find(f => f.id === film_id);
    if (!film) return;

    const specsList = Object.entries(film.specs || {})
        .filter(([, value]) => value)
        .map(([key, value]) => `<li><strong>${esc(key)}:</strong> ${esc(value)}</li>`)
        .join('');

    const awardsList = (film.awards || [])
        .map(a => `<li><strong>${esc(a.category)}</strong><span>${esc(a.winner)}</span></li>`)
        .join('');

    const castList = (film.cast || [])
        .map(p => `<li><strong>${esc(p.name)}</strong> <span class="role">${esc(p.role)}</span></li>`)
        .join('');

    const r = film.ratings || {};
    const trailerLink = film.trailer
        ? `<a class="btn ghost" href="${esc(film.trailer)}" target="_blank" rel="noopener">Трейлер на YouTube</a>`
        : '';
    const pageLink = film.page
        ? `<a class="btn" href="${esc(film.page)}">Страница фильма</a>`
        : '';

    detailCard.innerHTML = `
    <div class="detail-layout">
        <img src="${esc(film.image || NO_COVER)}" alt="${esc(film.name)}" class="detail-img" onerror="this.src='${NO_COVER}'">
        <div class="detail-body">
            <p class="label">${esc(film.year)} · ${esc(film.wins)} из ${esc(film.nominations)} номинаций</p>
            <h2 id="detail-title">${esc(film.name)}</h2>
            <p class="detail-orig">${esc(film.original)}</p>
            <p class="detail-desc">${esc(film.description)}</p>

            ${specsList ? `<div class="detail-specs"><strong>Основное</strong><ul>${specsList}</ul></div>` : ''}

            <div class="detail-rates">
                <div><span>IMDb</span><b>${esc(r.imdb ?? film.rating)}</b></div>
                <div><span>Кинопоиск</span><b>${esc(r.kinopoisk ?? '—')}</b></div>
                <div><span>Rotten Tomatoes</span><b>${esc(r.rottenTomatoes ?? '—')}</b></div>
            </div>

            ${castList ? `<div class="detail-specs"><strong>В ролях</strong><ul>${castList}</ul></div>` : ''}

            ${awardsList ? `<details class="detail-awards"><summary>Награды (${film.awards.length})</summary><ul>${awardsList}</ul></details>` : ''}

            <div class="detail-actions">
                ${pageLink}
                ${trailerLink}
                <button type="button" class="btn ghost" data-act="edit">Изменить</button>
                <button type="button" class="btn danger" data-act="delete">Удалить</button>
            </div>
        </div>
    </div>
    `;

    detailCard.querySelector('[data-act="edit"]').addEventListener('click', () => {
        closeDetail();
        openForm(film.id);
    });
    detailCard.querySelector('[data-act="delete"]').addEventListener('click', () => deleteFilm(film.id));

    detailSection.classList.remove('hidden'); // модалка
    document.body.classList.add('modal-open');
    detailSection.querySelector('.modal-content').scrollTop = 0;
}

function closeDetail() {
    detailSection.classList.add('hidden');
    if (formSection.classList.contains('hidden')) document.body.classList.remove('modal-open');
}

closeBtn.addEventListener('click', closeDetail);
detailSection.addEventListener('click', (e) => {
    if (e.target === detailSection) closeDetail();
});

/* ---------- Create и Update: форма ---------- */

function openForm(id = null) {
    editingId = id;
    filmForm.reset();
    filmForm.classList.remove('was-checked');

    if (id === null) {
        formTitle.textContent = 'Новый фильм';
        filmForm.elements.year.value = new Date().getFullYear();
        filmForm.elements.wins.value = 1;
        filmForm.elements.nominations.value = 1;
    } else {
        const film = filmsData.find(f => f.id === id);
        formTitle.textContent = 'Изменить фильм';
        filmForm.elements.name.value = film.name;
        filmForm.elements.original.value = film.original || '';
        filmForm.elements.year.value = film.year;
        filmForm.elements.wins.value = film.wins;
        filmForm.elements.nominations.value = film.nominations;
        filmForm.elements.rating.value = film.rating;
        filmForm.elements.director.value = film.specs?.['Режиссёр'] || '';
        filmForm.elements.runtime.value = film.specs?.['Длительность'] || '';
        filmForm.elements.studio.value = film.specs?.['Студия'] || '';
        filmForm.elements.image.value = film.image || '';
        filmForm.elements.trailer.value = film.trailer || '';
        filmForm.elements.description.value = film.description || '';
    }

    formSection.classList.remove('hidden');
    document.body.classList.add('modal-open');
    formSection.querySelector('.modal-content').scrollTop = 0;
    filmForm.elements.name.focus();
}

function closeForm() {
    formSection.classList.add('hidden');
    if (detailSection.classList.contains('hidden')) document.body.classList.remove('modal-open');
}

filmForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = filmForm.elements;
    const wins = Number(f.wins.value);
    const nominations = Number(f.nominations.value);

    if (wins > nominations) {
        f.wins.setCustomValidity('Побед не может быть больше, чем номинаций');
        f.wins.reportValidity();
        f.wins.setCustomValidity('');
        return;
    }

    const specs = {
        'Режиссёр': f.director.value.trim(),
        'Длительность': f.runtime.value.trim(),
        'Студия': f.studio.value.trim(),
        'Оскары': `${wins} из ${nominations} номинаций`
    };
    const fields = {
        name: f.name.value.trim(),
        original: f.original.value.trim(),
        year: Number(f.year.value),
        wins,
        nominations,
        rating: Number(f.rating.value),
        image: f.image.value.trim() || NO_COVER,
        trailer: f.trailer.value.trim() || null,
        description: f.description.value.trim(),
        specs
    };

    let focusId;
    if (editingId === null) {
        // Create
        const id = filmsData.reduce((max, film) => Math.max(max, film.id), 0) + 1;
        filmsData.push({
            id,
            slug: null,
            ...fields,
            ratings: { imdb: fields.rating, kinopoisk: '—', rottenTomatoes: '—' },
            awards: [],
            cast: [],
            facts: [],
            page: null
        });
        focusId = id;
        showToast(`Фильм «${fields.name}» добавлен`);
    } else {
        // Update
        const film = filmsData.find(item => item.id === editingId);
        Object.assign(film, fields);
        film.ratings = { ...(film.ratings || {}), imdb: fields.rating };
        focusId = film.id;
        showToast(`Фильм «${fields.name}» обновлён`);
    }

    saveFilms();
    searchInput.value = '';
    renderFilmsList(filmsData, focusId);
    closeForm();
    const card = filmGrid.querySelector(`[data-id="${focusId}"]`);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

addBtn.addEventListener('click', () => openForm(null));
formClose.addEventListener('click', closeForm);
document.getElementById('form-cancel').addEventListener('click', closeForm);
formSection.addEventListener('click', (e) => {
    if (e.target === formSection) closeForm();
});

/* ---------- Delete ---------- */

function deleteFilm(id) {
    const film = filmsData.find(f => f.id === id);
    if (!film) return;
    if (!confirm(`Удалить фильм «${film.name}»?`)) return;

    closeDetail();
    const card = filmGrid.querySelector(`[data-id="${id}"]`);
    const finish = () => {
        filmsData = filmsData.filter(f => f.id !== id);
        saveFilms();
        renderCurrent();
        showToast(`Фильм «${film.name}» удалён`);
    };

    if (card && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        card.classList.add('removing');           // плавное исчезновение
        setTimeout(finish, 380);
    } else {
        finish();
    }
}

/* ---------- сброс ---------- */

resetBtn.addEventListener('click', async () => {
    if (!confirm('Вернуть список из файла films.json? Все ваши изменения пропадут.')) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* нет доступа к хранилищу */ }
    const seed = await loadSeed();
    if (seed) {
        filmsData = seed;
        searchInput.value = '';
        renderCurrent();
        showToast('Список восстановлен из films.json');
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    closeDetail();
    closeForm();
});

document.addEventListener('DOMContentLoaded', loadFilms);
