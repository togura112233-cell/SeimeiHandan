/* 姓名判断 〜五格剖象法〜 UI・アニメーション制御 */
'use strict';

(function () {
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  let current = null; // { result, meta }
  let poemOffset = 0;
  let running = false;

  /* ============ 入力 ============ */
  $('startBtn').addEventListener('click', () => { run().catch(console.error); });
  ['seiInput', 'meiInput'].forEach((id) => {
    $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') run().catch(console.error); });
  });

  function splitChars(s) {
    return [...s.replace(/[\s　]/g, '')];
  }

  async function run() {
    if (running) return;
    const seiChars = splitChars($('seiInput').value);
    const meiChars = splitChars($('meiInput').value);
    const err = $('inputError');
    err.textContent = '';
    if (!seiChars.length || !meiChars.length) {
      err.textContent = '姓と名を両方入れてください。';
      return;
    }
    const mode = document.querySelector('input[name="mode"]:checked').value;
    const result = window.Gokaku.computeGokaku(seiChars, meiChars, mode);

    const unknown = [...result.sei, ...result.mei].filter((c) => c.unknown);
    if (unknown.length) {
      err.textContent = `この文字の画数が辞書にありません: ${unknown.map((c) => c.ch).join('、')}`;
      return;
    }

    current = {
      result,
      meta: {
        fullName: seiChars.join('') + ' ' + meiChars.join(''),
        seiChars, meiChars,
        offset: 0,
      },
    };
    poemOffset = 0;
    running = true;

    // ステージリセット
    ['strokeStage', 'diagramStage', 'resultStage', 'shikishiStage'].forEach((id) => $(id).classList.add('hidden'));
    $('strokeRow').innerHTML = '';
    $('diagram').innerHTML = '';
    $('kakuCards').innerHTML = '';
    $('aiResult').classList.add('hidden');

    try {
      await animateStrokes(result);
      await animateDiagram(result);
      await showResults(result);
    } finally {
      running = false;
    }
  }

  /* ============ 1. 筆順アニメーション ============ */
  async function animateStrokes(result) {
    const stage = $('strokeStage');
    stage.classList.remove('hidden');
    stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const row = $('strokeRow');

    const chars = [...result.sei, ...result.mei];
    for (const c of chars) {
      const cell = document.createElement('div');
      cell.className = 'stroke-cell';
      const box = document.createElement('div');
      box.className = 'stroke-box';
      const count = document.createElement('div');
      count.className = 'stroke-count';
      count.innerHTML = '<span class="num">0</span> 画';
      const note = document.createElement('div');
      note.className = 'stroke-note';
      cell.appendChild(box); cell.appendChild(count); cell.appendChild(note);
      row.appendChild(cell);
      requestAnimationFrame(() => cell.classList.add('on'));

      const numEl = count.querySelector('.num');
      const paths = (window.KANJIVG[c.vgChar] || '').split('|').filter(Boolean);

      if (paths.length) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 109 109');
        box.appendChild(svg);
        let drawn = 0;
        for (const d of paths) {
          const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          p.setAttribute('d', d);
          svg.appendChild(p);
          const len = p.getTotalLength();
          const dur = Math.min(0.34, Math.max(0.12, len / 420));
          p.style.strokeDasharray = String(len);
          p.style.strokeDashoffset = String(len);
          p.getBoundingClientRect(); // reflow
          p.style.transition = `stroke-dashoffset ${dur}s ease-in-out`;
          p.style.strokeDashoffset = '0';
          await sleep(dur * 1000 + 30);
          drawn++;
          numEl.textContent = String(drawn);
        }
        // 表示上の筆数と辞書画数がずれる場合は辞書値に合わせる
        const base = c.n - (adjOf(c) ? adjOf(c)[0] : 0);
        if (drawn !== base) numEl.textContent = String(base);
      } else {
        // 筆順データなし: 文字をフェード表示してカウントアップ
        const span = document.createElement('div');
        span.className = 'plain-char';
        span.textContent = c.display;
        box.appendChild(span);
        const base = c.n - (adjOf(c) ? adjOf(c)[0] : 0);
        for (let i = 1; i <= base; i++) {
          numEl.textContent = String(i);
          await sleep(55);
        }
      }

      // 部首補正の演出（伝統モード）
      const adj = adjOf(c);
      if (adj) {
        await sleep(250);
        numEl.textContent = String(c.n);
        numEl.style.transform = 'scale(1.25)';
        numEl.style.display = 'inline-block';
        numEl.style.transition = 'transform 0.25s';
        setTimeout(() => { numEl.style.transform = 'scale(1)'; }, 260);
        await sleep(380);
      }
      const rest = c.notes.filter((t) => !adj || !t.includes(adj[1]));
      if (adj || rest.length) {
        note.innerHTML = (adj ? `<span class="adj">＋${adj[0]}画</span> ${adj[1]}` : '') +
          (adj && rest.length ? '・' : '') + rest.join('・');
      }
      await sleep(140);
    }
    await sleep(500);
  }

  function adjOf(c) {
    // gokaku.js と同じ規則: 補正は表示字(旧字体)に登録があるときのみ
    if (current.result.mode !== 'kyu') return null;
    return window.RAD_ADJUST[c.display] || null;
  }

  /* ============ 2. 五格図 ============ */
  async function animateDiagram(result) {
    const stage = $('diagramStage');
    stage.classList.remove('hidden');
    stage.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const { sei, mei, kaku, reiTen, reiChi } = result;
    const grid = document.createElement('div');
    grid.className = 'diagram-grid';
    grid.style.gridTemplateColumns = '96px 96px 110px 96px';

    const rows = [];
    if (reiTen) rows.push({ type: 'rei', label: '霊数 1' });
    sei.forEach((c) => rows.push({ type: 'char', c }));
    mei.forEach((c) => rows.push({ type: 'char', c }));
    if (reiChi) rows.push({ type: 'rei', label: '霊数 1' });

    const seiRows = reiTen ? sei.length + 1 : sei.length;
    const totalRows = rows.length;

    // 文字タイル（3列目）
    rows.forEach((r, i) => {
      const el = document.createElement('div');
      if (r.type === 'rei') {
        el.className = 'dg-char dg-rei';
        el.textContent = r.label;
      } else {
        el.className = 'dg-char';
        el.innerHTML = `${r.c.display}<span class="dg-n">${r.c.n}</span>`;
      }
      el.style.gridColumn = '3';
      el.style.gridRow = String(i + 1);
      grid.appendChild(el);
    });

    const badges = [];
    function badge(label, num, col, rowStart, rowEnd) {
      const s = window.SUJI[window.Gokaku.reduce81(num)];
      const el = document.createElement('div');
      el.className = 'kaku-badge';
      el.innerHTML = `<span class="kb-label">${label}</span><span class="kb-num">${num}</span><span class="kb-rank ${window.rankClass(s.rank)}" style="background:none;color:inherit">${s.rank}</span>`;
      el.querySelector('.kb-rank').style.color = '';
      el.style.gridColumn = String(col);
      el.style.gridRow = `${rowStart} / ${rowEnd + 1}`;
      grid.appendChild(el);
      badges.push(el);
      return el;
    }

    badge('天格', kaku.tenkaku, 4, 1, seiRows);
    badge('地格', kaku.chikaku, 4, seiRows + 1, totalRows);
    badge('人格', kaku.jinkaku, 2, Math.max(1, seiRows), Math.min(totalRows, seiRows + 1));
    badge('外格', kaku.gaikaku, 1, 1, totalRows);
    // 総格は全幅の行
    const sou = document.createElement('div');
    const souSuji = window.SUJI[window.Gokaku.reduce81(kaku.soukaku)];
    sou.className = 'kaku-badge dg-span';
    sou.style.gridRow = String(totalRows + 1);
    sou.innerHTML = `<span class="kb-label">総格</span><span class="kb-num">${kaku.soukaku}</span><span class="kb-rank">${souSuji.rank}</span>`;
    grid.appendChild(sou);
    badges.push(sou);

    $('diagram').appendChild(grid);

    for (const b of badges) {
      await sleep(420);
      b.classList.add('on');
    }
    await sleep(600);
  }

  /* ============ 3. 結果カード ============ */
  async function showResults(result) {
    const stage = $('resultStage');
    stage.classList.remove('hidden');

    const { kaku } = result;
    const order = ['jinkaku', 'chikaku', 'gaikaku', 'soukaku', 'tenkaku'];
    const cardsEl = $('kakuCards');

    const cards = order.map((key) => {
      const n = kaku[key];
      const s = window.SUJI[window.Gokaku.reduce81(n)];
      const info = window.KAKU_INFO[key];
      const el = document.createElement('div');
      el.className = 'card kaku-card';
      const reduced = window.Gokaku.reduce81(n);
      const numHtml = reduced === n ? `${n}<small>画</small>` : `${n}<small>画→${reduced}</small>`;
      el.innerHTML = `
        <div class="kc-left">
          <div class="kc-kaku">${info.label}</div>
          <div class="kc-num">${numHtml}</div>
          <span class="kc-rank ${window.rankClass(s.rank)}">${s.rank}</span>
        </div>
        <div class="kc-body">
          <div class="kc-name">${reduced}画 「${s.name}」</div>
          <div class="kc-text">${s.text}</div>
          <div class="kc-desc">${info.desc}</div>
        </div>`;
      cardsEl.appendChild(el);
      return el;
    });

    // 三才配置
    const ss = window.Gokaku.sansai(kaku);
    $('sansaiCard').innerHTML = `
      <h3>三才配置（五行）</h3>
      <div class="gogyou-row">
        <span class="gogyou-ball g-${ss.ten}">${ss.ten}<small>天</small></span>
        <span class="gogyou-rel">${ss.r1}</span>
        <span class="gogyou-ball g-${ss.jin}">${ss.jin}<small>人</small></span>
        <span class="gogyou-rel">${ss.r2}</span>
        <span class="gogyou-ball g-${ss.chi}">${ss.chi}<small>地</small></span>
      </div>
      <p><span class="extra-rank ${''}">${ss.rank}</span>${ss.text}</p>`;

    // 陰陽配列
    const iy = window.Gokaku.inyouArray(result.sei, result.mei);
    $('inyouCard').innerHTML = `
      <h3>陰陽配列</h3>
      <div class="inyou-row">${iy.arr.join('')}</div>
      <p><span class="extra-rank">${iy.rank}</span>${iy.text}</p>
      <p style="font-size:0.82rem;color:var(--ink-soft)">奇数画＝陽（○）、偶数画＝陰（●）</p>`;

    stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    for (const c of cards) {
      await sleep(260);
      c.classList.add('on');
    }
  }

  /* ============ 4. 色紙（静の演出） ============ */
  $('poemBtn').addEventListener('click', () => { showShikishi().catch(console.error); });
  $('rerollBtn').addEventListener('click', () => {
    poemOffset++;
    showShikishi().catch(console.error);
  });
  $('resetBtn').addEventListener('click', () => {
    ['strokeStage', 'diagramStage', 'resultStage', 'shikishiStage'].forEach((id) => $(id).classList.add('hidden'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    $('seiInput').focus();
  });

  async function showShikishi() {
    if (!current) return;
    const stage = $('shikishiStage');
    stage.classList.remove('hidden');
    stage.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const meta = { ...current.meta, offset: poemOffset };
    const talk = window.Shinnosuke.buildTalk(current.result, meta);
    const poem = window.Shinnosuke.buildPoem(current.result, meta);

    $('talkName').textContent = `${current.meta.fullName} さんへ`;
    // 落款は相談者の名の一字（あなたのための色紙）
    document.querySelector('.shikishi-sign').textContent = current.meta.meiChars[0] || '福';

    // トークをタイプライター風に
    const body = $('talkBody');
    body.textContent = '';
    const poemEl = $('shikishiPoem');
    poemEl.innerHTML = '';
    document.querySelector('.shikishi-sign').classList.remove('on');

    for (let i = 0; i < talk.length; i += 3) {
      body.textContent = talk.slice(0, i + 3);
      await sleep(16);
    }
    body.textContent = talk;

    await sleep(900); // 「静」の間

    // 色紙に一文字ずつ
    const chars = [...poem];
    for (const ch of chars) {
      const sp = document.createElement('span');
      sp.textContent = ch === ' ' ? '　' : ch;
      poemEl.appendChild(sp);
    }
    for (const sp of poemEl.children) {
      await sleep(430);
      sp.classList.add('on');
    }
    await sleep(400);
    document.querySelector('.shikishi-sign').classList.add('on');
  }

  /* ============ 5. AI鑑定（Codex経由） ============ */
  $('aiBtn').addEventListener('click', () => { runAI().catch(console.error); });

  function summaryText() {
    const { result } = current;
    const { kaku } = result;
    const lines = [];
    const cs = [...result.sei, ...result.mei]
      .map((c) => `${c.ch}${c.display !== c.ch ? `(旧字体:${c.display})` : ''}=${c.n}画${c.notes.length ? '（' + c.notes.join('、') + '）' : ''}`);
    lines.push(`文字と画数: ${cs.join(' / ')}`);
    for (const key of ['tenkaku', 'jinkaku', 'chikaku', 'gaikaku', 'soukaku']) {
      const n = kaku[key];
      const s = window.SUJI[window.Gokaku.reduce81(n)];
      lines.push(`${window.KAKU_INFO[key].label}: ${n}画「${s.name}」${s.rank} — ${s.text}`);
    }
    const ss = window.Gokaku.sansai(kaku);
    lines.push(`三才配置: 天${ss.ten}・人${ss.jin}・地${ss.chi}（${ss.r1}／${ss.r2}）${ss.rank}`);
    const iy = window.Gokaku.inyouArray(result.sei, result.mei);
    lines.push(`陰陽配列: ${iy.arr.join('')} ${iy.rank}`);
    return lines.join('\n');
  }

  async function runAI() {
    if (!current) return;
    const btn = $('aiBtn');
    const out = $('aiResult');
    out.classList.remove('hidden');
    out.textContent = '筆を執っています……（Codexで鑑定文を生成中。1〜2分かかることがあります）';
    btn.disabled = true;
    try {
      const prompt = window.Shinnosuke.buildAIPrompt(current.result, current.meta, summaryText());
      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.text) out.textContent = data.text;
      else out.textContent = (data.error || 'AI鑑定を取得できませんでした。') + '\n※ この機能は `node bin/cli.js` で起動したときだけ使えます（Codexサブスク経由）。上のオフライン鑑定はいつでも動きます。';
    } catch (e) {
      out.textContent = 'AI鑑定はローカルサーバ経由でのみ利用できます。`node bin/cli.js` で起動してください。（オフライン鑑定はこのまま使えます）';
    } finally {
      btn.disabled = false;
    }
  }
})();
