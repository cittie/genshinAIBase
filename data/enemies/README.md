# data/enemies/ — 敌人数据

敌人基础属性与元素抗性。**当前仅有表头，数值待录入。**

> 用途：伤害计算需要敌人的**等级**（防御区）与**抗性**（抗性区）。
> 见 [`docs/mechanics/damage-formula.md`](../../docs/mechanics/damage-formula.md#24-防御区)。

---

## enemies.csv — 敌人基础数据

一行一个敌人。若同一敌人有多个等级档位（如深境螺旋不同层），**按等级分行**（`enemy_id` 可加后缀区分，如 `ruin_guard_90`）。

| 字段 | 类型 | 单位 | 枚举/取值 | 可空 | 说明 |
|---|---|---|---|---|---|
| `enemy_id` | string | — | — | 否 | **主键**，官方 ID 或自定义 slug |
| `slug` | string | — | 小写下划线 | 否 | 检索键 |
| `name_zh` | string | — | — | 否 | 中文名 |
| `name_en` | string | — | — | 否 | 英文名 |
| `category` | string | — | `normal` `elite` `boss` `weekly_boss` `local_legend` `other` | 是 | 敌人类别 |
| `level` | int | — | — | 是 | 等级（决定防御区） |
| `hp` | float | — | — | 是 | 生命值上限 |
| `atk` | float | — | — | 是 | 攻击力 |
| `def` | float | — | — | 是 | 防御力（通常由等级决定） |
| `notes` | string | — | — | 是 | 备注（**禁止含逗号**），如「有元素护盾」 |
| `version` | string | — | — | 否 | 数据版本 |
| `source` | string | — | `official` `datamine` `community` `wiki` | 否 | 数据来源 |

### 说明

- 防御区公式只依赖**等级**，因此 `level` 是最高优先级的字段。
- 若敌人有护盾、免疫、特殊减伤，写入 `notes`（**禁止含逗号**）。

---

## enemy_resistance.csv — 元素抗性（长表）

一行「一个敌人 × 一个元素」。

| 字段 | 类型 | 单位 | 枚举/取值 | 可空 | 说明 |
|---|---|---|---|---|---|
| `enemy_id` | string | — | — | 否 | **主键之一**，关联 `enemies.enemy_id` |
| `slug` | string | — | — | 否 | 与 `enemies.slug` 一致 |
| `element` | string | — | `pyro` `hydro` `anemo` `electro` `dendro` `cryo` `geo` `physical` | 否 | **主键之一** |
| `res_pct` | float | % | — | 是 | 抗性百分数数值（`10` = 10%，`-40` = -40%） |
| `notes` | string | — | — | 是 | 备注（**禁止含逗号**），如「破盾后降为 0」 |
| `version` | string | — | — | 否 | 数据版本 |
| `source` | string | — | — | 否 | 数据来源 |

### 抗性的特殊取值

| 情况 | 写法 |
|---|---|
| 免疫（如纯水精灵对水） | `100` 或更高，并在 `notes` 注明「免疫」 |
| 未知 | 留空 |
| 有争议 | `?` |

> 抗性为负值时**直接写负数**（如 `-40`），不要写 `40` 再加说明。

### 为什么用长表

每个敌人需要 8 个元素各一行，宽表会有 8 列冗余且新增元素时需改表结构。
长表同时便于「找出对火抗性最低的敌人」这类反向查询。

---

## 待建表

| 表 | 用途 |
|---|---|
| `enemy_def_shred.csv` | 特定机制导致的防御力变化 |
| `enemy_phases.csv` | 多阶段 Boss 各阶段属性 |

---

## 相关

- 防御区与抗性区公式：[`../../docs/mechanics/damage-formula.md`](../../docs/mechanics/damage-formula.md)
- 数据契约：[`../schema/README.md`](../schema/README.md)
