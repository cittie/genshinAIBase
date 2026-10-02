# guides/character-builds/ — 角色配装方案

一个角色一份文件，文件名 = 角色的 `slug`（与 `data/characters/characters.csv` 的 `slug` 完全一致）。

---

## 命名规则

```
guides/character-builds/<slug>.md
```

示例：`hu_tao.md`、`raiden_shogun.md`、`furina.md`

> ⚠️ **禁止用中文名做文件名**。中文名会变（别名、翻译调整），slug 才稳定。

---

## 文件结构（强制）

每份文件必须包含：

1. **YAML 元信息头** —— 见 [_TEMPLATE.md](_TEMPLATE.md)
2. **角色概述** —— 定位、伤害来源、核心机制（一到两段）
3. **有效词条** —— 引用 [`rules/stat-priority.md`](../../rules/stat-priority.md) 的判定结果
4. **圣遗物** —— 套装方案（首选/过渡）+ 主词条 + 副词条优先级
5. **武器** —— 分四层（专武/五星替代/四星最优/三星过渡）
6. **队伍** —— 常见队伍原型与队友
7. **天赋与命座优先级** —— 先升什么、命座价值
8. **常见误区** —— 该角色特有的坑
9. **数据缺口** —— 本仓库未收录且影响结论的数值

---

## 索引维护

新增角色配装后，需要在 [index/INDEX.md](../../index/INDEX.md) 的角色索引中登记（或依赖自动生成脚本）。

---

## 相关

- 模板：[_TEMPLATE.md](_TEMPLATE.md)
- 角色数据：[`../../data/characters/`](../../data/characters/README.md)
- 词条优先级：[`../../rules/stat-priority.md`](../../rules/stat-priority.md)
- 圣遗物选择：[`../../rules/artifact-selection.md`](../../rules/artifact-selection.md)
- 武器选择：[`../../rules/weapon-selection.md`](../../rules/weapon-selection.md)
