# guides/team-comps/ — 队伍方案

一支具体队伍的完整方案（四人配置 + 循环轴 + 替代方案）。

---

## 命名规则

```
guides/team-comps/<archetype>__<主C slug>.md
```

示例：

- `vaporize__hu_tao.md`（蒸发队，主 C 胡桃）
- `hyperbloom__raiden_shogun.md`（超绽放队，触发者雷电将军）
- `mono_pyro__lyney.md`（纯火队，主 C 林尼）

> `archetype` 取自 [`data/teams/team_archetypes.csv`](../../data/teams/team_archetypes.csv) 的 `slug`。

---

## 文件结构（强制）

1. **YAML 元信息头** —— 见 [_TEMPLATE.md](_TEMPLATE.md)
2. **队伍构成表** —— 四人 + 职能 + 关键作用
3. **反应轴** —— 谁挂元素、谁触发反应、触发顺序
4. **循环轴（Rotation）** —— 技能顺序 + 各段耗时 + 循环总时长
5. **ER 检查** —— 各角色充能需求与手段
6. **元素共鸣** —— 触发了哪些、增益方向
7. **优势与劣势** —— 适用场景与不适用场景
8. **替代方案** —— 每个位置至少一个下位替代及代价
9. **数据缺口** —— 未收录且影响结论的数值

---

## 与 data/teams/ 的关系

| | `data/teams/team_archetypes.csv` | 本目录 |
|---|---|---|
| 抽象原型（如「蒸发主 C」） | ✅ | ❌ |
| 具体队伍（如「胡桃 + 行秋 + 钟离 + 夜兰」） | ❌ | ✅ |

`data/teams/` 给 AI 提供**推理起点**，本目录提供**现成方案**。

---

## 相关

- 模板：[_TEMPLATE.md](_TEMPLATE.md)
- 配队规则：[`../../rules/team-building.md`](../../rules/team-building.md)
- 队伍原型：[`../../data/teams/`](../../data/teams/README.md)
- 反应机制：[`../../docs/mechanics/reactions.md`](../../docs/mechanics/reactions.md)
- 循环与充能：[`../../docs/mechanics/energy-and-rotation.md`](../../docs/mechanics/energy-and-rotation.md)
