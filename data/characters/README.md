# data/characters/ — 角色数据

角色基础属性与定位。

> **数据状态**
> - `characters.csv`：**已填充 124 行**（v7.1 全量），`source=datamine`
> - `character_roles.csv`：**已填充 172 行**，覆盖 120 / 124 个角色
> - `community_roles.csv`：**已填充 120 行**，社区定位来源快照（交叉核对用）
>
> 重新生成：
> ```bash
> node scripts/import_genshin_db.mjs --in <genshin-db 的 data.min.json> --targets characters,roles
> python scripts/fetch_community_roles.py   # 刷新社区定位来源快照（联网）
> ```

---

## 数据来源与口径（重要）

`characters.csv` 由脚本 [`scripts/import_genshin_db.mjs`](../../scripts/import_genshin_db.mjs)
从 **genshin-db v5**（其数据来自 GenshinData 解包仓库 + Fandom wiki）生成，因此：

| 项 | 口径 |
|---|---|
| `base_hp_lv90` / `base_atk_lv90` / `base_def_lv90` | 由解包的成长曲线在 90 级精确计算后**四舍五入取整**（游戏内显示值） |
| `ascension_stat_value` | **仅突破带来的加成**，不包括 5% 暴击率 / 50% 暴击伤害基础值 |
| `burst_cost` | 元素爆发所需元素能量；`NA` 表示该爆发不消耗元素能量或无该记录 |
| `version` | 该角色**实装**的游戏版本 |
| `slug` | 由英文名推导：小写、非字母数字转 `_`、去首尾下划线（如 `Hu Tao` → `hu_tao`） |
| `region` | 优先取解包的 `region` 字段；为空时由 `associationType` 回退映射；仍无法判定则留空（未知） |

**正确性验证**：导入脚本内置 16 个角色的回归自检（HP / ATK / DEF / 突破属性 / 突破数值 / 爆发能量
共 96 个数），全部与外部独立来源一致；不一致时脚本会中止写入。见
[`scripts/README.md`](../../scripts/README.md)。

### 已知缺口

| 缺口 | 说明 |
|---|---|
| **旅行者分元素变体** | 源数据中 `traveleranemo` / `travelerdendro` 等 7 种变体**只有天赋与命座记录，没有角色级属性**。因此 `aether`(10000005) / `lumine`(10000007) 的 `element` 留空、`burst_cost` 为 `NA`。分元素的基础属性与突破加成待补 |
| `manekin` / `manekina` | 特殊条目（`element` 为空、无天赋记录），同上处理 |
| 技能倍率、命座、固有天赋 | 见文末「待建表」 |

> 上述缺口的处理原则：**留空或标 `NA`，不推测填充**。

---

## characters.csv — 角色基础数据

一行一个角色（含旅行者按元素分别建行）。**已填充 124 行。**

| 字段 | 类型 | 单位 | 枚举/取值 | 可空 | 说明 |
|---|---|---|---|---|---|
| `char_id` | string | — | — | 否 | **主键**，官方角色 ID |
| `slug` | string | — | 小写下划线 | 否 | 检索键与文件名，由英文名推导，如 `hu_tao` |
| `name_zh` | string | — | — | 否 | 中文名 |
| `name_en` | string | — | — | 否 | 英文名 |
| `rarity` | int | — | `4` `5` | 否 | 稀有度 |
| `element` | string | — | `pyro` `hydro` `anemo` `electro` `dendro` `cryo` `geo`（空 = 未知/随玩家选择） | 是 | 元素类型 |
| `weapon_type` | string | — | `sword` `claymore` `polearm` `catalyst` `bow` | 否 | 武器类型 |
| `region` | string | — | `mondstadt` `liyue` `inazuma` `sumeru` `fontaine` `natlan` `snezhnaya` `nodkrai` `other` | 是 | 所属地区；空 = 未知 |
| `base_hp_lv90` | float | — | — | 是 | 90 级**角色自身**基础生命值（不含武器/圣遗物） |
| `base_atk_lv90` | float | — | — | 是 | 90 级**角色自身**基础攻击力 |
| `base_def_lv90` | float | — | — | 是 | 90 级**角色自身**基础防御力 |
| `ascension_stat` | string | — | `crit_rate_pct` `crit_dmg_pct` `atk_pct` `hp_pct` `def_pct` `em` `energy_recharge_pct` `elemental_dmg_pct` `physical_dmg_pct` `healing_bonus_pct` | 是 | 突破加成属性类型 |
| `ascension_stat_value` | float | % 或 — | — | 是 | **仅突破带来的**加成数值；`em` 为固定值，其余为百分数数值 |
| `burst_cost` | int 或 `NA` | — | — | 是 | 元素爆发元素能量消耗；`NA` = 不消耗能量或无记录 |
| `version` | string | — | — | 否 | 该角色实装的游戏版本，如 `5.0` |
| `source` | string | — | `official` `datamine` `community` `wiki` | 否 | 数据来源（当前全部为 `datamine`） |

