# docs/ — 客观机制知识

本目录存放**可验证的游戏机制事实**：公式、系数、系统规则、枚举定义。

**边界**：这里只回答「是什么 / 怎么算」，不回答「该选哪个」。
决策方法请放 `rules/`，主观推荐请放 `guides/`。

---

## 内容清单

### mechanics/ 战斗机制

| 文件 | 内容 | 上游依赖 |
|---|---|---|
| [damage-formula.md](mechanics/damage-formula.md) | 伤害总公式、各乘区定义、期望伤害算法 | 无 |
| [reactions.md](mechanics/reactions.md) | 元素反应分类、增幅/剧变公式、反应系数表 | damage-formula |
| [stats-and-scaling.md](mechanics/stats-and-scaling.md) | 面板属性构成、基础值、成长曲线、词条换算 | 无 |
| [energy-and-rotation.md](mechanics/energy-and-rotation.md) | 元素能量回复、微粒/晶球、循环与充能需求 | stats-and-scaling |
| [aura-icd.md](mechanics/aura-icd.md) | 元素附着量、衰减、反应消耗、ICD 规则 | reactions |

### systems/ 游戏系统

| 文件 | 内容 |
|---|---|
| [artifacts.md](systems/artifacts.md) | 圣遗物部位、主副词条规则、强化与套装机制 |
| [weapons.md](systems/weapons.md) | 武器类型、稀有度、基础攻击力档位、精炼机制 |
| [talents.md](systems/talents.md) | 天赋等级、固有天赋、命之座机制 |

### 其他

| 文件 | 内容 |
|---|---|
| [glossary.md](glossary.md) | 术语与缩写对照表（中英 + 社区黑话） |

---

## 写作规范

1. **公式必须给出完整形式**，标明每个符号含义与单位，不要只给结论。
2. **数值系数**：确定的值直接写；不确定的写 `?` 并在同段落注明「待核实」，
   同时在对应 `data/*.csv` 中建列占位。**严禁填估计值**。
3. **区分乘区**：涉及伤害时明确标注属于哪个乘区（同类相加 / 异类相乘）。
4. **版本敏感内容**标注游戏版本，如 `（5.0）`。
5. 引用外部结论时给出处（官方公告 / 解包 / 社区实测），便于后续复核。

---

## 相关

- 数据契约（单位、缺失值约定）：[../AGENTS.md](../AGENTS.md#3-数据契约硬性约定破坏即为-bug)
- 全库导航：[../index/INDEX.md](../index/INDEX.md)
