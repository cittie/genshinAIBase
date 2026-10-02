# AGENTS.md — 原神 AI 知识库 · 使用与维护规范

> 本文件是本仓库的**唯一入口**，面向所有读取本仓库的 AI 代理与自动化脚本。
> 人类读者请先看 [README.md](README.md)（简体中文）或 [README.en.md](README.en.md)（English）；
> 两者的**环境搭建指引**覆盖了从零运行本仓库所需的全部步骤。贡献流程见 [CONTRIBUTING.md](CONTRIBUTING.md)。
>
> 版本：`v0.1`（骨架）｜最后更新：2026-10-02｜数据版本覆盖：**v7.1**
>
> **数据来源与口径**
> - 角色 / 武器 / 圣遗物 / 天赋 / 命座：`source=datamine`（genshin-db v5.2.14，游戏 v7.1）
> - 元素反应 / 等级系数 / 附着消耗 / 能量：`source=community`
>   （KQM Theorycrafting Library @ `106c0f3`，2026-10-01，`7.1 data`）
>
> ⚠️ **反应倍率易错**：5.2 版本加强了剧变反应，网上大量旧攻略的倍率已过期
> （超载 2.0→**2.75**、超导 0.5→**1.5**）。引用时务必连同 `version` 一起引用。

---

## 0. 定位

本仓库是**原神（Genshin Impact）的 AI 优先结构化知识库**，用 Markdown 承载机制与判定逻辑、用 CSV 承载数值与枚举，
目标是让 AI 能够**低歧义地检索、解析、推理**以下三类问题：

| 任务 | 典型问题 | 必读规则 | 核心数据 |
|---|---|---|---|
| **配队规划** | 「给胡桃配蒸发行秋队，第四人放谁？」 | [rules/team-building.md](rules/team-building.md) | `data/characters/`、`data/teams/` |
| **圣遗物选择** | 「绝缘 4 件套和余响 4 件套，雷电将军选哪个？」 | [rules/artifact-selection.md](rules/artifact-selection.md) | `data/artifacts/` |
| **武器选择** | 「四星里哪把大剑最适合迪卢克？」 | [rules/weapon-selection.md](rules/weapon-selection.md) | `data/weapons/` |

**设计原则**：AI 优先 > 人类可读 > 排版美观。宁要字段明确、宁可留空标注「未知」，也不要含糊表述或编造数值。

---

## 1. AI 读取顺序（固定流程）

1. **本文件** —— 掌握数据契约与目录约定
2. **[index/INDEX.md](index/INDEX.md)** —— 全库导航（主题 → 文件路径），用于定位
3. **`rules/*.md`** —— 与当前任务对应的判定逻辑与评分口径
4. **`data/**/*.csv`** —— 取具体数值，字段含义查同目录 `README.md`
5. **`docs/mechanics/`** —— 公式与机制有疑问时查阅
6. **`guides/`** —— 需要成体系的角色/队伍攻略时查阅（主观内容，注意与机制事实区分）

> 检索建议：先用 `index/INDEX.md` 缩小范围，再 grep 具体 `slug`（如 `hu_tao`）。
> 所有实体都有稳定英文 `slug`，跨文件关联一律靠 `char_id` / `weapon_id` / `set_id`，**不要靠中文名关联**（存在别名）。

---

## 2. 目录结构

```
genshinAIBase/
├─ AGENTS.md                 # 本文件：AI 入口与数据契约
├─ README.md                 # 人类入口（简体中文）：环境搭建指引
├─ README.en.md              # 人类入口（English）：与 README.md 成对维护
├─ CONTRIBUTING.md           # 贡献与维护流程
├─ CHANGELOG.md              # 变更日志（按游戏版本 + 仓库版本）
├─ index/
│  └─ INDEX.md               # 全库导航：主题 → 文件路径
├─ docs/                     # 客观知识：机制、公式、系统规则
│  ├─ mechanics/             # 伤害公式、反应、属性、充能、附着/ICD
│  └─ systems/               # 圣遗物、武器、天赋命座、终局玩法
├─ rules/                    # 面向 AI 的判定规则（怎么做决策）
│  ├─ team-building.md       # 配队规则
│  ├─ artifact-selection.md  # 圣遗物选择规则
│  └─ weapon-selection.md    # 武器选择规则
├─ data/                     # 结构化数据（CSV 为主）
│  ├─ schema/                # 全局数据契约 + 全部表清单
│  ├─ characters/            # 角色基础信息与定位
│  ├─ weapons/               # 武器基础信息
│  ├─ artifacts/             # 圣遗物套装与词条
│  ├─ elements/              # 元素反应与附着
│  ├─ enemies/               # 敌人与抗性
│  └─ teams/                 # 队伍原型与示例
├─ guides/                   # 攻略型内容（主观，标注口径）
│  ├─ character-builds/      # 单角色配置方案
│  ├─ team-comps/            # 具体配队方案
│  └─ faq/                   # 常见问题
└─ scripts/                  # 校验与生成脚本
```

