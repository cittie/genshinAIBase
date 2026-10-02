# data/elements/ — 元素反应与能量

反应系数、附着消耗与能量结算。**当前仅有表头，数值待录入/待核实。**

> ⚠️ 本目录对**准确性的要求最高**：反应系数一旦录错，所有伤害计算都会错。
> 请只录入有明确出处的数值，无法溯源的填 `?`。

---

## reactions.csv — 元素反应

一行一个反应。

| 字段 | 类型 | 单位 | 枚举/取值 | 可空 | 说明 |
|---|---|---|---|---|---|
| `reaction_id` | string | — | 小写下划线 | 否 | **主键**，如 `vaporize`、`hyperbloom` |
| `reaction_zh` | string | — | — | 否 | 中文名 |
| `reaction_en` | string | — | — | 否 | 英文名 |
| `category` | string | — | `amplifying` `transformative` `catalyzing` `none` | 否 | 反应类别 |
| `trigger_element` | string | — | 元素枚举 | 是 | 触发元素 |
| `aura_element` | string | — | 元素枚举 | 是 | 被附着元素（底料） |
| `damage_element` | string | — | 元素枚举 + `physical` + `none` | 是 | 伤害元素 |
| `base_multiplier` | float | — | — | 是 | 基础倍率（增幅为 1.5/2.0；剧变为待核实） |
| `em_scaling` | string | — | `amplifying` `transformative` `none` | 是 | 精通加成公式类型 |
| `can_crit` | bool | — | `true` `false` | 是 | 是否可暴击 |
| `uses_def_zone` | bool | — | `true` `false` | 是 | 是否吃防御区 |
| `notes` | string | — | — | 是 | 备注（**禁止含逗号**） |
| `version` | string | — | — | 否 | 数据版本 |
| `source` | string | — | — | 否 | 数据来源 |

### `category` 枚举

| 值 | 中文 | 特征 |
|---|---|---|
| `amplifying` | 增幅反应 | 蒸发、融化；放大原伤害 |
| `transformative` | 剧变反应 | 超载、感电、超导、碎冰、扩散、结晶、绽放系 |
| `catalyzing` | 催化反应 | 原激化、超激化、蔓激化；加到基础伤害区 |
| `none` | 无直接伤害 | 冻结、燃烧（燃烧另有 DoT） |

### 待核实项（填 `?`）

- 各剧变反应的 `base_multiplier`
- 剧变的**角色等级系数**表（需要一个额外的 `level_coefficients.csv`，见待建表）
- 催化反应的等级系数与精通系数
- 绽放系的触发者判定

> 参考公式结构见 [`docs/mechanics/reactions.md`](../../docs/mechanics/reactions.md)。
> **公式结构可信，具体系数未核实。**

---

## aura_consumption.csv — 附着量消耗

一行一个反应，记录该反应消耗多少元素附着量。

| 字段 | 类型 | 单位 | 枚举/取值 | 可空 | 说明 |
|---|---|---|---|---|---|
| `reaction_id` | string | — | — | 否 | **主键**，关联 `reactions.reaction_id` |
| `aura_consumed_unit` | float | U | — | 是 | 消耗的附着量（单位 U） |
| `aura_consumed_ratio` | float | — | — | 是 | 消耗比例（相对于触发元素附着量） |
| `notes` | string | — | — | 是 | 备注（**禁止含逗号**），如「水下无限附着」 |
| `version` | string | — | — | 否 | 数据版本 |
| `source` | string | — | — | 否 | 数据来源 |

> `aura_consumed_unit` 与 `aura_consumed_ratio` 二者填其一即可，另一个留空。
> 全部数值**待核实**，见 [`docs/mechanics/aura-icd.md`](../../docs/mechanics/aura-icd.md)。

---

## particle_energy.csv — 微粒/晶球能量结算

一行一种「拾取物 × 元素匹配 × 前后台」组合。

| 字段 | 类型 | 单位 | 枚举/取值 | 可空 | 说明 |
|---|---|---|---|---|---|
| `pickup_type` | string | — | `particle` `orb` | 否 | **主键之一**，微粒或晶球 |
| `element_relation` | string | — | `same` `different` `no_element` | 否 | **主键之一**，与拾取者元素的关系 |
| `field_state` | string | — | `on_field` `off_field` | 否 | **主键之一**，拾取者是否在场 |
| `energy_value` | float | 能量 | — | 是 | 结算的元素能量（**已含前台/后台修正**） |
| `notes` | string | — | — | 是 | 备注（**禁止含逗号**） |
| `version` | string | — | — | 否 | 数据版本 |
| `source` | string | — | — | 否 | 数据来源 |

**预期行数**：`2 × 3 × 2 = 12` 行（微粒/晶球 × 同/异/无元素 × 前台/后台）。

> ⚠️ **全部数值待核实**。这是最容易记错的一张表，请以实测或权威来源录入。
> 在录入前，AI 不得给出具体能量数值（见
> [`docs/mechanics/energy-and-rotation.md`](../../docs/mechanics/energy-and-rotation.md)）。
>
> 注意：元素充能效率（ER%）**不在此表体现**，它是运行时乘数，
> 由 `实际获得 = energy_value × ER% / 100` 计算。

---

## 待建表

| 表 | 主键 | 用途 |
|---|---|---|
| `level_coefficients.csv` | `level` | 角色等级 → 剧变/催化反应等级系数 |
| `reaction_priority.csv` | `priority_order` | 反应优先级与元素共存规则 |
| `element_aura_decay.csv` | `element` + `aura_tier` | 附着档位、U 值与衰减速率 |
| `weapon_type_energy.csv` | — | 各武器类型产球量（如需要） |

---

## 相关

- 反应机制：[`../../docs/mechanics/reactions.md`](../../docs/mechanics/reactions.md)
- 附着与 ICD：[`../../docs/mechanics/aura-icd.md`](../../docs/mechanics/aura-icd.md)
- 充能与循环：[`../../docs/mechanics/energy-and-rotation.md`](../../docs/mechanics/energy-and-rotation.md)
- 数据契约：[`../schema/README.md`](../schema/README.md)
