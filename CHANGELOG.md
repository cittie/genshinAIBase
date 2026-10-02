# 变更日志

本仓库有两条版本线：

- **仓库版本**（`vX.Y`）：目录结构、数据契约、规则文本的变更。
- **游戏版本**（如 `5.0`）：数据覆盖到的游戏版本。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。
变更类型：`新增` / `变更` / `修正` / `移除` / `待办`。

---

## [未发布]

### 新增
- **`data/characters/character_roles.csv` 已填充 172 行，覆盖 120 / 124 个角色**，是**推导字段**，
  每行都带判定依据（`notes`）与可信度（`confidence`）：
  - 机械类职能（`healer` / `shielder` / `debuffer` / `buffer`）由解包技能文本推导，
    判定条件是「动词 + 受益对象」组合而非关键词命中，依据整句原文写入 `notes`（`source=datamine`，`confidence=high`）。
  - 输出轴（`main_dps` / `sub_dps`）取自社区定位来源，两个页面交叉核对（`source=community`）。
  - 社区标为 Support 但技能文本未匹配到具体职能时，用新增的 `support` 兜底 role。
- **`data/characters/community_roles.csv`**：社区定位来源快照（120 行），
  记录 genshin.gg 三个页面的原始标签与一致性列 `agree`，用于交叉核对与离线复现。
- `scripts/fetch_community_roles.py`：抓取并解析上述来源快照，零第三方依赖（仅标准库）。
- `role` 枚举新增 `support`（兜底功能位），`character_roles.csv` 新增 `confidence` 列。
- **双语 README**：`README.md`（简体中文）+ `README.en.md`（English），
  面向人类读者，覆盖环境要求、从零搭建步骤、自检命令、Windows 常见问题、
  作为 AI 知识库的检索路径与最小上下文包。
- **双语一致性检查**（`scripts/validate_data.py`）：双语对的命令行集合与链接目标集合必须一致，
  不一致即报错。命令与路径与语言无关，作为漂移检测信号；正文措辞不参与比对。
- 文档语言与双语约定写入 [AGENTS.md §7](AGENTS.md)：新增架构性文件时必须同步创建中英文 README 指引。
- `scripts/import_genshin_db.mjs`：从 genshin-db 的 `data.min.json` 复现式导入角色数据，
  内置 16 个角色 × 6 个字段的回归自检，不一致时中止写入。
- **`data/characters/characters.csv` 已填充 124 行角色基础数据**（覆盖 v7.1 全量），
  `source=datamine`，含 90 级基础生命/攻击/防御、突破加成属性与数值、爆发能量消耗、实装版本。
  数据来自 genshin-db v5.2.14（GenshinData 解包 + Fandom wiki）。

### 修正
- 职能推导过程中发现并修复 6 类误判（均已写入脚本注释，避免回归）：
  1. 雷电将军的「为队伍恢复**元素能量**」被误判为治疗 → 治疗规则要求非 Energy/Stamina。
  2. 荒泷一斗的「降低**自己**的抗性」被误判为减益 → 减益规则要求句中出现 opponents/enemies。
  3. 北斗的「降低受到的伤害（resistance to interruption）」被误判为减益 → 同上。
  4. 希诺宁、娜维娅、林尼、卡齐娜、玛薇卡、瓦蕾莎、兹白等的**自我增益**被误判为增伤
     → 增伤规则拦截四类措辞（被动态、主动态、倒装、受益者本人）与 `For each X party member` 条件句。
  5. 多莉「连结的角色」、行秋「当前角色」、希诺宁「active characters」（复数）漏判为治疗
     → 目标词补 `connected/current`，并放行复数形式。
  6. `is_primary` 在纯辅助角色上出现多行 `true` → 改为每角色恰好一行。

### 变更
- `.gitignore` 新增 `genshin-db*.tgz`、`data.min.json`、`/package/`、`.cache/`，
  避免按 README 步骤下载的源数据与抓取缓存被误提交。

### 待办
- [ ] 复核 `character_roles.csv` 中 `confidence=low` 的行（`agree=false` 的 5 个来源冲突角色）
- [ ] 补齐旅行者分元素变体（`traveleranemo` ~ `travelerpyro`）：源数据仅有天赋与命座记录
- [ ] `character_roles.damage_source` 需要伤害构成数据才能填，当前全表留空
- [ ] 填充 `data/weapons/weapons.csv`（255 把，源数据含 90 级基础攻击力、副属性、R1~R5 被动）
- [ ] 填充 `data/artifacts/artifact_sets.csv`（63 套，源数据含 `effect2Pc` / `effect4Pc` 文本）
- [ ] 补齐 `docs/mechanics/reactions.md` 的剧变反应等级系数表
- [ ] 建立 `guides/character-builds/` 的角色配装条目

---

## [v0.1] — 2026-10-02

仓库骨架建立，尚无数值数据。

### 新增
- `AGENTS.md`：AI 入口，含数据契约（ID/单位/缺失值/多值/CSV 规范/来源时效）、目录职责边界、三类任务标准流程、维护约定。
- `README.md`、`CONTRIBUTING.md`、`.gitignore`、`.gitattributes`。
- `index/INDEX.md`：全库主题导航。
- `docs/mechanics/`：伤害公式、元素反应、属性与成长、充能与循环、元素附着与 ICD。
- `docs/systems/`：圣遗物、武器、天赋与命座。
- `docs/glossary.md`：术语与缩写表。
- `rules/`：配队、圣遗物选择、武器选择三份判定规则。
- `data/`：角色、武器、圣遗物、元素、敌人、队伍六类数据的 CSV 表头与字段字典。
- `guides/`：角色配装与队伍方案模板。
- `scripts/validate_data.py` + `.github/workflows/validate.yml`：CSV 格式与主键校验。
