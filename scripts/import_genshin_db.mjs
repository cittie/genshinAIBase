#!/usr/bin/env node
/**
 * 从 genshin-db 的 data.min.json 导入角色数据，生成符合本仓库数据契约的 CSV。
 *
 * 用法:
 *   node scripts/import_genshin_db.mjs --in <data.min.json 路径> [选项]
 *
 * 选项:
 *   --in <path>         genshin-db 的 src/min/data.min.json（必填）
 *   --out <dir>         仓库根目录，默认脚本所在目录的上一级
 *   --targets <list>    逗号分隔，默认 characters；可选 characters,roles
 *   --dry-run           只打印统计，不写文件
 *
 * 数据来源: genshin-db v5（GenshinData 解包 + Fandom wiki）
 * 契约: AGENTS.md §3 —— UTF-8 无 BOM、LF、逗号分隔、百分比为百分数数值、空=未知、NA=不适用
 *
 * 注意: 本脚本只做「解包数据 -> CSV」的忠实转写，不做任何推测填充。
 *       推导得到的字段（如角色定位）必须在输出中标注推导依据。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// 参数
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const out = { targets: 'characters', dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--in') out.input = argv[++i];
    else if (a === '--out') out.outDir = argv[++i];
    else if (a === '--targets') out.targets = argv[++i];
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error('未知参数: ' + a);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (args.help || !args.input) {
  console.log(`用法: node scripts/import_genshin_db.mjs --in <data.min.json> [--out <repo>] [--targets characters,roles] [--dry-run]

  --in        genshin-db 的 src/min/data.min.json
  --out       仓库根目录（默认脚本上级目录）
  --targets   默认 characters；可选 characters,roles
  --dry-run   只输出统计，不写文件`);
  process.exit(args.help ? 0 : 1);
}

const REPO = path.resolve(args.outDir || path.join(__dirname, '..'));
const SRC = path.resolve(args.input);
const TARGETS = new Set(
  args.targets.split(',').map(s => s.trim()).filter(Boolean).flatMap(t =>
    t === 'all' ? ['characters', 'roles', 'weapons', 'artifacts'] : [t]));

// ---------------------------------------------------------------------------
// 枚举映射
// ---------------------------------------------------------------------------
const ELEMENT = {
  ELEMENT_PYRO: 'pyro', ELEMENT_HYDRO: 'hydro', ELEMENT_ANEMO: 'anemo',
  ELEMENT_ELECTRO: 'electro', ELEMENT_DENDRO: 'dendro', ELEMENT_CRYO: 'cryo',
  ELEMENT_GEO: 'geo', ELEMENT_NONE: '',
};

const WEAPON = {
  WEAPON_SWORD_ONE_HAND: 'sword', WEAPON_CLAYMORE: 'claymore',
  WEAPON_POLE: 'polearm', WEAPON_CATALYST: 'catalyst', WEAPON_BOW: 'bow',
};

// 突破加成属性 -> 本仓库枚举
const SUBSTAT = {
  FIGHT_PROP_ATTACK_PERCENT: 'atk_pct',
  FIGHT_PROP_HP_PERCENT: 'hp_pct',
  FIGHT_PROP_DEFENSE_PERCENT: 'def_pct',
  FIGHT_PROP_CRITICAL: 'crit_rate_pct',
  FIGHT_PROP_CRITICAL_HURT: 'crit_dmg_pct',
  FIGHT_PROP_CHARGE_EFFICIENCY: 'energy_recharge_pct',
  FIGHT_PROP_ELEMENT_MASTERY: 'em',
  FIGHT_PROP_HEAL_ADD: 'healing_bonus_pct',
  FIGHT_PROP_FIRE_ADD_HURT: 'elemental_dmg_pct',
  FIGHT_PROP_WATER_ADD_HURT: 'elemental_dmg_pct',
  FIGHT_PROP_WIND_ADD_HURT: 'elemental_dmg_pct',
  FIGHT_PROP_ELEC_ADD_HURT: 'elemental_dmg_pct',
  FIGHT_PROP_ICE_ADD_HURT: 'elemental_dmg_pct',
  FIGHT_PROP_ROCK_ADD_HURT: 'elemental_dmg_pct',
  FIGHT_PROP_GRASS_ADD_HURT: 'elemental_dmg_pct',
  FIGHT_PROP_PHYSICAL_ADD_HURT: 'physical_dmg_pct',
};

// 地区：优先用 datamine 的 region 字段，为空时回退到 associationType
const ASSOC_REGION = {
  MONDSTADT: 'mondstadt', LIYUE: 'liyue', INAZUMA: 'inazuma', SUMERU: 'sumeru',
  FONTAINE: 'fontaine', NATLAN: 'natlan', SNEZHNAYA: 'snezhnaya',
  SNEZHNAYA_STAR: 'snezhnaya', FATUI: 'snezhnaya',
  NODKRAI: 'nodkrai', NODKRAI_ZIBAI: 'nodkrai',
  MAINACTOR: 'other', RANGER: 'other',
  HVISION: '', OMNI_SCOURGE: '',
};

const KNOWN_REGIONS = new Set([
  'mondstadt', 'liyue', 'inazuma', 'sumeru', 'fontaine', 'natlan',
  'snezhnaya', 'nodkrai', 'other',
]);

// ---------------------------------------------------------------------------
// 工具
// ---------------------------------------------------------------------------
const warnings = [];

function warn(msg) { warnings.push(msg); }

/**
 * 生成不与已有 slug 冲突的 slug。
 *
 * 源数据里存在同名不同 ID 的记录（如两把 "Prized Isshin Blade"，源 key 为
 * prizedisshinblade 与 prizedisshinblade-01），此时把源 key 的区分后缀接到
 * slug 上，保证既唯一又可追溯；仍冲突则退化为递增序号。
 */
function uniqueSlug(base, key, used) {
  let slug = base;
  if (used.has(slug)) {
    const head = base.replace(/_/g, '');
    const extra = String(key).replace(/[^a-z0-9]/gi, '').slice(head.length);
    if (extra) slug = `${base}_${extra}`;
    const root = slug;
    let n = 2;
    while (used.has(slug)) slug = `${root}_${n++}`;
    warn(`slug 冲突已消歧: ${base} + (${key}) -> ${slug}`);
  }
  return slug;
}