**目录职责边界**
- `docs/` = 客观机制事实（「防御区怎么算」）
- `rules/` = 决策方法（「什么情况下优先堆暴击」）
- `data/` = 可机读数值（「胡桃 90 级基础攻击力 = 106」）
- `guides/` = 主观推荐（「胡桃优先赤沙之杖」），必须标注评分口径与版本

---

## 3. 数据契约（硬性约定，破坏即为 bug）

### 3.1 标识符

| 字段 | 规则 | 示例 |
|---|---|---|
| `char_id` | 官方角色 ID，数字字符串，稳定不变 | `10000046` |
| `weapon_id` | 官方武器 ID，数字字符串 | `13501` |
| `set_id` | 圣遗物套装 ID，数字字符串 | `15001` |
| `slug` | 英文小写下划线，**文件名与检索键** | `hu_tao`、`staff_of_homa` |
| `name_zh` / `name_en` | 展示名，不作为关联键 | `胡桃` / `Hu Tao` |

- 所有表**主键唯一**；同一实体在不同表中 `slug` 必须完全一致。
- 新增实体不得改动既有 ID 与 slug。

### 3.2 单位与数值

- **百分比字段一律使用百分数数值**，字段名以 `_pct` 结尾：`33.1` 表示 33.1%。
- 数值单元格**只放数字**，禁止出现 `33.1%`、`约33%`、`1,234`、`1e3`、单位后缀。
- 时间字段以 `_sec` 结尾，单位秒。
- 未说明的数值默认取**满级（角色 90 级 / 武器 90 级）**，并在表头或列名中显式体现（如 `base_atk_lv90`）。
- 元素类型用英文小写枚举：`pyro` `hydro` `anemo` `electro` `dendro` `cryo` `geo` `physical`。

### 3.3 缺失值约定

| 写法 | 含义 |
|---|---|
| 空单元格 | 未知 / 待补（**不是 0**） |
| `NA` | 该实体确实不具备此属性（如无护盾能力） |
| `?` | 数据有争议或来源冲突，需复核 |

> AI 引用数据时：空值必须显式说明「此项数据缺失」，**严禁推测填充**。

### 3.4 多值字段

同一单元格内多值用**分号 `;`** 分隔（如 `vaporize;overload`）。禁止用逗号，避免与 CSV 分隔符冲突。

### 3.5 CSV 通用规范

- 编码 UTF-8（**无 BOM**），换行 LF，分隔符逗号，首行为表头。
- 表头为英文 `snake_case`；面向展示的名称列用 `name_zh` / `name_en`。
- 一行一条记录；禁止合并单元格、小计行、空行、注释行。
- 列顺序稳定；**新增列只能追加到表尾**，不得插在中间或改名。
- 含逗号/换行的字段必须用双引号包裹（优先改写文案以规避）。
- 每张表的字段定义写在该表所在目录的 `README.md`。

### 3.6 来源与时效

- 每张表带 `version` 列，记录该行数据生效的**游戏版本号**（如 `5.0`）。
- 每张表带 `source` 列，取值：`official`（官方公告/游戏内）｜`datamine`（解包）｜`community`（社区实测）｜`wiki`。
- 存在版本变动的数据（数值调整、机制改动）必须新增行或更新 `version`，并在 `CHANGELOG.md` 记录。

---

## 4. 三类任务的标准流程

### 4.1 配队规划

1. 明确需求：目标场景（深境螺旋 / 幻想真境剧诗 / 大世界 / 单体 Boss）、驾驶时长、预算（五星命座/专武）。
2. 查 `data/characters/character_roles.csv` 锁定主 C 与所需职能（`role` 字段）。
3. 按 [rules/team-building.md](rules/team-building.md) 补齐职能位：主 C + 副 C + 增伤/减抗 + 生存/充能。
4. 校验反应轴与元素共鸣（`data/elements/reactions.csv`、`data/teams/team_archetypes.csv`）。
5. 查 `guides/team-comps/` 是否有成熟方案可对齐，输出时给出**职能缺口**与**替代方案**。

