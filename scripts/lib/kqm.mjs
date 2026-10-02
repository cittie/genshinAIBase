/**
 * KQM Theorycrafting Library 的**转写表与构建器**（纯逻辑，无 IO）。
 *
 * 拉取（网络）、锚点读取（文件）与写出（CSV）留在 `scripts/import_kqm_tcl.mjs`，
 * 本模块只负责「给定源文件内容 → 结构化行」，因此可以脱离网络做单元测试，
 * 见 `tests/kqm.test.mjs`。
 *
 * ⚠️ 本文件里的数值是**人工转写**自 KQM 的 markdown 正文（那些数值写在散文里，
 * 无法可靠地自动解析）。为防止转写悄悄过期，`ANCHORS` 要求每条数值都能在
 * 被引用的源文件里找到对应字符串；`checkAnchors` 在每次导入前执行。
 */

// ---------------------------------------------------------------------------
// 固定来源
// ---------------------------------------------------------------------------
export const KQM_REPO = 'KQM-git/TCL';
export const KQM_COMMIT = '106c0f3f1b349df0d76297243c72cd0dc043aa01';
export const KQM_COMMIT_DATE = '2026-10-01';
export const KQM_COMMIT_MSG = '7.1 data';
export const GAME_VERSION = '7.1';
export const SOURCE_URL_BASE = `https://github.com/${KQM_REPO}/blob/${KQM_COMMIT}/`;

export const SRC = {
  player: 'src/data/elemental_curves/player.json',
  enemy: 'src/data/elemental_curves/element.json',
  shield: 'src/data/elemental_curves/shield.json',
  transformFormula: 'docs/combat-mechanics/_formulas/transformative.md',
  amplifyFormula: 'docs/combat-mechanics/_formulas/amplifying.md',
  additiveFormula: 'docs/combat-mechanics/_formulas/additive.md',
  transformDoc: 'docs/combat-mechanics/elemental-effects/transformative-reactions.md',
  gaugeDoc: 'docs/combat-mechanics/elemental-effects/elemental-gauge-theory.md',
  energyDoc: 'docs/combat-mechanics/energy.md',
  resonanceDoc: 'docs/combat-mechanics/elemental-effects/elemental-resonance.md',
};

/** 等级系数只取到 100 级（角色上限 90；敌人常见到 100）。源数组延伸到 200。 */
export const MAX_LEVEL = 100;

/** 元素 → 中文单字，用于生成共鸣的 `condition`。 */
export const ELEMENT_ZH = {
  pyro: '火', hydro: '水', electro: '雷', cryo: '冰',
  anemo: '风', geo: '岩', dendro: '草',
};

// ---------------------------------------------------------------------------
// 锚点
// ---------------------------------------------------------------------------

/** 每条**人工转写**的数值都必须能在被引用的源文件里找到对应字符串。
 *  源一旦变动（数值调整、措辞改写），校验会立刻失败，而不是静默保留过期值。 */
export const ANCHORS = [
  { src: SRC.transformFormula, must: ['2.75', '0.25', '0.6', '1.5', 'ECTriggers'] },
  { src: SRC.transformFormula, must: ['2000 + '] },
  { src: SRC.amplifyFormula, must: ['2 &', '1.5 &', '1400 + '] },
  { src: SRC.additiveFormula, must: ['1.25', '1.15', '1200 + '] },
  { src: SRC.transformDoc, must: ['Physical DMG', 'Dendro Core', '40% by 12 seconds', '1U Pyro sometime', '8GU'] },
  { src: SRC.gaugeDoc, must: ['0.8x modifier', '0.5x unit modifier', '2x unit modifier', '0.4U from both gauges'] },
  { src: SRC.energyDoc, must: ['three times', '60%', '70%', '80%', 'Clear Particles/Orbs give'] },
  { src: SRC.resonanceDoc, must: [
    'Fervent Flames', 'Soothing Water', 'High Voltage', 'Shattering Ice',
    'Impetuous Winds', 'Enduring Rock', 'Sprawling Greenery', 'Protective Canopy',
    'Increases ATK by 25%', 'Increases Max HP by 25%',
    'Shortens Skill CD by 5%', 'Increases shield strength by 15%',
    'gain 30 Elemental Mastery for 6s', 'gain 20 Elemental Mastery for 6s',
    'All Elemental RES +15%',
  ] },
];

/**
 * 校验锚点。
 * @param {(srcPath: string) => string} read 读取源文件内容
 * @returns {string[]} 问题列表（空数组表示通过）
 */
