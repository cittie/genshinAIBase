---
# ── 元信息头（必填，供 AI 解析）──
slug: example_slug              # 角色 slug，必须与 data/characters/characters.csv 一致
name_zh: 示例角色
name_en: Example Character
doc_type: character_build
game_version: "5.0"             # 本攻略适用的游戏版本
repo_version: "v0.1"
last_updated: 2026-10-02
baseline:                       # 评分口径（结论成立的前提）
  char_level: 90
  talent_levels: "9/9/9"        # 普攻/战技/爆发
  constellation: 0
  weapon_refinement: "R1"
  enemy: "90级 / 10%抗性"
tags: [main_dps, pyro, polearm]
data_completeness: skeleton     # skeleton | partial | complete
---

# 示例角色 — 配装方案

> 📋 **模板说明**：本文件是模板，复制后重命名为 `<slug>.md` 并替换全部内容。
> 所有 `示例` / `xxx` 处都需替换；不确定的数值**留空并标注「未收录」**，禁止填写估计值。

---

## 1. 角色概述

- **定位**：`main_dps`（依据 [`data/characters/character_roles.csv`](../../data/characters/character_roles.csv)）
- **伤害来源**：元素爆发为主（约 `xx%`），元素战技为辅
- **面板属性来源**：攻击力 / 生命值 / 防御力
- **核心机制**：一两句话说明该角色的独特机制（如「低血量时获得火元素伤害加成」）

**机制依据**：[`docs/mechanics/damage-formula.md`](../../docs/mechanics/damage-formula.md)

---

## 2. 有效词条

> 由 [`rules/stat-priority.md`](../../rules/stat-priority.md) 判定得出。

| 优先级 | 词条 | 理由 |
|---|---|---|
| 1 | 暴击伤害% / 暴击率% | 直接技能伤害为主，吃暴击（保持约 1:2） |
| 2 | 元素精通 | 作为增幅反应触发者 |
| 3 | 攻击力% | 面板属性来源 |
| 4 | 元素充能效率% | 仅需满足循环需求 |

**无效词条**：防御力%、治疗加成%
**属性转化天赋**：无 / 有（说明转化关系）

---

## 3. 圣遗物

### 3.1 套装方案

| 层级 | 方案 | 说明 |
|---|---|---|
| 首选 | 4 件套「xxx」 | 触发条件：xxx（角色可稳定满足） |
| 过渡 | 2 件套「xxx」+ 2 件套「xxx」 | 副词条质量优先 |
| 备选 | 4 件套「xxx」 | 若无法稳定触发首选条件时 |

**数据依据**：[`data/artifacts/artifact_sets.csv`](../../data/artifacts/artifact_sets.csv)

### 3.2 主词条

| 部位 | 主词条 | 说明 |
|---|---|---|
| 生之花 | 生命值（固定） | — |
| 死之羽 | 攻击力（固定） | — |
| 时之沙 | xxx | — |
| 空之杯 | xxx | — |
| 理之冠 | xxx | — |

### 3.3 副词条优先级

```
暴击伤害% / 暴击率%（保持约 1:2）> 元素精通 > 攻击力% > 元素充能效率%
```

### 3.4 毕业标准

| 层级 | 标准 |
|---|---|
| 入门 | 主词条正确 + 套装结构达成 |
| 及格 | 每件 ≥ 2~3 个有效词条 |
| 良好 | 每件 ≥ 4 个有效词条，双爆配平 |
| 毕业 | 每件 ≈ 5 个有效词条 |

---

## 4. 武器

> 依据 [`rules/weapon-selection.md`](../../rules/weapon-selection.md)，必须分四层。

| 层级 | 武器 | 精炼 | 适配理由 | 代价 |
|---|---|---|---|---|
| 专武 | xxx | R1 | 副属性为暴击伤害 | 需抽限定池 |
| 五星替代 | xxx | R1 | 副属性为攻击力% | 双爆更难配平 |
| 四星最优 | xxx | R5 | 副属性为暴击率，被动可稳定触发 | 基础攻击力偏低 |
| 三星过渡 | xxx | R5 | 提供充能，前期够用 | 上限低 |

**换武器后的双爆调整**：说明暴击率/暴击伤害目标如何变化。

**数据依据**：[`data/weapons/weapons.csv`](../../data/weapons/weapons.csv)

---

## 5. 队伍

| 队伍 | 构成 | 关键反应 | 说明 |
|---|---|---|---|
| xxx | 主C + 队友1 + 队友2 + 队友3 | 蒸发 | — |

**队伍原型依据**：[`data/teams/team_archetypes.csv`](../../data/teams/team_archetypes.csv)
**配队规则**：[`rules/team-building.md`](../../rules/team-building.md)

---

## 6. 天赋与命座优先级

### 天赋升级顺序

```
元素爆发 > 元素战技 > 普通攻击
```

依据：[`docs/systems/talents.md`](../../docs/systems/talents.md)

### 命座价值

| 命座 | 价值 | 说明 |
|---|---|---|
| C1 | 中 | … |
| C2 | 高 | … |

---

## 7. 常见误区

| 误区 | 纠正 |
|---|---|
| xxx | xxx |

---

## 8. 数据缺口

> 本仓库尚未收录、且影响本攻略结论的数值。**不得用估计值填充。**

- [ ] 该角色的 90 级基础属性（`data/characters/characters.csv`）
- [ ] 天赋倍率表
- [ ] 套装效果数值（`data/artifacts/artifact_set_bonuses.csv`）
- [ ] 武器基础攻击力与副属性数值

---

## 相关

- [规则：词条优先级](../../rules/stat-priority.md)
- [规则：圣遗物选择](../../rules/artifact-selection.md)
- [规则：武器选择](../../rules/weapon-selection.md)
- [数据：角色](../../data/characters/README.md)
