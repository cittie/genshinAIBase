# data/teams/ — 队伍数据

队伍原型（反应轴模板）与元素共鸣。**当前仅有表头，数值/内容待录入。**

---

## team_archetypes.csv — 队伍原型

一行一个**原型（archetype）**，即「一套反应轴 + 职能构成」的抽象模板，
不是某位玩家的具体队伍。

| 字段 | 类型 | 单位 | 枚举/取值 | 可空 | 说明 |
|---|---|---|---|---|---|
| `archetype_id` | string | — | 小写下划线 | 否 | **主键**，如 `vaporize_carry` |
| `slug` | string | — | — | 否 | 检索键 |
| `name_zh` | string | — | — | 否 | 中文名，如「蒸发主 C」 |
| `name_en` | string | — | — | 否 | 英文名 |
| `core_elements` | string | — | 元素枚举，多值用 `;` | 是 | 核心元素组合，如 `pyro;hydro` |
| `core_char_slugs` | string | — | 角色 slug，多值用 `;` | 是 | 典型核心角色 |
| `key_reaction` | string | — | `reaction_id`，多值用 `;` | 是 | 关键反应，如 `vaporize` |
| `required_roles` | string | — | `role` 枚举，多值用 `;` | 是 | 必需职能，如 `main_dps;enabler;healer` |
| `description` | string | — | — | 是 | 一句话说明（**禁止含逗号**） |
| `version` | string | — | — | 否 | 数据版本 |
| `source` | string | — | `official` `datamine` `community` `wiki` | 否 | 数据来源 |

### 使用示例

```
用户问「胡桃怎么配队」
1. 找 core_char_slugs 含 hu_tao 的原型 → 得到「蒸发主 C」
2. 读 required_roles → main_dps;enabler;buffer;shielder
3. 从 character_roles.csv 中按 role 筛选候选
4. 按 rules/team-building.md 校验反应轴与 ER
```

### 与 guides/team-comps/ 的区别

| | `data/teams/team_archetypes.csv` | `guides/team-comps/` |
|---|---|---|
| 内容 | 抽象原型（机器可读） | 具体队伍方案（人读） |
| 性质 | 客观结构 | 主观推荐 |
| 用途 | AI 推理起点 | 现成方案 |

---

## elemental_resonance.csv — 元素共鸣

一行一个共鸣。

| 字段 | 类型 | 单位 | 枚举/取值 | 可空 | 说明 |
|---|---|---|---|---|---|
| `resonance_id` | string | — | — | 否 | **主键**，如 `pyro_resonance` |
| `element_pair` | string | — | 元素枚举，多值用 `;` | 否 | 触发共鸣的元素（同元素 2 人） |
| `name_zh` | string | — | — | 否 | 共鸣名 |
| `name_en` | string | — | — | 否 | 英文名 |
| `effect_type` | string | — | 见 `artifact_set_bonuses.effect_type` | 是 | 效果类型 |
| `effect_summary` | string | — | — | 是 | 效果摘要（**禁止含逗号**） |
| `value` | float | 依 `value_unit` | — | 是 | 数值 |
| `value_unit` | string | — | `pct` `flat` `sec` `count` | 是 | 单位 |
| `condition` | string | — | — | 是 | 触发条件（**禁止含逗号**） |
| `version` | string | — | — | 否 | 数据版本 |
| `source` | string | — | — | 否 | 数据来源 |

> ⚠️ **数值待核实**。在录入前，AI 只能说明「双 X 共鸣提供 Y 类增益」，
> 不得给出百分比数字。见 [`rules/team-building.md §4`](../../rules/team-building.md#4-元素共鸣判定)。

---

## 待建表

| 表 | 用途 |
|---|---|
| `team_examples.csv` | 具体队伍案例（四人配置 + 循环要点） |
| `team_constraints.csv` | 场景约束（如剧诗的元素与角色池限制） |

---

## 相关

- 配队规则：[`../../rules/team-building.md`](../../rules/team-building.md)
- 角色定位：[`../characters/README.md`](../characters/README.md)
- 反应机制：[`../../docs/mechanics/reactions.md`](../../docs/mechanics/reactions.md)
- 数据契约：[`../schema/README.md`](../schema/README.md)
