# data/weapons/ — 武器数据

武器基础属性与被动。

> **数据状态：`weapons.csv` 已填充 255 行**（v7.1 全量），`source=datamine`
>
> 重新生成：
> ```bash
> node scripts/import_genshin_db.mjs --in <genshin-db 的 data.min.json> --targets weapons
> ```

---

## 数据来源与口径

由 [`scripts/import_genshin_db.mjs`](../../scripts/README.md) 从 genshin-db（GenshinData 解包）生成。

| 项 | 口径 |
|---|---|
| `base_atk_lv90` | 由解包成长曲线 + 突破加成精确计算后**四舍五入取整**；**不随精炼变化** |
| `sub_stat_value_lv90` | 副属性数值：`em` 为整数，其余为百分数数值保留 1 位（与游戏内显示一致） |
| `max_level` | 等级上限。**1★ 与 2★ 共 10 把为 70，其余 245 把为 90** |
| `passive_summary` | R1 被动**全文**（优先中文）；中文标点不含 ASCII 逗号，天然满足 CSV 契约 |
| `version` | 该武器实装的游戏版本 |

**正确性验证**：导入脚本内置 12 把武器的回归自检（稀有度 / 满级基础攻击力 / 副属性类型 / 副属性数值
共 48 个数），全部与外部独立来源一致；不一致即中止写入。

### 已知缺口

| 缺口 | 说明 |
|---|---|
| `obtain_method` **全表留空** | 源数据**没有**获取途径字段，因此 0 行有值。需要人工或另找来源，不推测 |
| 1 把武器的副属性数值留空 | `prized_isshin_blade_01`（id 11420）：源数据 `baseStatText` 是字面量 `"NaN"`、`base.specialized=0`，按契约记为未知而非 0 |
| 10 把武器无副属性 | 源数据 `mainStatType` 为空，`sub_stat` 与数值均留空 |
| 精炼数值 | R1~R5 各等级的被动数值在待建表 `weapon_refinements.csv`，当前只在 `passive_summary` 给出 R1 全文 |

### 同名记录消歧

源数据里 `prizedisshinblade` / `prizedisshinblade-01` / `prizedisshinblade-02` 三条记录**英文名完全相同**。
脚本按源 key 的区分后缀生成 slug：`prized_isshin_blade` / `prized_isshin_blade_01` / `prized_isshin_blade_02`，
保证唯一且可追溯（消歧时会打印警告）。

---

## weapons.csv — 武器基础数据

一行一把武器（同名记录按上述规则消歧后各占一行）。

| 字段 | 类型 | 单位 | 枚举/取值 | 可空 | 说明 |
|---|---|---|---|---|---|
| `weapon_id` | string | — | — | 否 | **主键**，官方武器 ID |
| `slug` | string | — | 小写下划线 | 否 | 检索键，如 `staff_of_homa` |
| `name_zh` | string | — | — | 否 | 中文名 |
| `name_en` | string | — | — | 否 | 英文名 |
| `rarity` | int | — | `1`~`5` | 否 | 稀有度 |
| `weapon_type` | string | — | `sword` `claymore` `polearm` `catalyst` `bow` | 否 | 武器类型 |
| `max_level` | int | — | `70` `90` | 否 | 等级上限（见上方口径） |
| `base_atk_lv90` | float | — | — | 是 | **满级**基础攻击力（等级上限见 `max_level`） |
| `sub_stat` | string | — | 见下方枚举 | 是 | 副属性类型；无副属性则空 |
| `sub_stat_value_lv90` | float | % 或 — | — | 是 | **满级**副属性数值（`_pct` 类填百分数，`em` 为整数） |
| `passive_name_zh` | string | — | — | 是 | 被动名称 |
| `passive_summary` | string | — | — | 是 | R1 被动全文（**禁止含逗号**） |
| `obtain_method` | string | — | `gacha_limited` `gacha_standard` `gacha_weapon` `forging` `event` `battle_pass` `quest` `shop` | 是 | 获取途径（**当前全表为空**，源数据无此字段） |
| `version` | string | — | — | 否 | 数据生效的游戏版本 |
| `source` | string | — | `official` `datamine` `community` `wiki` | 否 | 数据来源（当前全部为 `datamine`） |

### `sub_stat` 枚举

| 值 | 含义 | 单位 |
|---|---|---|
| `atk_pct` | 攻击力 | % |
| `hp_pct` | 生命值 | % |
| `def_pct` | 防御力 | % |
| `crit_rate_pct` | 暴击率 | % |
| `crit_dmg_pct` | 暴击伤害 | % |
| `energy_recharge_pct` | 元素充能效率 | % |
| `em` | 元素精通 | 整数 |
| `physical_dmg_pct` | 物理伤害加成 | % |

> 武器副属性**不含**元素伤害加成（元素伤害只出现在圣遗物与角色突破上）。

### 注意事项

- `base_atk_lv90` / `sub_stat_value_lv90` 是**满级值**：字段名沿用 `_lv90` 契约，
  但 10 把 1★/2★ 武器的上限是 70，其值为 70 级数值，请以 `max_level` 为准。
- `base_atk_lv90` **不随精炼变化**，精炼只影响被动。
- 副属性**类型固定**，同一把武器永远同一个副属性；只有数值随等级成长。
- `passive_summary` 只给 R1 全文；各精炼等级的完整数值应放入待建表 `weapon_refinements.csv`。
- 精炼等级不在此表体现（一把武器只有一行），精炼差异属于**评估口径**，见
  [`rules/weapon-selection.md`](../../rules/weapon-selection.md)。

---

## 待建表

| 表 | 主键 | 用途 |
|---|---|---|
| `weapon_refinements.csv` | `weapon_id` + `refinement` | 被动在 R1~R5 各等级的数值 |

建议字段：

```
weapon_id, slug, refinement, effect_text, value, value_unit, condition, notes, version, source
```

---

## 相关

- 数据契约：[`../schema/README.md`](../schema/README.md)
- 武器选择规则：[`../../rules/weapon-selection.md`](../../rules/weapon-selection.md)
- 武器系统机制：[`../../docs/systems/weapons.md`](../../docs/systems/weapons.md)
- 充能缺口判定：[`../../docs/mechanics/energy-and-rotation.md`](../../docs/mechanics/energy-and-rotation.md)
