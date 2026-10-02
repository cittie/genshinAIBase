# INDEX — 全库导航

> 按**主题**定位文件的索引。AI 检索流程：本文件 → 相关文件 → 具体字段/行。
> 入口文件是 [AGENTS.md](../AGENTS.md)，本文件是它的展开版。

---

## 0. 按任务找文件

| 任务 | 规则（怎么做） | 数据（数值） | 机制（为什么） |
|---|---|---|---|
| **配队规划** | [rules/team-building.md](../rules/team-building.md) | [data/characters/](../data/characters/README.md)、[data/teams/](../data/teams/README.md) | [docs/mechanics/reactions.md](../docs/mechanics/reactions.md) |
| **圣遗物选择** | [rules/artifact-selection.md](../rules/artifact-selection.md) | [data/artifacts/](../data/artifacts/README.md) | [docs/systems/artifacts.md](../docs/systems/artifacts.md) |
| **武器选择** | [rules/weapon-selection.md](../rules/weapon-selection.md) | [data/weapons/](../data/weapons/README.md) | [docs/systems/weapons.md](../docs/systems/weapons.md) |
| **词条优先级** | [rules/stat-priority.md](../rules/stat-priority.md) | [data/characters/](../data/characters/README.md) | [docs/mechanics/stats-and-scaling.md](../docs/mechanics/stats-and-scaling.md) |

---

## 1. 元文档

| 文件 | 用途 |
|---|---|
| [AGENTS.md](../AGENTS.md) | **AI 入口**：数据契约、检索顺序、输出要求 |
| [README.md](../README.md) | 人类入口（简体中文）：**从零搭建运行环境** |
| [README.en.md](../README.en.md) | 人类入口（English）：与 README.md 成对维护 |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | 贡献流程与红线 |
| [CHANGELOG.md](../CHANGELOG.md) | 变更日志 |
| [index/INDEX.md](INDEX.md) | 本文件，全库导航 |

> **双语约定**：`README.md` 与 `README.en.md` 的命令行与链接目标必须一致，
> 由 `scripts/validate_data.py` 强制检查。详见 [AGENTS.md §7](../AGENTS.md)。

---

## 2. 机制（docs/）

### 2.1 战斗机制 · [docs/mechanics/](../docs/mechanics/)

| 主题 | 文件 | 关键词 |
|---|---|---|
| 伤害公式与乘区 | [damage-formula.md](../docs/mechanics/damage-formula.md) | 基础伤害、伤害加成区、暴击区、防御区、抗性区、期望伤害、DPS |
| 元素反应 | [reactions.md](../docs/mechanics/reactions.md) | 增幅、剧变、催化、蒸发、融化、超载、感电、超导、扩散、绽放、超绽放、烈绽放、激化 |
| 属性与成长 | [stats-and-scaling.md](../docs/mechanics/stats-and-scaling.md) | 面板构成、基础值、突破属性、词条换算、边际收益 |
| 元素能量与循环 | [energy-and-rotation.md](../docs/mechanics/energy-and-rotation.md) | 微粒、晶球、充能效率、ER 需求、输出轴、循环 |
| 元素附着与 ICD | [aura-icd.md](../docs/mechanics/aura-icd.md) | 附着量、U、衰减、反应消耗、ICD、2.5秒/3次、附着标签 |

### 2.2 游戏系统 · [docs/systems/](../docs/systems/)

| 主题 | 文件 | 关键词 |
|---|---|---|
| 圣遗物系统 | [artifacts.md](../docs/systems/artifacts.md) | 部位、主词条、副词条、强化、套装、有效词条数 |
| 武器系统 | [weapons.md](../docs/systems/weapons.md) | 武器类型、稀有度、基础攻击力档位、副属性、精炼 |
| 天赋与命座 | [talents.md](../docs/systems/talents.md) | 天赋等级、固有天赋、命之座、天赋倍率、升级材料 |

### 2.3 术语 · [docs/glossary.md](../docs/glossary.md)

