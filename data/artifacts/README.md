# data/artifacts/ — 圣遗物数据

套装与套装效果。

> **数据状态**
> - `artifact_sets.csv`：**已填充 63 行**（全量套装），`source=datamine`
> - `artifact_set_bonuses.csv`：**已填充 122 行**（2 件套 61 行 + 4 件套 61 行）
> - `artifact_main_stats.csv`：**仅表头**（主词条数值需逐条对照游戏内录入，见文末）
>
> 重新生成：
> ```bash
> node scripts/import_genshin_db.mjs --in <genshin-db 的 data.min.json> --targets artifacts
> ```

---

## 数据来源与解析口径

由 [`scripts/import_genshin_db.mjs`](../../scripts/README.md) 从 genshin-db（GenshinData 解包）生成。
套装效果是自然语言，因此采用 **「规则表 + 无匹配即中止」** 策略：

| 情形 | 处理 |
|---|---|
| 2 件套文本**无任何规则命中** | 脚本**直接退出（退出码 3）**，绝不静默漏解析 |
| 4 件套文本 | 只填可机械提取的字段；复合条件句不硬拆（见下方覆盖度） |
| 数值依赖其他属性（如「基于元素充能效率的 25%」） | `value` 留空，`notes` 说明依赖关系 |
| 源数据本身无 2 件套（4 套「祈愿」系列） | 相关字段留空，不产出 2 件套效果行 |

**正确性验证**：内置 22 套圣遗物的 2 件套回归自检（类型 + 数值），
全部与外部独立来源一致；不一致即中止写入。

### 4 件套结构化字段的覆盖度（已知局限）

4 件套大多是复合条件句，**不适合机械拆成单一 `effect_type` + `value`**。当前实际覆盖：

| 字段 | 有值行数 / 61 |
|---|---|
| `condition`（触发条件分句） | 58 |
| `duration_sec` | 34 |
| `effect_type` | 19 |
| `max_stacks` | 7 |

因此查询 4 件套效果时，**应优先读 `artifact_sets.bonus_4pc_summary`（完整中文效果）**，
再用 `artifact_set_bonuses` 的结构化字段做筛选辅助。宁可留空也不硬拆出误导性的结论。

### 已知缺口

| 缺口 | 说明 |
|---|---|
| `obtain_domain` **全表留空** | 源数据没有获取秘境字段，0 行有值。需另找来源，不推测 |
| 4 件套的完整结构化拆解 | 见上方覆盖度表；需要人工校对或伤害构成数据 |
| `artifact_main_stats.csv` | 各主词条满级数值**档位各不相同**，不得按统一比例推算，需逐条录入 |

---

## artifact_sets.csv — 套装主表

一行一个套装。

| 字段 | 类型 | 单位 | 枚举/取值 | 可空 | 说明 |
|---|---|---|---|---|---|
| `set_id` | string | — | — | 否 | **主键**，官方套装 ID |
| `slug` | string | — | 小写下划线 | 否 | 检索键，如 `crimson_witch_of_flames` |
| `name_zh` | string | — | — | 否 | 中文名 |
| `name_en` | string | — | — | 否 | 英文名 |
| `rarity_max` | int | — | `3` `4` `5` | 是 | 该套装最高稀有度（取 `rarityList` 最大值） |
| `bonus_2pc_type` | string | — | 见 `artifact_set_bonuses.effect_type` | 是 | 2 件套效果类型（便于快速过滤） |
| `bonus_2pc_value` | float | % 或 — | — | 是 | 2 件套数值（冗余列） |
| `bonus_4pc_summary` | string | — | — | 是 | **4 件套完整效果（中文）**（禁止含逗号） |
| `obtain_domain` | string | — | — | 是 | 获取秘境名称（**当前全表为空**） |
| `version` | string | — | — | 否 | 数据生效的游戏版本 |
| `source` | string | — | `official` `datamine` `community` `wiki` | 否 | 数据来源 |

> `bonus_2pc_*` 是**冗余列**：同一信息也存在于 `artifact_set_bonuses.csv`。
> 保留原因是「按 2 件套属性筛套装」这一查询极其高频，冗余可显著降低 AI 的检索成本。
> 复合效果（如「普通攻击与重击伤害」）在此只取**第一项**，完整拆分见 `artifact_set_bonuses.csv`。
> 修改时必须两处同步。

---

## artifact_set_bonuses.csv — 套装效果（长表）

**一行一个效果**。2 件套 1~2 行，4 件套 1~3 行。