**注意事项**

- `base_*_lv90` 是**角色自身**基础值，**不含武器**。武器的 `base_atk_lv90` 在 `weapons.csv`。
- 攻击力百分比词条作用于「角色基础攻击力 + 武器基础攻击力」，因此这两个数值缺一不可。
- `ascension_stat_value` **不含** 5% 暴击率与 50% 暴击伤害基础值。
  例：胡桃 `crit_dmg_pct` = `38.4`（角色面板 90 级无装备时为 50 + 38.4 = 88.4%）。
- `elemental_dmg_pct` 的具体元素由该行的 `element` 决定（如钟离 `geo` + `elemental_dmg_pct` = 岩元素伤害加成）。
- 旅行者按元素拆成多行 —— **但当前源数据不支持**，见上文「已知缺口」。

---

## character_roles.csv — 角色定位

**长表**：一个角色可以有多行（多定位）。用于配队时的职能筛选。

> **状态：已填充 172 行，覆盖 120 / 124 个角色**
> （未覆盖的 4 个是 `aether`/`lumine`/`manekin`/`manekina` —— 见「已知缺口」）
>
> 定位是**推导字段**，因此本表把「依据」和「可信度」一起写进数据，而不是只给结论。

### 推导方法（可复现）

由 [`scripts/import_genshin_db.mjs --targets roles`](../../scripts/README.md) 生成，两类来源互不冒充：

| 来源 | 得到哪些 role | `source` | `confidence` |
|---|---|---|---|
| **解包技能文本** | `healer` `shielder` `debuffer` `buffer` | `datamine` | `high` |
| **社区定位标签** | `main_dps` `sub_dps` | `community` | `medium` / `low` |
| 社区标为 Support 但技能文本未匹配到具体职能 | `support`（兜底） | `community` | `low` |

**机械类职能**由技能描述中的整句原文判定，该句直接写入 `notes`，每行可人工复核。
判定条件是「动词 + 对象」的组合，而不是关键词命中：

| role | 判定条件 | 反例（刻意排除） |
|---|---|---|
| `healer` | 治疗动词（heal/healing/regenerate/restore）**且**受益对象是队友或范围内角色 | 胡桃只恢复自己 → 不算；雷电将军「恢复**元素能量**」→ 不算 |
| `shielder` | 生成护盾或给出 `DMG Absorption` | — |
| `debuffer` | 降低敌人 RES/DEF **且**句中出现 opponents/enemies | 荒泷一斗「降低**自己**的抗性」→ 不算；北斗「降低受到的伤害」→ 不算 |
| `buffer` | 给予队伍属性/伤害增益（有明确受益对象） | 「For each X party member，本人 ATK 提升」这类以队友为触发条件的**自我增益** → 不算 |

**输出轴**取自 [community_roles.csv](community_roles.csv)：`main_dps` / `sub_dps` 直接采用，
两个来源冲突时采用 tier-list 并在 `notes` 标注冲突。

