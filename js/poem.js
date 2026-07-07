/*
 * 心之介。風 鑑定トーク＆一行詩ジェネレーター（オフライン版）
 *
 * 文体資料（実在の「手相詩人 心之介。」の公開情報より）:
 * - 一人称は「僕」。明るく軽快、「！」と「（笑）」を交える。占いをポップに身近に。
 * - 決めつけで終わらせない: 「あなたは○○タイプ。だから、△△だともっと輝ける」が公式の型。
 * - 口癖「人生を人に決められてたまるか！」
 * - 詩は長い韻文ではなく、5〜15字の「一行の書」。鑑定の要約でありお守り。実例「日々新たな自分に」。
 * - 喋りは陽、書は静。書く直前だけトーンが静謐になる。
 */
'use strict';

(function () {
  // 名前から決まるシード付き乱数（同じ名前なら同じ結果、re-roll用にoffsetを渡せる）
  function seededRand(seedStr, offset) {
    let h = 2166136261 ^ (offset || 0);
    for (let i = 0; i < seedStr.length; i++) {
      h ^= seedStr.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return function () {
      h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
      return ((h >>> 0) % 100000) / 100000;
    };
  }
  function pick(rand, arr) { return arr[Math.floor(rand() * arr.length)]; }

  /* ---------- タイプ名（人格数理から） ---------- */
  const TYPES = {
    '大吉': ['先頭に立つと燃えるリーダータイプ', '人を照らす太陽タイプ', '登り坂に強い山あり谷なしタイプ', '始めた瞬間が一番強いスタートダッシュタイプ'],
    '吉':   ['コツコツが最強の職人タイプ', '芯が一本通った竹タイプ', '静かに燃える熾火（おきび）タイプ', '決めたら曲げない一本道タイプ'],
    '半吉': ['器用貧乏に見えて実は多刀流タイプ', '本番に強い勝負師タイプ', '遅咲きの大輪タイプ', '名参謀・軍師タイプ'],
    '凶':   ['逆境で目が覚めるジェットコースタータイプ', '転んでもタダでは起きない七転八起タイプ', '嵐を越えるほど強くなる船乗りタイプ', '壊して創る革命家タイプ'],
    '大凶': ['大勝負でこそ本領を発揮する一発逆転タイプ', '常識の外側に道を見つける開拓者タイプ'],
  };
  const rankKey = (rank) => (rank === '中吉' ? '吉' : rank === '注意' ? '凶' : rank);

  /* ---------- 一行詩バンク（テーマ別） ---------- */
  // {k} = 名前の漢字を織り込むスロット
  const POEMS = {
    // 勢い・大吉
    ikioi: [
      '日々新たな自分に', 'あなたの道は あなたが照らす', '迷わず行けば 道は追いつく',
      '今日のあなたが いちばん新しい', '追い風は 走る人にしか吹かない', '頂上は 一歩の集まり',
      '咲く時を知る花は 強い', '陽はまた あなたから昇る',
    ],
    // 努力・堅実
    doryoku: [
      '積み上げた分だけ 崩れない', '根を張る時間も 花のうち', '急がば その一歩を深く',
      '続けることが 才能の正体', '汗は 未来の通貨', '静かな努力ほど よく響く',
      '磨かれる石だけが 光る',
    ],
    // 再生・波乱を越える
    saisei: [
      '迷いは翼のかたちをしている', '転んだ場所に 種を蒔け', '雨の日にしか 根は伸びない',
      '壊れた数だけ 創れる', '嵐の夜が 船乗りを育てる', '曲がり道にこそ 実りあり',
      '涙の分だけ 器が深い', '何度でも はじめの一歩',
    ],
    // 調和・人徳
    chouwa: [
      'よく笑う人に 福は集まる', '与えた恩は 巡ってあなたに', '和らぎは 最強の鎧',
      'あなたの隣は あたたかい', '人を照らす灯は 消えない', 'つないだ手の数が 財産',
    ],
    // 名前織り込み型
    weave: [
      '「{k}」の字のごとく まっすぐに', '「{k}」一文字に 天の応援あり', 'その名に「{k}」を持つ人は 折れない',
      '「{k}」の字が あなたのお守り',
    ],
  };

  /* ---------- 鑑定トーク ---------- */
  function buildTalk(result, meta) {
    const { kaku } = result;
    const rand = seededRand(meta.fullName, meta.offset || 0);
    const jin = window.SUJI[window.Gokaku.reduce81(kaku.jinkaku)];
    const chi = window.SUJI[window.Gokaku.reduce81(kaku.chikaku)];
    const sou = window.SUJI[window.Gokaku.reduce81(kaku.soukaku)];
    const gai = window.SUJI[window.Gokaku.reduce81(kaku.gaikaku)];
    const type = pick(rand, TYPES[rankKey(jin.rank)] || TYPES['吉']);

    const opening = pick(rand, [
      `はい、${meta.fullName}さんね！　……うん、ええ名前や。ちょっと待ってな、いま画数が全部つながったわ（笑）`,
      `${meta.fullName}さん、お待たせ！　名前見た瞬間にピンと来たで。これはしゃべりがいのある名前や！`,
      `よっしゃ、${meta.fullName}さんいこか！　僕、数字と計算がめちゃくちゃ得意やねん。画数は嘘つかへんで！`,
    ]);

    const core = `まずド真ん中の人格が${kaku.jinkaku}画「${jin.name}」。あなたはズバリ、${type}！　${jin.text}`;

    const wakage = `若いころの運勢とか生まれ持った資質を見る地格は${kaku.chikaku}画で「${chi.name}」（${chi.rank}）。${chi.text}`;

    const shakai = `で、まわりからどう見られてるか、人にどう助けられるかの外格が${kaku.gaikaku}画「${gai.name}」（${gai.rank}）。${gai.text}`;

    const bannen = `人生まるごと、特に後半戦を背負う総格は${kaku.soukaku}画「${sou.name}」（${sou.rank}）。${sou.text}`;

    // 提案（決めつけで終わらせない）
    const goodRanks = ['大吉', '吉', '中吉'];
    const proposal = goodRanks.includes(jin.rank)
      ? pick(rand, [
          `だからね、あなたは遠慮してる場合とちゃう。半歩前に出る役、引き受けたほうが絶対輝けるで！`,
          `だから、「自分なんて」は今日で禁止！　あなたが前に出るだけで、まわりの運まで上がるんやから。`,
        ])
      : pick(rand, [
          `数字だけ見たら波はあるよ。でもな、僕は4万人以上見てきたから断言できる。波のある名前の人ほど、越えたあとが強い。だから、環境が変わる場面を怖がらんと、むしろ自分から取りに行くともっと輝けるで！`,
          `ちょっと荒れた数字も入ってる。でもそれ、裏を返せば「平凡では終われへん」ってことや。だから、安定より挑戦の側に立つと一気に化けるタイプやで！`,
        ]);

    const closing = pick(rand, [
      `最後にひとつだけ。占いは天気予報や。雨って出ても、傘を持って出かけるかどうかはあなたが決める。——人生を人に決められてたまるか！やで（笑）\n\nほな、ここからは静かにいくで。あなたに一行、書かせてもらいます。`,
      `ええか、名前は変えられへんけど、名前の活かし方は今日から変えられる。人生を人に決められてたまるか！……この言葉、持って帰ってな（笑)\n\nさて。ここからちょっとだけ、静かにさせてや。あなたの一行を降ろすから。`,
    ]);

    return [opening, core, wakage, shakai, bannen, proposal, closing].join('\n\n');
  }

  /* ---------- 一行詩 ---------- */
  function buildPoem(result, meta) {
    const { kaku } = result;
    const rand = seededRand(meta.fullName + '/poem', meta.offset || 0);
    const jin = window.SUJI[window.Gokaku.reduce81(kaku.jinkaku)];
    const sou = window.SUJI[window.Gokaku.reduce81(kaku.soukaku)];
    const avg = (window.rankScore(jin.rank) + window.rankScore(sou.rank)) / 2;

    // テーマ選定: 運勢の質で選ぶ
    let bank;
    if (avg >= 4.2) bank = POEMS.ikioi;
    else if (avg >= 3.4) bank = rand() < 0.5 ? POEMS.doryoku : POEMS.chouwa;
    else if (avg >= 2.4) bank = rand() < 0.5 ? POEMS.doryoku : POEMS.saisei;
    else bank = POEMS.saisei;

    // 2割の確率で名前の漢字織り込み型
    const nameKanji = meta.meiChars.filter((c) => window.STROKES[c] != null);
    if (nameKanji.length && rand() < 0.2) {
      return pick(rand, POEMS.weave).replace('{k}', pick(rand, nameKanji));
    }
    return pick(rand, bank);
  }

  /* ---------- Codex(AI)用プロンプト ---------- */
  function buildAIPrompt(result, meta, summaryText) {
    return [
      'あなたは実在の占い師「手相詩人 心之介。」の文体を再現するライターです。以下の文体ガイドを厳守してください。',
      '',
      '【文体ガイド】',
      '- 一人称は「僕」。関西弁まじりの明るく軽快な喋り。「！」「（笑）」を適度に使う。占いをポップに身近に。',
      '- 断定はするが決めつけで終わらせない。「あなたは○○タイプ。だから、△△だともっと輝ける」という提案の型を必ず使う。',
      '- 口癖「人生を人に決められてたまるか！」をどこかで1回使う。',
      '- 凶数があっても不安を煽らず、活かし方に変換する。',
      '- 最後は一転して静かなトーンになり、色紙に書く「一行の詩」で締める。詩は5〜15文字の短い一行（例:「日々新たな自分に」）。長い韻文にしない。',
      '',
      '【鑑定データ（熊崎式五格剖象法）】',
      summaryText,
      '',
      '【出力形式】',
      '1) 鑑定トーク（400〜600字、段落分け）',
      '2) 最後に一行だけ、色紙に書く詩を「◆詩◆ 〜」の形式で出す',
      '',
      `相談者の名前: ${meta.fullName}`,
    ].join('\n');
  }

  window.Shinnosuke = { buildTalk, buildPoem, buildAIPrompt };
})();
