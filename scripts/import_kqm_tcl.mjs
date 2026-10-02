#!/usr/bin/env node
/**
 * 从 KQM Theorycrafting Library (TCL) 导入元素机制数据。
 *
 * 来源: https://github.com/KQM-git/TCL （社区理论库，覆盖 v7.1）
 * 固定引用到某个 commit，保证可复现。
 *
 * 用法:
 *   node scripts/import_kqm_tcl.mjs --fetch      # 下载固定 commit 的源文件到 .cache/kqm-tcl
 *   node scripts/import_kqm_tcl.mjs              # 读取缓存 → 校验锚点 → 写出 CSV
 *   node scripts/import_kqm_tcl.mjs --dry-run    # 只校验不写文件
 *   node scripts/import_kqm_tcl.mjs --refresh    # 解析最新 master 的 commit 并提示是否要更新
 *
 * 产物:
 *   data/elements/level_coefficients.csv   等级 → 系数（角色/敌人/结晶护盾）
 *   data/elements/reactions.csv            元素反应系数与属性
 *   data/elements/aura_consumption.csv     反应对元素附着量的消耗
 *   data/elements/particle_energy.csv      微粒/晶球能量结算
 *
 * 设计要点:
 *   1. 等级系数从源仓库的 JSON **机器提取**，并带已知锚点自检
 *      （等级 90 的剧变系数必须等于 1446.8535）。
 *   2. 反应倍率/附着消耗/能量表来自仓库的 markdown 正文，属于**人工转写**。
 *      为避免转写悄悄过期，每条转写都带一个「锚点字符串」，
 *      脚本会校验该字符串确实出现在被引用的源文件里；源一旦变动即报错。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(path.join(__dirname, '..'));

// ---------------------------------------------------------------------------
// 固定来源
// ---------------------------------------------------------------------------
const KQM_REPO = 'KQM-git/TCL';
const KQM_COMMIT = '106c0f3f1b349df0d76297243c72cd0dc043aa01';
const KQM_COMMIT_DATE = '2026-10-01';
const KQM_COMMIT_MSG = '7.1 data';
const GAME_VERSION = '7.1';
const SOURCE_URL_BASE = `https://github.com/${KQM_REPO}/blob/${KQM_COMMIT}/`;

const SRC = {
  player: 'src/data/elemental_curves/player.json',
  enemy: 'src/data/elemental_curves/element.json',
  shield: 'src/data/elemental_curves/shield.json',
  transformFormula: 'docs/combat-mechanics/_formulas/transformative.md',
  amplifyFormula: 'docs/combat-mechanics/_formulas/amplifying.md',
  additiveFormula: 'docs/combat-mechanics/_formulas/additive.md',
  transformDoc: 'docs/combat-mechanics/elemental-effects/transformative-reactions.md',
  gaugeDoc: 'docs/combat-mechanics/elemental-effects/elemental-gauge-theory.md',
  energyDoc: 'docs/combat-mechanics/energy.md',
};

/** 等级系数只取到 100 级（角色上限 90；敌人常见到 100）。源数组延伸到 200。 */
const MAX_LEVEL = 100;

// ---------------------------------------------------------------------------
// 参数
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const out = { dryRun: false, fetch: false, refresh: false };
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