缩写（ATK/EM/ER/CR/CD/ICD）、技能（E/Q/普攻/重击）、职能（主C/副C/奶/盾/充电宝）、
黑话（双爆/白值/毕业/专武/平替）、元素与反应名、玩法（深渊/剧诗/周本）。

---

## 3. 规则（rules/）

| 文件 | 回答的问题 |
|---|---|
| [README.md](../rules/README.md) | 规则写作规范与依赖关系 |
| [team-building.md](../rules/team-building.md) | 职能模型、队伍模板、反应轴判定、元素共鸣、ER 检查、场景适配 |
| [stat-priority.md](../rules/stat-priority.md) | **地基**：有效词条如何判定（判定四问 + 词条有效性表 + 耦合关系） |
| [artifact-selection.md](../rules/artifact-selection.md) | 套装结构判定、主词条判定树、副词条优先级、毕业标准 |
| [weapon-selection.md](../rules/weapon-selection.md) | 硬过滤、评估维度、被动可触发性、充能缺口、四层推荐 |

---

## 4. 数据（data/）

总览：[data/README.md](../data/README.md)｜契约：[data/schema/README.md](../data/schema/README.md)

| 表 | 主键 | 内容 | 状态 |
|---|---|---|---|
| [characters/characters.csv](../data/characters/characters.csv) | `char_id` | 角色基础属性、突破加成、爆发能量 | ✅ **124 行** |
| [characters/character_roles.csv](../data/characters/character_roles.csv) | `char_id`+`role` | 角色定位（长表） | ✅ **171 行 / 120 角色** |
| [characters/community_roles.csv](../data/characters/community_roles.csv) | `char_id` | 社区定位来源快照（交叉核对） | ✅ **120 行** |
| [characters/character_talents.csv](../data/characters/character_talents.csv) | `char_id`+`talent_type` | 天赋完整文本与属性缩放 | ✅ **753 行** |
| [characters/character_talent_params.csv](../data/characters/character_talent_params.csv) | `char_id`+`talent_type`+`label_index` | 天赋逐条属性词条（长表） | ✅ **2387 行** |
| [characters/character_constellations.csv](../data/characters/character_constellations.csv) | `char_id`+`constellation_index` | 命之座效果与天赋 +3 归属 | ✅ **720 行** |
| [weapons/weapons.csv](../data/weapons/weapons.csv) | `weapon_id` | 武器基础属性与被动 | ✅ **255 行** |
| [artifacts/artifact_sets.csv](../data/artifacts/artifact_sets.csv) | `set_id` | 圣遗物套装主表 | ✅ **63 行** |
| [artifacts/artifact_set_bonuses.csv](../data/artifacts/artifact_set_bonuses.csv) | `set_id`+`pieces`+`effect_index` | 套装效果（长表） | ✅ **122 行** |
| [artifacts/artifact_main_stats.csv](../data/artifacts/artifact_main_stats.csv) | `slot`+`main_stat` | 主词条数值 | 表头 |
| [elements/level_coefficients.csv](../data/elements/level_coefficients.csv) | `level` | 等级 → 角色/敌人/结晶护盾系数 | ✅ **100 行** |
| [elements/reactions.csv](../data/elements/reactions.csv) | `reaction_id` | 反应系数与属性 | ✅ **20 行** |
| [elements/aura_consumption.csv](../data/elements/aura_consumption.csv) | `reaction_id` | 附着量消耗 | ✅ **18 行** |
| [elements/particle_energy.csv](../data/elements/particle_energy.csv) | `pickup_type`+`element_relation`+`field_state`+`party_size` | 微粒/晶球能量 | ✅ **24 行** |
| [enemies/enemies.csv](../data/enemies/enemies.csv) | `enemy_id` | 敌人基础属性 | 表头 |
| [enemies/enemy_resistance.csv](../data/enemies/enemy_resistance.csv) | `enemy_id`+`element` | 敌人元素抗性（长表） | 表头 |
| [teams/team_archetypes.csv](../data/teams/team_archetypes.csv) | `archetype_id` | 队伍原型 | 表头 |
| [teams/elemental_resonance.csv](../data/teams/elemental_resonance.csv) | `resonance_id` | 元素共鸣 | 表头 |

