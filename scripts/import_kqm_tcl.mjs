#!/usr/bin/env node
/**
 * 从 KQM Theorycrafting Library (TCL) 导入元素机制数据。
 *
 * 用法:
 *   node scripts/import_kqm_tcl.mjs --fetch      # 下载固定 commit 的源文件到 .cache/kqm-tcl
 *   node scripts/import_kqm_tcl.mjs              # 读取缓存 → 校验锚点 → 写出 CSV
 *   node scripts/import_kqm_tcl.mjs --dry-run    # 只校验不写文件
 *   node scripts/import_kqm_tcl.mjs --refresh    # 查询 master 最新 commit 与脚本内固定值比对
 *
 * 产物:
 *   data/elements/level_coefficients.csv   等级 → 系数（角色/敌人/结晶护盾）
 *   data/elements/reactions.csv            元素反应系数与属性
 *   data/elements/aura_consumption.csv     反应对元素附着量的消耗
 *   data/elements/particle_energy.csv      微粒/晶球能量结算
 *   data/teams/elemental_resonance.csv     元素共鸣（长表：一效果一行）
 *
 * 结构：**数值与构建器在 `scripts/lib/kqm.mjs`**（纯逻辑，有单元测试
 * `tests/kqm.test.mjs`）；本文件只负责网络、文件与主流程。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  KQM_REPO, KQM_COMMIT, KQM_COMMIT_DATE, KQM_COMMIT_MSG,
  SRC, ANCHORS, checkAnchors,
  LEVEL_HEADER, buildLevels, LEVEL_REGRESSION,
  REACTIONS_HEADER, buildReactions,
  AURA_HEADER, buildAura,
  ENERGY_HEADER, buildEnergy,
  RESONANCE_HEADER, buildResonance,
} from './lib/kqm.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(path.join(__dirname, '..'));
const CACHE = path.join(REPO, '.cache', 'kqm-tcl');

function parseArgs(argv) {
  const out = { dryRun: false, fetch: false, refresh: false, help: false };
  for (const a of argv) {
    if (a === '--fetch') out.fetch = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--refresh') out.refresh = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error('未知参数: ' + a);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(`用法: node scripts/import_kqm_tcl.mjs [--fetch] [--dry-run] [--refresh]

  --fetch     下载固定 commit (${KQM_COMMIT.slice(0, 7)}) 的源文件到 .cache/kqm-tcl/
  --dry-run   只校验锚点与自检，不写文件
  --refresh   查询 master 最新 commit，与脚本内固定值比对`);
  process.exit(0);
}

const cachePath = (srcPath) => path.join(CACHE, srcPath.replace(/\//g, '__'));
const pinnedUrl = (srcPath) => `https://raw.githubusercontent.com/${KQM_REPO}/${KQM_COMMIT}/${srcPath}`;

function readSource(srcPath) {
  const p = cachePath(srcPath);
  if (!fs.existsSync(p)) {
    throw new Error(`缺少缓存 ${path.relative(REPO, p)}；请先运行: node scripts/import_kqm_tcl.mjs --fetch`);
  }
  return fs.readFileSync(p, 'utf8');
}

// ---------------------------------------------------------------------------
// 抓取（该主机偶发 ECONNRESET，故退避重试）
// ---------------------------------------------------------------------------
async function fetchWithRetry(url, attempts = 4) {
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36';
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      lastErr = e.cause ? `${e.message} (${e.cause.message})` : e.message;
      if (i < attempts) await new Promise(r => setTimeout(r, 800 * i));
    }
  }
  throw new Error(`重试 ${attempts} 次仍失败: ${lastErr}`);
}

async function fetchAll() {
  fs.mkdirSync(CACHE, { recursive: true });
  for (const srcPath of Object.values(SRC)) {
    const text = await fetchWithRetry(pinnedUrl(srcPath));
    fs.writeFileSync(cachePath(srcPath), text, 'utf8');
    console.log(`  OK  ${srcPath}  (${text.length} bytes)`);
  }
  console.log(`源文件已缓存到 ${path.relative(REPO, CACHE)}`);
}

async function refresh() {
  const res = await fetch(`https://api.github.com/repos/${KQM_REPO}/commits/master`, {
    headers: { 'User-Agent': 'dsh-agent', Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`查询失败: HTTP ${res.status}`);
  const data = await res.json();
  const msg = String(data.commit.message).split('\n')[0];
  console.log(`脚本固定 commit : ${KQM_COMMIT}  (${KQM_COMMIT_DATE} ${KQM_COMMIT_MSG})`);
  console.log(`master 最新 commit: ${data.sha}  (${data.commit.author.date} ${msg})`);
  if (data.sha === KQM_COMMIT) {
    console.log('已是最新，无需更新。');
  } else {
    console.log('⚠ 源已更新。更新前请重新核对 lib/kqm.mjs 中的转写值与锚点，再更新 KQM_COMMIT。');
  }
}

// ---------------------------------------------------------------------------
// 写出
// ---------------------------------------------------------------------------
function assertNoDelimiter(value) {
  const v = String(value);
  if (v.includes(',')) throw new Error(`字段含逗号，违反 CSV 契约: ${v}`);
  if (v.includes('\n') || v.includes('\r')) throw new Error(`字段含换行: ${v}`);
  return v;
}

function writeCsv(relPath, header, rows) {
  const lines = [header.map(assertNoDelimiter).join(',')];
  for (const row of rows) lines.push(row.map(assertNoDelimiter).join(','));
  if (args.dryRun) return { path: relPath, rows: rows.length };
  const full = path.join(REPO, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, lines.join('\n') + '\n', 'utf8');
  return { path: relPath, rows: rows.length };
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------
if (args.refresh) {
  await refresh();
  process.exit(0);
}

if (args.fetch) {
  console.log(`下载 ${KQM_REPO} @ ${KQM_COMMIT.slice(0, 7)} …`);
  await fetchAll();
}

// 锚点校验：人工转写的数值必须能在被引用的源文件里找到
const problems = checkAnchors(readSource);
if (problems.length) {
  console.error('\n[锚点校验失败] 源内容与转写不符，已中止写入：');
  problems.forEach(p => console.error('  - ' + p));
  console.error('\n请重新核对上游数值与 lib/kqm.mjs 的转写表，再更新 KQM_COMMIT。');
  process.exit(3);
}
console.error(`锚点校验通过（${ANCHORS.reduce((n, a) => n + a.must.length, 0)} 条）`);

const levels = buildLevels(
  JSON.parse(readSource(SRC.player)),
  JSON.parse(readSource(SRC.enemy)),
  JSON.parse(readSource(SRC.shield)),
);
if (levels.problems.length) {
  console.error('\n[等级系数自检失败] 已中止写入：');
  levels.problems.forEach(p => console.error('  - ' + p));
  process.exit(2);
}
console.error(`等级系数自检通过（${Object.keys(LEVEL_REGRESSION).length} 个锚点）`);

const produced = [
  writeCsv('data/elements/level_coefficients.csv', LEVEL_HEADER, levels.rows),
  writeCsv('data/elements/reactions.csv', REACTIONS_HEADER, buildReactions()),
  writeCsv('data/elements/aura_consumption.csv', AURA_HEADER, buildAura()),
  writeCsv('data/elements/particle_energy.csv', ENERGY_HEADER, buildEnergy()),
  writeCsv('data/teams/elemental_resonance.csv', RESONANCE_HEADER, buildResonance()),
];

console.log('\n=== 导入结果 ===');
for (const p of produced) console.log(`  ${p.path}  (${p.rows} 行)`);
console.log(`  来源: ${KQM_REPO} @ ${KQM_COMMIT.slice(0, 7)} (${KQM_COMMIT_DATE} ${KQM_COMMIT_MSG})`);
console.log(`  写入模式: ${args.dryRun ? 'DRY-RUN（未写文件）' : '已写入'}`);