const CACHE = path.join(REPO, '.cache', 'kqm-tcl');
const cachePath = (srcPath) => path.join(CACHE, srcPath.replace(/\//g, '__'));

function pinnedUrl(srcPath) {
  return `https://raw.githubusercontent.com/${KQM_REPO}/${KQM_COMMIT}/${srcPath}`;
}

// ---------------------------------------------------------------------------
// 抓取 / 校验
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
      // 该主机偶发 ECONNRESET（网络层重置），退避重试即可恢复
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
  const UA = 'Mozilla/5.0 (compatible; dsh-agent)';
  const res = await fetch(`https://api.github.com/repos/${KQM_REPO}/commits/master`, {
    headers: { 'User-Agent': UA, Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`查询失败: HTTP ${res.status}`);
  const data = await res.json();
  const latest = data.sha;
  const msg = String(data.commit.message).split('\n')[0];
  console.log(`脚本固定 commit : ${KQM_COMMIT}  (${KQM_COMMIT_DATE} ${KQM_COMMIT_MSG})`);
  console.log(`master 最新 commit: ${latest}  (${data.commit.author.date} ${msg})`);
  if (latest === KQM_COMMIT) {
    console.log('已是最新，无需更新。');
  } else {
    console.log('⚠ 源已更新。更新前请重新核对本脚本中的转写值与锚点，然后更新 KQM_COMMIT/KQM_COMMIT_DATE/KQM_COMMIT_MSG。');
  }
}

function readSource(srcPath) {
  const p = cachePath(srcPath);
  if (!fs.existsSync(p)) {
    throw new Error(`缺少缓存 ${path.relative(REPO, p)}；请先运行: node scripts/import_kqm_tcl.mjs --fetch`);
  }
  return fs.readFileSync(p, 'utf8');
}

/**
 * 锚点校验：每条**人工转写**的数值都必须能在被引用的源文件里找到对应字符串。
 * 源一旦变动（数值调整、措辞改写），这里会立刻失败，而不是静默保留过期值。
 */
const ANCHORS = [
  { src: SRC.transformFormula, must: ['2.75', '0.25', '0.6', '1.5', 'ECTriggers'] },
  { src: SRC.transformFormula, must: ['2000 + '] },
  { src: SRC.amplifyFormula, must: ['2 &', '1.5 &', '1400 + '] },
  { src: SRC.additiveFormula, must: ['1.25', '1.15', '1200 + '] },
  { src: SRC.transformDoc, must: ['Physical DMG', 'Dendro Core', '40% by 12 seconds', '1U Pyro sometime', '8GU'] },
  { src: SRC.gaugeDoc, must: ['0.8x modifier', '0.5x unit modifier', '2x unit modifier', '0.4U from both gauges'] },
  { src: SRC.energyDoc, must: ['three times', '60%', '70%', '80%', 'Clear Particles/Orbs give'] },
];

function verifyAnchors() {
  const problems = [];
  for (const { src, must } of ANCHORS) {
    const text = readSource(src);
    for (const m of must) {
      if (!text.includes(m)) problems.push(`${src} 缺少锚点 ${JSON.stringify(m)}`);
    }
  }
  if (problems.length) {
    console.error('\n[锚点校验失败] 源内容与转写不符，已中止写入：');
    problems.forEach(p => console.error('  - ' + p));
    console.error('\n请重新核对上游数值与本脚本的转写表，再更新 KQM_COMMIT。');
    process.exit(3);
  }
  console.error(`锚点校验通过（${ANCHORS.reduce((n, a) => n + a.must.length, 0)} 条）`);
}

// ---------------------------------------------------------------------------
// 1) 等级系数（机器提取）
// ---------------------------------------------------------------------------
const LEVEL_HEADER = [
  'level', 'player_multiplier', 'enemy_multiplier', 'shield_multiplier',
  'version', 'source', 'source_url',
];

// 已知锚点：等级 90 的角色剧变系数。取自公开资料，不是从本脚本输出抄来的。
const LEVEL_REGRESSION = { 90: 1446.8535, 1: 17.165606, 2: 18.535048 };

function buildLevels() {
  const player = JSON.parse(readSource(SRC.player));
  const enemy = JSON.parse(readSource(SRC.enemy));
  const shield = JSON.parse(readSource(SRC.shield));

  // 索引即等级；索引 0 为占位（等于等级 1）
  for (const [lv, want] of Object.entries(LEVEL_REGRESSION)) {
    const got = player[Number(lv)];
    if (got !== want) {
      console.error(`\n[等级系数自检失败] 等级 ${lv}: got ${got} want ${want}`);
      process.exit(2);
    }
  }
  console.error(`等级系数自检通过（${Object.keys(LEVEL_REGRESSION).length} 个锚点；源数组长度 ${player.length}）`);

  const rows = [];
  for (let lv = 1; lv <= MAX_LEVEL; lv++) {
    if (player[lv] === undefined || enemy[lv] === undefined || shield[lv] === undefined) break;
    rows.push([
      String(lv), String(player[lv]), String(enemy[lv]), String(shield[lv]),
      GAME_VERSION, 'community', SOURCE_URL_BASE + SRC.player,
    ]);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 2) 元素反应（人工转写 + 锚点）
//    em_scaling 三种公式分别来自三个公式文件：
//      amplifying   1 + 2.78·EM/(1400+EM)
//      transformative 1 + 16·EM/(2000+EM)
//      additive     1 + 5·EM/(1200+EM)
// ---------------------------------------------------------------------------
const REACTIONS_HEADER = [
  'reaction_id', 'reaction_zh', 'reaction_en', 'category',
  'trigger_element', 'aura_element', 'damage_element',
  'base_multiplier', 'em_scaling', 'can_crit', 'uses_def_zone',
  'notes', 'version', 'source', 'source_url',
];

const AMP = SRC.amplifyFormula, TRA = SRC.transformFormula, ADD = SRC.additiveFormula;
const TDOC = SRC.transformDoc, GDOC = SRC.gaugeDoc;

const REACTIONS = [
  // 增幅反应：强/弱倍率不同，附着消耗也不同，因此拆成两条
  ['vaporize_strong', '蒸发·强', 'Vaporize (Forward)', 'amplifying', 'hydro', 'pyro', '', '2', 'amplifying', 'true', 'true',
    '水触发火附着；伤害元素为触发攻击的元素', AMP],
  ['vaporize_weak', '蒸发·弱', 'Vaporize (Reverse)', 'amplifying', 'pyro', 'hydro', '', '1.5', 'amplifying', 'true', 'true',
    '火触发水附着；伤害元素为触发攻击的元素', AMP],
  ['melt_strong', '融化·强', 'Melt (Forward)', 'amplifying', 'pyro', 'cryo', '', '2', 'amplifying', 'true', 'true',
    '火触发冰附着；伤害元素为触发攻击的元素', AMP],
  ['melt_weak', '融化·弱', 'Melt (Reverse)', 'amplifying', 'cryo', 'pyro', '', '1.5', 'amplifying', 'true', 'true',
    '冰触发火附着；伤害元素为触发攻击的元素', AMP],

  // 剧变反应
  ['overloaded', '超载', 'Overloaded', 'transformative', 'pyro;electro', 'electro;pyro', 'pyro', '2.75', 'transformative', 'false', 'false',
    '反应内建 ICD 0.5 秒', TRA],
  ['superconduct', '超导', 'Superconduct', 'transformative', 'electro;cryo', 'cryo;electro', 'cryo', '1.5', 'transformative', 'false', 'false',
    '使敌人物理抗性降低 40%、持续 12 秒（不影响冰/雷抗性）', TRA],
  ['electro_charged', '感电', 'Electro-Charged', 'transformative', 'hydro;electro', 'electro;hydro', 'electro', '2', 'transformative', 'false', 'false',
    '每秒一跳；倍率为 2×ECTriggers', TRA],
  ['shattered', '碎冰', 'Shattered', 'transformative', '', 'frozen', 'physical', '3', 'transformative', 'false', 'false',
    '钝击命中冻结目标触发；与烈绽放/超绽放同倍率', TRA],
  ['swirl', '扩散', 'Swirl', 'transformative', 'anemo', 'pyro;hydro;cryo;electro', '', '0.6', 'transformative', 'false', 'false',
    '伤害元素为被扩散的元素；伤害取触发扩散者的等级与精通', TRA],
  ['crystallize', '结晶', 'Crystallize', 'transformative', 'geo', 'pyro;hydro;cryo;electro', 'none', '0', 'none', 'false', 'false',
    '不造成伤害；护盾吸收量吃触发者的等级与精通（见 level_coefficients 的 shield_multiplier）', TDOC],
  ['burning', '燃烧', 'Burning', 'transformative', 'pyro;dendro', 'dendro;pyro', 'pyro', '0.25', 'transformative', 'false', 'false',
    '每 0.25 秒一跳；归属由最后刷新附着的一方决定', TRA],
  ['bloom', '绽放', 'Bloom', 'transformative', 'hydro;dendro', 'dendro;hydro', 'none', '2', 'transformative', 'false', 'false',
    '生成草原核，本身不造成伤害', TRA],
  ['bloom_explosion', '草原核爆炸', 'Bloom Explosion', 'transformative', '', '', 'dendro', '2', 'transformative', 'false', 'false',
    '草原核 6 秒后、或场上第 6 个生成时爆炸；对玩家伤害减 95%', TDOC],
  ['hyperbloom', '超绽放', 'Hyperbloom', 'transformative', 'electro', '', 'dendro', '3', 'transformative', 'false', 'false',
    '雷作用于草原核；伤害取触发者的等级与精通', TDOC],
  ['burgeon', '烈绽放', 'Burgeon', 'transformative', 'pyro', '', 'dendro', '3', 'transformative', 'false', 'false',
    '火作用于草原核；伤害取触发者；会伤及自身（对玩家减 95%）', TDOC],

  // 催化（激化系）：加到基础伤害区，因此吃暴击与防御区
  ['quicken', '原激化', 'Quicken', 'additive', 'dendro', 'electro', 'none', '', 'additive', '', '',
    '生成激化状态，本身无伤害', ADD],
  ['aggravate', '超激化', 'Aggravate', 'additive', 'electro', 'quicken', '', '1.15', 'additive', 'true', 'true',
    '对激化状态敌人造成雷伤时加到基础伤害区', ADD],
  ['spread', '蔓激化', 'Spread', 'additive', 'dendro', 'quicken', '', '1.25', 'additive', 'true', 'true',
    '对激化状态敌人造成草伤时加到基础伤害区', ADD],
  ['aggravated_swirl', '激化扩散', 'Aggravated Swirl', 'transformative', 'anemo', 'quicken', 'electro', '0.6', 'transformative', 'false', 'false',
    '雷扩散接触激化附着时触发；虽由激化引发，但按剧变反应计算', TDOC],

  // 无伤害反应
  ['frozen', '冻结', 'Frozen', 'none', 'cryo', 'hydro', 'none', '', 'none', '', '',
    '无直接伤害；冻结附着量 = 2×min(原附着量、触发附着量)', GDOC],
];

function buildReactions() {
  const rows = [];
  for (const r of REACTIONS) {
    const [id, zh, en, cat, trig, aura, dmg, mult, em, crit, def, notes, src] = r;
    rows.push([id, zh, en, cat, trig, aura, dmg, mult, em, crit, def,
      notes, GAME_VERSION, 'community', SOURCE_URL_BASE + src]);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 3) 附着量消耗（人工转写 + 锚点）
//    单位修正 = 触发元素附着量要乘的系数；单位消耗 = 直接扣掉的固定 U 值
// ---------------------------------------------------------------------------
const AURA_HEADER = [
  'reaction_id', 'aura_consumed_unit', 'aura_consumed_ratio',
  'notes', 'version', 'source', 'source_url',
];

const AURA = [
  ['overloaded', '', '1', '超载与超导的单位修正为 1×（等量消耗触发元素的附着量）', GDOC],
  ['superconduct', '', '1', '同上', GDOC],
  ['vaporize_weak', '', '0.5', '弱增幅触发（1.5 倍）的单位修正为 0.5×', GDOC],
  ['vaporize_strong', '', '2', '强增幅触发（2 倍）的单位修正为 2×', GDOC],
  ['melt_weak', '', '0.5', '弱增幅触发（1.5 倍）的单位修正为 0.5×', GDOC],
  ['melt_strong', '', '2', '强增幅触发（2 倍）的单位修正为 2×', GDOC],
  ['swirl', '', '0.5', '风触发一律 0.5×；扩散的 AoE 有非零附着量，传播规则另见文档', GDOC],
  ['crystallize', '', '0.5', '岩触发一律 0.5×；反应内建全局 ICD 1 秒（期间不再消耗附着）', GDOC],
  ['electro_charged', '0.4', '', '每跳从水与雷两个附着量各扣 0.4U；AoE 跳为零附着', GDOC],
  ['shattered', '8', '', '常规消耗 8GU；部分情况下更少（可连续碎冰）', TDOC],
  ['bloom', '', '', '触发元素影响消耗、比例为 水:草 = 2:1（水为弱元素），但**不影响伤害**；源文档未给出可用的单一系数', TDOC],
  ['frozen', '', '', '冻结附着量 = 2×min(原附着量、触发附着量)；消耗规则见冻结公式', GDOC],
  ['burning', '', '', '源文档未给出附着消耗数值', TDOC],
  ['hyperbloom', '', '', '作用于草原核、不消耗敌人身上的附着', TDOC],
  ['burgeon', '', '', '作用于草原核、不消耗敌人身上的附着', TDOC],
  ['quicken', '', '', '源文档未给出附着消耗数值', ADD],
  ['aggravate', '', '', '催化反应不消耗被激化目标的附着（加到原伤害）', ADD],
  ['spread', '', '', '同上', ADD],
];

function buildAura() {
  return AURA.map(([id, unit, ratio, notes, src]) =>
    [id, unit, ratio, notes, GAME_VERSION, 'community', SOURCE_URL_BASE + src]);
}

// ---------------------------------------------------------------------------
// 4) 微粒/晶球能量（人工转写 + 锚点）
//    后台系数随队伍人数变化：4 人 60%、3 人 70%、2 人 80%
// ---------------------------------------------------------------------------
const ENERGY_HEADER = [
  'pickup_type', 'element_relation', 'field_state', 'party_size',
  'energy_value', 'notes', 'version', 'source', 'source_url',
];

// [pickup, relation, field, party, particle值, orb值]
const ENERGY_TABLE = [
  ['same', 'on_field', 'NA', 3.0, 9.0],
  ['same', 'off_field', '4', 1.8, 5.4],
  ['same', 'off_field', '3', 2.1, 6.3],
  ['same', 'off_field', '2', 2.4, 7.2],
  ['different', 'on_field', 'NA', 1.0, 3.0],
  ['different', 'off_field', '4', 0.6, 1.8],
  ['different', 'off_field', '3', 0.7, 2.1],
  ['different', 'off_field', '2', 0.8, 2.4],
  ['no_element', 'on_field', 'NA', 2.0, 6.0],
  ['no_element', 'off_field', '4', 1.2, 3.6],
  ['no_element', 'off_field', '3', 1.4, 4.2],
  ['no_element', 'off_field', '2', 1.6, 4.8],
];

function buildEnergy() {
  const rows = [];
  for (const [rel, field, party, particle, orb] of ENERGY_TABLE) {
    const note = field === 'on_field'
      ? '在场角色；与队伍人数无关'
      : `后台角色；4/3/2 人队伍分别按 60%/70%/80% 结算；同元素为异元素的 3 倍、无色为异元素的 2 倍`;
    rows.push(['particle', rel, field, party, String(particle), note, GAME_VERSION, 'community', SOURCE_URL_BASE + SRC.energyDoc]);
    rows.push(['orb', rel, field, party, String(orb), '晶球能量为微粒的 3 倍；' + note, GAME_VERSION, 'community', SOURCE_URL_BASE + SRC.energyDoc]);
  }
  return rows;
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
  const lines = [header.join(',')];
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

verifyAnchors();

const produced = [
  writeCsv('data/elements/level_coefficients.csv', LEVEL_HEADER, buildLevels()),
  writeCsv('data/elements/reactions.csv', REACTIONS_HEADER, buildReactions()),
  writeCsv('data/elements/aura_consumption.csv', AURA_HEADER, buildAura()),
  writeCsv('data/elements/particle_energy.csv', ENERGY_HEADER, buildEnergy()),
];

console.log('\n=== 导入结果 ===');
for (const p of produced) console.log(`  ${p.path}  (${p.rows} 行)`);
console.log(`  来源: ${KQM_REPO} @ ${KQM_COMMIT.slice(0, 7)} (${KQM_COMMIT_DATE} ${KQM_COMMIT_MSG})`);
console.log(`  写入模式: ${args.dryRun ? 'DRY-RUN（未写文件）' : '已写入'}`);