**`is_primary` 每角色恰好一行**：有输出轴行则归它；否则按固定优先级
`shielder > debuffer > healer > buffer` 归给第一条职能行。
该顺序表示「哪项更能定义功能位」，**不是强度排序**。

| 字段 | 类型 | 单位 | 枚举/取值 | 可空 | 说明 |
|---|---|---|---|---|---|
| `char_id` | string | — | — | 否 | **主键之一**，关联 `characters.char_id` |
| `slug` | string | — | — | 否 | 与 `characters.slug` 一致 |
| `role` | string | — | 见下方枚举 | 否 | **主键之一**，职能 |
| `is_primary` | bool | — | `true` `false` | 否 | 是否为主要定位（每角色恰好一行 `true`） |
| `scaling_stat` | string | — | `atk` `hp` `def` `em`，多值用 `;` | 是 | 伤害倍率所依据的面板属性，由倍率标签读取 |
| `damage_type` | string | — | 元素枚举 + `physical` | 是 | 主要伤害元素；突破属性为物理伤害加成时记 `physical` |
| `damage_source` | string | — | `normal_attack` `elemental_skill` `elemental_burst` … | 是 | **留空**，见下方说明 |
| `field_state` | string | — | `on_field` `off_field` | 是 | 由输出轴推导：`main_dps` → `on_field`，`sub_dps` → `off_field` |
| `confidence` | string | — | `high` `medium` `low` | 是 | 见上方推导方法表 |
| `notes` | string | — | — | 是 | **判定依据原文**或来源冲突记录（**禁止含逗号**） |
| `version` | string | — | — | 否 | 该角色实装的游戏版本 |
| `source` | string | — | `datamine` `community` | 否 | 数据来源 |

> **`damage_source` 为什么留空**：曾尝试用「各天赋的倍率条目数量」推断，
> 但条目数不反映伤害占比（香菱普攻有 10 条倍率，实际伤害来自元素爆发的旋火轮）。
> 该字段需要人工或伤害构成数据，**宁可留空也不填错**。
>
> **`damage_type` 的局限**：物理流角色（优菈、雷泽、辛焱、菲米尼）中只有突破属性为
> 物理伤害加成者会被记为 `physical`，其余仍按元素记录。
>
> **`buffer` 的口径**：包含「为队伍提供的任何属性/伤害增益」，
> 因此不少主 C 也会有一行 `buffer`（其固有天赋顺带给队伍加成），这不代表他们是专业辅助。


### `role` 枚举

| 值 | 中文 | 说明 |
|---|---|---|
| `main_dps` | 主 C | 主要伤害输出，通常站场 |
| `sub_dps` | 副 C | 后台输出 |
| `driver` | 驾驶员 | 站场触发后台角色输出，自身伤害占比低 |
| `buffer` | 增伤 | 提升己方属性或伤害 |
| `debuffer` | 减益 | 降低敌人抗性/防御 |
| `healer` | 治疗 | 提供治疗 |
| `shielder` | 护盾 | 提供护盾 |
| `battery` | 充能 | 为队友提供元素能量 |
| `enabler` | 附着/底料 | 提供稳定的元素附着以支撑反应 |
| `crowd_control` | 控制 | 聚怪、冻结、眩晕等 |
| `support` | 功能位（兜底） | **仅在无法判定具体职能时使用**：社区标为 Support，但技能文本未匹配到治疗/护盾/减抗/增伤。有具体职能时应优先用具体职能 |

> 一个角色通常有 1~4 行。例如「主 C + 副 C」型角色会有两行，`is_primary` 标出主定位。

---

## community_roles.csv — 社区定位来源快照

**外部来源的原始标签**，是 `character_roles.csv` 中输出轴字段的依据与交叉核对记录。

> **状态：已填充 120 行**（`source=community`，游戏版本 7.1）

