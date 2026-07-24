#!/usr/bin/env node
/*
 * 姓名判断 〜五格剖象法〜 ローカル起動サーバ
 * 依存パッケージなし（Node標準のみ）。静的ファイルを配信し、空きポートで起動して
 * ブラウザを自動で開く。/api/reading は codex CLI（サブスク）経由のAI鑑定。
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const START_PORT = parseInt(process.env.PORT || '4578', 10);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

// --- Codex による AI 鑑定エンドポイント ---
function handleReading(req, res) {
  let body = '';
  req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy(); });
  req.on('end', () => {
    let prompt = '';
    try { prompt = (JSON.parse(body || '{}').prompt || '').toString(); } catch (e) {}
    if (!prompt) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'no prompt' })); return; }

    // codex CLI を非対話で実行。画像生成と同じサブスク経由（有料APIは使わない）。
    const args = ['exec', '-m', 'gpt-5.5', '--sandbox', 'read-only',
      '--dangerously-bypass-approvals-and-sandbox', prompt];
    let child;
    try {
      // stdin は無効化（開いたままだと codex が EOF 待ちでハングする）
      // Windows では npm の CLI shim が codex.cmd になるため、明示的に解決する。
      const codexCommand = process.platform === 'win32' ? 'codex.exe' : 'codex';
      child = spawn(codexCommand, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'codex を起動できません（未インストールの可能性）' }));
      return;
    }
    let out = '', err = '';
    const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch (e) {} }, 170000);
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', () => {
      clearTimeout(timer);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'codex が見つかりません。先に Codex を入れてログインしてください。' }));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      const text = cleanCodexOutput(out) || cleanCodexOutput(err);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      if (text) res.end(JSON.stringify({ text }));
      else res.end(JSON.stringify({ error: 'Codex から鑑定文を取得できませんでした（ログイン状態をご確認ください）。code=' + code }));
    });
  });
}

// codex exec のログ行を除き、鑑定本文だけ取り出す
function cleanCodexOutput(raw) {
  if (!raw) return '';
  let s = raw.replace(/\x1b\[[0-9;]*m/g, ''); // ANSI 除去
  const lines = s.split('\n');
  const kept = lines.filter((ln) => {
    const t = ln.trim();
    if (!t) return true;
    if (/^\[?\d{4}-\d{2}-\d{2}T/.test(t)) return false;
    if (/^(thinking|codex|tokens used|User instructions|OpenAI Codex|workdir:|model:|provider:|approval:|sandbox:|reasoning|session|--------)/i.test(t)) return false;
    if (/^\[.*\]$/.test(t)) return false;
    return true;
  });
  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

const server = http.createServer((req, res) => {
  try {
    if (req.method === 'POST' && (req.url || '').split('?')[0] === '/api/reading') {
      return handleReading(req, res);
    }
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';
    // パストラバーサル防止
    const filePath = path.normalize(path.join(ROOT, urlPath));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    });
  } catch (e) {
    res.writeHead(500); res.end('Server Error');
  }
});

function listen(port, triesLeft) {
  server.once('error', (e) => {
    if (e.code === 'EADDRINUSE' && triesLeft > 0) {
      listen(port + 1, triesLeft - 1);
    } else {
      console.error('起動に失敗しました:', e.message);
      process.exit(1);
    }
  });
  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log('');
    console.log('  姓名判断 〜五格剖象法〜');
    console.log('  ' + url);
    console.log('  終了するには Ctrl+C を押してください。');
    console.log('');
    const opener = process.platform === 'darwin' ? 'open'
      : process.platform === 'win32' ? 'start ""'
      : 'xdg-open';
    exec(`${opener} ${url}`, () => {});
  });
}

listen(START_PORT, 20);
