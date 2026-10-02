/**
 * scripts/lib/kqm.mjs 的单元测试。
 *
 * 运行: node --test
 *
 * 这里测的是**转写表自身的内部一致性**与**锚点机制**，不需要联网。
 * 若本地已有 `.cache/kqm-tcl/`（由 `--fetch` 生成），还会额外跑一次
 * 「真实源文件 vs 锚点」的集成校验。
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SRC, ANCHORS, checkAnchors, MAX_LEVEL, ELEMENT_ZH, GAME_VERSION,
  LEVEL_HEADER, LEVEL_REGRESSION, buildLevels,
  REACTIONS_HEADER, REACTIONS, buildReactions,
  AURA_HEADER, AURA, buildAura,
  ENERGY_HEADER, ENERGY_TABLE, buildEnergy,
  RESONANCE_HEADER, RESONANCE, buildResonance,
} from '../scripts/lib/kqm.mjs';

const REPO = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const cachePath = (src) => path.join(REPO, '.cache', 'kqm-tcl', src.replace(/\//g, '__'));

/** 所有构建器的产物，统一做「无 ASCII 逗号」与「行宽一致」检查。 */
const ALL_TABLES = [
  ['level_coefficients', LEVEL_HEADER, buildLevels([], [], []) ],
];

// ---------------------------------------------------------------------------
// 锚点机制
// ---------------------------------------------------------------------------
test('checkAnchors: 源内容齐全时无问题', () => {
  // 造一个满足全部锚点的假源
  const fake = {};
  for (const { src, must } of ANCHORS) fake[src] = (fake[src] || '') + must.join(' ');
  const problems = checkAnchors(src => fake[src]);
  assert.deepEqual(problems, []);
});

test('checkAnchors: 缺少某个数值时精确报出', () => {
  const fake = {};
  for (const { src, must } of ANCHORS) fake[src] = (fake[src] || '') + must.join(' ');
  // 抹掉超载的新倍率，模拟上游回退到旧值
  fake[SRC.transformFormula] = fake[SRC.transformFormula].replace('2.75', '2.0');
  const problems = checkAnchors(src => fake[src]);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /2\.75/);
});

test('checkAnchors: 源文件读不到时报告而不是抛出', () => {
  const problems = checkAnchors(() => { throw new Error('缺少缓存'); });
  assert.ok(problems.length > 0);
  assert.match(problems[0], /无法读取/);
});

test('每个锚点引用的文件都在 SRC 中登记', () => {
  const known = new Set(Object.values(SRC));
  for (const { src } of ANCHORS) assert.ok(known.has(src), `${src} 未在 SRC 登记`);
});

// ---------------------------------------------------------------------------
// 等级系数
// ---------------------------------------------------------------------------
test('buildLevels: 索引即等级，等级 90 = 1446.8535', () => {
  // 造一个满足回归锚点的最小数组
  const curve = [];
  for (const [lv, v] of Object.entries(LEVEL_REGRESSION)) curve[Number(lv)] = v;
  for (let i = 0; i <= MAX_LEVEL; i++) if (curve[i] === undefined) curve[i] = 1;
  const { rows, problems } = buildLevels(curve, curve, curve);
  assert.deepEqual(problems, []);
  assert.equal(rows.length, MAX_LEVEL);
  assert.equal(rows[0][0], '1');
  assert.equal(rows[89][0], '90');
  assert.equal(rows[89][1], '1446.8535');
});

test('buildLevels: 锚点不符时报告问题', () => {
  const wrong = [];
  for (let i = 0; i <= MAX_LEVEL; i++) wrong[i] = 1;
  const { problems } = buildLevels(wrong, wrong, wrong);
  assert.ok(problems.length >= 1);
  assert.match(problems.join(' '), /等级 90/);
});

// ---------------------------------------------------------------------------
// 反应
// ---------------------------------------------------------------------------
test('buildReactions: reaction_id 唯一且行宽与表头一致', () => {
  const rows = buildReactions();
  const ids = rows.map(r => r[0]);
  assert.equal(new Set(ids).size, ids.length, 'reaction_id 必须唯一');
  for (const r of rows) assert.equal(r.length, REACTIONS_HEADER.length);
});

test('buildReactions: 5.2 加强后的倍率（旧值 2.0/0.5 已过期）', () => {
  const by = Object.fromEntries(buildReactions().map(r => [r[0], r]));
  assert.equal(by.overloaded[7], '2.75');
  assert.equal(by.superconduct[7], '1.5');
  assert.equal(by.shattered[7], '3');
  assert.equal(by.hyperbloom[7], '3');
  assert.equal(by.burgeon[7], '3');
  assert.equal(by.swirl[7], '0.6');
  assert.equal(by.burning[7], '0.25');
  assert.equal(by.bloom[7], '2');
});

test('buildReactions: 超绽放与烈绽放都是草元素伤害', () => {
  // 曾误写成雷/火；这决定了「堆草抗削减是否有效」
  const by = Object.fromEntries(buildReactions().map(r => [r[0], r]));
  assert.equal(by.hyperbloom[6], 'dendro');
  assert.equal(by.burgeon[6], 'dendro');
});

