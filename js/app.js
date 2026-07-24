/* 姓名判断 〜五格剖象法〜 UI・アニメーション制御 */
'use strict';

(function () {
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  let current = null; // { result, meta }
  let poemOffset = 0;
  let running = false;

  /* ============ 入力 ============ */
  let variantChoices = {}; // 入力された字 → 本人が選んだ字体（例: '高' → '髙'）

  $('startBtn').addEventListener('click', () => { run().catch(console.error); });
  ['seiInput', 'meiInput'].forEach((id) => {
    $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') run().catch(console.error); });
    $(id).addEventListener('input', () => {
      variantChoices = {};
      $('variantPanel').classList.add('hidden');
    });
  });

  function splitChars(s) {
    return [...s.replace(/[\s　]/g, '')];
  }

  /* 異体字の確認パネル: 戸籍の字がどちらかを本人に選んでもらう */
  function askVariants(pending) {
    const panel = $('variantPanel');
    panel.innerHTML = `
      <p class="variant-title">字体の確認</p>
      <p class="variant-desc">同じ読みで字体が複数ある漢字が含まれています。戸籍・普段お使いの字を選んでください（画数が変わります）。</p>`;
    for (const ch of pending) {
      const row = document.createElement('div');
      row.className = 'variant-row';
      row.innerHTML = window.ITAIJI[ch].map(([v, label], i) => `
        <label class="variant-option">
          <input type="radio" name="variant-${ch}" value="${v}" ${i === 0 ? 'checked' : ''}>
          <span class="variant-glyph">${v}</span>
          <span class="variant-label">${label}・${window.STROKES[v]}画</span>
        </label>`).join('');
      panel.appendChild(row);
    }
    const btn = document.createElement('button');
    btn.className = 'primary-btn variant-btn';
    btn.textContent = 'この字で鑑定する';
    btn.addEventListener('click', () => {
      for (const ch of pending) {
        variantChoices[ch] = panel.querySelector(`input[name="variant-${ch}"]:checked`).value;
      }
      panel.classList.add('hidden');
      run().catch(console.error);
    });
    panel.appendChild(btn);
    panel.classList.remove('hidden');
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function run() {
    if (running) return;
    let seiChars = splitChars($('seiInput').value);
    let meiChars = splitChars($('meiInput').value);
    const err = $('inputError');
    err.textContent = '';
    if (!seiChars.length || !meiChars.length) {
      err.textContent = '姓と名を両方入れてください。';
      return;
    }

    // 異体字（髙/高 など）が含まれていて未確認なら、先に字体を選んでもらう
    const pending = [...new Set([...seiChars, ...meiChars])]
      .filter((ch) => window.ITAIJI[ch] && !(ch in variantChoices));
    if (pending.length) {
      askVariants(pending);
      return;
    }
    seiChars = seiChars.map((ch) => variantChoices[ch] || ch);
    meiChars = meiChars.map((ch) => variantChoices[ch] || ch);

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
    const talk = window.Bokuden.buildTalk(current.result, meta);
    const poem = window.Bokuden.buildPoem(current.result, meta);

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

  /* ============ 5. A4 PDFレポート ============ */
  ['pdfBtn', 'pdfBtnResult'].forEach((id) => {
    $(id).addEventListener('click', () => { printReport(); });
  });

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function printReport() {
    if (!current) return;
    const { result, meta } = current;
    const { kaku } = result;

    const today = new Date();
    const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
    const modeLabel = result.mode === 'kyu' ? '旧字体・伝統画数（熊崎式）' : '新字体・実画数';

    // 文字と画数
    const charRows = [...result.sei, ...result.mei].map((c) => `
      <div class="pr-char">
        <div class="pr-char-glyph">${esc(c.display)}</div>
        <div class="pr-char-n">${c.n}画</div>
        ${c.display !== c.ch ? `<div class="pr-char-note">「${esc(c.ch)}」の旧字体</div>` : ''}
        ${c.notes.length ? `<div class="pr-char-note">${esc(c.notes.join('・'))}</div>` : ''}
      </div>`).join('');

    // 五格
    const order = ['jinkaku', 'chikaku', 'gaikaku', 'soukaku', 'tenkaku'];
    const kakuRows = order.map((key) => {
      const n = kaku[key];
      const reduced = window.Gokaku.reduce81(n);
      const s = window.SUJI[reduced];
      const info = window.KAKU_INFO[key];
      const numLabel = reduced === n ? `${n}画` : `${n}画→${reduced}`;
      return `
        <tr>
          <th>${esc(info.label)}</th>
          <td class="pr-num">${numLabel}</td>
          <td class="pr-suji">「${esc(s.name)}」</td>
          <td class="pr-rank ${window.rankClass(s.rank)}">${esc(s.rank)}</td>
          <td class="pr-text">${esc(s.text)}<span class="pr-desc">${esc(info.desc)}</span></td>
        </tr>`;
    }).join('');

    const ss = window.Gokaku.sansai(kaku);
    const iy = window.Gokaku.inyouArray(result.sei, result.mei);

    // トークと一行詩（色紙をまだ出していなくても同じシードで再現できる）
    const talkMeta = { ...meta, offset: poemOffset };
    const talk = window.Bokuden.buildTalk(result, talkMeta);
    const poem = window.Bokuden.buildPoem(result, talkMeta);

    const talkHtml = talk.split('\n\n').map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');

    $('printReport').innerHTML = `
      <header class="pr-header">
        <p class="pr-sub">熊崎式・五格剖象法　姓名判断レポート</p>
        <h1 class="pr-name">${esc(meta.fullName)}</h1>
        <p class="pr-meta">鑑定日: ${dateStr}　／　画数の数え方: ${esc(modeLabel)}</p>
      </header>

      <section class="pr-section">
        <h2>文字と画数</h2>
        <div class="pr-chars">${charRows}</div>
      </section>

      <section class="pr-section">
        <h2>五格の鑑定</h2>
        <table class="pr-table">${kakuRows}</table>
      </section>

      <section class="pr-section pr-two-col">
        <div>
          <h2>三才配置（五行）</h2>
          <p class="pr-inline"><strong>天${ss.ten}・人${ss.jin}・地${ss.chi}</strong>（${ss.r1}／${ss.r2}）
            <span class="pr-rank-inline">${esc(ss.rank)}</span></p>
          <p>${esc(ss.text)}</p>
        </div>
        <div>
          <h2>陰陽配列</h2>
          <p class="pr-inline"><strong class="pr-inyou">${iy.arr.join('')}</strong>
            <span class="pr-rank-inline">${esc(iy.rank)}</span></p>
          <p>${esc(iy.text)}（奇数画＝陽○、偶数画＝陰●）</p>
        </div>
      </section>

      <section class="pr-section">
        <h2>鑑定トーク</h2>
        <div class="pr-talk">${talkHtml}</div>
      </section>

      <section class="pr-section pr-shikishi-sec">
        <h2>あなたへの一行</h2>
        <div class="pr-shikishi">
          <span class="pr-poem">${esc(poem)}</span>
          <span class="pr-sign">${esc(meta.meiChars[0] || '福')}</span>
        </div>
      </section>

      <footer class="pr-footer">
        <p>※ 画数の数え方（旧字体・部首・かな）は流派により異なります。本レポートは熊崎式で広く用いられる基準を採用しています。</p>
        <p>姓名判断 〜五格剖象法〜　／　筆順データ: KanjiVG（CC BY-SA 3.0）・画数辞書: KANJIDIC2（EDRDG）</p>
      </footer>`;

    window.print();
  }
})();
