---
# ── 元信息头（必填，供 AI 解析）──
slug: example_archetype__example_carry
archetype: example_archetype      # 对应 data/teams/team_archetypes.csv 的 slug
main_dps_slug: example_slug
name_zh: 示例队伍
doc_type: team_comp
game_version: "5.0"
repo_version: "v0.1"
last_updated: 2026-10-02
baseline:
  char_level: 90
  talent_levels: "9/9/9"
  constellation: 0
  weapon_refinement: "R1"
  enemy: "90级 / 10%抗性"
tags: [vaporize, pyro, hydro]
data_completeness: skeleton
---

# 示例队伍 — 配队方案

> 📋 **模板说明**：复制后按 `命名规则` 重命名并替换全部内容。
> 不确定的数值**留空并标注「未收录」**，禁止填估计值。

---

## 1. 队伍构成

| 位置 | 角色 | slug | 职能 | 关键作用 |
|---|---|---|---|---|
| 主 C | 示例角色 | `example_slug` | `main_dps` | 站场输出，蒸发触发者 |
| 副 C | xxx | `xxx` | `sub_dps` | 后台输出 |
| 增伤 | xxx | `xxx` | `buffer` | 提供攻击力增益 |
| 生存 | xxx | `xxx` | `shielder` | 护盾，抗打断 |

**职能覆盖检查**（依据 [`rules/team-building.md`](../../rules/team-building.md)）：

- [x] 主输出
- [x] 后台输出
- [x] 增伤/减抗
- [x] 生存
- [ ] 充能（是否需要？见 §4）

---

## 2. 反应轴

```
1. xxx 挂底料元素（xxx）
2. 主 C 触发 xxx 反应（倍率 x.x）
3. 反应触发者 = 主 C → 精通堆在主 C 身上
```

| 判定项 | 结论 |
|---|---|
| 反应类型 | 增幅 / 剧变 / 催化 |
| 触发者 | xxx（**精通堆给触发者**） |
| 覆盖率 | 受附着量与 ICD 限制（详见 [`docs/mechanics/aura-icd.md`](../../docs/mechanics/aura-icd.md)） |
| 反向污染 | 是否存在抢反应风险 |
| 反应自伤 | 是否存在（如烈绽放） |

---

## 3. 循环轴

| 顺序 | 角色 | 动作 | 耗时(秒) | 说明 |
|---|---|---|---|---|
| 1 | xxx | 元素战技 | x.x | 挂底料 |
| 2 | xxx | 元素爆发 | x.x | 增伤窗口 |
| 3 | 主 C | 元素战技 + 普攻/重击 | x.x | 主要输出段 |
| … | | | | |

**循环总时长**：`xx` 秒
**依据**：[`docs/mechanics/energy-and-rotation.md`](../../docs/mechanics/energy-and-rotation.md)

---

## 4. ER（元素充能效率）检查

| 角色 | 爆发能量需求 | 循环内获得能量 | ER 需求 | 实际配置 |
|---|---|---|---|---|
| 主 C | 未收录 | 未收录 | 未收录 | xxx |
| 队友1 | 未收录 | 未收录 | 未收录 | xxx |

> ⚠️ 本仓库尚未收录产球与能量数值（`data/elements/particle_energy.csv` 为空），
> 因此**无法给出精确 ER 需求**。在补齐前只能给出方向性判断：
> 「同元素队友越多，ER 需求越低」「带产球型角色可降低全队 ER 需求」。

---

## 5. 元素共鸣

| 共鸣 | 是否触发 | 增益方向 |
|---|---|---|
| 双火 | 是/否 | 攻击力类增益（数值待核实） |
| 双水 | 是/否 | 生命值/生存类增益（数值待核实） |

**依据**：[`data/teams/elemental_resonance.csv`](../../data/teams/elemental_resonance.csv)

---

## 6. 优势与劣势

### 优势

- xxx

### 劣势 / 不适用场景

- xxx

### 适用场景

| 场景 | 评价 |
|---|---|
| 深境螺旋 | ✅ / ⚠️ / ❌ + 理由 |
| 幻想真境剧诗 | … |
| 单体 Boss | … |
| 群怪 | … |

---

## 7. 替代方案

| 原角色 | 替代 | 代价 |
|---|---|---|
| xxx | xxx | 失去护盾，改用治疗 |
| xxx | xxx | 增伤窗口缩短 |

> **必填**：每个位置至少一个下位替代。

---

## 8. 数据缺口

- [ ] 各角色爆发能量需求
- [ ] 各角色产球量
- [ ] 微粒/晶球能量结算表
- [ ] 元素共鸣数值

---

## 相关

- [规则：配队](../../rules/team-building.md)
- [规则：词条优先级](../../rules/stat-priority.md)
- [机制：元素反应](../../docs/mechanics/reactions.md)
- [机制：充能与循环](../../docs/mechanics/energy-and-rotation.md)
