# data/elements/ — 元素反应与能量

反应系数、等级系数、附着消耗与能量结算。

> **数据状态**
> - `level_coefficients.csv`：**已填充 100 行**（1~100 级 × 角色/敌人/结晶护盾）
> - `reactions.csv`：**已填充 20 行**（v7.1，含 5.2 剧变加强后的倍率）
> - `aura_consumption.csv`：**已填充 18 行**
> - `particle_energy.csv`：**已填充 24 行**
>
> **来源**：KQM Theorycrafting Library（`KQM-git/TCL`），固定 commit
> [`106c0f3f1b349df0d76297243c72cd0dc043aa01`](https://github.com/KQM-git/TCL/tree/106c0f3f1b349df0d76297243c72cd0dc043aa01)
> （2026-10-01，提交信息 `7.1 data`）。`source` 列取值 `community`，
> 每行的 `source_url` 指向该行数值所在的具体文件。
>
> 重新生成：
> ```bash
> node scripts/import_kqm_tcl.mjs --fetch   # 下载固定 commit 的源文件到 .cache/kqm-tcl/
> node scripts/import_kqm_tcl.mjs           # 校验锚点并写出 CSV
> node scripts/import_kqm_tcl.mjs --refresh # 检查上游是否已有新 commit
> ```

> ⚠️ 本目录对**准确性要求最高**：反应系数一旦录错，所有伤害计算都会错。
> 因此导入脚本对每条**人工转写**的数值都做了**锚点校验**——
> 该数值必须能在被引用的源文件里找到对应字符串，否则拒绝写入（见 `scripts/README.md`）。

---

## level_coefficients.csv — 等级系数

一行一个等级。剧变反应与催化反应都用这里的 `player_multiplier`。

| 字段 | 类型 | 单位 | 枚举/取值 | 可空 | 说明 |
|---|---|---|---|---|---|
| `level` | int | — | `1`~`100` | 否 | **主键**，等级 |
| `player_multiplier` | float | — | — | 否 | **角色**等级系数（角色触发反应时用） |
| `enemy_multiplier` | float | — | — | 否 | **敌人/环境**等级系数（敌人触发时用） |
| `shield_multiplier` | float | — | — | 否 | 结晶护盾的等级系数 |
| `version` | string | — | — | 否 | 数据版本 |
| `source` | string | — | `community` | 否 | 数据来源 |
| `source_url` | string | — | URL | 否 | 该行数值的出处文件 |

- **索引即等级**：源数据是数组，第 0 项为占位（等于 1 级），第 1 项起对应 1 级。
- 关键值：**90 级角色系数 = 1446.8535**（已作为导入脚本的自检锚点）。
- `player_multiplier` 与 `enemy_multiplier` 在约 55 级前相同，之后分化；90 级时敌人系数为 1202.8137。
- 源数组延伸到 200 级，本表只收录到 **100 级**（角色上限 90、敌人常见至 100）。

---

## reactions.csv — 元素反应

一行一个反应。**蒸发/融化因强/弱倍率不同而拆成两条**（附着消耗也不同）。

| 字段 | 类型 | 单位 | 枚举/取值 | 可空 | 说明 |
|---|---|---|---|---|---|
| `reaction_id` | string | — | 小写下划线 | 否 | **主键**，如 `vaporize_strong`、`hyperbloom` |
| `reaction_zh` | string | — | — | 否 | 中文名 |
| `reaction_en` | string | — | — | 否 | 英文名 |
| `category` | string | — | `amplifying` `transformative` `additive` `none` | 否 | 反应类别 |
| `trigger_element` | string | — | 元素枚举，多值用 `;` | 是 | 触发元素 |
| `aura_element` | string | — | 元素枚举 + `quicken` `frozen`，多值用 `;` | 是 | 被附着元素（底料） |
| `damage_element` | string | — | 元素枚举 + `physical` + `none` | 是 | 伤害元素 |
| `base_multiplier` | float | — | — | 是 | 反应倍率 |
| `em_scaling` | string | — | `amplifying` `transformative` `additive` `none` | 是 | 精通加成公式类型 |
| `can_crit` | bool | — | `true` `false` | 是 | 是否可暴击 |
| `uses_def_zone` | bool | — | `true` `false` | 是 | 是否吃防御区 |
| `notes` | string | — | — | 是 | 备注（**禁止含逗号**） |
| `version` | string | — | — | 否 | 数据版本 |
| `source` | string | — | `community` | 否 | 数据来源 |
| `source_url` | string | — | URL | 否 | 该行数值的出处文件 |

### `category` 枚举

| 值 | 中文 | 特征 | 精通系数 |
|---|---|---|---|
| `amplifying` | 增幅反应 | 蒸发、融化；放大**最终伤害** | `2.78 × EM / (1400 + EM)` |
| `transformative` | 剧变反应 | 超载、感电、超导、碎冰、扩散、结晶、**燃烧**、绽放系 | `16 × EM / (2000 + EM)` |
| `additive` | 催化反应 | 原激化、超激化、蔓激化；加到**基础伤害区** | `5 × EM / (1200 + EM)` |
| `none` | 无直接伤害 | 冻结 | — |

> ⚠️ **三种精通系数不可混用**，这是最容易出错的地方。

### 反应倍率一览（v7.1）

| 反应 | `base_multiplier` | 伤害元素 |
|---|---|---|
| 烈绽放 / 超绽放 / 碎冰 | 3 | 草 / 草 / 物理 |
| 超载 | 2.75 | 火 |
| 感电 | 2（× 触发次数） | 雷 |
| 绽放（草原核爆炸） | 2 | 草 |
| 超导 | 1.5 | 冰 |
| 扩散 | 0.6 | 被扩散的元素 |
| 燃烧 | 0.25 | 火 |
| 结晶 | 0 | 无 |
| 增幅·强（蒸发水打火 / 融化火打冰） | 2 | 触发攻击的元素 |
| 增幅·弱（蒸发火打水 / 融化冰打火） | 1.5 | 触发攻击的元素 |
| 超激化 / 蔓激化 | 1.15 / 1.25 | — |

> ⚠️ **5.2 版本加强了剧变反应**。网上常见旧值（超载 2.0、超导 0.5、碎冰 1.5、感电 1.2）
> **均已过期**。引用本表时请连同 `version` 一起引用。

> 公式结构见 [`docs/mechanics/reactions.md`](../../docs/mechanics/reactions.md)。

---

## aura_consumption.csv — 附着量消耗

一行一个反应，记录该反应消耗多少元素附着量。

| 字段 | 类型 | 单位 | 枚举/取值 | 可空 | 说明 |
|---|---|---|---|---|---|
| `reaction_id` | string | — | — | 否 | **主键**，关联 `reactions.reaction_id` |
| `aura_consumed_unit` | float | U | — | 是 | **直接扣掉的固定附着量** |
| `aura_consumed_ratio` | float | — | — | 是 | **乘在触发元素附着量上的系数** |
| `notes` | string | — | — | 是 | 备注（**禁止含逗号**） |
| `version` | string | — | — | 否 | 数据版本 |
| `source` | string | — | `community` | 否 | 数据来源 |
| `source_url` | string | — | URL | 否 | 该行数值的出处文件 |

> `aura_consumed_unit` 与 `aura_consumed_ratio` **二者填其一**，另一个留空。
> 两者都为空的行走表示「源文档未给出该反应的消耗数值」——`notes` 会说明原因，
> **不是遗漏**，不要凭记忆补。

| 反应 | 消耗 |
|---|---|
| 超载 / 超导 | 1×（AoE 为零附着） |
| 增幅·弱 / 增幅·强 | 0.5× / 2× |
| 扩散 / 结晶 | 0.5× |
| 感电 | 0.4U / 跳（水与雷各扣） |
| 碎冰 | 8U |
| 绽放 | 水:草 = 2:1（水为弱元素），**不影响伤害** |

> 附着税、衰减速率与时长公式见 [`docs/mechanics/aura-icd.md`](../../docs/mechanics/aura-icd.md)。

---

## particle_energy.csv — 微粒/晶球能量结算

一行一种「拾取物 × 元素匹配 × 前后台 × 队伍人数」组合。

| 字段 | 类型 | 单位 | 枚举/取值 | 可空 | 说明 |
|---|---|---|---|---|---|
| `pickup_type` | string | — | `particle` `orb` | 否 | **主键之一**，微粒或晶球 |
| `element_relation` | string | — | `same` `different` `no_element` | 否 | **主键之一**，与拾取者元素的关系 |
| `field_state` | string | — | `on_field` `off_field` | 否 | **主键之一**，拾取者是否在场 |
| `party_size` | int | — | `2` `3` `4`，在场时为 `NA` | 是 | **主键之一**，队伍人数（只影响后台系数） |
| `energy_value` | float | 能量 | — | 是 | 结算的元素能量（**已含前台/后台修正**） |
| `notes` | string | — | — | 是 | 备注（**禁止含逗号**） |
| `version` | string | — | — | 否 | 数据版本 |
| `source` | string | — | `community` | 否 | 数据来源 |
| `source_url` | string | — | URL | 否 | 该行数值的出处文件 |

**行数**：`2 × 3 × (1 + 3) = 24` 行。在场角色与队伍人数无关（`party_size = NA`），
后台角色有 4/3/2 人三种系数。

> ⚠️ **后台系数不是固定的 80%**，而是 4 人 60% / 3 人 70% / 2 人 80%——
> 这是本表最容易记错的地方，因此 `party_size` 必须作为主键的一部分。
>
> 表内数值**已含后台修正**，直接查用即可。
> 元素充能效率（ER%）**不在此表体现**，它是运行时乘数：
> `实际获得 = energy_value × ER% / 100`。
>
> 详见 [`docs/mechanics/energy-and-rotation.md`](../../docs/mechanics/energy-and-rotation.md)。

---

## 待建表

| 表 | 主键 | 用途 | 源可得性 |
|---|---|---|---|
| `reaction_priority.csv` | `priority_order` | 反应优先级与元素共存规则 | ⚠️ 源文档未给出完整优先级表 |
| `element_aura_decay.csv` | `element` + `aura_tier` | 附着档位、U 值与衰减速率 | ✅ KQM 有（本次未纳入，见 `aura-icd.md` 的速率表） |
| `character_particles.csv` | `char_id` | 各角色技能产球量 | ✅ KQM TCL 有 `resources/compendiums/elemental-skill-particles.md` |

---

## 相关

- 反应机制：[`../../docs/mechanics/reactions.md`](../../docs/mechanics/reactions.md)
- 附着与 ICD：[`../../docs/mechanics/aura-icd.md`](../../docs/mechanics/aura-icd.md)
- 充能与循环：[`../../docs/mechanics/energy-and-rotation.md`](../../docs/mechanics/energy-and-rotation.md)
- 导入脚本说明：[`../../scripts/README.md`](../../scripts/README.md)
- 数据契约：[`../schema/README.md`](../schema/README.md)
