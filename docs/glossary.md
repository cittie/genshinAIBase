# 术语与缩写表

> AI 解析用户口语、黑话与缩写时的对照表。**中文社区用语优先**，附英文与缩写。
> 新增术语请追加到对应分节末尾，保持字母序或逻辑序。

---

## 1. 属性缩写

| 缩写 | 英文 | 中文 | 说明 |
|---|---|---|---|
| HP | HP | 生命值 | |
| ATK | ATK | 攻击力 | |
| DEF | DEF | 防御力 | |
| EM | Elemental Mastery | 元素精通 | 影响反应伤害 |
| ER | Energy Recharge | 元素充能效率 | 基础 100% |
| CR | Crit Rate | 暴击率 | 基础 5% |
| CD | Crit DMG | 暴击伤害 | 基础 50%；勿与「冷却时间」混淆 |
| DMG | Damage | 伤害 | |
| RES | Resistance | 抗性 | |
| DoT | Damage over Time | 持续伤害 | |
| AoE | Area of Effect | 范围伤害 | |
| DPS | Damage per Second | 每秒伤害 | |
| ICD | Internal Cooldown | 内部冷却 | 附着规则，见 [aura-icd.md](mechanics/aura-icd.md) |
| U | Unit | 元素附着量单位 | |

> ⚠️ **歧义提醒**：`CD` 在中文社区既指「暴击伤害」也指「冷却时间（Cooldown）」。
> 判断依据上下文：出现在属性/词条语境 → 暴击伤害；出现在技能/循环语境 → 冷却时间。

---

## 2. 技能与操作

| 术语 | 英文 | 含义 |
|---|---|---|
| E | Elemental Skill | 元素战技 |
| Q | Elemental Burst | 元素爆发 |
| 普攻 / 平A | Normal Attack | 普通攻击 |
| 重击 | Charged Attack | 消耗体力的强化攻击 |
| 下落攻击 | Plunging Attack | 空中下落攻击 |
| 战技 / 技能 | — | 通常指元素战技 |
| 大招 | — | 元素爆发 |
| 切人 | Swap | 切换角色 |
| 站场 / 后台 | On-field / Off-field | 是否在场输出 |
| 输出轴 / 循环轴 | Rotation | 技能释放顺序与时长的循环，见 [energy-and-rotation.md](mechanics/energy-and-rotation.md) |
| 快切 | Quick Swap | 频繁切换角色的打法 |
| 驾驶 / 驾驶时间 | — | 主 C 站场输出的时间占比 |

---

## 3. 队伍职能

| 术语 | 英文 | 含义 |
|---|---|---|
| 主 C | Main DPS | 主要伤害输出者，通常站场 |
| 副 C | Sub DPS | 后台输出者 |
| 辅助 | Support | 提供增益/减益/生存 |
| 奶妈 / 奶 | Healer | 治疗角色 |
| 盾 / 盾辅 | Shielder | 提供护盾 |
| 充能工具人 / 充电宝 | Battery | 主要为队友提供元素能量的角色 |
| 挂件 | — | 提供元素附着或共鸣的辅助 |
| 驾驶员 | Driver | 站场触发后台角色输出（自身伤害占比低） |
| 聚怪 | Grouping / CC | 把敌人聚集到一起 |
| 减抗 | RES Shred | 降低敌人抗性 |
| 减防 | DEF Shred | 降低敌人防御力 |
| 增益 / buff | Buff | 提升己方属性或伤害 |
| 附魔 | Infusion | 使普通攻击附带元素伤害 |
| 双水/双火/双雷… | — | 队伍中同元素角色数量为 2，触发元素共鸣 |
| 元素共鸣 | Elemental Resonance | 队伍元素构成触发的额外效果 |

---

## 4. 伤害与配装

| 术语 | 含义 |
|---|---|
| 白值 | 面板中的基础数值（不含百分比加成） |
| 绿字 | 面板中的加成部分 |
| 双爆 | 暴击率 + 暴击伤害 |
| 有效词条 | 对某角色真正有收益的圣遗物副词条 |
| 毕业 | 圣遗物副词条达到理想水平 |
| 毕业难度 | 达到理想词条所需的期望成本 |
| 三攻 | 攻击力%（沙）+ 攻击力%（杯）+ 攻击力%（头）的极端堆法 |
| 散件 | 不属于当前套装的圣遗物单件 |
| 主词条 / 副词条 | Main Stat / Substat |
| 4 件套 / 2 件套 | 套装件数触发的效果 |
| 独立乘区 | 不与同类加成相加、而是单独相乘的增益 |
| 易伤 | 使敌人受到伤害提高 |
| 触发者 | 造成那次伤害、决定反应数值的角色 |
| 反应覆盖率 | 实际触发反应的伤害次数占比，见 [aura-icd.md](mechanics/aura-icd.md) |
| 专武 | 为某角色量身设计的五星武器 |
| 平替 | 可替代专武的较易获取武器 |
| 精炼 | 武器被动等级 R1~R5 |
| 命座 | 角色突破材料等级 C0~C6 |

---

## 5. 元素与反应

| 术语 | 英文 | 字段值 |
|---|---|---|
| 火 | Pyro | `pyro` |
| 水 | Hydro | `hydro` |
| 风 | Anemo | `anemo` |
| 雷 | Electro | `electro` |
| 草 | Dendro | `dendro` |
| 冰 | Cryo | `cryo` |
| 岩 | Geo | `geo` |
| 物理 | Physical | `physical` |

| 反应 | 英文 | 类别 |
|---|---|---|
| 蒸发 | Vaporize | 增幅 |
| 融化 | Melt | 增幅 |
| 超载 | Overloaded | 剧变 |
| 感电 | Electro-Charged | 剧变 |
| 超导 | Superconduct | 剧变 |
| 碎冰 | Shattered | 剧变 |
| 扩散 | Swirl | 剧变 |
| 结晶 | Crystallize | 剧变（生成护盾） |
| 冻结 | Frozen | 无伤害 |
| 燃烧 | Burning | 持续伤害 |
| 绽放 | Bloom | 剧变 |
| 超绽放 | Hyperbloom | 剧变 |
| 烈绽放 | Burgeon | 剧变 |
| 原激化 | Quicken | 催化（状态） |
| 超激化 | Aggravate | 催化 |
| 蔓激化 | Spread | 催化 |

详细公式见 [reactions.md](mechanics/reactions.md)。

---

## 6. 玩法与场景

| 术语 | 含义 |
|---|---|
| 大世界 | 开放世界探索 |
| 深境螺旋 / 深渊 | 高难挑战，双队伍，限时 |
| 幻想真境剧诗 / 剧诗 | 需自备角色的高难玩法，含元素限制与角色池限制 |
| 周本 | 每周限次的 Boss 秘境 |
| 秘境 | 消耗树脂的副本 |
| 树脂 | 体力资源 |
| 摩拉 | 通用货币 |
| 好感度 | 角色亲密度 |
| 速切 | 高频切换角色的打法 |

---

## 7. 命名与别名注意事项

- 角色、武器、套装可能存在**多个中文别名或简称**（如昵称、外号）。
- **跨表关联一律使用 `char_id` / `weapon_id` / `set_id` / `slug`，不得使用中文名。**
- 别名可在本表或 `data/aliases.csv`（待建）中登记，用于把用户口语映射到 `slug`。

> 待办：建立 `data/aliases.csv`，字段建议 `alias,entity_type,entity_id,slug,note`。

---

## 相关

- 数据契约：[../AGENTS.md](../AGENTS.md)
- 伤害与反应机制：[mechanics/](mechanics/)
