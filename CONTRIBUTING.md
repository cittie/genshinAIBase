# 贡献指南

本仓库是**面向 AI 的知识库**，因此对格式一致性的要求高于普通文档仓库。
一次改动只要破坏了下游 AI 的解析假设，就等同于 bug。

---

## 一、动手前

1. 读 [AGENTS.md](AGENTS.md) 的「3. 数据契约」，这是硬约束。
2. 确认你要改的表，读该表所在目录的 `README.md`（字段字典）。
3. 决定内容归属：
   - **客观机制** → `docs/`
   - **决策方法** → `rules/`
   - **可机读数值** → `data/`
   - **主观推荐** → `guides/`（必须标注评分口径与适用版本）

---

## 二、红线（PR 会被直接打回）

| 红线 | 说明 |
|---|---|
| 编造数值 | 不确定就留空或填 `?`，并在 PR 里说明待核实 |
| 填写估计值 | 禁止「约 2000」「大概 30%」这类写法 |
| 改动既有 ID / slug | `char_id`、`weapon_id`、`set_id`、`slug` 一旦入库即冻结 |
| 破坏 CSV 列序 | 只能**追加到表尾**，不能插列、改名、调序 |
| 在数值单元格带单位 | 写 `33.1`，不写 `33.1%` |
| 提交游戏资源 | 图片/音频/模型/解包原始包一律不入库（见 `.gitignore`） |
| 用中文名做关联 | 跨表关联只用 ID 与 slug |
| 只改单语 README | [README.md](README.md) 与 [README.en.md](README.en.md) 必须同步修改，命令与链接需保持一致 |

---

## 三、常见改动类型

### 新增角色

按顺序补齐：

1. `data/characters/characters.csv` — 基础信息 + 突破属性
2. `data/characters/character_roles.csv` — 一个角色可有多行（多定位）
3. `guides/character-builds/<slug>.md` — 复制 `_TEMPLATE.md` 填写（可后续 PR 补）
4. `index/INDEX.md` — 如引入了新的角色分类，补导航
5. `CHANGELOG.md` — 在「未发布」下记录

### 新增武器 / 圣遗物套装

1. 对应 `data/weapons/weapons.csv` 或 `data/artifacts/artifact_sets.csv` 增行
2. 套装效果写入 `data/artifacts/artifact_set_bonuses.csv`（**长表**：一个效果一行）
3. 目录 `README.md` 如新增了枚举值，同步补枚举说明

### 修正公式 / 机制

1. 改 `docs/mechanics/*.md`
2. 若涉及 `data/` 中的系数，同步改 CSV
3. `CHANGELOG.md` 记在「修正」下，写清**旧结论错在哪**

---

## 四、提交前自检

```bash
python scripts/validate_data.py
```

校验内容：UTF-8 无 BOM、LF 换行、表头存在、每行列数一致、主键唯一、
`_pct` 字段为数值、多值字段未使用逗号、无空行与尾随空列、
**Markdown 相对链接有效**、**双语 README 的命令与链接同构**。

CI 会在 PR 上自动跑同一脚本，必须为绿。

---

## 五、提交信息格式

```
<类型>: <范围> <描述>
```

类型：`data` / `docs` / `rules` / `guides` / `schema` / `chore` / `fix`

示例：

```
data: 补充 5.0 角色玛薇卡基础数据
docs: 修正超载反应基础伤害等级系数
rules: 新增幻想真境剧诗配队约束
schema: characters.csv 追加 ascension_stat_value 列
```

---

## 六、审核标准

- 数值可溯源（PR 里给出出处：官方公告 / 解包 / 实测 / wiki 链接）
- 不破坏 `scripts/validate_data.py`
- 时效性明确：`version` 列填了数据生效的游戏版本
- 主观推荐有评分口径，不与 `docs/` 中的客观机制冲突

---

## 七、许可

本项目采用 [MIT 许可证](LICENSE)（Copyright © 2026 Yee）。

贡献内容默认以同一许可证发布（inbound = outbound）：提交 PR 即表示同意你的贡献
以 MIT 许可证授权给本项目及其他使用者。