由 [`scripts/fetch_community_roles.py`](../../scripts/README.md) 抓取并解析，三个页面互相核对：

| 列 | 来源 |
|---|---|
| `role_tier_list` | <https://genshin.gg/tier-list/>（基于深境螺旋与幽境危战的出场率） |
| `role_builds` | <https://genshin.gg/builds/> |
| `role_character_page` | <https://genshin.gg/characters/>`<slug_gg>`/（仅榜上缺失的角色） |

**标签只有四种**，且已规范化：`Main DPS` → `main_dps`，`Sub DPS` → `sub_dps`，
`DPS` → `main_dps`，`Support` → `support`。

> ⚠️ 该来源**只回答输出轴**，不区分治疗/护盾/增伤/减益。
> 因此它只用于推导 `main_dps` / `sub_dps`，辅助类职能一律由解包技能文本独立推导。

| 字段 | 类型 | 单位 | 枚举/取值 | 可空 | 说明 |
|---|---|---|---|---|---|
| `char_id` | string | — | — | 否 | **主键**，关联 `characters.char_id` |
| `slug` | string | — | — | 否 | 本仓库 slug |
| `name_gg` | string | — | — | 是 | 该来源使用的名称 |
| `slug_gg` | string | — | — | 是 | 该来源使用的 slug（用于复原角色页 URL） |
| `role_tier_list` | string | — | `main_dps` `sub_dps` `support`，空 = 榜上无此角色 | 是 | 强度榜标签 |
| `role_builds` | string | — | 同上 | 是 | 配装总览标签 |
| `role_character_page` | string | — | 同上 | 是 | 角色页标签 |
| `agree` | string | — | `true` `false`，空 = 只有一个来源 | 是 | 多来源是否一致 |
| `url` | string | — | — | 是 | 主来源 URL |
| `fetched_at` | string | — | ISO 日期 | 是 | 抓取日期 |
| `version` | string | — | — | 否 | 该来源标注的游戏版本 |
| `source` | string | — | `community` | 否 | 数据来源 |

### 已知的来源冲突（5 个）

`agree=false` 的角色，两处标签不一致，采用 tier-list 的值并在 `character_roles.notes` 标注：

| 角色 | tier-list | builds |
|---|---|---|
| `columbina` | `sub_dps` | `support` |
| `ifa` | `sub_dps` | `main_dps` |
| `ororon` | `support` | `sub_dps` |
| `sethos` | `sub_dps` | `main_dps` |
| `xinyan` | `support` | `main_dps` |

> 这 5 行在 `character_roles.csv` 中标记 `confidence=low`，是复核的优先目标。


### 使用示例（伪查询）

```
配队需要「护盾」→ WHERE role = 'shielder'
配队需要「能量主 C 的生命值流派」→ WHERE role='main_dps' AND scaling_stat='hp'
剧变反应队找触发者 → WHERE damage_source='transformative'
```

---

## 待建表

| 表 | 用途 | 源数据可得性 |
|---|---|---|
| `character_talents.csv` | 天赋倍率、升级材料、天赋书系列 | ✅ genshin-db 有 `stats.talents` 全量参数 |
| `character_constellations.csv` | 命之座效果 | ✅ genshin-db 有 `constellations` |
| `character_passives.csv` | 固有天赋与解锁突破阶段 | ✅ genshin-db 有 `talents.passive1~3` |
| `character_abilities.csv` | 技能附着标签（U 值）与 ICD 组 | ❌ 需其他来源（解包属性表） |

---

## 相关

- 数据契约：[`../../data/schema/README.md`](../schema/README.md)
- 角色定位在配队中的用法：[`../../rules/team-building.md`](../../rules/team-building.md)
- 词条优先级判定：[`../../rules/stat-priority.md`](../../rules/stat-priority.md)
- 属性与成长机制：[`../../docs/mechanics/stats-and-scaling.md`](../../docs/mechanics/stats-and-scaling.md)