### 4.2 圣遗物选择

1. 确定角色定位与伤害来源（普攻/重击/元素战技/元素爆发，前台/后台）。
2. 过滤可用套装：`data/artifacts/artifact_sets.csv` + `artifact_set_bonuses.csv`。
3. 核对主词条可行性：`artifact_main_stats.csv`（沙/杯/头可用主词条）。
4. 按 [rules/artifact-selection.md](rules/artifact-selection.md) 排序，明确 2 件套 vs 4 件套取舍。
5. **必须说明词条有效性与毕业难度**（是否吃暴击、是否需要特定副词条堆叠）。

### 4.3 武器选择

1. 按 `weapon_type` 过滤 `data/weapons/weapons.csv`。
2. 计算适配度：基础攻击力 × 副属性 × 被动触发条件（是否吃充能/精通/暴击）。
3. 区分**专武**与**平替**，给出四星最优解与三星过渡解。
4. 精炼等级不同的结论要分开表述（`R1` / `R5`）。

---

## 5. 输出给用户时的要求

- **可溯源**：引用具体文件路径（必要时带行号），不要给无出处的结论。
- **不编造**：数据缺失就写「该数值本仓库尚未收录」。
- **区分事实与评价**：机制结论来自 `docs/` + `data/`；强度排序来自 `rules/` + `guides/`，属主观口径。
- **标注时效**：涉及当期新角色/新深渊时，提示数据可能滞后于游戏版本。
- **给替代方案**：配队与武器建议至少给一个下位替代。

---

## 6. 维护约定（给 AI 协作者）

- **新增角色**需同步更新：`data/characters/characters.csv`、`character_roles.csv`、`guides/character-builds/<slug>.md`（可后补）、`index/INDEX.md`。
- **新增套装/武器**同理更新对应 CSV 与该目录 `README.md` 的字段说明。
- 修改 CSV 后必须运行：`python scripts/validate_data.py`（CI 也会跑）。
- **禁止提交**游戏资源二进制（图片/音频/模型/GameData 原始包），见 `.gitignore`。
- 提交信息格式：`data: 补充 5.0 角色玛薇卡`、`docs: 修正超载反应基础伤害`、`rules: 新增剧诗配队约束`。
- 不确定的数值：**留空并加 `?`**，在 PR 描述中说明待核实，不要填估计值。

---

## 7. 文档语言与双语约定

### 7.1 双语对

`README.md`（简体中文）与 `README.en.md`（English）是**必须成对维护的双语对**，
两者需保持**结构同构**，且满足：

| 必须一致 | 允许不同 |
|---|---|
| 代码块中的**命令行**（去掉注释后） | 正文措辞、标题译文 |
| Markdown **链接目标**（相对路径） | 表格列宽、举例表述 |
| 章节顺序与覆盖的主题 | 语言切换互链（天然指向对方） |

一致性由 `scripts/validate_data.py` 强制检查，不一致即报错：

```
--- 双语一致性 错误 ---
  [错误] README.md: 缺少 README.en.md 中的命令: node foo.mjs
```

> **原理**：命令与路径与语言无关，是最可靠的漂移信号。
> 正文措辞不同是正常的，因此不参与比对。语言切换互链在忽略名单中。

### 7.2 README 必须包含的内容

新增或改造架构时，README（中英各一份）必须覆盖：

1. **环境要求** —— 依赖、版本、用途、是否必需；明确说明是否需 `pip` / `npm` 安装
2. **从零搭建步骤** —— 按「获取 → 自检 → 可选的重建数据」顺序，每步给出可直接复制的命令
3. **自检命令** —— 让用户能自证环境就绪（本仓库为 `python scripts/validate_data.py`）
4. **常见问题** —— 至少覆盖 Windows 下的解释器与编码问题
5. **作为 AI 知识库使用的检索路径**与最小上下文包

### 7.3 其余文档的语言

`AGENTS.md`、`docs/`、`rules/`、`data/`、`guides/` 当前**以中文为主**。
如需英文版，应**成对新增**（如 `xxx.en.md`），并在本文件与 [index/INDEX.md](index/INDEX.md) 登记，
同时把该文件对加入 `scripts/validate_data.py` 的 `BILINGUAL_PAIRS`。
**禁止只翻译一半**：单语文件比没有翻译更容易造成两份内容互相矛盾。