export function checkAnchors(read) {
  const problems = [];
  for (const { src, must } of ANCHORS) {
    let text;
    try {
      text = read(src);
    } catch (e) {
      problems.push(`${src} 无法读取: ${e.message}`);
      continue;
    }
    for (const m of must) {
      if (!text.includes(m)) problems.push(`${src} 缺少锚点 ${JSON.stringify(m)}`);
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------
// 1) 等级系数（机器提取）
// ---------------------------------------------------------------------------
export const LEVEL_HEADER = [
  'level', 'player_multiplier', 'enemy_multiplier', 'shield_multiplier',
  'version', 'source', 'source_url',
];

// 已知锚点：等级 90 的角色剧变系数。取自公开资料，不是从本脚本输出抄来的。
export const LEVEL_REGRESSION = { 90: 1446.8535, 1: 17.165606, 2: 18.535048 };

/**
 * 源数组**索引即等级**（索引 0 为占位，等于等级 1）。
 * @returns {{rows: string[][], problems: string[]}}
 */
export function buildLevels(player, enemy, shield) {
  const problems = [];
  for (const [lv, want] of Object.entries(LEVEL_REGRESSION)) {
    const got = player[Number(lv)];
    if (got !== want) problems.push(`等级 ${lv}: got ${got} want ${want}`);
  }
  const rows = [];
  for (let lv = 1; lv <= MAX_LEVEL; lv++) {
    if (player[lv] === undefined || enemy[lv] === undefined || shield[lv] === undefined) break;
    rows.push([
      String(lv), String(player[lv]), String(enemy[lv]), String(shield[lv]),
      GAME_VERSION, 'community', SOURCE_URL_BASE + SRC.player,
    ]);
  }
  return { rows, problems };
}

// ---------------------------------------------------------------------------
// 2) 元素反应（人工转写）
//    em_scaling 三种公式分别来自三个公式文件：
//      amplifying     1 + 2.78·EM/(1400+EM)
//      transformative 1 + 16·EM/(2000+EM)
//      additive       1 + 5·EM/(1200+EM)
// ---------------------------------------------------------------------------
export const REACTIONS_HEADER = [
  'reaction_id', 'reaction_zh', 'reaction_en', 'category',
  'trigger_element', 'aura_element', 'damage_element',
  'base_multiplier', 'em_scaling', 'can_crit', 'uses_def_zone',
  'notes', 'version', 'source', 'source_url',
];

export const AMP = SRC.amplifyFormula, TRA = SRC.transformFormula, ADD = SRC.additiveFormula;
const TDOC = SRC.transformDoc, GDOC = SRC.gaugeDoc;

export const REACTIONS = [
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

export function buildReactions() {
  return REACTIONS.map(r => {
    const [id, zh, en, cat, trig, aura, dmg, mult, em, crit, def, notes, src] = r;
    return [id, zh, en, cat, trig, aura, dmg, mult, em, crit, def,
      notes, GAME_VERSION, 'community', SOURCE_URL_BASE + src];
  });
}

// ---------------------------------------------------------------------------
// 3) 附着量消耗（人工转写）
//    单位修正 = 触发元素附着量要乘的系数；单位消耗 = 直接扣掉的固定 U 值
// ---------------------------------------------------------------------------
export const AURA_HEADER = [
  'reaction_id', 'aura_consumed_unit', 'aura_consumed_ratio',
  'notes', 'version', 'source', 'source_url',
];

export const AURA = [
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

export function buildAura() {
  return AURA.map(([id, unit, ratio, notes, src]) =>
    [id, unit, ratio, notes, GAME_VERSION, 'community', SOURCE_URL_BASE + src]);
}

// ---------------------------------------------------------------------------
// 4) 微粒/晶球能量（人工转写）
//    后台系数随队伍人数变化：4 人 60%、3 人 70%、2 人 80%
// ---------------------------------------------------------------------------
export const ENERGY_HEADER = [
  'pickup_type', 'element_relation', 'field_state', 'party_size',
  'energy_value', 'notes', 'version', 'source', 'source_url',
];

/** [元素关系, 前后台, 队伍人数, 微粒值, 晶球值] */
export const ENERGY_TABLE = [
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

export function buildEnergy() {
  const rows = [];
  for (const [rel, field, party, particle, orb] of ENERGY_TABLE) {
    const note = field === 'on_field'
      ? '在场角色；与队伍人数无关'
      : '后台角色；4/3/2 人队伍分别按 60%/70%/80% 结算；同元素为异元素的 3 倍、无色为异元素的 2 倍';
    rows.push(['particle', rel, field, party, String(particle), note, GAME_VERSION, 'community', SOURCE_URL_BASE + SRC.energyDoc]);
    rows.push(['orb', rel, field, party, String(orb), '晶球能量为微粒的 3 倍；' + note, GAME_VERSION, 'community', SOURCE_URL_BASE + SRC.energyDoc]);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 5) 元素共鸣（人工转写）
//    长表：一行一个效果。一个共鸣有多个效果（如「炽热之火」既是受冰时间减少 40%、
//    又是攻击力 +25%），单行无法用一个 value 表达。
// ---------------------------------------------------------------------------
export const RESONANCE_HEADER = [
  'resonance_id', 'effect_index', 'element_pair', 'name_zh', 'name_en',
  'effect_type', 'effect_summary', 'value', 'value_unit', 'condition',
  'version', 'source', 'source_url',
];

/** [id, element_pair, zh, en, [[effect_type, summary, value, unit], …]] */
export const RESONANCE = [
  ['fervent_flames', 'pyro;pyro', '炽热之火', 'Fervent Flames', [
    ['aura_duration', '受到冰元素影响的时间减少 40%', '40', 'pct'],
    ['stat_buff', '攻击力提高 25%', '25', 'pct'],
  ]],
  ['soothing_water', 'hydro;hydro', '滋润之水', 'Soothing Water', [
    ['aura_duration', '受到火元素影响的时间减少 40%', '40', 'pct'],
    ['stat_buff', '生命值上限提高 25%', '25', 'pct'],
  ]],
  ['high_voltage', 'electro;electro', '强压之雷', 'High Voltage', [
    ['aura_duration', '受到水元素影响的时间减少 40%', '40', 'pct'],
    ['energy_generation', '超导、超载、感电反应 100% 概率产生雷元素微粒（冷却 5 秒）', '100', 'pct'],
  ]],
  ['shattering_ice', 'cryo;cryo', '粉碎之冰', 'Shattering Ice', [
    ['aura_duration', '受到雷元素影响的时间减少 40%', '40', 'pct'],
    ['stat_buff', '对处于冻结状态或附着冰元素的敌人暴击率提高 15%', '15', 'pct'],
  ]],
  ['impetuous_winds', 'anemo;anemo', '迅捷之风', 'Impetuous Winds', [
    ['stamina_cost', '体力消耗降低 15%', '15', 'pct'],
    ['movement_speed', '移动速度提高 10%', '10', 'pct'],
    ['cooldown_reduction', '技能冷却时间缩短 5%', '5', 'pct'],
  ]],
  ['enduring_rock', 'geo;geo', '坚定之岩', 'Enduring Rock', [
    ['shield_strength', '护盾强效提高 15%', '15', 'pct'],
    ['damage_bonus', '处于护盾保护下时造成的伤害提高 15%', '15', 'pct'],
    ['resistance_shred', '对敌人造成伤害时使其岩元素抗性降低 20%、持续 15 秒', '20', 'pct'],
  ]],
  ['sprawling_greenery', 'dendro;dendro', '蔓生之草', 'Sprawling Greenery', [
    ['stat_buff', '触发燃烧、原激化或绽放反应后，附近队伍成员元素精通提高 30、持续 6 秒', '30', 'flat'],
    ['stat_buff', '触发超激化、蔓激化、超绽放或烈绽放反应后，附近队伍成员元素精通提高 20、持续 6 秒', '20', 'flat'],
  ]],
  ['protective_canopy', 'any;any', '庇护之光', 'Protective Canopy', [
    ['resistance_buff', '所有元素抗性提高 15%', '15', 'pct'],
    ['resistance_buff', '物理抗性提高 15%', '15', 'pct'],
  ]],
];

export function buildResonance() {
  const rows = [];
  for (const [id, pair, zh, en, effects] of RESONANCE) {
    const element = pair.split(';')[0];
    const condition = id === 'protective_canopy'
      ? '队伍中有 4 名不同元素角色'
      : `队伍中有 2 名${ELEMENT_ZH[element]}元素角色`;
    effects.forEach(([type, summary, value, unit], i) => {
      rows.push([
        id, String(i + 1), pair, zh, en, type, summary, value, unit,
        condition, GAME_VERSION, 'community', SOURCE_URL_BASE + SRC.resonanceDoc,
      ]);
    });
  }
  return rows;
}
