import './fonts.css';
import './style.css';
import { ASPECTS, ASPECT_ORDER, QUESTIONS, SCALE, INTRO, TIE_TEXT } from './data.js';

const app = document.querySelector('#app');

const TIPS = {
  cognitive:
    'Вы хорошо защищены от красивых обещаний. Одна тонкость: иногда рекламу, которая зацепила вас не логикой, а чувством, откладывают в сторону, хотя за ней стоит толковая вещь. Дайте ей шанс — и уже потом проверяйте факты.',
  emotional:
    'Эмоции — точный компас, но и удобный крючок. Если хочется купить «на настроении», сделайте паузу на сутки: осталось желание — значит, это было про вас, а не про ролик.',
  motivational:
    'Вы рациональны, и это экономит ресурсы. Следите только за обратной ловушкой: погоня за выгодой иногда заставляет покупать то, что вам не нужно. Спрашивайте себя не только о том, насколько это выгодно, но и о том, нужно ли вам это вообще.',
  social:
    'Вы тонко чувствуете людей и тренды. Время от времени проверяйте: купили бы вы это, если бы об этом никто не узнал? Ответ помогает отделить своё желание от ожиданий окружения.',
};

const LOADING_LINES = [
  'Считаем ваши ответы…',
  'Складываем четыре аспекта…',
  'Сверяем с профилями…',
  'Готово. Вот ваш результат.',
];

