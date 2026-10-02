# data/schema/ — 数据契约与表索引

本目录是数据层的**契约中心**。跨表的通用约定写在 [AGENTS.md §3](../../AGENTS.md#3-数据契约硬性约定破坏即为-bug)，
本文件提供**所有表的字段索引**与新增表的登记流程。

---

## 1. 字段命名规则

| 后缀 | 含义 | 示例 |
|---|---|---|
| `_id` | 官方 ID（数字字符串为主键） | `char_id`、`weapon_id`、`set_id` |
| `_slug` / `slug` | 英文小写下划线检索键 | `hu_tao` |
| `_zh` / `_en` | 中文 / 英文展示名 | `name_zh`、`name_en` |
| `_pct` | 百分数数值（`33.1` = 33.1%） | `crit_rate_pct` |
| `_sec` | 时间，单位秒 | `duration_sec` |
| `_lv90` / `_lv20` | 满级数值，避免歧义 | `base_atk_lv90` |
| `is_` | 布尔，取值 `true` / `false` | `is_primary` |
| `_type` | 枚举分类 | `weapon_type`、`effect_type` |
| `_summary` | 文本摘要（**禁止含逗号**） | `bonus_4pc_summary` |
| `notes` | 自由备注（**禁止含逗号**） | — |
| `version` | 数据生效的游戏版本 | `5.0` |
| `source` | 数据来源枚举 | `official` |

### 枚举值（全局统一）

| 枚举 | 取值 |
|---|---|
| 元素 `element` | `pyro` `hydro` `anemo` `electro` `dendro` `cryo` `geo` `physical` |
| 武器类型 `weapon_type` | `sword` `claymore` `polearm` `catalyst` `bow` |
| 圣遗物部位 `slot` | `flower` `plume` `sands` `goblet` `circlet` |
| 来源 `source` | `official` `datamine` `community` `wiki` |
| 布尔 `is_*` | `true` `false` |

> 枚举一律**小写英文**。新增枚举值必须同步更新本表与对应目录的 `README.md`。

---

## 2. 表索引

### 2.1 characters/

| 表 | 主键 | 字段数量 | 详细定义 |
|---|---|---|---|
| `characters.csv` | `char_id` | 16 | [characters/README.md](../characters/README.md) |
| `character_roles.csv` | `char_id` + `role` | 12 | [characters/README.md](../characters/README.md) |
| `community_roles.csv` | `char_id` | 12 | [characters/README.md](../characters/README.md) |

字段速览

```
characters.csv
  char_id, slug, name_zh, name_en, rarity, element, weapon_type, region,
  base_hp_lv90, base_atk_lv90, base_def_lv90, ascension_stat,
  ascension_stat_value, burst_cost, version, source

character_roles.csv
  char_id, slug, role, is_primary, scaling_stat, damage_type,
  damage_source, field_state, confidence, notes, version, source

community_roles.csv
  char_id, slug, name_gg, slug_gg, role_tier_list, role_builds,
  role_character_page, agree, url, fetched_at, version, source
```

### 2.2 weapons/

| 表 | 主键 | 字段数量 | 详细定义 |
|---|---|---|---|
| `weapons.csv` | `weapon_id` | 15 | [weapons/README.md](../weapons/README.md) |

```
weapons.csv
  weapon_id, slug, name_zh, name_en, rarity, weapon_type, max_level,
  base_atk_lv90, sub_stat, sub_stat_value_lv90, passive_name_zh,
  passive_summary, obtain_method, version, source
```

> `max_level` 是本仓库对原表头的**追加**：1★/2★ 共 10 把武器上限为 70，
> 因此 `base_atk_lv90` / `sub_stat_value_lv90` 的语义是「满级值」，等级上限见 `max_level`。

### 2.3 artifacts/

| 表 | 主键 | 字段数量 | 详细定义 |
|---|---|---|---|
| `artifact_sets.csv` | `set_id` | 11 | [artifacts/README.md](../artifacts/README.md) |
| `artifact_set_bonuses.csv` | `set_id` + `pieces` + `effect_index` | 15 | 同上 |
| `artifact_main_stats.csv` | `slot` + `main_stat` | 6 | 同上 |

```
artifact_sets.csv
  set_id, slug, name_zh, name_en, rarity_max, bonus_2pc_type,
  bonus_2pc_value, bonus_4pc_summary, obtain_domain, version, source

artifact_set_bonuses.csv
  set_id, slug, pieces, effect_index, effect_name, effect_type,
  effect_target, value, value_unit, condition, duration_sec,
  max_stacks, notes, version, source

artifact_main_stats.csv
  slot, main_stat, value_base, value_lv20_5star, version, source
```

### 2.4 elements/

| 表 | 主键 | 详细定义 |
|---|---|---|
| `reactions.csv` | `reaction_id` | [elements/README.md](../elements/README.md) |
| `aura_consumption.csv` | `reaction_id` | 同上 |
| `particle_energy.csv` | `pickup_type` + `element_relation` + `field_state` | 同上 |

```
reactions.csv
  reaction_id, reaction_zh, reaction_en, category, trigger_element,
  aura_element, damage_element, base_multiplier, em_scaling, can_crit,
  uses_def_zone, notes, version, source

aura_consumption.csv
  reaction_id, aura_consumed_unit, aura_consumed_ratio, notes, version, source

particle_energy.csv
  pickup_type, element_relation, field_state, energy_value, notes, version, source
```

### 2.5 enemies/

| 表 | 主键 | 详细定义 |
|---|---|---|
| `enemies.csv` | `enemy_id` | [enemies/README.md](../enemies/README.md) |
| `enemy_resistance.csv` | `enemy_id` + `element` | 同上 |

```
enemies.csv
  enemy_id, slug, name_zh, name_en, category, level, hp, atk, def,
  notes, version, source

enemy_resistance.csv
  enemy_id, slug, element, res_pct, notes, version, source
```

### 2.6 teams/

| 表 | 主键 | 详细定义 |
|---|---|---|
| `team_archetypes.csv` | `archetype_id` | [teams/README.md](../teams/README.md) |
| `elemental_resonance.csv` | `resonance_id` | 同上 |

```
team_archetypes.csv
  archetype_id, slug, name_zh, name_en, core_elements, core_char_slugs,
  key_reaction, required_roles, description, version, source

elemental_resonance.csv
  resonance_id, element_pair, name_zh, name_en, effect_type,
  effect_summary, value, value_unit, condition, version, source
```

---

## 3. 长表 vs 宽表

| 形式 | 何时使用 | 示例 |
|---|---|---|
| **宽表**（一实体一行） | 属性固定、一对一的字段 | `characters.csv` |
| **长表**（一效果/一定位一行） | 一对多、需要按条件过滤 | `artifact_set_bonuses.csv`、`character_roles.csv`、`enemy_resistance.csv` |

**推导字段的处理**：不是解包/官方直接给出的字段（如 `character_roles.role`）
必须满足两条——把**判定依据**写进 `notes`，并用 `confidence` 标注可信度。
参见 [characters/README.md](../characters/README.md) 的推导方法表。

**为什么用长表**：AI 可以按 `effect_type` / `pieces` / `element` 直接过滤，
不必解析单元格里的复合文本。**优先长表**，除非字段确实一对一。

---

## 4. 新增表流程

1. 确认现有表无法承载（优先扩展已有表，而非新建表）。
2. 在本文件 §2 登记：表名、主键、字段清单。
3. 在对应目录 `README.md` 中写字段字典：字段名、类型、单位、枚举、是否可空、说明。
4. 创建 CSV，**只写表头**，交给后续 PR 填数据。
5. 在 [data/README.md](../README.md) 的「待建表」中移除，加入正式清单。
6. 在 [CHANGELOG.md](../../CHANGELOG.md) 记录。

### 字段字典模板

```markdown
| 字段 | 类型 | 单位 | 枚举/取值 | 可空 | 说明 |
|---|---|---|---|---|---|
| `char_id` | string | — | — | 否 | 官方角色 ID，主键 |
| `crit_rate_pct` | float | % | — | 是 | 百分数数值，33.1 = 33.1% |
```

---

## 5. 数据校验

`scripts/validate_data.py` 会检查：

- UTF-8 无 BOM、LF 换行
- 表头存在且为 `snake_case`
- 每行列数与表头一致（允许行尾缺失空值）
- 主键唯一（按本文件 §2 登记的主键定义）
- `_pct` / 数值列内容合法（数字、空、`NA`、`?`）
- 多值字段（约定用 `;`）中不含逗号
- 无完全空行、无尾随空列
- 每张表含 `version` 与 `source` 列

---

## 相关

- 通用数据契约：[../../AGENTS.md](../../AGENTS.md)
- 数据层总览：[../README.md](../README.md)
- 维护流程：[../../CONTRIBUTING.md](../../CONTRIBUTING.md)
