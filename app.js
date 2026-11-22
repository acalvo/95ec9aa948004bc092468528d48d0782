(() => {
  'use strict';
  const TOTAL = window.PREGUNTAS.length;
  const LETTERS = ['A', 'B', 'C', 'D'];
  const $ = (id) => document.getElementById(id);

  const views = { setup: $('setup'), quiz: $('quiz'), result: $('result') };
  let queue = [], pos = 0, correct = 0, failed = [], answered = false, current = null;

  function show(name) {
    for (const [k, el] of Object.entries(views)) el.hidden = k !== name;
  }

  // "1-250, 4 18 29 48 199" -> [1..250, ...] (sin duplicados, orden de aparición)
  function parseSelection(text) {
    const tokens = text.split(/[\s,;]+/).filter(Boolean);
    if (!tokens.length) throw new Error('Escribe al menos una pregunta o un rango.');
    const seen = new Set(), out = [];
    const add = (n) => { if (!seen.has(n)) { seen.add(n); out.push(n); } };
    for (const t of tokens) {
      let m;
      if ((m = t.match(/^(\d+)$/))) {
        const n = +m[1];
        if (n < 1 || n > TOTAL) throw new Error(`La pregunta ${n} no existe (1-${TOTAL}).`);
        add(n);
      } else if ((m = t.match(/^(\d+)\s*[-–—]\s*(\d+)$/))) {
        const a = +m[1], b = +m[2];
        if (a > b) throw new Error(`Rango inválido: ${t} (el inicio es mayor que el final).`);
        if (a < 1 || b > TOTAL) throw new Error(`El rango ${t} se sale de 1-${TOTAL}.`);
        for (let i = a; i <= b; i++) add(i);
      } else {
        throw new Error(`No entiendo «${t}». Usa números y rangos como 1-128.`);
      }
    }
    return out;
  }

  // Permite escribir "1 - 250" con espacios alrededor del guion.
  const normalize = (s) => s.replace(/(\d)\s*([-–—])\s*(\d)/g, '$1$2$3');

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Opciones que dependen de otras ("todas las anteriores", "a y b"...): no se reordenan.
  const RELATIVE = /anteriores|todas las (respuestas|opciones)|ninguna de las|ambas|\b[a-d]\)|\by\s+[a-d]\b|opciones? [a-d]\b|respuestas? [a-d]\b|correctas|incorrectas/i;
  const canShuffle = (q) => !q.o.some((o) => RELATIVE.test(o));
  const currentMode = () => document.querySelector('input[name=orden]:checked').value;
  let mode = 'orden', perm = [0, 1, 2, 3], correctPos = 0;

  function start(ids, m) {
    mode = m;
    queue = m === 'orden' ? ids.slice().sort((a, b) => a - b) : shuffle(ids.slice());
    pos = 0; correct = 0; failed = [];
    show('quiz');
    render();
  }

  function render() {
    current = window.PREGUNTAS[queue[pos] - 1];
    answered = false;
    perm = [0, 1, 2, 3];
    if (mode === 'azar-total' && canShuffle(current)) shuffle(perm);
    correctPos = perm.indexOf(current.a);
    $('progress').textContent = `Pregunta ${pos + 1} de ${queue.length}`;
    updateScore();
    $('bar-fill').style.width = `${(pos / queue.length) * 100}%`;
    $('qid').textContent = `Nº ${current.id}`;
    $('qtext').textContent = current.q;
    const box = $('options');
    box.textContent = '';
    box.classList.remove('locked');
    perm.map((k) => current.o[k]).forEach((text, i) => {
      const lab = document.createElement('label');
      lab.className = 'opt';
      const inp = document.createElement('input');
      inp.type = 'radio'; inp.name = 'resp'; inp.value = i;
      const b = document.createElement('b'); b.textContent = LETTERS[i] + ')';
      const span = document.createElement('span'); span.textContent = text;
      lab.append(inp, b, span);
      box.append(lab);
    });
    $('feedback').hidden = true;
    $('send').hidden = false; $('send').disabled = true;
    $('next').hidden = true;
    window.scrollTo(0, 0);
  }

  const failedSorted = () => failed.slice().sort((x, y) => x - y);

  function updateScore() {
    $('n-ok').textContent = correct;
    const ko = $('n-ko');
    ko.textContent = failed.length;
    ko.disabled = !failed.length;
  }

  async function copyFailed() {
    const text = failedSorted().join(' ');
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.append(ta); ta.select();
      try { document.execCommand('copy'); } finally { ta.remove(); }
    }
    const ko = $('n-ko');
    ko.textContent = '¡Copiado!';
    clearTimeout(copyFailed.t);
    copyFailed.t = setTimeout(updateScore, 1200);
  }

  const selected = () => {
    const el = document.querySelector('input[name=resp]:checked');
    return el ? +el.value : -1;
  };

  function submit() {
    const sel = selected();
    if (answered || sel < 0) return;
    answered = true;
    const ok = sel === correctPos;
    if (ok) {
      // Acierto: se suma y se pasa directamente a la siguiente pregunta.
      correct++;
      updateScore();
      if (++pos < queue.length) render(); else finish();
      return;
    }
    failed.push(current.id);
    const opts = $('options').children;
    opts[correctPos].classList.add('correct');
    opts[sel].classList.add('wrong');
    $('options').classList.add('locked');
    document.querySelectorAll('input[name=resp]').forEach((i) => (i.disabled = true));
    const fb = $('feedback');
    fb.hidden = false;
    fb.className = 'ko';
    fb.textContent = `✘ Incorrecta. La respuesta correcta es la ${LETTERS[correctPos]}.`;
    updateScore();
    $('bar-fill').style.width = `${((pos + 1) / queue.length) * 100}%`;
    $('send').hidden = true;
    const next = $('next');
    next.hidden = false;
    next.textContent = pos + 1 < queue.length ? 'Siguiente' : 'Ver resultado';
    next.focus();
  }

  function next() {
    if (!answered) return;
    if (++pos < queue.length) render(); else finish();
  }

  function finish() {
    show('result');
    const n = queue.length, pct = Math.round((correct / n) * 100);
    $('result-summary').textContent = `${correct} de ${n} correctas (${pct} %)`;
    const sorted = failedSorted();
    $('failed-box').hidden = !sorted.length;
    $('retry-failed').hidden = !sorted.length;
    $('failed-list').textContent = sorted.join(' ');
  }

  $('setup-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const err = $('setup-error');
    try {
      const ids = parseSelection(normalize($('seleccion').value));
      err.hidden = true;
      start(ids, currentMode());
    } catch (ex) {
      err.textContent = ex.message; err.hidden = false;
    }
  });

  $('options').addEventListener('change', () => { if (!answered) $('send').disabled = false; });
  $('q-form').addEventListener('submit', (e) => { e.preventDefault(); if (!answered) submit(); else next(); });
  $('next').addEventListener('click', next);
  $('n-ko').addEventListener('click', copyFailed);
  $('quit').addEventListener('click', () => { if (confirm('¿Salir de la sesión actual?')) show('setup'); });
  $('again').addEventListener('click', () => show('setup'));
  $('retry-failed').addEventListener('click', () => {
    start(failed.slice(), currentMode());
  });

  document.addEventListener('keydown', (e) => {
    if (views.quiz.hidden || answered || e.ctrlKey || e.metaKey || e.altKey) return;
    const i = 'abcd1234'.indexOf(e.key.toLowerCase());
    if (i >= 0 && e.key.length === 1) {
      const inputs = document.querySelectorAll('input[name=resp]');
      const inp = inputs[i % 4];
      if (inp) { inp.checked = true; $('send').disabled = false; }
    }
  });
})();