const state = {
  screen: 'intro', // intro | question | loading | result
  answers: Array(QUESTIONS.length).fill(null),
  index: 0,
  result: null,
  loadToken: 0,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ── Подсчёт ─────────────────────────────────────────────── */

function computeResult(answers) {
  const raw = {};
  const maxByAspect = {};
  for (const k of ASPECT_ORDER) {
    raw[k] = 0;
    maxByAspect[k] = 0;
  }

  QUESTIONS.forEach((q, i) => {
    raw[q.aspect] += answers[i] ?? 3;
    maxByAspect[q.aspect] += 5;
  });

  const pct = {};
  for (const k of ASPECT_ORDER) {
    pct[k] = Math.round((raw[k] / maxByAspect[k]) * 100);
  }

  const max = Math.max(...ASPECT_ORDER.map((k) => raw[k]));
  const tied = ASPECT_ORDER.filter((k) => raw[k] === max);

  return { raw, maxByAspect, pct, dominant: tied[0], tied };
}

/* ── Разметка ────────────────────────────────────────────── */

function topline({ progress = null } = {}) {
  return `
    <header class="topline">
      <span class="brand"><span class="brand-mark" aria-hidden="true"></span>Аспекты рекламы</span>
      ${
        progress === null
          ? '<span></span>'
          : `<div class="progress-wrap" aria-hidden="true">
               <span>${progress.answered}/${progress.total}</span>
               <span class="progress-track"><span class="progress-fill" style="width:${progress.percent}%"></span></span>
             </div>`
      }
    </header>`;
}

function introScreen() {
  return `
    ${topline()}
    <main class="screen hero">
      <span class="kicker">Анонимный мини-опросник</span>
      <h1>${esc(INTRO.title)}</h1>
      <p class="lede">${esc(INTRO.text)}</p>

      <div class="meta-row">
        <span class="chip">12 вопросов</span>
        <span class="chip">≈ 2 минуты</span>
        <span class="chip">4 аспекта</span>
        <span class="chip">Без регистрации</span>
      </div>

      <ul class="aspect-list">
        ${ASPECT_ORDER.map(
          (k, i) => `
            <li>
              <span class="n">0${i + 1}</span>
              <span class="t">${esc(ASPECTS[k].title)}</span>
              <span class="s">${esc(ASPECTS[k].tagline)}</span>
            </li>`
        ).join('')}
      </ul>

      <div class="cta-row">
        <button class="btn" type="button" data-act="start">Начать тест</button>
        <span class="fineprint">${esc(INTRO.note)}</span>
      </div>

      <footer class="footer">
        <span>Опросник о восприятии рекламы</span>
        <span>Не является психологической диагностикой</span>
      </footer>
    </main>`;
}

function questionScreen() {
  const total = QUESTIONS.length;
  const i = state.index;
  const q = QUESTIONS[i];
  const answer = state.answers[i];

  return `
    ${topline({ progress: { answered: i + 1, total, percent: Math.round(((i + 1) / total) * 100) } })}
    <main class="screen">
      <div class="q-head">
        <span class="q-count"><strong>Вопрос ${i + 1}</strong> из ${total}</span>
      </div>

      <h2 class="question" id="q-text">${esc(q.text)}</h2>

      <div class="options" role="radiogroup" aria-labelledby="q-text">
        ${SCALE.map(
          (o) => `
            <button class="option" type="button" role="radio" aria-checked="${answer === o.value}"
              data-act="answer" data-value="${o.value}">
              <span class="dot" aria-hidden="true"></span>
              <span class="label">${esc(o.label)}</span>
              <span class="num" aria-hidden="true">${o.value}</span>
            </button>`
        ).join('')}
      </div>

      <div class="q-foot">
        <button class="linkbtn" type="button" data-act="back">${i === 0 ? '← В начало' : '← Назад'}</button>
        ${
          answer !== null
            ? `<button class="linkbtn" type="button" data-act="next">${
                i === total - 1 ? 'Показать результат →' : 'Дальше →'
              }</button>`
            : `<span class="hint">Выберите ответ, чтобы продолжить</span>`
        }
      </div>
    </main>`;
}

function loadingScreen() {
  return `
    ${topline()}
    <main class="screen loading">
      <div class="pulse" aria-hidden="true"><i></i><i></i><i></i></div>
      <p class="loading-text" id="load-text">${esc(LOADING_LINES[0])}</p>
    </main>`;
}

function resultScreen() {
  const r = state.result;
  const lead = ASPECTS[r.dominant];
  const isTie = r.tied.length > 1;

  const maxRaw = r.maxByAspect[r.dominant];

  return `
    ${topline()}
    <main class="screen">
      <div class="result-head">
        <span class="result-eyebrow">Ваш результат</span>

        <section class="type-block" style="--type-color:${lead.color};--type-soft:${lead.soft}">
          <span class="type-number">Аспект ${lead.number}</span>
          <h1 class="type-name">${esc(lead.title)}</h1>
          <p class="type-tagline">${esc(lead.tagline)}</p>
          <p class="type-desc">${esc(lead.description)}</p>
          <span class="type-score">Выраженность: <b>${r.pct[r.dominant]}%</b> <span>(${r.raw[r.dominant]} из ${maxRaw})</span></span>
        </section>

        ${
          isTie
            ? `<p class="fineprint" style="margin-top:14px">${esc(TIE_TEXT)} Близкие результаты: ${r.tied
                .map((k) => esc(ASPECTS[k].title.toLowerCase()))
                .join(', ')}.</p>`
            : ''
        }
      </div>

      <h2 class="section-title">Профиль восприятия</h2>
      <div class="chart">
        ${ASPECT_ORDER.map((k) => {
          const a = ASPECTS[k];
          return `
            <div class="bar-row">
              <div class="bar-top">
                <span class="bar-name"><span class="mark" style="--c:${a.color}"></span>${esc(a.title)}</span>
                <span class="bar-val">${r.pct[k]}%</span>
              </div>
              <div class="bar-track" role="img" aria-label="${esc(a.title)}: ${r.pct[k]}%">
                <div class="bar-fill${k === r.dominant ? ' lead' : ''}" style="--c:${a.color}" data-w="${r.pct[k]}"></div>
              </div>
            </div>`;
        }).join('')}
      </div>

      <h2 class="section-title">Что означают аспекты</h2>
      <div class="aspect-cards">
        ${ASPECT_ORDER.map((k) => {
          const a = ASPECTS[k];
          return `
            <details class="aspect-card" style="--c:${a.color}">
              <summary>
                <span class="mark" aria-hidden="true"></span>
                ${esc(a.title)}
                <span class="plus" aria-hidden="true">+</span>
              </summary>
              <div class="body">
                <p class="short">${esc(a.short)}</p>
                <p>${esc(a.description)}</p>
              </div>
            </details>`;
        }).join('')}
      </div>

      <section class="tip-block">
        <h3>На что обратить внимание</h3>
        <p>${esc(TIPS[r.dominant])}</p>
      </section>

      <div class="result-actions">
        <button class="btn" type="button" data-act="restart">Пройти ещё раз</button>
        <button class="btn ghost" type="button" data-act="copy">Скопировать результат</button>
      </div>

      <details class="aspect-card how">
        <summary>
          Как считается результат
          <span class="plus" aria-hidden="true">+</span>
        </summary>
        <div class="body">
          <p>В каждой группе по 3 утверждения. Ответ «совсем не про меня» даёт 1 балл, «это точно про меня» — 5.
          Сумма по группе переводится в проценты от максимума (15 баллов). Главный аспект — тот, где баллов больше всего.</p>
        </div>
      </details>

      <p class="disclaimer">
        Это развлекательный опросник о восприятии рекламы, а не психологическая диагностика.
        Ответы никуда не отправляются: все расчёты происходят прямо в вашем браузере.
      </p>

      <footer class="footer">
        <span>Аспекты рекламы</span>
        <span>Когнитивный · Эмоциональный · Мотивационный · Социальный</span>
      </footer>
    </main>`;
}

/* ── Рендер ──────────────────────────────────────────────── */

function render() {
  if (state.screen === 'intro') app.innerHTML = introScreen();
  else if (state.screen === 'question') app.innerHTML = questionScreen();
  else if (state.screen === 'loading') app.innerHTML = loadingScreen();
  else if (state.screen === 'result') app.innerHTML = resultScreen();

  if (state.screen === 'result') {
    requestAnimationFrame(() => {
      document.querySelectorAll('.bar-fill').forEach((el) => {
        el.style.width = `${el.dataset.w}%`;
      });
    });
  }
}

function goto(screen) {
  state.screen = screen;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Действия ────────────────────────────────────────────── */

function start() {
  state.answers = Array(QUESTIONS.length).fill(null);
  state.index = 0;
  state.result = null;
  goto('question');
}

function choose(value) {
  state.answers[state.index] = value;

  // мгновенно отмечаем выбор, затем мягко переходим дальше
  document.querySelectorAll('.option').forEach((el) => {
    el.setAttribute('aria-checked', String(Number(el.dataset.value) === value));
  });

  const last = state.index === QUESTIONS.length - 1;
  const currentIndex = state.index;
  window.setTimeout(() => {
    if (state.index !== currentIndex) return; // пользователь уже ушёл с вопроса
    if (last) finish();
    else {
      state.index += 1;
      render();
    }
  }, 260);
}

function nextQuestion() {
  if (state.answers[state.index] === null) return;
  if (state.index === QUESTIONS.length - 1) finish();
  else {
    state.index += 1;
    render();
  }
}

function backQuestion() {
  if (state.index === 0) {
    goto('intro');
  } else {
    state.index -= 1;
    render();
  }
}

async function finish() {
  if (state.answers.some((a) => a === null)) {
    // на случай пропусков — подставляем нейтральный ответ
    state.answers = state.answers.map((a) => (a === null ? 3 : a));
  }
  state.result = computeResult(state.answers);
  goto('loading');

  const token = ++state.loadToken;
  const textEl = () => document.querySelector('#load-text');

  for (let i = 1; i < LOADING_LINES.length; i++) {
    await sleep(620);
    if (token !== state.loadToken) return;
    const el = textEl();
    if (el) el.textContent = LOADING_LINES[i];
  }

  await sleep(460);
  if (token !== state.loadToken) return;
  goto('result');
}

function restart() {
  state.loadToken++;
  start();
}

async function copyResult() {
  const r = state.result;
  if (!r) return;
  const lead = ASPECTS[r.dominant];
  const text =
    `Мой профиль восприятия рекламы: ${lead.title} аспект, ${r.pct[r.dominant]}%.\n` +
    ASPECT_ORDER.map((k) => `${ASPECTS[k].title}: ${r.pct[k]}%`).join(' · ') +
    `\nТест: ${location.href}`;

  try {
    await navigator.clipboard.writeText(text);
    flashButton('copy', 'Скопировано ✓');
  } catch {
    flashButton('copy', 'Не получилось скопировать');
  }
}

function flashButton(act, label) {
  const btn = document.querySelector(`[data-act="${act}"]`);
  if (!btn) return;
  const original = btn.textContent;
  btn.textContent = label;
  window.setTimeout(() => {
    btn.textContent = original;
  }, 1600);
}

/* ── События ─────────────────────────────────────────────── */

app.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const act = btn.dataset.act;

  if (act === 'start' || act === 'restart') start();
  else if (act === 'answer') choose(Number(btn.dataset.value));
  else if (act === 'next') nextQuestion();
  else if (act === 'back') backQuestion();
  else if (act === 'copy') copyResult();
});

document.addEventListener('keydown', (e) => {
  if (state.screen !== 'question') return;
  if (e.key >= '1' && e.key <= '5') choose(Number(e.key));
  else if (e.key === 'ArrowRight' || e.key === 'Enter') {
    if (state.answers[state.index] !== null) nextQuestion();
  } else if (e.key === 'ArrowLeft') backQuestion();
});

render();
