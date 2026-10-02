# data/artifacts/ — 圣遗物数据

套装、套装效果与主词条数值。**当前仅有表头，数值待录入。**

---

## artifact_sets.csv — 套装主表

一行一个套装。

| 字段 | 类型 | 单位 | 枚举/取值 | 可空 | 说明 |
|---|---|---|---|---|---|
| `set_id` | string | — | — | 否 | **主键**，官方套装 ID |
| `slug` | string | — | 小写下划线 | 否 | 检索键，如 `crimson_witch_of_flames` |
| `name_zh` | string | — | — | 否 | 中文名 |
| `name_en` | string | — | — | 否 | 英文名 |
| `rarity_max` | int | — | `3` `4` `5` | 是 | 该套装最高稀有度 |
| `bonus_2pc_type` | string | — | 见 `artifact_set_bonuses.effect_type` | 是 | 2 件套效果类型（便于快速排序） |
| `bonus_2pc_value` | float | % 或 — | — | 是 | 2 件套数值（冗余列，便于快速过滤） |
| `bonus_4pc_summary` | string | — | — | 是 | 4 件套效果摘要（**禁止含逗号**） |
| `obtain_domain` | string | — | — | 是 | 获取秘境名称 |
| `version` | string | — | — | 否 | 数据生效的游戏版本 |
| `source` | string | — | `official` `datamine` `community` `wiki` | 否 | 数据来源 |

> `bonus_2pc_*` 是**冗余列**：同一信息也存在于 `artifact_set_bonuses.csv`。
> 保留原因是「按 2 件套属性筛套装」这一查询极其高频，冗余可显著降低 AI 的检索成本。
> 修改时必须两处同步。

---

## artifact_set_bonuses.csv — 套装效果（长表）

**一行一个效果**。2 件套通常 1 行，4 件套可能有 1~3 行（多段效果）。

| 字段 | 类型 | 单位 | 枚举/取值 | 可空 | 说明 |
|---|---|---|---|---|---|
| `set_id` | string | — | — | 否 | **主键之一**，关联 `artifact_sets.set_id` |
| `slug` | string | — | — | 否 | 与 `artifact_sets.slug` 一致 |
| `pieces` | int | — | `2` `4` | 否 | **主键之一**，触发所需件数 |
| `effect_index` | int | — | 从 `1` 开始 | 否 | **主键之一**，同一件数下的第几条效果 |
| `effect_name` | string | — | — | 是 | 效果名（如有） |
| `effect_type` | string | — | 见下方枚举 | 是 | 效果类型 |
| `effect_target` | string | — | 见下方枚举 | 是 | 作用对象 |
| `value` | float | 依 `value_unit` | — | 是 | 数值 |
| `value_unit` | string | — | `pct` `flat` `sec` `count` `multiplier` | 是 | `value` 的单位 |
| `condition` | string | — | — | 是 | 触发条件（**禁止含逗号**） |
| `duration_sec` | float | 秒 | — | 是 | 持续时间 |
| `max_stacks` | int | — | — | 是 | 最大叠层数 |
| `notes` | string | — | — | 是 | 备注（**禁止含逗号**） |
| `version` | string | — | — | 否 | 数据版本 |
| `source` | string | — | — | 否 | 数据来源 |

### `effect_type` 枚举（可扩展）

`atk_pct` `hp_pct` `def_pct` `em` `energy_recharge_pct` `crit_rate_pct` `crit_dmg_pct`
`elemental_dmg_pct` `physical_dmg_pct` `normal_attack_dmg_pct` `charged_attack_dmg_pct`
`plunging_dmg_pct` `elemental_skill_dmg_pct` `elemental_burst_dmg_pct`
`healing_bonus_pct` `shield_strength_pct` `res_shred_pct` `def_shred_pct`
`reaction_dmg_pct` `dmg_pct` `other`

### `effect_target` 枚举

`self`（装备者）｜`team`（全队）｜`party_nearby`（附近队友）｜`enemy`（敌人）｜`other`

### 为什么用长表

4 件套效果普遍带**条件、持续、叠层**，例如「触发某反应后攻击力提升，持续 10 秒，最多叠 3 层」。
拆成长表后，AI 可直接按 `effect_type` / `condition` / `duration_sec` 过滤与比较，
无需解析自然语言文本。

---

## artifact_main_stats.csv — 主词条数值

| 字段 | 类型 | 单位 | 枚举/取值 | 可空 | 说明 |
|---|---|---|---|---|---|
| `slot` | string | — | `flower` `plume` `sands` `goblet` `circlet` | 否 | **主键之一** |
| `main_stat` | string | — | 见下方枚举 | 否 | **主键之一** |
| `value_base` | float | % 或 — | — | 是 | 初始（+0）数值 |
| `value_lv20_5star` | float | % 或 — | — | 是 | 5★ 满级（+20）数值 |
| `version` | string | — | — | 否 | 数据版本 |
| `source` | string | — | — | 否 | 数据来源 |

### `main_stat` 枚举

`hp` `atk`（花与羽的固定主词条）
`hp_pct` `atk_pct` `def_pct` `elemental_mastery` `energy_recharge_pct`
`pyro_dmg_pct` `hydro_dmg_pct` `anemo_dmg_pct` `electro_dmg_pct` `dendro_dmg_pct` `cryo_dmg_pct` `geo_dmg_pct`
`physical_dmg_pct` `crit_rate_pct` `crit_dmg_pct` `healing_bonus_pct`

### ⚠️ 待核实说明

各主词条的满级数值**档位不同**（如暴击率与暴击伤害、攻击力% 与元素精通各不相同），
**不得套用统一比例推算**。必须逐条对照游戏内数值录入。

在录入完成前，`docs/mechanics/stats-and-scaling.md` 中相关表格标记为 `?`。

---

## 待建表

| 表 | 主键 | 用途 |
|---|---|---|
| `artifact_substat_tiers.csv` | `sub_stat` + `tier` | 副词条各强化档位的数值 |
| `artifact_substat_pool.csv` | `sub_stat` | 副词条池与出现权重 |

---

## 相关

- 数据契约：[`../schema/README.md`](../schema/README.md)
- 圣遗物选择规则：[`../../rules/artifact-selection.md`](../../rules/artifact-selection.md)
- 圣遗物系统机制：[`../../docs/systems/artifacts.md`](../../docs/systems/artifacts.md)
- 词条换算：[`../../docs/mechanics/stats-and-scaling.md`](../../docs/mechanics/stats-and-scaling.md)
