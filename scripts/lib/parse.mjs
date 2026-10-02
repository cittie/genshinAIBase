/**
 * 从游戏文本推导结构化字段的**纯函数**集合。
 *
 * 为什么单独成模块：这些逻辑是导入脚本里最容易出错、也最需要反复验证的部分
 * （历史上标签缩放、天赋 +3、命座受益对象、4 件套受益对象都各修过一次 bug）。
 * 抽出来之后可以脱离 186MB 解包数据直接做单元测试，见 `tests/parse.test.mjs`。
 *
 * 本模块**不得**引入文件、网络或进程相关的副作用。
 */

// ---------------------------------------------------------------------------
// 文本与标识符
// ---------------------------------------------------------------------------

/** 英文名 -> 稳定 slug（小写下划线）。与 AGENTS.md §3.1 的 slug 约定一致。 */
export function toSlug(name) {
  return String(name)
    .replace(/['\u2019]/g, '')     // Wolf's -> Wolfs，避免生成 wolf_s_gravestone
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * slug 冲突消歧：优先用源键去掉公共前缀后的部分拼在 slug 上，保证既唯一又可追溯；
 * 仍冲突则退化为递增序号。
 * @param {(msg: string) => void} [onWarn] 消歧时的告警回调
 */
export function uniqueSlug(base, key, used, onWarn) {
  let slug = base;
  if (used.has(slug)) {
    const head = base.replace(/_/g, '');
    const extra = String(key).replace(/[^a-z0-9]/gi, '').slice(head.length);
    if (extra) slug = `${base}_${extra}`;
    const root = slug;
    let n = 2;
    while (used.has(slug)) slug = `${root}_${n++}`;
    if (onWarn) onWarn(`slug 冲突已消歧: ${base} + (${key}) -> ${slug}`);
  }
  return slug;
}

/** 按句切分（去 HTML 标签），用于逐句扫描技能文本。 */
export function sentencesOf(text) {
  return String(text || '')
    .replace(/<[^>]*>/g, '')
    .split(/(?<=[.!])\s+/)
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/** notes 必须无逗号（CSV 契约），且不宜过长。 */
export function noteText(s) {
  return String(s).replace(/,/g, '、').replace(/;/g, '；').replace(/\s+/g, ' ').trim().slice(0, 150);
}

/** 全文清洗：不留 ASCII 逗号/分号（CSV 契约），但**不截断**。
 *  与 noteText 统一：逗号 → 「、」，分号 → 「；」。英文名称同样需要清洗
 *  （如香菱固有天赋 "Beware, It's Super Hot!"）。 */
export function fullText(s) {
  return String(s || '')
    .replace(/,/g, '、')
    .replace(/;/g, '；')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 数值裁剪到 4 位小数，避免浮点噪声；非数值原样返回。 */
export function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? String(Math.round(n * 10000) / 10000) : String(v);
}

// ---------------------------------------------------------------------------
// 天赋属性标签
// ---------------------------------------------------------------------------

export const STAT_SUFFIX = {
  生命值上限: 'hp', 最大生命值: 'hp', 攻击力: 'atk', 防御力: 'def', 元素精通: 'em',
};
// 属性词（按正则，注意「最大生命值」是「生命值上限」的另一种写法）
export const STAT_WORDS = [
  { re: '生命值上限|最大生命值', stat: 'hp' },
  { re: '攻击力', stat: 'atk' },
  { re: '防御力', stat: 'def' },
  { re: '元素精通', stat: 'em' },
];
// 非角色面板属性的机制（生命之契/当前生命值/元素能量…）→ 不适用
export const NON_STAT_SUFFIX = /(生命之契|当前生命值|元素能量|战意|夜魂值|体力|燃素)/;
export const META_LABEL = /(间隔|持续|冷却|消耗|数量|层数|范围|速度|概率|次数|充能)/;
export const STAT_ORDER = ['atk', 'hp', 'def', 'em'];

/** 解析一条属性标签：`技能伤害|{param1:F2P}生命值上限`。
 *
 *  属性与单位都是**逐参数**的：一条标签可能引用多个不同属性的参数
 *  （如 `突进攻击伤害|{param1:F1P}攻击力+{param2:F1P}元素精通` → 参数 1 吃攻击力、参数 2 吃精通），
 *  也可能混合单位（`治疗量|{param5:I}+{param6:F2P}生命值上限` → 固定值 + 生命值百分比）。
 *  因此 scaling_stat / value_unit 都与 param_refs 按位置一一对应。
 *
 *  判定顺序：
 *   1. 按出现顺序扫描模板，把属性词分配给「它之前最近的一批参数」；
 *      尾部未标注的参数继承最后一个属性词（如 `{param2:F1P}最大生命值+{param3:I}` 两个都吃生命值）。
 *   2. 完全没有属性词时：元数据词（间隔/持续/冷却/消耗…）或非面板机制（生命之契…）→ NA；
 *      否则仅当该词条全部参数都是百分比、且词条名含「伤害（不含伤害加成）/治疗/恢复/护盾/吸收」
 *      → 攻击力（游戏默认）。固定值词条（如护盾基础吸收量 `{param5:I}`）不套用默认，判 NA。
 */
export function parseLabel(label) {
  const m = String(label).match(/^([^|]+)\|(.*)$/);
  if (!m) return null;
  const name = m[1].trim();
  const tpl = m[2];

  const params = [...tpl.matchAll(/\{param(\d+):([^}]+)\}/g)].map(x => {
    const fmt = x[2];
    let unit = 'flat';
    if (/P$/.test(fmt)) unit = 'pct';
    else if (/秒/.test(tpl)) unit = 'sec';
    return { n: Number(x[1]), fmt, unit, index: x.index, stat: '' };
  });

  // 1. 属性词按位置分配给参数
  const tokens = params.map(p => ({ kind: 'param', index: p.index, ref: p }));
  for (const w of STAT_WORDS) {
    for (const h of tpl.matchAll(new RegExp(w.re, 'g'))) {
      tokens.push({ kind: 'stat', index: h.index, stat: w.stat });
    }
  }
  tokens.sort((a, b) => a.index - b.index);
  let pending = [];
  let lastStat = '';
  for (const t of tokens) {
    if (t.kind === 'param') pending.push(t.ref);
    else { for (const p of pending) p.stat = t.stat; pending = []; lastStat = t.stat; }
  }
  for (const p of pending) p.stat = lastStat;

  // 2. 无属性词时的兜底
  const suffix = tpl.replace(/\{param\d+:[^}]+\}/g, '').replace(/[^\u4e00-\u9fa5]/g, '');
  const anyStat = params.some(p => p.stat);
  let fallback = 'NA';
  if (!anyStat) {
    if (META_LABEL.test(name) || NON_STAT_SUFFIX.test(suffix)) fallback = 'NA';
    else if (params.length && params.every(p => p.unit === 'pct')
             && (/伤害/.test(name) && !/伤害加成/.test(name) || /(治疗|恢复|护盾|吸收)/.test(name))) {
      fallback = 'atk';
    }
  }
  for (const p of params) if (!p.stat) p.stat = fallback;

  const stats = [...new Set(params.map(p => p.stat))];
  return {
    name,
    params,
    stat: STAT_ORDER.filter(s => stats.includes(s)).join(';') || 'NA',
    stats: params.map(p => p.stat).join(';'),
    units: params.map(p => p.unit).join(';'),
  };
}

// ---------------------------------------------------------------------------
// 命之座
// ---------------------------------------------------------------------------

export const TEAM_CN = /队伍中(附近)?(的)?(所有|自己的|其他)?角色|附近的队伍|队伍中所有/;
// 对敌减益：效果落在敌人身上（削抗/削防/易伤）
export const ENEMY_CN = /(敌人|敌方|对手)[^。]{0,24}(抗性|防御力)[^。]{0,8}(降低|减少|下降)|降低[^。]{0,12}(敌人|敌方|对手)[^。]{0,12}(抗性|防御力)|受到的伤害(提高|提升|增加)/;

export function deriveEffectTarget(descZh) {
  const text = String(descZh || '');
  const isTeam = TEAM_CN.test(text);
  const isEnemy = ENEMY_CN.test(text);
  if (isTeam && isEnemy) return 'both';
  if (isTeam) return 'team';
  if (isEnemy) return 'enemy';
  return 'self';
}

export const TALENT_CATEGORY_CN = {
  普通攻击: 'normal_attack', 元素战技: 'elemental_skill', 元素爆发: 'elemental_burst',
};
// 文本里天赋名可能带类别前缀（含「·」或直接相连），如「普通攻击·如水从平的技能等级提高3级」
export const TALENT_NAME_PREFIXES = ['', '普通攻击·', '元素战技·', '元素爆发·', '普通攻击', '元素战技', '元素爆发'];
// 措辞变体（已穷举全库，仅此两种）：
//   「技能等级提高3级」250 条 / 「技能等级提升3级」2 条（胡桃 c3、c5）
export const LEVELUP_RE = /的技能等级(提高|提升)3级/;

/** 「X的技能等级提高/提升3级」→ X 对应的天赋类别。
 *  用**天赋名逐个做包含匹配**，而不是先用正则截取名字：
 *  天赋名里真的存在逗号、♪、！等字符（芭芭拉「演唱，开始♪」、
 *  卡齐娜「出击，冲天转转！」、那维莱特「潮水啊，我已归来」），正则截取会截断。
 * @param {string} descZh
 * @param {{type: string, name: string}[]} talentList 该角色的天赋表
 * @returns {{value: string, how: string}} how ∈ none/name/category/conflict(..)/unresolved
 */
export function deriveTalentLevelUp(descZh, talentList) {
  const text = String(descZh || '').replace(/\*\*/g, '');
  const m = text.match(LEVELUP_RE);
  if (!m) return { value: '', how: 'none' };
  const suffix = `的技能等级${m[1]}3级`;

  const hits = (talentList || []).filter(t => t.name
    && TALENT_NAME_PREFIXES.some(p => text.includes(`${p}${t.name}${suffix}`)));
  if (hits.length === 1) return { value: hits[0].type, how: 'name' };
  if (hits.length > 1) {
    return { value: hits[0].type, how: `conflict(${hits.map(h => h.type).join('|')})` };
  }
  // 回退：按类别前缀判定
  const c = text.match(/(普通攻击|元素战技|元素爆发)[·]?([^。；]{1,30}?)的技能等级(?:提高|提升)3级/);
  if (c) return { value: TALENT_CATEGORY_CN[c[1]], how: 'category' };
  return { value: '?', how: 'unresolved' };
}

// ---------------------------------------------------------------------------
// 圣遗物 4 件套受益对象
// ---------------------------------------------------------------------------

// 例：饰金之梦 4 件套写的是「使装备者获得强化」，队友只是**触发条件**，属自身增益。
export const TEAM_TARGET = /\b(all party members|all nearby party members|nearby party members)\b/i;
export const SELF_TARGET =
  /((equipping character|character equipping|character wearing|wielder|wearer)\b[^.]{0,50}\b(obtain|gain|receive|is increased|are increased))|((increases?|boosts?|enhances?)\b[^.]{0,30}\b(equipping character|wielder|wearer)\b)/i;

/** 判定 4 件套效果的受益对象：self / team / both。 */
export function artifactTarget(text) {
  const isTeam = TEAM_TARGET.test(String(text || ''));
  if (!isTeam) return 'self';
  return SELF_TARGET.test(String(text || '')) ? 'both' : 'team';
}

/** 触发条件：取第一个分句（中文按「，」，英文按逗号）。 */
export function firstClause(text) {
  const zhParts = String(text || '').split('，');
  if (zhParts.length > 1) return zhParts[0];
  const enParts = String(text || '').split(/,\s*/);
  return enParts.length > 1 ? enParts[0] : '';
}

/** 仅当文本中恰好出现一次时才返回，避免把套装级数值误挂到某一条效果上。
 *  正则可含多个捕获组（不同语序），取第一个有值的组。 */
export function singleNumber(text, re) {
  const hits = [];
  for (const m of String(text || '').matchAll(re)) {
    const v = m.slice(1).find(x => x !== undefined);
    if (v !== undefined) hits.push(v);
  }
  return hits.length === 1 ? hits[0] : '';
}

// ---------------------------------------------------------------------------
// CSV 契约
// ---------------------------------------------------------------------------

/** 契约：单元格不得含 ASCII 逗号或换行（多值请用 `;`）。 */
export function assertNoDelimiter(value, where) {
  const v = String(value);
  if (v.includes(',')) throw new Error(`${where || '字段'} 含逗号，违反 CSV 契约: ${v}`);
  if (v.includes('\n') || v.includes('\r')) throw new Error(`${where || '字段'} 含换行`);
  return v;
}

/** 把表头与行渲染成 CSV 文本（LF、无 BOM、结尾换行）。纯函数，便于测试。 */
export function toCsv(header, rows) {
  const lines = [header.map(c => assertNoDelimiter(c, '表头')).join(',')];
  for (const row of rows) {
    lines.push(row.map((c, i) => assertNoDelimiter(c, `第${i + 1}列`)).join(','));
  }
  return lines.join('\n') + '\n';
}