| 字段 | 类型 | 单位 | 枚举/取值 | 可空 | 说明 |
|---|---|---|---|---|---|
| `set_id` | string | — | — | 否 | **主键之一**，关联 `artifact_sets.set_id` |
| `slug` | string | — | — | 否 | 与 `artifact_sets.slug` 一致 |
| `pieces` | int | — | `2` `4` | 否 | **主键之一**，触发所需件数 |
| `effect_index` | int | — | 从 `1` 开始 | 否 | **主键之一**，同一件数下的第几条效果 |
| `effect_name` | string | — | — | 是 | 效果名（源数据未单独给出，当前全部留空） |
| `effect_type` | string | — | 见下方枚举 | 是 | 效果类型；4 件套常为空，见覆盖度说明 |
| `effect_target` | string | — | 见下方枚举 | 是 | 作用对象 |
| `value` | float | 依 `value_unit` | — | 是 | 数值；依赖其他属性时留空 |
| `value_unit` | string | — | `pct` `flat` | 是 | `value` 的单位 |
| `condition` | string | — | — | 是 | 触发条件（4 件套取第一个分句）（**禁止含逗号**） |
| `duration_sec` | float | 秒 | — | 是 | 持续时间；**仅当文本中恰好出现一次时才填** |
| `max_stacks` | int | — | — | 是 | 最大叠层数；同样只填唯一值 |
| `notes` | string | — | — | 是 | 效果全文（中文）或依赖关系说明（**禁止含逗号**） |
| `version` | string | — | — | 否 | 数据版本 |
| `source` | string | — | — | 否 | 数据来源 |

### `effect_type` 枚举（可扩展）

**属性类**
`atk_pct` `hp_pct` `def_pct` `hp` `def` `em` `energy_recharge_pct`
`crit_rate_pct` `crit_dmg_pct` `dmg_pct`

**伤害加成类**
`elemental_dmg_pct` `pyro_dmg_pct` `hydro_dmg_pct` `anemo_dmg_pct` `electro_dmg_pct`
`dendro_dmg_pct` `cryo_dmg_pct` `geo_dmg_pct` `physical_dmg_pct`
`normal_attack_dmg_pct` `charged_attack_dmg_pct` `plunging_dmg_pct`
`elemental_skill_dmg_pct` `elemental_burst_dmg_pct` `reaction_dmg_pct`

**生存与其他**
`healing_bonus_pct` `incoming_healing_bonus_pct` `shield_strength_pct`
`elemental_res_pct` `pyro_res_pct` `hydro_res_pct` `anemo_res_pct` `electro_res_pct`
`dendro_res_pct` `cryo_res_pct` `geo_res_pct` `physical_res_pct`
`*_res_shred_pct`（降低敌人抗性，如 `dendro_res_shred_pct`）
`energy_regen`（回复元素能量）`other`

> 元素相关类型按元素细分（`pyro_dmg_pct` 等），因此 `elemental_dmg_pct`
> 只用于「对任意元素/当前元素生效」的情形。

### `effect_target` 枚举

`self`（装备者）｜`team`（全队）｜`both`（两者兼有）｜`other`

判定规则（依据英文原文，且有回归闸门）：

| 条件 | 判定 |
|---|---|
| 出现 `all party members` / `all nearby party members` / `nearby party members`，**且**受益者是装备者本人 | `both` |
| 出现上述全队词，受益者不是本人 | `team` |
| 未出现全队词 | `self` |

> ⚠️ **不能简单地把「文本里出现 party 就算 team」**——`gilded_dreams`（饰金之梦）4 件套写的是
> 「使**装备者**获得强化」，队友只是**触发条件**，属自身增益。这条正是早期规则判错的地方。
> 当前实现带 14 套人工核对过的 4 件套受益对象回归自检，改规则会被立刻拦住。
>
> `both` 目前有 2 套：`heart_of_the_furnace`（自身攻击 +12% 且全队星烁反应伤害 +50%）、
> `night_of_the_skys_unveiling`（自身暴击率 + 全队月曜反应伤害 +10%）。

### 为什么用长表

4 件套效果普遍带**条件、持续、叠层**，例如「触发某反应后攻击力提升，持续 10 秒，最多叠 3 层」。
拆成长表后，AI 可直接按 `effect_type` / `condition` / `duration_sec` 过滤与比较。
（但如上所述，4 件套的 `effect_type` 覆盖有限，完整效果仍以 `bonus_4pc_summary` 为准。）

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