> 状态「表头」= 字段契约已冻结，数值待录入。

---

## 5. 攻略（guides/）

| 目录 | 内容 | 命名 |
|---|---|---|
| [character-builds/](../guides/character-builds/README.md) | 单角色配装 | `<slug>.md` |
| [team-comps/](../guides/team-comps/README.md) | 具体队伍方案 | `<archetype>__<主C slug>.md` |
| [faq/](../guides/faq/README.md) | 常见问题 | `<topic>.md` |

模板：[character-builds/_TEMPLATE.md](../guides/character-builds/_TEMPLATE.md)、
[team-comps/_TEMPLATE.md](../guides/team-comps/_TEMPLATE.md)

**当前状态**：仅模板，尚无正式攻略。

---

## 6. 脚本（scripts/）

| 文件 | 用途 |
|---|---|
| [README.md](../scripts/README.md) | 脚本文档 |
| [validate_data.py](../scripts/validate_data.py) | CSV 格式与主键校验 + Markdown 内链检查 |

---

## 7. 关键词反查表

| 用户可能说 | 去哪 |
|---|---|
| 「谁能当奶妈」「有没有护盾角色」 | [data/characters/character_roles.csv](../data/characters/character_roles.csv)（按 `role` 过滤） |
| 「谁是主 C」「谁是后台」 | [data/characters/character_roles.csv](../data/characters/character_roles.csv)（`main_dps` / `sub_dps`） |
| 「这个角色的治疗/伤害吃什么属性」 | [data/characters/character_talent_params.csv](../data/characters/character_talent_params.csv)（`scaling_stat`） |
| 「某个技能的倍率是多少 / 冷却多久」 | [data/characters/character_talent_params.csv](../data/characters/character_talent_params.csv)（`value_lv1` / `value_lv10`） |
| 「某个角色的技能原文」 | [data/characters/character_talents.csv](../data/characters/character_talents.csv)（`description_zh`，完整不截断） |
| 「这个命座加的是哪个天赋」 | [data/characters/character_constellations.csv](../data/characters/character_constellations.csv)（`talent_level_up`） |
| 「这个命座是给自己还是给队伍」 | [data/characters/character_constellations.csv](../data/characters/character_constellations.csv)（`effect_target`） |
| 「这把武器的基础攻击力/副属性是多少」 | [data/weapons/weapons.csv](../data/weapons/weapons.csv) |
| 「哪些武器是充能/精通副属性」 | [data/weapons/weapons.csv](../data/weapons/weapons.csv)（按 `sub_stat` 过滤） |
| 「哪些套装 2 件套加攻击力」 | [data/artifacts/artifact_sets.csv](../data/artifacts/artifact_sets.csv)（按 `bonus_2pc_type` 过滤） |
| 「某个 4 件套效果是什么」 | [data/artifacts/artifact_sets.csv](../data/artifacts/artifact_sets.csv) 的 `bonus_4pc_summary`（完整效果） |
| 「谁是增伤」「谁减抗」 | [data/characters/character_roles.csv](../data/characters/character_roles.csv)（`buffer` / `debuffer`） |
| 「暴击率多少够」「双爆配比」 | [rules/stat-priority.md](../rules/stat-priority.md#3-词条排序生成流程) |
| 「蒸发几倍」「融化倍率」 | [docs/mechanics/reactions.md](../docs/mechanics/reactions.md#反应倍率) |
| 「防御区怎么算」「抗性区」 | [docs/mechanics/damage-formula.md](../docs/mechanics/damage-formula.md#24-防御区) |
| 「充能要多少」「ER 需求」 | [docs/mechanics/energy-and-rotation.md](../docs/mechanics/energy-and-rotation.md#3-元素充能效率需求) |
| 「为什么不触发反应」「挂不上元素」 | [docs/mechanics/aura-icd.md](../docs/mechanics/aura-icd.md) |
| 「4 件套还是 2+2」 | [rules/artifact-selection.md](../rules/artifact-selection.md#12-4-件套-vs-22-的取舍) |
| 「词条是不是毕业了」 | [rules/artifact-selection.md](../rules/artifact-selection.md#4-库存质量评估有效词条数) |
| 「这把武器能不能用」 | [rules/weapon-selection.md](../rules/weapon-selection.md) |
| 「队里缺什么」 | [rules/team-building.md](../rules/team-building.md#1-职能模型配队的基本骨架) |
| 「剧诗怎么配」 | [rules/team-building.md](../rules/team-building.md#6-场景适配) |
| 「某个黑话什么意思」 | [docs/glossary.md](../docs/glossary.md) |

---

## 8. 数据缺口总览

引用以下内容时必须声明「本仓库未收录」：

| 缺口 | 相关文件 |
|---|---|
| ✅ 角色基础数据（124 名）**已收录** | `data/characters/characters.csv` |
| ✅ 角色职能定位（120 名）**已收录**（推导字段，含依据与 `confidence`） | `data/characters/character_roles.csv` |
| ✅ 武器基础数据（255 把）**已收录** | `data/weapons/weapons.csv` |
| ✅ 圣遗物套装与效果（63 套 / 122 行）**已收录** | `data/artifacts/` |
| 武器**获取途径**（`obtain_method` 全表为空，源数据无此字段） | `data/weapons/weapons.csv` |
| 圣遗物**获取秘境**（`obtain_domain` 全表为空） | `data/artifacts/artifact_sets.csv` |
| 4 件套效果的完整结构化拆解（仅 `effect_type` 19/61 有值） | `data/artifacts/artifact_set_bonuses.csv` |
| ✅ 角色职能定位（120 名）、**完整技能文本与逐条属性缩放**（753 + 2387 行）**已收录** | `data/characters/` |
| 武器 R1~R5 精炼数值、圣遗物主副词条数值 | 待建表 |
| 角色定位未覆盖 4 名（旅行者与特殊条目） | `data/characters/character_roles.csv` |
| `damage_source` 全表留空（倍率条目数不能反映伤害占比） | `data/characters/character_roles.csv` |
| 旅行者分元素变体（仅天赋/命座记录可得） | `data/characters/` |
| 全部武器数值与被动 | `data/weapons/` |
| 全部套装效果数值与主词条数值 | `data/artifacts/` |
| ✅ **反应倍率、等级系数、附着消耗、能量结算已收录**（v7.1，20 + 100 + 18 + 24 行） | `data/elements/` |
| 敌人属性与抗性 | `data/enemies/` |
| 元素共鸣数值 | `data/teams/elemental_resonance.csv` |
| 命之座激活材料、天赋升级材料、固有天赋解锁阶段 | 待建表 |
| 逐技能 ICD 与附着标签（U 值） | 待建表（KQM 有附着量汇编，未纳入） |
| 各角色技能产球量 | 待建表（KQM 有 `elemental-skill-particles`，未纳入） |
| 反应优先级与元素共存表 | 待建表（源文档未给出完整表） |

> AI 在数值补齐前应给出方法论与结构性结论，而非具体排名；
> 唯一可以精确引用的是 `data/characters/characters.csv`。

### 已知易错点（引用前务必确认）

| 易错点 | 正确值 | 出处 |
|---|---|---|
| 剧变反应精通系数 | `16 × EM / (2000 + EM)`，不是增幅的 `2.78/(1400+EM)` | `docs/mechanics/reactions.md` §1 |
| 超载 / 超导倍率 | **2.75 / 1.5**（5.2 加强后），旧的 2.0 / 0.5 已过期 | `data/elements/reactions.csv` |
| 超绽放 / 烈绽放伤害元素 | 都是**草元素**，不是雷/火 | `data/elements/reactions.csv` |
| 后台回能系数 | 随队伍人数变化（4 人 **60%**），不是固定 80% | `data/elements/particle_energy.csv` |
| 普攻命中回能 | 只有**在场角色**获得，且不受 ER% 影响 | `docs/mechanics/energy-and-rotation.md` §1 |