test('buildReactions: 燃烧是剧变反应而非无伤害反应', () => {
  const by = Object.fromEntries(buildReactions().map(r => [r[0], r]));
  assert.equal(by.burning[3], 'transformative');
  assert.equal(by.burning[6], 'pyro');
});

test('buildReactions: 三种精通系数各自对应，且不可混用', () => {
  const by = Object.fromEntries(buildReactions().map(r => [r[0], r]));
  assert.equal(by.vaporize_strong[8], 'amplifying');
  assert.equal(by.overloaded[8], 'transformative');
  assert.equal(by.aggravate[8], 'additive');
  // 结晶无伤害但属于剧变
  assert.equal(by.crystallize[3], 'transformative');
  assert.equal(by.crystallize[7], '0');
  assert.equal(by.crystallize[8], 'none');
});

test('buildReactions: 剧变不吃暴击与防御区，增幅/催化都吃', () => {
  const by = Object.fromEntries(buildReactions().map(r => [r[0], r]));
  for (const id of ['overloaded', 'superconduct', 'electro_charged', 'shattered', 'swirl', 'burning', 'hyperbloom', 'burgeon']) {
    assert.equal(by[id][9], 'false', `${id} 不应吃暴击`);
    assert.equal(by[id][10], 'false', `${id} 不应吃防御区`);
  }
  for (const id of ['vaporize_strong', 'melt_weak', 'aggravate', 'spread']) {
    assert.equal(by[id][9], 'true', `${id} 应吃暴击`);
    assert.equal(by[id][10], 'true', `${id} 应吃防御区`);
  }
});

test('buildReactions: 蒸发与融化拆成强/弱两条（倍率与附着消耗都不同）', () => {
  const by = Object.fromEntries(buildReactions().map(r => [r[0], r]));
  assert.equal(by.vaporize_strong[7], '2');
  assert.equal(by.vaporize_weak[7], '1.5');
  assert.equal(by.melt_strong[7], '2');
  assert.equal(by.melt_weak[7], '1.5');
});

// ---------------------------------------------------------------------------
// 附着消耗
// ---------------------------------------------------------------------------
test('buildAura: 每个反应的单位修正是 1 或 2 或 0.5', () => {
  const by = Object.fromEntries(buildAura().map(r => [r[0], r]));
  assert.equal(by.overloaded[2], '1');
  assert.equal(by.superconduct[2], '1');
  assert.equal(by.vaporize_weak[2], '0.5');
  assert.equal(by.vaporize_strong[2], '2');
  assert.equal(by.swirl[2], '0.5');
  assert.equal(by.crystallize[2], '0.5');
});

test('buildAura: 感电是每跳 0.4U，碎冰是 8U（用 unit 而非 ratio）', () => {
  const by = Object.fromEntries(buildAura().map(r => [r[0], r]));
  assert.equal(by.electro_charged[1], '0.4');
  assert.equal(by.electro_charged[2], '');
  assert.equal(by.shattered[1], '8');
  assert.equal(by.shattered[2], '');
});

test('buildAura: unit 与 ratio 二者填其一，不得同时有值', () => {
  for (const r of buildAura()) {
    assert.ok(!(r[1] && r[2]), `${r[0]} 同时填了 unit 与 ratio`);
  }
});

test('buildAura: 两列都为空的行走必须带说明（不是遗漏）', () => {
  for (const r of buildAura()) {
    if (!r[1] && !r[2]) assert.ok(r[3] && r[3].length > 0, `${r[0]} 无值又无说明`);
  }
});

// ---------------------------------------------------------------------------
// 能量
// ---------------------------------------------------------------------------
test('buildEnergy: 24 行（12 组合 × 微粒/晶球）', () => {
  assert.equal(ENERGY_TABLE.length, 12);
  assert.equal(buildEnergy().length, 24);
});

test('buildEnergy: 晶球恒为微粒的 3 倍', () => {
  const round4 = (n) => Number(n.toFixed(4));   // 避免 2.1*3 = 6.300000000000001 的浮点噪声
  for (const [rel, field, party, particle, orb] of ENERGY_TABLE) {
    assert.equal(round4(orb), round4(particle * 3), `${rel}/${field}/${party} 晶球应为微粒 3 倍`);
  }
});

test('buildEnergy: 后台系数随队伍人数变化（4 人 60% / 3 人 70% / 2 人 80%）', () => {
  const rate = { '4': 0.6, '3': 0.7, '2': 0.8 };
  for (const [rel, field, party, particle] of ENERGY_TABLE) {
    if (field !== 'off_field') continue;
    const base = ENERGY_TABLE.find(e => e[0] === rel && e[1] === 'on_field')[3];
    assert.equal(Number((base * rate[party]).toFixed(4)), particle,
      `${rel} 后台 ${party} 人应为 ${base}×${rate[party]}`);
  }
});

