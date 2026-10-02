/**
 * scripts/lib/parse.mjs 的单元测试。
 *
 * 运行: node --test tests/
 *
 * 这些用例刻意与**历史上的真实 bug** 一一对应——每一条都是曾经真的错过的情形，
 * 而不是凭空构造的输入。注释里标了对应的回归编号（见 scripts/README.md）。
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toSlug, uniqueSlug, sentencesOf, noteText, fullText, num,
  parseLabel, deriveEffectTarget, deriveTalentLevelUp,
  artifactTarget, firstClause, singleNumber,
  assertNoDelimiter, toCsv, STAT_ORDER,
} from '../scripts/lib/parse.mjs';

// ---------------------------------------------------------------------------
// 文本与标识符
// ---------------------------------------------------------------------------
test('toSlug: 撇号先行剥离，不产生 x_s_y（回归 #4）', () => {
  // 曾经生成 wolf_s_gravestone
  assert.equal(toSlug("Wolf's Gravestone"), 'wolfs_gravestone');
  assert.equal(toSlug('Kamisato Ayaka'), 'kamisato_ayaka');
  assert.equal(toSlug('  Staff of Homa  '), 'staff_of_homa');
  assert.equal(toSlug('Aeon-Blade: Type X'), 'aeon_blade_type_x');
  assert.equal(toSlug('咏唱'), '');
});

test('uniqueSlug: 同名不同源键时用源键后缀消歧并告警（回归 #5）', () => {
  const used = new Set(['prized_isshin_blade']);
  const warns = [];
  const slug = uniqueSlug('prized_isshin_blade', 'prizedisshinblade-01', used, m => warns.push(m));
  assert.notEqual(slug, 'prized_isshin_blade');
  assert.equal(warns.length, 1);
});

test('uniqueSlug: 源键后缀非空时拼到 slug 上（真实案例）', () => {
  // 两把 "Prized Isshin Blade"：源键 prizedisshinblade / prizedisshinblade-01
  const used = new Set(['prized_isshin_blade']);
  const slug = uniqueSlug('prized_isshin_blade', 'prizedisshinblade-01', used, () => {});
  assert.equal(slug, 'prized_isshin_blade_01');
});

test('uniqueSlug: 源键后缀为空（与 slug 等长）时退化为递增序号', () => {
  const used = new Set(['foo']);
  assert.equal(uniqueSlug('foo', 'abc', used, () => {}), 'foo_2');
});

test('uniqueSlug: 拼接后仍冲突则继续递增', () => {
  const used = new Set(['prized_isshin_blade', 'prized_isshin_blade_01']);
  assert.equal(uniqueSlug('prized_isshin_blade', 'prizedisshinblade-01', used, () => {}),
    'prized_isshin_blade_01_2');
});

test('uniqueSlug: 无冲突时原样返回且不告警', () => {
  const warns = [];
  assert.equal(uniqueSlug('bar', 'k', new Set(), m => warns.push(m)), 'bar');
  assert.equal(warns.length, 0);
});

test('sentencesOf: 去 HTML 标签并按句切分', () => {
  const s = sentencesOf('<b>First.</b> Second sentence. Third!');
  assert.deepEqual(s, ['First.', 'Second sentence.', 'Third!']);
});

test('fullText: 清洗逗号/分号但不截断（回归 #7）', () => {
  // 香菱固有天赋 "Beware, It's Super Hot!" 曾触发 CSV 契约检查
  assert.equal(fullText("Beware, It's Super Hot!"), "Beware、 It's Super Hot!");
  const long = 'a,'.repeat(200) + 'end';
  assert.ok(fullText(long).length > 150, 'fullText 不得截断');
  assert.ok(!fullText(long).includes(','));
});

test('noteText: 清洗并截断到 150 字', () => {
  const s = noteText('x,'.repeat(200));
  assert.equal(s.length, 150);
  assert.ok(!s.includes(','));
});

test('num: 裁掉浮点噪声，非数值原样返回', () => {
  assert.equal(num(0.1 + 0.2), '0.3');
  assert.equal(num(593.2278000000001), '593.2278');
  assert.equal(num('12'), '12');
  assert.equal(num(undefined), 'undefined');
});

// ---------------------------------------------------------------------------
// 天赋属性标签：parseLabel
// ---------------------------------------------------------------------------
test('parseLabel: 无属性后缀的伤害按游戏默认吃攻击力', () => {
  const r = parseLabel('一段伤害|{param1:F1P}');
  assert.equal(r.stats, 'atk');
  assert.equal(r.units, 'pct');
  assert.equal(r.params[0].n, 1);
});

test('parseLabel: 生命值上限后缀 -> hp', () => {
  const r = parseLabel('技能伤害|{param1:F2P}生命值上限');
  assert.equal(r.stats, 'hp');
  assert.equal(r.units, 'pct');
});

test('parseLabel: 最大生命值是生命值上限的别名（回归 #17）', () => {
  // 钟离/迪奥娜的护盾用的是「最大生命值」，只映射后者会把护盾算成吃攻击力
  const r = parseLabel('护盾附加吸收量|{param6:F1P}最大生命值');
  assert.equal(r.stats, 'hp');
});

test('parseLabel: 一条标签引用两个不同属性的参数（回归 #18）', () => {
  const r = parseLabel('突进攻击伤害|{param1:F1P}攻击力+{param2:F1P}元素精通');
  assert.equal(r.stats, 'atk;em');
  assert.equal(r.units, 'pct;pct');
});

test('parseLabel: 尾部未标注的参数继承最后一个属性词', () => {
  // 迪奥娜护盾：百分比吃生命值 + 固定值部分也属于生命值
  const r = parseLabel('护盾基础吸收量|{param2:F1P}最大生命值+{param3:I}');
  assert.equal(r.stats, 'hp;hp');
  assert.equal(r.units, 'pct;flat');
});

test('parseLabel: 混合单位（固定值 + 生命值百分比）', () => {
  // 沃雅妮莎的治疗量
  const r = parseLabel('遥久之歌治疗量|{param5:I}+{param6:F2P}生命值上限');
  assert.equal(r.stats, 'hp;hp');
  assert.equal(r.units, 'flat;pct');
});

test('parseLabel: 元数据词优先判 NA（回归 #11）', () => {
  // 「遥久之歌治疗间隔」含「治疗」二字，曾被判为吃攻击力——它是时间参数
  const r = parseLabel('遥久之歌治疗间隔|{param7:F1}秒');
  assert.equal(r.stats, 'NA');
  assert.equal(r.units, 'sec');

  const r2 = parseLabel('技能冷却时间|{param10:F1}秒');
  assert.equal(r2.stats, 'NA');

  const r3 = parseLabel('重击体力消耗|{param6:F1}点');
  assert.equal(r3.stats, 'NA');
});

test('parseLabel: 固定值词条不套用默认攻击力（回归 #19）', () => {
  // 护盾基础吸收量是固定值，曾因词条名含「护盾」被判为吃攻击力
  const r = parseLabel('护盾基础吸收量|{param5:I}');
  assert.equal(r.stats, 'NA');
  assert.equal(r.units, 'flat');
});

test('parseLabel: 非面板机制判 NA', () => {
  assert.equal(parseLabel('贯夜治疗量|{param6:F1P}生命之契').stats, 'NA');
  assert.equal(parseLabel('元素能量|{param4:I}').stats, 'NA');
});

test('parseLabel: 伤害加成不是伤害，不套默认攻击力', () => {
  assert.equal(parseLabel('遥久之歌伤害加成|{param2:F1P}').stats, 'NA');
});

test('parseLabel: 抗性降低这类百分比效果不适用属性缩放', () => {
  assert.equal(parseLabel('水元素/冰元素抗性降低|{param8:F1P}').stats, 'NA');
});

test('parseLabel: 格式不合法返回 null', () => {
  assert.equal(parseLabel('没有分隔符'), null);
});

test('parseLabel: stat 汇总按固定顺序去重', () => {
  const r = parseLabel('袖伤害|{param1:P}攻击力+{param2:P}防御力');
  assert.equal(r.stats, 'atk;def');
  assert.equal(r.stat, 'atk;def');
  assert.deepEqual(STAT_ORDER, ['atk', 'hp', 'def', 'em']);
});

// ---------------------------------------------------------------------------
// 命之座：受益对象
// ---------------------------------------------------------------------------
test('deriveEffectTarget: 队伍词 -> team', () => {
  assert.equal(deriveEffectTarget('队伍中所有角色获得15%火元素伤害加成。'), 'team');
});

test('deriveEffectTarget: 对敌减益 -> enemy', () => {
  assert.equal(deriveEffectTarget('高天之歌会使敌人的风元素抗性与物理抗性降低12%。'), 'enemy');
  assert.equal(deriveEffectTarget('敌人防御力降低30%，持续6秒。'), 'enemy');
});

test('deriveEffectTarget: 两者兼有 -> both', () => {
  const t = '茜特菈莉的元素精通提升125点，队伍中附近的角色的元素精通提升250点。'
    + '受本次反应影响的敌人的火元素抗性还会额外降低20%。';
  assert.equal(deriveEffectTarget(t), 'both');
});

test('deriveEffectTarget: 其余 -> self', () => {
  assert.equal(deriveEffectTarget('处于彼岸蝶舞状态下时，胡桃的重击不会消耗体力。'), 'self');
  assert.equal(deriveEffectTarget(''), 'self');
});

// ---------------------------------------------------------------------------
// 命之座：天赋 +3
// ---------------------------------------------------------------------------
const XIANG_LING = [
  { type: 'normal_attack', name: '白案功夫' },
  { type: 'elemental_skill', name: '锅巴出击' },
  { type: 'elemental_burst', name: '旋火轮' },
];

test('deriveTalentLevelUp: 按天赋名匹配', () => {
  assert.deepEqual(deriveTalentLevelUp('旋火轮的技能等级提高3级。', XIANG_LING),
    { value: 'elemental_burst', how: 'name' });
});

test('deriveTalentLevelUp: 兼容「提升」措辞（回归 #20）', () => {
  // 胡桃写的是「技能等级提升3级」，只匹配「提高」会漏掉她
  const hu = [
    { type: 'elemental_skill', name: '蝶引来生' },
    { type: 'elemental_burst', name: '安神秘法' },
  ];
  assert.deepEqual(deriveTalentLevelUp('蝶引来生的技能等级提升3级。', hu),
    { value: 'elemental_skill', how: 'name' });
});

test('deriveTalentLevelUp: 天赋名含逗号与 ♪ 不截断（回归 #21）', () => {
  const barbara = [
    { type: 'elemental_skill', name: '演唱，开始♪' },
    { type: 'elemental_burst', name: '闪耀奇迹♪' },
  ];
  assert.equal(deriveTalentLevelUp('演唱，开始♪的技能等级提高3级。', barbara).value, 'elemental_skill');
  assert.equal(deriveTalentLevelUp('闪耀奇迹♪的技能等级提高3级。', barbara).value, 'elemental_burst');
});

test('deriveTalentLevelUp: 天赋名含 ！ 不截断', () => {
  const kachina = [{ type: 'elemental_skill', name: '出击，冲天转转！' }];
  assert.equal(deriveTalentLevelUp('出击，冲天转转！的技能等级提高3级。', kachina).value, 'elemental_skill');
});

test('deriveTalentLevelUp: 兼容 普通攻击· 前缀（回归 #21）', () => {
  const neu = [{ type: 'normal_attack', name: '如水从平' }];
  assert.equal(deriveTalentLevelUp('普通攻击·如水从平的技能等级提高3级。', neu).value, 'normal_attack');
});

test('deriveTalentLevelUp: 名字匹配不到时回退到类别前缀', () => {
  const r = deriveTalentLevelUp('元素爆发**未知技能**的技能等级提高3级。', []);
  assert.deepEqual(r, { value: 'elemental_burst', how: 'category' });
});

test('deriveTalentLevelUp: 非 +3 命座返回空', () => {
  assert.deepEqual(deriveTalentLevelUp('普通攻击的最后一击会造成爆炸。', XIANG_LING),
    { value: '', how: 'none' });
});

test('deriveTalentLevelUp: 命中但完全无法解析时标 ?', () => {
  const r = deriveTalentLevelUp('某某东西的技能等级提高3级。', []);
  assert.equal(r.value, '?');
  assert.equal(r.how, 'unresolved');
});

test('deriveTalentLevelUp: 多个天赋名同时命中标为 conflict', () => {
  const dup = [
    { type: 'elemental_skill', name: '旋火轮' },
    { type: 'elemental_burst', name: '旋火轮' },
  ];
  const r = deriveTalentLevelUp('旋火轮的技能等级提高3级。', dup);
  assert.ok(r.how.startsWith('conflict'));
});

test('deriveTalentLevelUp: 剥离 ** 加粗标记', () => {
  const aino = [{ type: 'elemental_burst', name: '精密水冷仪' }];
  assert.equal(deriveTalentLevelUp('元素爆发**精密水冷仪**的技能等级提高3级。', aino).value, 'elemental_burst');
});

// ---------------------------------------------------------------------------
// 圣遗物 4 件套受益对象
// ---------------------------------------------------------------------------
test('artifactTarget: 队友受益 -> team', () => {
  assert.equal(artifactTarget('All party members gain 20% ATK.'), 'team');
});

test('artifactTarget: 装备者自身 -> self（回归 #3 的反面）', () => {
  // 饰金之梦原文是「使装备者获得强化」，队友只是触发条件
  assert.equal(
    artifactTarget('The equipping character gains 50 Elemental Mastery. This effect is triggered when party members trigger reactions.'),
    'self');
});

test('artifactTarget: 同时含装备者与队伍 -> both', () => {
  assert.equal(
    artifactTarget('All party members gain 20% ATK, and the equipping character gains 10% CRIT Rate.'),
    'both');
});

test('artifactTarget: 空文本 -> self', () => {
  assert.equal(artifactTarget(''), 'self');
});

test('firstClause: 中文按「，」英文按逗号取第一分句', () => {
  assert.equal(firstClause('触发条件，后续效果'), '触发条件');
  assert.equal(firstClause('When X happens, gain Y'), 'When X happens');
  assert.equal(firstClause('没有分句'), '');
});

test('singleNumber: 仅在恰好出现一次时返回', () => {
  assert.equal(singleNumber('ATK +20%', /ATK \+(\d+)%/g), '20');
  assert.equal(singleNumber('ATK +20% and DEF +20%', /ATK \+(\d+)%/g), '20');
  assert.equal(singleNumber('ATK +20% and ATK +30%', /ATK \+(\d+)%/g), '');
});

// ---------------------------------------------------------------------------
// CSV 契约
// ---------------------------------------------------------------------------
test('assertNoDelimiter: 逗号与换行都要抛错', () => {
  assert.throws(() => assertNoDelimiter('a,b'), /逗号/);
  assert.throws(() => assertNoDelimiter('a\nb'), /换行/);
  assert.equal(assertNoDelimiter('多值;用分号'), '多值;用分号');
});

test('toCsv: LF 换行、结尾换行、非 ASCII 逗号（，）合法', () => {
  const text = toCsv(['a', 'b'], [['1', '中文，标点']]);
  assert.equal(text, 'a,b\n1,中文，标点\n');
  assert.ok(!text.includes('\r'));
});

test('toCsv: 含 ASCII 逗号时抛错并指明列号', () => {
  assert.throws(() => toCsv(['a'], [['x,y']]), /第1列/);
});
