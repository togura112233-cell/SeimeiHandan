/*
 * 五格剖象法（熊崎式）計算エンジン
 * - 画数モード: 'kyu' = 旧字体・康熙字典画数（熊崎式の本流） / 'shin' = 新字体の実画数
 * - 霊数: 一字姓は天格に+1、一字名は地格に+1。総格には含めない。外格の計算には含める。
 */
'use strict';

/** 濁点・半濁点を分解する（かな用） */
function decomposeKana(ch) {
  const nfd = ch.normalize('NFD');
  const base = nfd[0];
  let extra = 0, mark = '';
  if (nfd.length > 1) {
    if (nfd[1] === '゙') { extra = 2; mark = '濁点(+2)'; }      // ゛
    else if (nfd[1] === '゚') { extra = 1; mark = '半濁点(+1)'; } // ゜
  }
  return { base, extra, mark };
}

function isKanaChar(ch) {
  const cp = ch.codePointAt(0);
  return (cp >= 0x3041 && cp <= 0x309F) || (cp >= 0x30A1 && cp <= 0x30FF);
}

/**
 * 1文字の画数を求める。
 * @returns {n, display, notes[], vgChar}  n=画数 display=表示に使う字 vgChar=筆順アニメ用の字
 */
function charStrokes(ch, mode) {
  const notes = [];

  // かな
  if (isKanaChar(ch) || ch === 'ー') {
    const { base, extra, mark } = decomposeKana(ch);
    const raw = window.KANA_STROKES[base != null ? base : ch];
    if (raw == null) return { n: 0, display: ch, notes: ['画数不明'], vgChar: ch, unknown: true };
    if (mark) notes.push(mark);
    return { n: raw + extra, display: ch, notes, vgChar: base || ch };
  }

  // 繰り返し記号・小書き
  if (ch === '々' || ch === 'ヶ' || ch === 'ヵ') {
    const n = window.KANA_STROKES[ch];
    if (ch === '々') notes.push('繰り返し記号は3画で数える（流派により前の字と同画数）');
    return { n, display: ch, notes, vgChar: ch };
  }

  // 漢字
  let target = ch;
  if (mode === 'kyu') {
    const kyu = window.KYUJITAI[ch];
    if (kyu) { target = kyu; notes.push(`旧字体「${kyu}」で数える`); }
  }
  let n = window.STROKES[target];
  if (n == null && target !== ch) { target = ch; n = window.STROKES[ch]; }
  if (n == null) return { n: 0, display: ch, notes: ['画数不明の文字'], vgChar: ch, unknown: true };

  if (mode === 'kyu') {
    // 補正は KanjiVG で実画数が確認できた字にのみ存在する。
    // （旧字体で KanjiVG が無い字は KANJIDIC が康熙式画数のため補正すると二重加算になる）
    const adj = window.RAD_ADJUST[target];
    if (adj) { n += adj[0]; notes.push(`${adj[1]} で+${adj[0]}画`); }
    else if (target !== ch && !(window.KANJIVG && window.KANJIVG[target])) notes.push('康熙字典式の画数');
    const kx = window.KANGXI_OVERRIDE && window.KANGXI_OVERRIDE[target];
    if (kx && kx !== n) { notes.push(`康熙字典では${kx}画`); n = kx; }
  }
  return { n, display: target, notes, vgChar: target, newChar: ch };
}

/** 姓・名の文字配列から五格を計算 */
function computeGokaku(seiChars, meiChars, mode) {
  const sei = seiChars.map((ch) => ({ ch, ...charStrokes(ch, mode) }));
  const mei = meiChars.map((ch) => ({ ch, ...charStrokes(ch, mode) }));

  const seiSum = sei.reduce((a, c) => a + c.n, 0);
  const meiSum = mei.reduce((a, c) => a + c.n, 0);

  // 霊数（一字姓・一字名の補数）
  const reiTen = sei.length === 1 ? 1 : 0;
  const reiChi = mei.length === 1 ? 1 : 0;

  const tenkaku = seiSum + reiTen;
  const chikaku = meiSum + reiChi;
  const jinkaku = sei[sei.length - 1].n + mei[0].n;
  const soukaku = seiSum + meiSum; // 総格に霊数は含めない
  let gaikaku = tenkaku + chikaku - jinkaku;
  if (sei.length === 1 && mei.length === 1) gaikaku = 2; // 霊数1+霊数1

  return {
    sei, mei, mode,
    reiTen, reiChi,
    kaku: { tenkaku, jinkaku, chikaku, gaikaku, soukaku },
  };
}