test('buildEnergy: 在场角色与队伍人数无关（party_size = NA）', () => {
  for (const r of buildEnergy()) {
    if (r[2] === 'on_field') assert.equal(r[3], 'NA');
    else assert.ok(['2', '3', '4'].includes(r[3]));
  }
});

test('buildEnergy: 同元素是异元素的 3 倍，无色是异元素的 2 倍（在场）', () => {
  const onField = (rel) => ENERGY_TABLE.find(e => e[0] === rel && e[1] === 'on_field')[3];
  assert.equal(onField('same'), onField('different') * 3);
  assert.equal(onField('no_element'), onField('different') * 2);
});

// ---------------------------------------------------------------------------
// 元素共鸣
// ---------------------------------------------------------------------------
test('buildResonance: 每个共鸣的 effect_index 从 1 连续递增', () => {
  const byId = {};
  for (const r of buildResonance()) (byId[r[0]] ||= []).push(Number(r[1]));
  for (const [id, idx] of Object.entries(byId)) {
    assert.deepEqual(idx, idx.map((_, i) => i + 1), `${id} 的 effect_index 不连续`);
  }
});

test('buildResonance: condition 用元素中文名而不是名称前缀（回归 #27）', () => {
  // 曾用 zh.slice(0,2) 生成「炽热元素角色」这种错误文本
  const by = Object.fromEntries(
    buildResonance().filter(r => r[0] === 'fervent_flames').map(r => [r[0], r]));
  assert.equal(by.fervent_flames[9], '队伍中有 2 名火元素角色');
  const geo = buildResonance().find(r => r[0] === 'enduring_rock');
  assert.equal(geo[9], '队伍中有 2 名岩元素角色');
});

test('buildResonance: 庇护之光是四元素条件', () => {
  const r = buildResonance().find(x => x[0] === 'protective_canopy');
  assert.equal(r[9], '队伍中有 4 名不同元素角色');
});

test('buildResonance: 只使用已知元素枚举', () => {
  for (const r of buildResonance()) {
    for (const el of r[2].split(';')) {
      assert.ok(el === 'any' || ELEMENT_ZH[el], `未知元素 ${el}`);
    }
  }
});

test('buildResonance: 八个共鸣齐全', () => {
  const ids = new Set(buildResonance().map(r => r[0]));
  assert.equal(ids.size, 8);
  for (const id of ['fervent_flames', 'soothing_water', 'high_voltage', 'shattering_ice',
    'impetuous_winds', 'enduring_rock', 'sprawling_greenery', 'protective_canopy']) {
    assert.ok(ids.has(id), `缺少 ${id}`);
  }
});

// ---------------------------------------------------------------------------
// 全表通用契约
// ---------------------------------------------------------------------------
test('所有表：行宽与表头一致、无 ASCII 逗号、source_url 指向已登记文件', () => {
  const known = new Set(Object.values(SRC));
  const tables = [
    ['level_coefficients', LEVEL_HEADER, buildReactions() && buildLevels(
      Array.from({ length: 201 }, () => 17.165606), Array.from({ length: 201 }, () => 17.165606),
      Array.from({ length: 201 }, () => 91.1791)).rows],
    ['reactions', REACTIONS_HEADER, buildReactions()],
    ['aura_consumption', AURA_HEADER, buildAura()],
    ['particle_energy', ENERGY_HEADER, buildEnergy()],
    ['elemental_resonance', RESONANCE_HEADER, buildResonance()],
  ];
  for (const [name, header, rows] of tables) {
    for (const row of rows) {
      assert.equal(row.length, header.length, `${name} 行宽不符: ${row[0]}`);
      for (const cell of row) {
        assert.ok(!String(cell).includes(','), `${name} 含 ASCII 逗号: ${cell}`);
        assert.ok(!String(cell).includes('\n'), `${name} 含换行`);
      }
    }
    const urlIdx = header.indexOf('source_url');
    if (urlIdx >= 0) {
      const urls = new Set(rows.map(r => r[urlIdx]));
      for (const u of urls) {
        assert.ok([...known].some(s => u.endsWith(s)), `source_url 未指向已登记文件: ${u}`);
      }
    }
    const verIdx = header.indexOf('version');
    if (verIdx >= 0) for (const r of rows) assert.equal(r[verIdx], GAME_VERSION);
  }
});

// ---------------------------------------------------------------------------
// 集成：若本地有缓存，用真实源文件跑一次锚点校验
// ---------------------------------------------------------------------------
const hasCache = fs.existsSync(cachePath(SRC.transformFormula));

test('集成: 真实源文件满足全部锚点', { skip: !hasCache && '未运行 --fetch，跳过' }, () => {
  const problems = checkAnchors((src) => {
    const p = cachePath(src);
    if (!fs.existsSync(p)) throw new Error(`缺少缓存 ${src}`);
    return fs.readFileSync(p, 'utf8');
  });
  assert.deepEqual(problems, []);
});
