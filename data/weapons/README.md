# data/weapons/ — 武器数据

武器基础属性与被动。**当前仅有表头，数值待录入。**

---

## weapons.csv — 武器基础数据

一行一把武器。

| 字段 | 类型 | 单位 | 枚举/取值 | 可空 | 说明 |
|---|---|---|---|---|---|
| `weapon_id` | string | — | — | 否 | **主键**，官方武器 ID |
| `slug` | string | — | 小写下划线 | 否 | 检索键，如 `staff_of_homa` |
| `name_zh` | string | — | — | 否 | 中文名 |
| `name_en` | string | — | — | 否 | 英文名 |
| `rarity` | int | — | `1`~`5` | 否 | 稀有度 |
| `weapon_type` | string | — | `sword` `claymore` `polearm` `catalyst` `bow` | 否 | 武器类型 |
| `base_atk_lv90` | float | — | — | 是 | 90 级基础攻击力（**不受精炼影响**） |
| `sub_stat` | string | — | 见下方枚举 | 是 | 副属性类型；无副属性则空 |
| `sub_stat_value_lv90` | float | % 或 — | — | 是 | 90 级副属性数值（`_pct` 类填百分数） |
| `passive_name_zh` | string | — | — | 是 | 被动名称 |
| `passive_summary` | string | — | — | 是 | 被动摘要（**禁止含逗号**） |
| `obtain_method` | string | — | `gacha_limited` `gacha_standard` `gacha_weapon` `forging` `event` `battle_pass` `quest` `shop` | 是 | 获取途径 |
| `version` | string | — | — | 否 | 数据生效的游戏版本 |
| `source` | string | — | `official` `datamine` `community` `wiki` | 否 | 数据来源 |

### `sub_stat` 枚举

| 值 | 含义 | 单位 |
|---|---|---|
| `atk_pct` | 攻击力 | % |
| `hp_pct` | 生命值 | % |
| `def_pct` | 防御力 | % |
| `crit_rate_pct` | 暴击率 | % |
| `crit_dmg_pct` | 暴击伤害 | % |
| `energy_recharge_pct` | 元素充能效率 | % |
| `elemental_mastery` | 元素精通 | 整数 |
| `physical_dmg_pct` | 物理伤害加成 | % |

### 注意事项

- `base_atk_lv90` **不随精炼变化**，精炼只影响被动。
- 副属性**类型固定**，同一把武器永远同一个副属性；只有数值随等级成长。
- `passive_summary` 只放摘要；各精炼等级的完整数值应放入待建表 `weapon_refinements.csv`。
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