/** 英文名 -> 稳定 slug（小写下划线）。与 AGENTS.md §3.1 的 slug 约定一致。 */
function toSlug(name) {
  return String(name)
    .replace(/['\u2019]/g, '')     // Wolf's -> Wolfs，避免生成 wolf_s_gravestone
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * 复刻 genshin-db getdata.js 的 getPromotionBonus，用于取满级（90 级 / 6 次突破）数值。
 */
function promotionAt(promotions, level, ascension) {
  for (let index = promotions.length - 2; index >= 0; index--) {
    if (level > promotions[index].maxlevel) return [index + 1, promotions[index + 1]];
    if (level === promotions[index].maxlevel) {
      if ((Number.isFinite(ascension) && ascension > index) || ascension === '+')
        return [index + 1, promotions[index + 1]];
      return [index, promotions[index]];
    }
  }
  return [0, promotions[0]];
}

/** 计算 90 级基础属性与突破加成数值。 */
function statsAt90(raw, key) {
  const s = raw.stats.characters[key];
  const curveSet = raw.curve.characters;
  if (!s) return undefined;
  const [, promo] = promotionAt(s.promotion, 90, '+');
  const c = curveSet['90'];
  if (!c) throw new Error('曲线数据缺少 90 级，无法计算');
  const out = {
    hp: s.base.hp * c[s.curve.hp] + promo.hp,
    atk: s.base.attack * c[s.curve.attack] + promo.attack,
    def: s.base.defense * c[s.curve.defense] + promo.defense,
    specialized: promo.specialized,
  };
  if (s.specialized === 'FIGHT_PROP_CRITICAL') out.specialized += s.base.critrate;
  else if (s.specialized === 'FIGHT_PROP_CRITICAL_HURT') out.specialized += s.base.critdmg;
  return out;
}

/**
 * 元素爆发能量消耗：从 combat3 的 labels 中找 "Energy Cost|{paramN:I}"，
 * 按 {paramN} 的 N 去 stats.talents[key].combat3 取参数。
 * 注意：不能用 label 的位置索引，必须用 {paramN} 标记（位置与 paramN 可以不一致）。
 */
function burstCost(raw, key) {
  const rec = raw.data.English.talents[key];
  const st = raw.stats.talents[key];
  if (!rec || !rec.combat3 || !st || !st.combat3) return { value: 'NA', why: 'no burst/talent record' };
  const labels = (rec.combat3.attributes && rec.combat3.attributes.labels) || [];
  const lbl = labels.find(l => /energy cost/i.test(l));
  if (!lbl) return { value: 'NA', why: 'burst has no energy cost (e.g. Mavuika/Skirk)' };
  const m = lbl.match(/\{param(\d+):/);
  if (!m) return { value: '?', why: 'no {paramN} token in: ' + lbl };
  const arr = st.combat3['param' + m[1]];
  if (!arr || !arr.length) return { value: '?', why: 'missing param' + m[1] };
  return { value: String(arr[0]), why: '' };
}

function regionOf(rec) {
  const direct = String(rec.region || '').toLowerCase().replace(/[^a-z]/g, '');
  if (direct && KNOWN_REGIONS.has(direct)) return direct;
  const assoc = String(rec.associationType || '').replace(/^ASSOC_/, '');
  if (assoc in ASSOC_REGION) return ASSOC_REGION[assoc];
  return '';
}

/**
 * 突破加成数值（仅突破带来的部分，不含 5% 暴击率 / 50% 暴击伤害基础值）。
 *
 * 注意：genshin-db 的 `specialized` 对暴击类把基础值折进去了
 * （FIGHT_PROP_CRITICAL 加 0.05，FIGHT_PROP_CRITICAL_HURT 加 0.5），
 * 其他属性则本来就是纯突破加成。此处统一还原为「仅突破加成」。
 *
 * EM 是固定值，不乘 100；其余按百分数数值输出，保留 1 位小数。
 */
function substatValue(substatType, specialized) {
  let bonus = specialized;
  if (substatType === 'FIGHT_PROP_CRITICAL') bonus -= 0.05;
  else if (substatType === 'FIGHT_PROP_CRITICAL_HURT') bonus -= 0.5;

  if (substatType === 'FIGHT_PROP_ELEMENT_MASTERY') {
    return String(Math.round(bonus * 10) / 10);
  }
  return String(Math.round(bonus * 1000) / 10);
}

function assertNoDelimiter(value, where) {
  const v = String(value);
  if (v.includes(',')) throw new Error(`${where} 含逗号，违反 CSV 契约: ${v}`);
  if (v.includes('\n') || v.includes('\r')) throw new Error(`${where} 含换行: ${v}`);
  return v;
}

function writeCsv(relPath, header, rows) {
  const lines = [header.join(',')];
  for (const row of rows) {
    const cells = row.map((cell, i) => assertNoDelimiter(cell, `${relPath} 第${i + 1}列`));
    lines.push(cells.join(','));
  }
  const text = lines.join('\n') + '\n';
  if (args.dryRun) return { path: relPath, rows: rows.length };
  const full = path.join(REPO, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, text, { encoding: 'utf8' });
  return { path: relPath, rows: rows.length };
}

// ---------------------------------------------------------------------------
// 载入源数据
// ---------------------------------------------------------------------------
process.stderr.write(`读取 ${SRC} ...\n`);
const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));
if (!raw.stats || !raw.curve || !raw.data) throw new Error('源文件结构不符合 genshin-db 预期');
const version = raw.version || {};

const en = raw.data.English.characters;
const zh = raw.data.ChineseSimplified.characters;
const sourceKeys = Object.keys(en).sort();
process.stderr.write(`源数据角色数: ${sourceKeys.length}\n`);

// slug 唯一性检查
const slugSeen = new Map();
for (const key of sourceKeys) {
  const slug = toSlug(en[key].name);
  if (!slug) throw new Error(`无法为 ${key} 生成 slug（英文名: ${en[key].name}）`);
  if (slugSeen.has(slug)) throw new Error(`slug 冲突: ${slug} <- ${slugSeen.get(slug)} / ${key}`);
  slugSeen.set(slug, key);
}

// ---------------------------------------------------------------------------
// characters.csv
// ---------------------------------------------------------------------------
const CHARACTER_HEADER = [
  'char_id', 'slug', 'name_zh', 'name_en', 'rarity', 'element', 'weapon_type', 'region',
  'base_hp_lv90', 'base_atk_lv90', 'base_def_lv90',
  'ascension_stat', 'ascension_stat_value', 'burst_cost', 'version', 'source',
];

function buildCharacters() {
  const rows = [];
  for (const key of sourceKeys) {
    const rec = en[key];
    const zhRec = zh[key] || {};
    const st = statsAt90(raw, key);
    if (!st) { warn(`${key}: 缺少 stats，已跳过`); continue; }

    const element = ELEMENT[rec.elementType];
    if (element === undefined) warn(`${key}: 未知 elementType ${rec.elementType}`);
    const weaponType = WEAPON[rec.weaponType];
    if (!weaponType) warn(`${key}: 未知 weaponType ${rec.weaponType}`);

    const ascStat = SUBSTAT[rec.substatType];
    if (ascStat === undefined) warn(`${key}: 未知 substatType ${rec.substatType}`);

    const bc = burstCost(raw, key);
    if (bc.value === '?') warn(`${key}: 爆发能量无法确定 (${bc.why})`);

    rows.push([
      String(rec.id),
      toSlug(rec.name),
      zhRec.name || '',
      rec.name,
      String(rec.rarity),
      element === undefined ? '' : element,
      weaponType || '',
      regionOf(rec),
      String(Math.round(st.hp)),
      String(Math.round(st.atk)),
      String(Math.round(st.def)),
      ascStat === undefined ? '' : ascStat,
      substatValue(rec.substatType, st.specialized),
      bc.value,
      version.characters ? (version.characters[key] || '') : '',
      'datamine',
    ]);
  }
  rows.sort((a, b) => Number(a[0]) - Number(b[0]));
  return rows;
}

// ---------------------------------------------------------------------------
// 回归自检：与外部独立来源（游戏内数值 / 社区公认值）比对，
// 防止公式复刻或字段解析被改坏。这些期望值不是从本脚本输出抄来的。
// ---------------------------------------------------------------------------
const REGRESSION = {
  hu_tao: { hp: 15552, atk: 106, def: 876, asc: 'crit_dmg_pct', ascVal: 38.4, burst: '60' },
  zhongli: { hp: 14695, atk: 251, def: 738, asc: 'elemental_dmg_pct', ascVal: 28.8, burst: '40' },
  furina: { hp: 15307, atk: 244, def: 696, asc: 'crit_rate_pct', ascVal: 19.2, burst: '60' },
  raiden_shogun: { hp: 12907, atk: 337, def: 789, asc: 'energy_recharge_pct', ascVal: 32, burst: '90' },
  nahida: { hp: 10360, atk: 299, def: 630, asc: 'em', ascVal: 115.2, burst: '50' },
  kaedehara_kazuha: { hp: 13348, atk: 297, def: 807, asc: 'em', ascVal: 115.2, burst: '60' },
  xiangling: { hp: 10875, atk: 225, def: 669, asc: 'em', ascVal: 96, burst: '80' },
  xingqiu: { hp: 10222, atk: 202, def: 758, asc: 'atk_pct', ascVal: 24, burst: '80' },
  fischl: { hp: 9189, atk: 244, def: 594, asc: 'atk_pct', ascVal: 24, burst: '60' },
  bennett: { hp: 12397, atk: 191, def: 771, asc: 'energy_recharge_pct', ascVal: 26.7, burst: '60' },
  noelle: { hp: 12071, atk: 191, def: 799, asc: 'def_pct', ascVal: 30, burst: '60' },
  jean: { hp: 14695, atk: 239, def: 769, asc: 'healing_bonus_pct', ascVal: 22.2, burst: '80' },
  ganyu: { hp: 9797, atk: 335, def: 630, asc: 'crit_dmg_pct', ascVal: 38.4, burst: '60' },
  sucrose: { hp: 9244, atk: 170, def: 703, asc: 'elemental_dmg_pct', ascVal: 24, burst: '80' },
  xiao: { hp: 12736, atk: 349, def: 799, asc: 'crit_rate_pct', ascVal: 19.2, burst: '70' },
  diluc: { hp: 12981, atk: 335, def: 784, asc: 'crit_rate_pct', ascVal: 19.2, burst: '40' },
};

function runRegression(rows) {
  const byslug = new Map(rows.map(r => [r[1], r]));
  const problems = [];
  for (const [slug, want] of Object.entries(REGRESSION)) {
    const row = byslug.get(slug);
    if (!row) { problems.push(`${slug}: 缺失`); continue; }
    const got = {
      hp: Number(row[8]), atk: Number(row[9]), def: Number(row[10]),
      asc: row[11], ascVal: Number(row[12]), burst: row[13],
    };
    for (const f of ['hp', 'atk', 'def', 'ascVal']) {
      if (got[f] !== want[f]) problems.push(`${slug}.${f}: got ${got[f]} want ${want[f]}`);
    }
    for (const f of ['asc', 'burst']) {
      if (got[f] !== want[f]) problems.push(`${slug}.${f}: got ${got[f]} want ${want[f]}`);
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------
// 武器回归自检：期望值来自外部（游戏内数值 / 社区公认值），不是脚本输出抄来的。
// ---------------------------------------------------------------------------
const WEAPON_REGRESSION = {
  staff_of_homa: { rarity: 5, atk: 608, sub: 'crit_dmg_pct', val: 66.2 },
  wolfs_gravestone: { rarity: 5, atk: 608, sub: 'atk_pct', val: 49.6 },
  amos_bow: { rarity: 5, atk: 608, sub: 'atk_pct', val: 49.6 },
  skyward_harp: { rarity: 5, atk: 674, sub: 'crit_rate_pct', val: 22.1 },
  aquila_favonia: { rarity: 5, atk: 674, sub: 'physical_dmg_pct', val: 41.3 },
  primordial_jade_winged_spear: { rarity: 5, atk: 674, sub: 'crit_rate_pct', val: 22.1 },
  engulfing_lightning: { rarity: 5, atk: 608, sub: 'energy_recharge_pct', val: 55.1 },
  aqua_simulacra: { rarity: 5, atk: 542, sub: 'crit_dmg_pct', val: 88.2 },
  the_catch: { rarity: 4, atk: 510, sub: 'energy_recharge_pct', val: 45.9 },
  favonius_sword: { rarity: 4, atk: 454, sub: 'energy_recharge_pct', val: 61.3 },
  iron_sting: { rarity: 4, atk: 510, sub: 'em', val: 165 },
  black_tassel: { rarity: 3, atk: 354, sub: 'hp_pct', val: 46.9 },
};

function runWeaponRegression(rows) {
  const bySlug = new Map(rows.map(r => [r[1], r]));
  const problems = [];
  for (const [slug, want] of Object.entries(WEAPON_REGRESSION)) {
    const row = bySlug.get(slug);
    if (!row) { problems.push(`${slug}: 缺失`); continue; }
    const got = {
      rarity: Number(row[4]), atk: Number(row[7]), sub: row[8], val: Number(row[9]),
    };
    for (const f of ['rarity', 'atk', 'val']) {
      if (got[f] !== want[f]) problems.push(`${slug}.${f}: got ${got[f]} want ${want[f]}`);
    }
    for (const f of ['sub']) {
      if (got[f] !== want[f]) problems.push(`${slug}.${f}: got ${got[f]} want ${want[f]}`);
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------
// 圣遗物回归自检：2 件套解析结果必须与公认数值一致。
// ---------------------------------------------------------------------------
const ARTIFACT_REGRESSION = {
  gladiators_finale: ['atk_pct', '18'],
  viridescent_venerer: ['anemo_dmg_pct', '15'],
  emblem_of_severed_fate: ['energy_recharge_pct', '20'],
  crimson_witch_of_flames: ['pyro_dmg_pct', '15'],
  deepwood_memories: ['dendro_dmg_pct', '15'],
  blizzard_strayer: ['cryo_dmg_pct', '15'],
  thundering_fury: ['electro_dmg_pct', '15'],
  heart_of_depth: ['hydro_dmg_pct', '15'],
  archaic_petra: ['geo_dmg_pct', '15'],
  pale_flame: ['physical_dmg_pct', '25'],
  tenacity_of_the_millelith: ['hp_pct', '20'],
  husk_of_opulent_dreams: ['def_pct', '30'],
  ocean_hued_clam: ['healing_bonus_pct', '15'],
  retracing_bolide: ['shield_strength_pct', '35'],
  gilded_dreams: ['em', '80'],
  berserker: ['crit_rate_pct', '12'],
  adventurer: ['hp', '1000'],
  lucky_dog: ['def', '100'],
  noblesse_oblige: ['elemental_burst_dmg_pct', '20'],
  marechaussee_hunter: ['normal_attack_dmg_pct', '15'],
  lavawalker: ['pyro_res_pct', '40'],
  tiny_miracle: ['elemental_res_pct', '20'],
};

function runArtifactRegression(setRows) {
  const bySlug = new Map(setRows.map(r => [r[1], r]));
  const problems = [];
  for (const [slug, [type, value]] of Object.entries(ARTIFACT_REGRESSION)) {
    const row = bySlug.get(slug);
    if (!row) { problems.push(`${slug}: 缺失`); continue; }
    if (row[5] !== type) problems.push(`${slug}.bonus_2pc_type: got ${row[5]} want ${type}`);
    if (row[6] !== value) problems.push(`${slug}.bonus_2pc_value: got ${row[6]} want ${value}`);
  }
  return problems;
}

// ---------------------------------------------------------------------------
// character_roles.csv —— 职能定位（推导字段）
//
// 两类来源，各自独立、互不冒充：
//   1. 解包技能文本（source=datamine, confidence=high）
//      机械类职能：healer / shielder / debuffer / buffer。判定依据是技能描述里
//      可核对的整句原文，写进 notes 供审计。
//   2. 社区标签（source=community, confidence=medium|low）
//      只用于输出轴：main_dps / sub_dps。来自 data/characters/community_roles.csv
//      （由 scripts/fetch_community_roles.py 抓取，含两个页面的交叉核对结果）。
//
// 刻意不做的事：
//   - 不从「倍率条目数量」猜 damage_source（条目数不反映伤害占比）→ 留空
//   - 不把「Support」硬塞进某个具体职能 → 无法判定具体职能时才用 support 兜底
// ---------------------------------------------------------------------------

const ROLE_ORDER = [
  'main_dps', 'sub_dps', 'driver', 'buffer', 'debuffer',
  'healer', 'shielder', 'battery', 'enabler', 'crowd_control', 'support',
];

// 队伍/他人指向的目标词。用于把「自我回血」排除在 healer 之外。
// `connected/current character(s)` 覆盖多莉（连结的角色）与行秋（当前角色）的措辞；
// `character(s)` 的复数形式必须放行，否则会漏掉希诺宁的 "active characters"。
const PARTY_TARGET =
  /\b(party members?|teammates?|allies|all characters|(?:active|current|connected) characters?|characters? within|nearby characters?|other party|within its AoE|within the field|in the field|within the skill's AoE)\b/i;

const ENEMY_WORD = /\b(opponents?|enemies|enemy)\b/i;

// 当角色没有输出轴定位时，is_primary 归给哪条职能行。
// 这不是强度排序，而是「哪一项最能定义该角色的功能位」：
// 护盾与减抗是更专一的功能，治疗次之，增伤最普遍（很多主 C 也带一点）。
const CAPABILITY_PRIORITY = ['shielder', 'debuffer', 'healer', 'buffer'];

// 把「队友」当触发条件的自我增益，不是队伍增益：
//   "For each Pyro party member, Navia gains 20% increased ATK."
//   "Each Pyro party member other than Lyney will cause the DMG dealt to increase..."
const SELF_CONDITIONAL = /\bFor each\b|\bEach\b[^.]{0,40}\bparty members?\b/i;

const CAPABILITY_RULES = [
  {
    role: 'healer',
    // 动词：heal/heals/healing/regenerat*/restor*。
    // `healing` 排除后接 "Bonus" 的情况（"Healing Bonus" 是增益不是治疗）；
    // `\bheals?\b` 本身不会命中 "Healing"。
    verb: /\b(heals?|healing(?!\s+Bonus)|regenerat\w*|restor\w*)\b/i,
    needsTarget: true,
    reason: '技能描述中为队友或范围内的角色恢复生命',
  },
  {
    role: 'shielder',
    verb: /((creates?|creating|summons?|summoning|grants?|granting|deploys?|deploying|generates?|generating|puts forth)\b[^.]{0,50}\bshield\b)|\bDMG [Aa]bsorption\b/i,
    reason: '技能描述中生成护盾或给出护盾吸收量',
  },
  {
    role: 'debuffer',
    // 必须同时出现「敌人」——否则会命中
    //   "Decreases Itto's Elemental and Physical RES by 20%"（自我减益）
    //   "increases the character's resistance to interruption, and decreases DMG taken"（减伤）
    verb: /((decreas|reduc)\w*[^.]{0,80}\b(RES|Resistance)\b)|(\b(RES|Resistance)\b[^.]{0,80}(decreas|reduc))|((decreas|reduc)\w*[^.]{0,40}\bDEF\b)|(\bDEF\b[^.]{0,40}(decreas|reduc))/i,
    enemyWord: true,
    reason: '技能描述中降低敌人的抗性或防御力',
  },
  {
    role: 'buffer',
    verb: /\b(gain|gains|grant|grants|granting|increas\w*|boost\w*|provid\w*|enhanc\w*|rais\w*)\b/i,
    statWord: /\b(ATK|DMG|Damage Bonus|Elemental DMG Bonus|Elemental Mastery|DEF|CRIT Rate|CRIT DMG|Healing Bonus|Attack SPD|Movement SPD|Shield Strength|Energy Recharge)\b/i,
    needsTarget: true,
    reason: '技能描述中为队伍提供属性或伤害增益',
  },
];

const TALENT_PROPS = ['combat1', 'combat2', 'combat3', 'passive1', 'passive2', 'passive3'];

function sentencesOf(text) {
  return String(text || '')
    .replace(/<[^>]*>/g, '')
    .split(/(?<=[.!])\s+/)
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/** notes 必须无逗号（CSV 契约），且不宜过长。 */
function noteText(s) {
  return s.replace(/,/g, '、').replace(/;/g, '；').replace(/\s+/g, ' ').trim().slice(0, 150);
}

/** 从解包技能文本推导机械类职能，返回 [{role, evidence}]。 */
function deriveCapabilities(raw, key) {
  const rec = raw.data.English.talents[key];
  const charRec = raw.data.English.characters[key];
  if (!rec) return [];
  const name = charRec ? charRec.name : '';
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // 「某角色自己的属性被提高」——受益者是本人而非队伍。四种措辞都要拦：
  //   被动:  "Xilonen's DEF is increased by 20%"
  //   主动:  "Mavuika's ATK increases by 30%"、"Kachina's Geo DMG Bonus increases by 20%"
  //   倒装:  "Other Geo party members increase Zibai's DEF by 15% each."
  //   受益:  "Navia gains 20% increased ATK"
  //   代词:  "Hydro party members increase her Elemental Mastery by 60 each."
  //   为本人: "Nearby party members can accumulate Will to Win for Lohen, increasing..."
  const SELF_PRONOUN_STAT =
    /\b(increas|boost|enhanc|rais)\w*\s[^.]{0,25}\b(his|her)\b\s+(own\s+)?(ATK|DEF|DMG|Elemental Mastery|CRIT|HP|Healing)/i;
  const selfBenefit = new RegExp(
    [
      `(\\b${esc}'s\\s[^.]{0,40}\\b(is|are|will be)\\s+(increased|boosted|enhanced|raised))`,
      `(\\b${esc}'s\\s[^.]{0,40}\\b(increases?|rises?|grows?)\\b)`,
      `(\\b(increas|boost|enhanc|rais)\\w*\\s[^.]{0,25}\\b${esc}'s\\b)`,
      `(\\b${esc}\\b[^.]{0,30}\\b(gains?|receives?|obtains?)\\b)`,
      `(\\bfor\\s+${esc}\\b[^.]{0,60}\\b(increas|boost|enhanc)\\w*)`,
    ].join('|'),
    'i');

  const found = [];
  for (const rule of CAPABILITY_RULES) {
    let evidence = null;
    for (const prop of TALENT_PROPS) {
      const talent = rec[prop];
      if (!talent) continue;
      for (const s of sentencesOf(talent.description)) {
        if (!rule.verb.test(s)) continue;
        if (rule.statWord && !rule.statWord.test(s)) continue;
        if (rule.needsTarget && !PARTY_TARGET.test(s)) continue;
        if (rule.enemyWord && !ENEMY_WORD.test(s)) continue;
        // 恢复能量/体力不是治疗：雷电将军「为附近队伍成员恢复元素能量」曾在此误判
        if (rule.role === 'healer'
            && /\b(Energy|Stamina)\b/i.test(s)
            && !/\b(HP|health)\b/i.test(s)) continue;
        if (rule.role === 'buffer'
            && (SELF_CONDITIONAL.test(s)
                || SELF_PRONOUN_STAT.test(s)
                || selfBenefit.test(s))) continue;
        evidence = `${prop}: ${noteText(s)}`;
        break;
      }
      if (evidence) break;
    }
    if (evidence) found.push({ role: rule.role, evidence });
  }
  return found;
}

/** 从伤害倍率标签读取面板属性来源（攻击力/生命值/防御力/元素精通）。 */
function deriveScalingStat(raw, key) {
  const rec = raw.data.English.talents[key];
  const params = raw.stats.talents[key];
  if (!rec || !params) return 'atk';
  const stats = new Set();
  for (const prop of ['combat1', 'combat2', 'combat3']) {
    const labels = (rec[prop] && rec[prop].attributes && rec[prop].attributes.labels) || [];
    for (const label of labels) {
      if (!/DMG/i.test(label)) continue;
      if (/Max HP/i.test(label)) stats.add('hp');
      else if (/\bDEF\b/.test(label)) stats.add('def');
      else if (/Elemental Mastery/i.test(label)) stats.add('em');
      else stats.add('atk');
    }
  }
  if (!stats.size) return 'atk';
  const ordered = ['atk', 'hp', 'def', 'em'].filter(s => stats.has(s));
  return ordered.join(';');
}

function readCommunityRoles(repo) {
  const file = path.join(repo, 'data', 'characters', 'community_roles.csv');
  if (!fs.existsSync(file)) {
    throw new Error(`缺少社区定位快照: data/characters/community_roles.csv\n` +
      `请先运行: python scripts/fetch_community_roles.py`);
  }
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(l => l.trim() !== '');
  const header = lines[0].split(',');
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const out = new Map();
  for (const line of lines.slice(1)) {
    const cells = line.split(',');
    if (cells.length !== header.length) {
      throw new Error(`community_roles.csv 列数异常: ${line.slice(0, 80)}`);
    }
    out.set(cells[idx.slug], {
      tier: cells[idx.role_tier_list],
      builds: cells[idx.role_builds],
      page: cells[idx.role_character_page],
      agree: cells[idx.agree],
    });
  }
  return { map: out, header };
}

const ROLES_HEADER = [
  'char_id', 'slug', 'role', 'is_primary', 'scaling_stat', 'damage_type',
  'damage_source', 'field_state', 'confidence', 'notes', 'version', 'source',
];

function buildRoles(raw, version, repo, args) {
  const { map: community } = readCommunityRoles(repo);
  const chars = listCharactersForRoles(raw, repo);
  const rows = [];
  const stats = { capability: 0, dps: 0, fallback: 0, noCommunity: 0, noData: 0 };

  for (const ch of chars) {
    const caps = deriveCapabilities(raw, ch.sourceKey);
    const comm = community.get(ch.slug);
    const scaling = deriveScalingStat(raw, ch.sourceKey);
    const damageType = ch.ascensionStat === 'physical_dmg_pct' ? 'physical' : (ch.element || '');
    const ver = version.characters ? (version.characters[ch.sourceKey] || '') : '';

    // 输出轴：优先 tier-list，冲突时采用 tier-list 并在 notes 记录
    let dpsRole = '';
    let dpsConfidence = '';
    let dpsNote = '';
    if (comm) {
      const labels = [comm.tier, comm.builds, comm.page].filter(Boolean);
      const dps = labels.filter(l => l === 'main_dps' || l === 'sub_dps');
      const uniq = [...new Set(dps)];
      if (uniq.length === 1) {
        dpsRole = uniq[0];
        if (comm.agree === 'true') dpsConfidence = 'medium';
        else if (comm.agree === 'false') {
          dpsConfidence = 'low';
          dpsNote = `来源冲突:tier-list=${comm.tier || '-'}/builds=${comm.builds || '-'}`;
        } else dpsConfidence = 'low';
      } else if (uniq.length > 1) {
        dpsRole = comm.tier === 'sub_dps' ? 'sub_dps' : 'main_dps';
        dpsConfidence = 'low';
        dpsNote = `来源冲突:tier-list=${comm.tier || '-'}/builds=${comm.builds || '-'}`;
      }
    } else {
      stats.noCommunity++;
    }

    if (dpsRole) {
      stats.dps++;
      const fieldState = dpsRole === 'main_dps' ? 'on_field' : 'off_field';
      rows.push([
        ch.charId, ch.slug, dpsRole, 'true', scaling, damageType, '', fieldState,
        dpsConfidence,
        noteText([dpsNote, comm && comm.agree === 'true' ? `社区来源一致:${comm.tier}` : ''].filter(Boolean).join(' ') || '社区定位'),
        ver, 'community',
      ]);
    }

    // 每个角色恰好一行 is_primary=true：有输出轴行则归它，否则归优先级最高的职能行
    let primaryTaken = Boolean(dpsRole);
    const orderedCaps = [...caps].sort(
      (a, b) => CAPABILITY_PRIORITY.indexOf(a.role) - CAPABILITY_PRIORITY.indexOf(b.role));
    for (const cap of orderedCaps) {
      stats.capability++;
      const primary = primaryTaken ? 'false' : 'true';
      primaryTaken = true;
      rows.push([
        ch.charId, ch.slug, cap.role, primary, scaling, damageType, '', '',
        'high', cap.evidence, ver, 'datamine',
      ]);
    }

    // 兜底：社区标为 Support 但技能文本未匹配到任何具体职能
    if (!dpsRole && caps.length === 0) {
      if (comm) {
        stats.fallback++;
        rows.push([
          ch.charId, ch.slug, 'support', 'true', scaling, damageType, '', '',
          comm.agree === 'true' ? 'medium' : 'low',
          '社区标注为 Support、但解包技能文本未匹配到具体职能',
          ver, 'community',
        ]);
      } else {
        // 既无社区标签、也无解包技能记录（旅行者与特殊条目）→ 不产出定位行
        stats.noData++;
      }
    }
  }

  rows.sort((a, b) => {
    const d = Number(a[0]) - Number(b[0]);
    if (d !== 0) return d;
    return ROLE_ORDER.indexOf(a[2]) - ROLE_ORDER.indexOf(b[2]);
  });

  console.error(`职能行: 解包推导 ${stats.capability} / 社区输出轴 ${stats.dps} / support 兜底 ${stats.fallback}`);
  if (stats.noCommunity) console.error(`无社区标签的角色: ${stats.noCommunity}（旅行者与特殊条目）`);
  if (stats.noData) console.error(`既无社区标签也无解包技能记录、未产出定位行: ${stats.noData}`);

  return [writeCsv('data/characters/character_roles.csv', ROLES_HEADER, rows)];
}

/** 读 characters.csv 中已生成的角色，供 roles 阶段复用（保证两表 slug 一致）。 */
function listCharactersForRoles(raw, repo) {
  const file = path.join(repo, 'data', 'characters', 'characters.csv');
  if (!fs.existsSync(file)) {
    throw new Error('缺少 data/characters/characters.csv，请先运行 --targets characters');
  }
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(l => l.trim() !== '');
  const header = lines[0].split(',');
  const i = Object.fromEntries(header.map((h, n) => [h, n]));
  const bySlugKey = new Map();
  for (const key of Object.keys(raw.data.English.characters)) {
    bySlugKey.set(toSlug(raw.data.English.characters[key].name), key);
  }
  return lines.slice(1).map(line => {
    const c = line.split(',');
    return {
      charId: c[i.char_id],
      slug: c[i.slug],
      element: c[i.element],
      ascensionStat: c[i.ascension_stat],
      sourceKey: bySlugKey.get(c[i.slug]),
    };
  }).filter(c => c.sourceKey);
}

// ---------------------------------------------------------------------------
// weapons.csv
//
// 武器基础攻击力来自解包的成长曲线；副属性类型是定值、数值随等级成长。
// 注意：1★/2★ 共 10 把武器等级上限为 70（其余 245 把为 90），因此新增
// `max_level` 列，并把 base_atk_lv90 / sub_stat_value_lv90 定义为「满级值」。
// ---------------------------------------------------------------------------

const WEAPONS_HEADER = [
  'weapon_id', 'slug', 'name_zh', 'name_en', 'rarity', 'weapon_type', 'max_level',
  'base_atk_lv90', 'sub_stat', 'sub_stat_value_lv90',
  'passive_name_zh', 'passive_summary', 'obtain_method', 'version', 'source',
];

const WEAPON_TYPE = {
  WEAPON_SWORD_ONE_HAND: 'sword', WEAPON_CLAYMORE: 'claymore',
  WEAPON_POLE: 'polearm', WEAPON_CATALYST: 'catalyst', WEAPON_BOW: 'bow',
};

/** 武器满级属性：攻击力走曲线 + 突破加成；副属性只走曲线（genshin-db 原实现如此）。 */
function weaponStatsAtMax(raw, key) {
  const s = raw.stats.weapons[key];
  if (!s) return undefined;
  const maxLevel = s.promotion[s.promotion.length - 1].maxlevel;
  const [, promo] = promotionAt(s.promotion, maxLevel, '+');
  const c = raw.curve.weapons[String(maxLevel)];
  if (!c) throw new Error(`武器曲线缺少 ${maxLevel} 级`);
  return {
    maxLevel,
    atk: s.base.attack * c[s.curve.attack] + promo.attack,
    specialized: s.base.specialized * c[s.curve.specialized],
    specializedType: s.specialized,
  };
}

/** 副属性数值：EM 为整数固定值，其余按百分数数值保留 1 位小数（与游戏内显示一致）。
 *  注意传入的是已映射的仓库枚举（`em`），不是原始的 FIGHT_PROP_* 名。
 *  源数据里 prizedisshinblade-01 的 baseStatText 是字面量 "NaN"、base.specialized=0，
 *  这种情况按契约留空（未知），而不是写成 0。 */
function weaponSubstatValue(type, value) {
  if (!type) return '';
  if (!Number.isFinite(value) || value === 0) return '';
  if (type === 'em') return String(Math.round(value));
  return String(Math.round(value * 1000) / 10);
}

function buildWeapons(raw, version) {
  const en = raw.data.English.weapons;
  const zh = raw.data.ChineseSimplified.weapons;
  const usedSlug = new Map();
  const rows = [];

  for (const key of Object.keys(en)) {
    const rec = en[key];
    const zrec = zh[key] || {};
    const st = weaponStatsAtMax(raw, key);
    if (!st) { warn(`武器 ${key}: 缺少 stats，已跳过`); continue; }

    const base = toSlug(rec.name);
    if (!base) throw new Error(`武器 ${key} 无法生成 slug`);
    const slug = uniqueSlug(base, key, usedSlug);
    usedSlug.set(slug, key);

    const wtype = WEAPON_TYPE[rec.weaponType];
    if (!wtype) warn(`武器 ${key}: 未知 weaponType ${rec.weaponType}`);

    const subStat = SUBSTAT[st.specializedType];
    const r1zh = zrec.r1 && zrec.r1.description;
    const r1en = rec.r1 && rec.r1.description;

    rows.push([
      String(rec.id), slug, zrec.name || '', rec.name,
      String(rec.rarity), wtype || '', String(st.maxLevel),
      String(Math.round(st.atk)),
      subStat === undefined ? '' : (subStat || ''),
      weaponSubstatValue(subStat, st.specialized),
      zrec.effectName || rec.effectName || '',
      noteText(r1zh || r1en || ''),           // 被动全文，优先中文（中文标点不含 ASCII 逗号）
      '',                                      // obtain_method：源数据无此字段
      version.weapons ? (version.weapons[key] || '') : '',
      'datamine',
    ]);
  }

  rows.sort((a, b) => Number(a[0]) - Number(b[0]));
  return rows;
}

// ---------------------------------------------------------------------------
// artifact_sets.csv + artifact_set_bonuses.csv
//
// 套装效果是自然语言，因此采用「规则表 + 无匹配即中止」策略：
// 任何一条 2 件套文本若无任何规则命中，脚本直接退出，避免静默漏解析。
// ---------------------------------------------------------------------------

const ELEMENT_EN = {
  Pyro: 'pyro', Hydro: 'hydro', Anemo: 'anemo', Electro: 'electro',
  Dendro: 'dendro', Cryo: 'cryo', Geo: 'geo',
};

/** 规则按顺序匹配，命中后从文本中移除，避免同一数值被多条规则重复计入。
 *  `types` 里的 `$N` 指向捕获组 N；`valueGroup` 指定数值所在的捕获组（默认 1）。 */
const ARTIFACT_STAT_RULES = [
  { re: /ATK \+(\d+(?:\.\d+)?)%/, types: ['atk_pct'], unit: 'pct' },
  { re: /HP \+(\d+(?:\.\d+)?)%/, types: ['hp_pct'], unit: 'pct' },
  { re: /Max HP increased by ([\d,]+)/, types: ['hp'], unit: 'flat' },
  { re: /DEF \+(\d+(?:\.\d+)?)%/, types: ['def_pct'], unit: 'pct' },
  { re: /DEF increased by ([\d,]+)/, types: ['def'], unit: 'flat' },
  { re: /Increases Elemental Mastery by (\d+)/, types: ['em'], unit: 'flat' },
  { re: /CRIT Rate \+(\d+(?:\.\d+)?)%/, types: ['crit_rate_pct'], unit: 'pct' },
  { re: /CRIT DMG \+(\d+(?:\.\d+)?)%/, types: ['crit_dmg_pct'], unit: 'pct' },
  { re: /Energy Recharge \+(\d+(?:\.\d+)?)%/, types: ['energy_recharge_pct'], unit: 'pct' },
  { re: /Gain a (\d+(?:\.\d+)?)% (\w+) DMG Bonus/, types: ['$2_dmg_pct'], unit: 'pct' },
  { re: /(\w+) DMG Bonus \+(\d+(?:\.\d+)?)%/, types: ['$1_dmg_pct'], unit: 'pct', valueGroup: 2 },
  { re: /Physical DMG (?:is increased by |\+)(\d+(?:\.\d+)?)%/, types: ['physical_dmg_pct'], unit: 'pct' },
  { re: /Elemental Skill and Elemental Burst DMG \+(\d+(?:\.\d+)?)%/, types: ['elemental_skill_dmg_pct', 'elemental_burst_dmg_pct'], unit: 'pct' },
  { re: /Elemental Burst DMG \+(\d+(?:\.\d+)?)%/, types: ['elemental_burst_dmg_pct'], unit: 'pct' },
  { re: /Increases Elemental Skill DMG by (\d+(?:\.\d+)?)%/, types: ['elemental_skill_dmg_pct'], unit: 'pct' },
  { re: /Normal and Charged Attack DMG \+(\d+(?:\.\d+)?)%/, types: ['normal_attack_dmg_pct', 'charged_attack_dmg_pct'], unit: 'pct' },
  { re: /Normal Attack DMG (?:increased by |\+)(\d+(?:\.\d+)?)%/, types: ['normal_attack_dmg_pct'], unit: 'pct' },
  { re: /Plunging Attack DMG increased by (\d+(?:\.\d+)?)%/, types: ['plunging_dmg_pct'], unit: 'pct' },
  { re: /Healing Bonus \+(\d+(?:\.\d+)?)%/, types: ['healing_bonus_pct'], unit: 'pct' },
  { re: /Character Healing Effectiveness \+(\d+(?:\.\d+)?)%/, types: ['healing_bonus_pct'], unit: 'pct' },
  { re: /Increases incoming healing by (\d+(?:\.\d+)?)%/, types: ['incoming_healing_bonus_pct'], unit: 'pct' },
  { re: /Increases Shield Strength by (\d+(?:\.\d+)?)%/, types: ['shield_strength_pct'], unit: 'pct' },
  { re: /All Elemental RES increased by (\d+(?:\.\d+)?)%/, types: ['elemental_res_pct'], unit: 'pct' },
  { re: /(\w+) RES increased by (\d+(?:\.\d+)?)%/, types: ['$1_res_pct'], unit: 'pct', valueGroup: 2 },
  // 4 件套常见的「X is increased by Y%」句式（2 件套极少用这种写法）
  { re: /Normal, Charged, and Plunging Attack DMG will increase by (\d+(?:\.\d+)?)%/, types: ['normal_attack_dmg_pct', 'charged_attack_dmg_pct', 'plunging_dmg_pct'], unit: 'pct' },
  { re: /(Normal|Charged|Plunging) Attack DMG (?:is increased|will increase|increases?) by (\d+(?:\.\d+)?)%/, types: ['$1_attack_dmg_pct'], unit: 'pct', valueGroup: 2 },
  { re: /increases Charged Attack DMG by (\d+(?:\.\d+)?)%/, types: ['charged_attack_dmg_pct'], unit: 'pct' },
  { re: /CRIT Rate (?:is increased|increases) by (?:an additional )?(\d+(?:\.\d+)?)%/, types: ['crit_rate_pct'], unit: 'pct' },
  { re: /CRIT DMG (?:is increased|increases) by (?:an additional )?(\d+(?:\.\d+)?)%/, types: ['crit_dmg_pct'], unit: 'pct' },
  { re: /ATK is increased by (\d+(?:\.\d+)?)%/, types: ['atk_pct'], unit: 'pct' },
  { re: /Increases DMG by (\d+(?:\.\d+)?)%/, types: ['dmg_pct'], unit: 'pct' },
  { re: /gain an? (\d+(?:\.\d+)?)% (?:Elemental )?DMG Bonus/, types: ['elemental_dmg_pct'], unit: 'pct' },
  // 减抗类（挂在敌人身上，与自身属性加成不同）
  { re: /(\w+) RES will be decreased by (\d+(?:\.\d+)?)%/, types: ['$1_res_shred_pct'], unit: 'pct', valueGroup: 2 },
  // 必须排在元素伤害规则之后，否则 \w+ 会把 "dealt" 之类当成元素名
  { re: /DMG dealt is increased by (\d+(?:\.\d+)?)%/, types: ['dmg_pct'], unit: 'pct' },
  // 回复元素能量类（如「烬城勇者绘卷」2 件套）
  { re: /regenerates (\d+) Elemental Energy/, types: ['energy_regen'], unit: 'flat' },
];

const ARTIFACT_SETS_HEADER = [
  'set_id', 'slug', 'name_zh', 'name_en', 'rarity_max',
  'bonus_2pc_type', 'bonus_2pc_value', 'bonus_4pc_summary',
  'obtain_domain', 'version', 'source',
];

const ARTIFACT_BONUSES_HEADER = [
  'set_id', 'slug', 'pieces', 'effect_index', 'effect_name', 'effect_type',
  'effect_target', 'value', 'value_unit', 'condition', 'duration_sec',
  'max_stacks', 'notes', 'version', 'source',
];

/** 在效果文本中提取结构化属性，返回 [{type, value, unit}]。 */
function parseArtifactStats(text) {
  const out = [];
  let rest = String(text || '');
  for (const rule of ARTIFACT_STAT_RULES) {
    const m = rest.match(rule.re);
    if (!m) continue;
    for (const t of rule.types) {
      const type = t.replace(/\$(\d)/g, (_, n) => {
        const word = m[Number(n)];
        return ELEMENT_EN[word] || String(word).toLowerCase();
      });
      out.push({
        type,
        value: String(m[rule.valueGroup || 1]).replace(/,/g, ''),
        unit: rule.unit,
      });
    }
    rest = rest.replace(rule.re, ' ');
  }
  return out;
}

/** 触发条件：取第一个分句（中文按「，」，英文按逗号）。 */
function firstClause(text) {
  const zhParts = String(text || '').split('，');
  if (zhParts.length > 1) return zhParts[0];
  const enParts = String(text || '').split(/,\s*/);
  return enParts.length > 1 ? enParts[0] : '';
}

/** 仅当文本中恰好出现一次时才返回，避免把套装级数值误挂到某一条效果上。
 *  正则可含多个捕获组（不同语序），取第一个有值的组。 */
function singleNumber(text, re) {
  const hits = [];
  for (const m of String(text || '').matchAll(re)) {
    const v = m.slice(1).find(x => x !== undefined);
    if (v !== undefined) hits.push(v);
  }
  return hits.length === 1 ? hits[0] : '';
}

function buildArtifacts(raw, version) {
  const en = raw.data.English.artifacts;
  const zh = raw.data.ChineseSimplified.artifacts;
  const keys = Object.keys(en).sort();
  const setRows = [];
  const bonusRows = [];
  const unparsed = [];
  const usedSlug = new Map();

  for (const key of keys) {
    const rec = en[key];
    const zrec = zh[key] || {};
    const base = toSlug(rec.name);
    if (!base) throw new Error(`圣遗物 ${key} 无法生成 slug`);
    const slug = uniqueSlug(base, key, usedSlug);
    usedSlug.set(slug, key);
    const ver = version.artifacts ? (version.artifacts[key] || '') : '';
    const rarityMax = Array.isArray(rec.rarityList) && rec.rarityList.length
      ? String(Math.max(...rec.rarityList)) : '';

    const eff2 = rec.effect2Pc;
    const eff4 = rec.effect4Pc;
    const zh2 = zrec.effect2Pc;
    const zh4 = zrec.effect4Pc;

    const parsed2 = eff2 ? parseArtifactStats(eff2) : [];
    if (eff2 && parsed2.length === 0) unparsed.push(`${key}: ${JSON.stringify(eff2)}`);

    setRows.push([
      String(rec.id), slug, zrec.name || '', rec.name, rarityMax,
      parsed2.length ? parsed2[0].type : '',
      parsed2.length ? parsed2[0].value : '',
      noteText(zh4 || eff4 || ''),
      '',                                   // obtain_domain：源数据无此字段
      ver, 'datamine',
    ]);

    parsed2.forEach((s, i) => {
      bonusRows.push([
        String(rec.id), slug, '2', String(i + 1), '',
        s.type, 'self', s.value, s.unit, '', '', '',
        noteText(zh2 || eff2 || ''),
        ver, 'datamine',
      ]);
    });

    if (eff4) {
      const parsed4 = parseArtifactStats(eff4);
      const duration = singleNumber(eff4, /for (\d+(?:\.\d+)?)s\b/g);
      // 叠层语序有两种：「maximum of 3 stacks」与「stacks up to 2 times」
      const stacks = singleNumber(eff4,
        /(?:maximum of|up to|max(?:imum)?) (\d+) stacks?|stacks? up to (\d+) times?/gi);
      const target = /party members|nearby party|all party/i.test(eff4) ? 'team' : 'self';
      const condition = noteText(firstClause(zh4 || eff4));

      if (parsed4.length === 0) {
        bonusRows.push([
          String(rec.id), slug, '4', '1', '', '', target, '', '',
          condition, duration, stacks, noteText(zh4 || eff4), ver, 'datamine',
        ]);
      } else {
        // 数值依赖其他属性时（如「基于元素充能效率的 25%」）不填 value
        const qualified = /of (Energy Recharge|Max HP|DEF|Elemental Mastery)/i.test(eff4);
        parsed4.forEach((s, i) => {
          bonusRows.push([
            String(rec.id), slug, '4', String(i + 1), '',
            s.type, target,
            qualified ? '' : s.value, qualified ? '' : s.unit,
            condition, duration, stacks,
            qualified
              ? `数值取决于其他属性、不单独给出: ${noteText(eff4)}`
              : noteText(zh4 || eff4),
            ver, 'datamine',
          ]);
        });
      }
    }
  }

  if (unparsed.length) {
    console.error('\n[2 件套解析失败] 规则表需补充，已中止写入：');
    unparsed.forEach(u => console.error('  - ' + u));
    process.exit(3);
  }

  setRows.sort((a, b) => Number(a[0]) - Number(b[0]));
  bonusRows.sort((a, b) => Number(a[0]) - Number(b[0]) || Number(a[2]) - Number(b[2]) || Number(a[3]) - Number(b[3]));

  // 覆盖度报告（非闸门）：4 件套是复合条件句，结构化字段本就填不全，这里让缺口可见
  const p4 = bonusRows.filter(r => r[2] === '4');
  console.error(`4 件套行 ${p4.length}：effect_type 有值 ${p4.filter(r => r[5]).length} / `
    + `duration_sec 有值 ${p4.filter(r => r[10]).length} / max_stacks 有值 ${p4.filter(r => r[11]).length}`);
  return { setRows, bonusRows };
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------
const produced = [];

if (TARGETS.has('characters')) {
  const rows = buildCharacters();
  const problems = runRegression(rows);
  if (problems.length) {
    console.error('\n[回归自检失败] 与已知值不一致，已中止写入：');
    problems.forEach(p => console.error('  - ' + p));
    process.exit(2);
  }
  console.error(`回归自检通过（${Object.keys(REGRESSION).length} 个角色）`);
  produced.push(writeCsv('data/characters/characters.csv', CHARACTER_HEADER, rows));
}

if (TARGETS.has('roles')) {
  produced.push(...buildRoles(raw, version, REPO, args));
}

if (TARGETS.has('weapons')) {
  const rows = buildWeapons(raw, version);
  const problems = runWeaponRegression(rows);
  if (problems.length) {
    console.error('\n[武器回归自检失败] 已中止写入：');
    problems.forEach(p => console.error('  - ' + p));
    process.exit(2);
  }
  console.error(`武器回归自检通过（${Object.keys(WEAPON_REGRESSION).length} 把）`);
  produced.push(writeCsv('data/weapons/weapons.csv', WEAPONS_HEADER, rows));
}

if (TARGETS.has('artifacts')) {
  const { setRows, bonusRows } = buildArtifacts(raw, version);
  const problems = runArtifactRegression(setRows);
  if (problems.length) {
    console.error('\n[圣遗物回归自检失败] 已中止写入：');
    problems.forEach(p => console.error('  - ' + p));
    process.exit(2);
  }
  console.error(`圣遗物回归自检通过（${Object.keys(ARTIFACT_REGRESSION).length} 套）`);
  produced.push(writeCsv('data/artifacts/artifact_sets.csv', ARTIFACT_SETS_HEADER, setRows));
  produced.push(writeCsv('data/artifacts/artifact_set_bonuses.csv', ARTIFACT_BONUSES_HEADER, bonusRows));
}

console.log('\n=== 导入结果 ===');
for (const p of produced) console.log(`  ${p.path}  (${p.rows} 行)`);
console.log(`  写入模式: ${args.dryRun ? 'DRY-RUN（未写文件）' : '已写入'}`);

if (warnings.length) {
  console.log(`\n=== 警告 (${warnings.length}) ===`);
  warnings.forEach(w => console.log('  - ' + w));
}