/** 数理を1〜81に還元（82以上は80を引く） */
function reduce81(n) {
  let m = n;
  while (m > 81) m -= 80;
  return Math.max(m, 1);
}

/** 五行（画数の一の位: 1,2=木 3,4=火 5,6=土 7,8=金 9,0=水） */
function gogyou(n) {
  const d = n % 10;
  if (d === 1 || d === 2) return '木';
  if (d === 3 || d === 4) return '火';
  if (d === 5 || d === 6) return '土';
  if (d === 7 || d === 8) return '金';
  return '水';
}

/** 陰陽（奇数=陽○ / 偶数=陰●） */
function inyou(n) { return n % 2 === 1 ? '○' : '●'; }

/** 五行の関係: 相生 / 比和 / 相剋 */
function gogyouRelation(a, b) {
  const SEI = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' }; // aがbを生む
  const KOKU = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' }; // aがbを剋す
  if (a === b) return '比和';
  if (SEI[a] === b || SEI[b] === a) return '相生';
  if (KOKU[a] === b) return '相剋(上剋下)';
  if (KOKU[b] === a) return '相剋(下剋上)';
  return '比和';
}

/** 三才配置（天格・人格・地格の五行）とその吉凶 */
function sansai(kaku) {
  const ten = gogyou(kaku.tenkaku);
  const jin = gogyou(kaku.jinkaku);
  const chi = gogyou(kaku.chikaku);
  const r1 = gogyouRelation(ten, jin);
  const r2 = gogyouRelation(jin, chi);
  const score = (r) => (r === '相生' ? 2 : r === '比和' ? 1 : 0);
  const total = score(r1) + score(r2);
  let rank, text;
  if (total >= 4) {
    rank = '大吉';
    text = '天・人・地の気がよどみなく流れる最良の配置。土台が安定し、努力が実を結びやすい運勢の器です。';
  } else if (total === 3) {
    rank = '吉';
    text = '気の流れが良く、安定感のある配置。多少の波はあっても、周囲の助けを得て伸びていけます。';
  } else if (total === 2) {
    rank = '中吉';
    text = 'おおむね穏やかな配置。無理をせず自分のペースを守ることで運気が安定します。';
  } else if (total === 1) {
    rank = '注意';
    text = '気の流れに引っかかりのある配置。環境の変化に敏感になりやすいので、休息と人間関係のメンテナンスを大切に。';
  } else {
    rank = '凶';
    text = '天・人・地がぶつかり合う配置。ただし摩擦は磨き石。困難を越えるたびに強くなる、大器晩成の気配でもあります。';
  }
  return { ten, jin, chi, r1, r2, rank, text };
}

/** 陰陽配列の判定 */
function inyouArray(sei, mei) {
  const arr = [...sei, ...mei].map((c) => inyou(c.n));
  const s = arr.join('');
  const allSame = arr.every((x) => x === arr[0]);
  const alternating = arr.every((x, i) => i === 0 || x !== arr[i - 1]);
  let rank, text;
  if (arr.length === 1) {
    rank = '—'; text = '一文字のため配列判断はありません。';
  } else if (alternating) {
    rank = '大吉';
    text = '陰と陽が交互に並ぶ「調和」の配列。バランス感覚に優れ、人との縁に恵まれます。';
  } else if (allSame) {
    rank = '凶';
    text = arr[0] === '○'
      ? '全て陽の「純陽」。勢いは抜群ですが、突っ走りすぎに注意。ブレーキ役の友人を大切に。'
      : '全て陰の「純陰」。粘り強さは随一ですが、内にこもりがち。意識して外の風に当たりましょう。';
  } else {
    // 上下で綺麗に分かれるか
    const firstChange = s.indexOf(s[0] === '○' ? '●' : '○');
    const clean = firstChange > 0 && (s.slice(firstChange).split('').every((x) => x === s[firstChange]));
    if (clean) {
      rank = '吉';
      text = '陰陽が上下で分かれる「大別」の配列。切り替え上手で、オンオフのメリハリが武器になります。';
    } else {
      rank = '中吉';
      text = '陰陽が混ざり合う配列。多面的な魅力の持ち主。環境によって違う顔を見せられる器用さがあります。';
    }
  }
  return { arr, rank, text };
}

window.Gokaku = { charStrokes, computeGokaku, reduce81, gogyou, inyou, sansai, inyouArray };
