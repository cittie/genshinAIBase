# data/ — 结构化数据层

本目录是知识库的**机读层**，以 CSV 为主，供 AI 直接解析、过滤、关联。

> ⚠️ **当前状态：骨架已建立，数值正在分批录入。**
>
> | 表 | 状态 |
> |---|---|
> | `characters/characters.csv` | ✅ **已填充 124 行**（v7.1 全量，`source=datamine`） |
> | `characters/character_roles.csv` | ✅ **已填充 172 行**（覆盖 120 角色；推导字段，含依据与可信度） |
> | `characters/community_roles.csv` | ✅ **已填充 120 行**（社区定位来源快照，用于交叉核对） |
> | `characters/character_talents.csv` | ✅ **已填充 753 行**（技能完整文本 + 属性缩放） |
> | `characters/character_talent_params.csv` | ✅ **已填充 2387 行**（逐条效果的属性来源与数值） |
> | `weapons/weapons.csv` | ✅ **已填充 255 行**（全量武器，含满级基础攻击力与副属性） |
> | `artifacts/artifact_sets.csv` | ✅ **已填充 63 行**（全量套装） |
> | `artifacts/artifact_set_bonuses.csv` | ✅ **已填充 122 行**（2 件套完整 + 4 件套部分结构化） |
> | 其余 8 张表 | ⏳ 仅表头（字段契约已冻结，数值待填） |
>
> 只有表头代表「该表待填充」，**不等于字段不存在**。校验脚本会提示哪些表为空。

---

## 通用规范

完整的硬性约定见 [AGENTS.md §3](../AGENTS.md#3-数据契约硬性约定破坏即为-bug)，要点：

| 项 | 规则 |
|---|---|
| 编码 | UTF-8，**无 BOM** |
| 换行 | LF |
| 分隔符 | 逗号 |
| 首行 | 表头，英文 `snake_case` |
| 百分比 | 百分数数值，字段名以 `_pct` 结尾（`33.1` = 33.1%） |
| 时间 | 秒，字段名以 `_sec` 结尾 |
| 空单元格 | 未知 / 待补（**不是 0**） |
| `NA` | 该实体确实不具备此属性 |
| `?` | 有争议，需复核 |
| 多值 | 用 `;` 分隔，禁止用逗号 |
| 必带列 | 每张表末尾都有 `version`、`source` |
| 变更 | 新增列只能**追加到表尾** |

`source` 枚举：`official`（官方）｜`datamine`（解包）｜`community`（社区实测）｜`wiki`

---

## 目录与表清单

| 目录 | 表 | 内容 |
|---|---|---|
| [characters/](characters/README.md) | `characters.csv` | 角色基础属性与突破加成 |
| | `character_roles.csv` | 角色定位（长表，一人多行） |
| | `community_roles.csv` | 社区定位来源快照（交叉核对用） |
| | `character_talents.csv` | 天赋完整文本与属性缩放 |
| | `character_talent_params.csv` | 天赋逐条属性词条（长表） |
| [weapons/](weapons/README.md) | `weapons.csv` | 武器基础属性与被动 |
| [artifacts/](artifacts/README.md) | `artifact_sets.csv` | 圣遗物套装主表 |
| | `artifact_set_bonuses.csv` | 套装效果（长表，一效果一行） |
| | `artifact_main_stats.csv` | 各部位可选主词条数值 |
| [elements/](elements/README.md) | `reactions.csv` | 元素反应系数与属性 |
| | `aura_consumption.csv` | 反应对元素附着量的消耗 |
| | `particle_energy.csv` | 元素微粒/晶球能量结算 |
| [enemies/](enemies/README.md) | `enemies.csv` | 敌人基础属性 |
| | `enemy_resistance.csv` | 敌人各元素抗性（长表） |
| [teams/](teams/README.md) | `team_archetypes.csv` | 队伍原型（反应轴模板） |
| | `elemental_resonance.csv` | 元素共鸣效果 |

完整字段定义：[schema/README.md](schema/README.md) 汇总索引；每张表的详细字段在同目录 `README.md`。

---

## 待建表（规划中）

| 建议表 | 用途 |
|---|---|
| `characters/character_talents.csv` | 天赋倍率与升级材料 |
| `characters/character_abilities.csv` | 技能附着标签与 ICD 组 |
| `characters/character_constellations.csv` | 命之座效果 |
| `characters/character_passives.csv` | 固有天赋 |
| `weapons/weapon_refinements.csv` | 武器被动各精炼数值 |
| `artifacts/artifact_substat_tiers.csv` | 副词条强化档位 |
| `elements/reaction_priority.csv` | 反应优先级与元素共存 |
| `teams/team_examples.csv` | 具体队伍案例 |
| `aliases.csv`（根 data/） | 别名/黑话 → slug 映射 |
| `materials/` | 突破与天赋材料 |

---

## 关联规则

跨表关联**只用 ID 与 slug**，禁止用中文名：

```
characters.char_id          ←→ character_roles.char_id
characters.slug             ←→ character_roles.slug
artifact_sets.set_id        ←→ artifact_set_bonuses.set_id
enemies.enemy_id            ←→ enemy_resistance.enemy_id
team_archetypes.core_char_slugs ←→ characters.slug（多值，; 分隔）
```

---

## 校验

```bash
python scripts/validate_data.py
```

校验：编码、换行、表头、列数一致、主键唯一、`_pct` 字段为数值、
多值字段未用逗号、无空行、无尾随空列。CI 自动运行。

---

## 数据来源与致谢

数值来源逐行记录在 `source` 列。整理时请遵守：

1. 优先使用**官方**来源（游戏内数值、官方公告）。
2. 解包数据标注 `datamine`。
3. 社区实测标注 `community` 并附链接（写在 PR 描述中）。
4. **不录入无法溯源的数值。**

参考文献与社区资料链接将在数据填充阶段补充到本文件。
