# 原神 AI 知识库（genshinAIBase）

**简体中文** ｜ [English](README.en.md)

> 🤖 **如果你是 AI / 自动化脚本，请先读 [AGENTS.md](AGENTS.md)** —— 数据契约、检索顺序、输出要求都在那里。
> 本文件面向人类读者，重点讲**怎么从零把运行环境跑起来**。

面向 **AI 消费**的原神（Genshin Impact）基础知识库：Markdown 存机制与判定规则，CSV 存数值与枚举。

---

## 这个仓库解决什么问题

| 问题类型 | 例子 | 对应内容 |
|---|---|---|
| 配队规划 | 主 C 缺什么职能位？元素共鸣怎么配？ | [rules/team-building.md](rules/team-building.md) |
| 圣遗物选择 | 2 件套还是 4 件套？主词条怎么选？ | [rules/artifact-selection.md](rules/artifact-selection.md) |
| 武器选择 | 专武之外的平替是什么？ | [rules/weapon-selection.md](rules/weapon-selection.md) |
| 机制问答 | 防御区怎么算？增幅反应加成多少？ | [docs/README.md](docs/README.md) |
| 词条判断 | 双爆怎么配比？什么词条对这个角色无效？ | [rules/stat-priority.md](rules/stat-priority.md) |
| 术语黑话 | 「双爆」「白值」「毕业」是什么意思？ | [docs/glossary.md](docs/glossary.md) |

---

## 一、环境要求

| 依赖 | 版本 | 用途 | 是否必需 |
|---|---|---|---|
| **Python** | 3.8+ | 运行 CSV / 链接校验脚本 | ✅ 必需 |
| **git** | 近版本均可 | 克隆仓库、提交改动 | ✅ 必需 |
| **Node.js** | 18+ | 重建数据（从源数据生成 CSV） | ⬜ 可选 |
| **curl + tar** | 系统自带即可 | 下载并解包源数据 | ⬜ 可选 |

> **不需要 `pip install`，也不需要 `npm install`。**
> 校验脚本只用 Python 标准库，导入脚本只用 Node 内置模块。
> 仓库不包含任何第三方运行时代码，克隆即可用。

检查本机版本：

```bash
python --version
node --version
git --version
```

---

## 二、快速开始

### 第 1 步：获取仓库

```bash
git clone <repo-url>
cd genshinAIBase
```

### 第 2 步：自检（确认环境就绪）

```bash
python scripts/validate_data.py
```

看到 `[OK] 校验通过` 就说明环境完全可用。这一步会检查：

- 所有 CSV 的编码（UTF-8 无 BOM）、换行（LF）、列数一致性、主键唯一性
- 数值字段格式、多值字段分隔符
- 所有 Markdown 的**相对链接是否指向存在的文件**

只想看错误、不要统计信息：

```bash
python scripts/validate_data.py --quiet
```

> **建议每次改动后都跑一次**，CI（`.github/workflows/validate.yml`）也会在 push / PR 时自动运行同一脚本。

### 第 3 步（可选）：重建数据

仓库已经提交了生成好的 CSV，**日常读取不需要执行这一步**。
只有在需要升级数据版本（例如游戏更新后）时才执行。

下载并解开源数据（约 38MB 压缩包 → 190MB JSON）：

```bash
curl -L -o genshin-db.tgz https://registry.npmjs.org/genshin-db/-/genshin-db-5.2.14.tgz
tar -xzf genshin-db.tgz
```

先**干跑**，确认统计与回归自检通过，不写任何文件：

```bash
node scripts/import_genshin_db.mjs --in package/src/min/data.min.json --dry-run
```

确认无误后正式写入，并立即校验：

```bash
node scripts/import_genshin_db.mjs --in package/src/min/data.min.json
python scripts/validate_data.py
```

清理下载产物（已在 `.gitignore` 中，但建议删除以免占空间）：

```bash
rm genshin-db.tgz
```

**若报 `JavaScript heap out of memory`**（源文件 190MB，低内存机器可能触发），提高 Node 堆上限后重跑：

```bash
node --max-old-space-size=4096 scripts/import_genshin_db.mjs --in package/src/min/data.min.json
```

导入脚本内置**回归自检**：16 个角色 × 6 个字段共 96 个外部验证过的数值，
任一不一致就中止写入并返回退出码 2。若失败，先判断是脚本改坏了还是期望值记错了。

细节见 [scripts/README.md](scripts/README.md)。

---

## 三、Windows 常见问题

### `python` 运行后无任何输出

Windows 上 `python` 可能指向 Microsoft Store 的占位程序，执行后不产生输出也不报错。
改用 `py` 启动器：

```powershell
py scripts/validate_data.py
```

或用 `Get-Command python` 确认实际路径，改用真实解释器。

### 控制台中文与符号乱码

Windows 控制台默认编码可能是 GBK，导致中文输出乱码甚至 `UnicodeEncodeError`：

```powershell
$env:PYTHONIOENCODING="utf-8"
```

（校验脚本已内置输出编码兜底，但仍建议设置。）

---

## 四、作为 AI 知识库使用

**不要一次性把整个仓库塞进上下文。** 按下面这条路径按需检索：

```
AGENTS.md  →  index/INDEX.md  →  rules/*.md  →  data/**/*.csv  →  docs/mechanics/
```

即：先读契约 → 用导航定位 → 读判定规则 → 取数值 → 有疑问再查机制。

### 最小上下文包

| 任务 | 建议投喂的文件 |
|---|---|
| 配队规划 | [AGENTS.md](AGENTS.md)、[rules/team-building.md](rules/team-building.md)、[data/characters/characters.csv](data/characters/characters.csv) |
| 圣遗物选择 | [AGENTS.md](AGENTS.md)、[rules/artifact-selection.md](rules/artifact-selection.md)、[rules/stat-priority.md](rules/stat-priority.md) |
| 武器选择 | [AGENTS.md](AGENTS.md)、[rules/weapon-selection.md](rules/weapon-selection.md) |
| 全库导航 | [index/INDEX.md](index/INDEX.md) |

### 示例提示词

```
你是原神配队顾问。

1. 先读 AGENTS.md，掌握数据契约（单位、缺失值、关联键）与检索顺序。
2. 用 index/INDEX.md 定位相关文件，再读 rules/ 与 data/ 中的 CSV。
3. 回答时必须引用具体文件路径；本仓库未收录的数值要显式说明
   「本仓库未收录」，禁止推测填充。
4. 区分「机制事实」（docs/ + data/）与「强度评价」（rules/ + guides/）。
```

---

## 五、目录概览

```
AGENTS.md      AI 入口：数据契约、检索顺序、输出要求
README.md      本文件（简体中文）
README.en.md   英文版
index/         全库导航，按主题定位文件
docs/          客观机制：伤害公式、元素反应、属性、充能、圣遗物/武器/天赋系统
rules/         AI 判定规则：词条优先级、配队、圣遗物、武器
data/          结构化数据（CSV）：角色、武器、圣遗物、元素、敌人、队伍
guides/        攻略型内容：角色配装、队伍方案（主观，标注口径与版本）
scripts/       校验脚本与数据导入脚本
```

详细说明见 [index/INDEX.md](index/INDEX.md)。

---

## 六、数据覆盖状态

| 数据 | 状态 |
|---|---|
| 角色基础数据（124 名，v7.1 全量） | ✅ **已填充**，`source=datamine` |
| 角色定位（职能/输出类型） | ⏳ 待填充（推导字段，需依据） |
| 武器 / 圣遗物 / 元素反应 / 敌人 / 队伍 | ⏳ 仅表头（字段契约已冻结） |

字段定义见 [data/schema/README.md](data/schema/README.md) 与 [data/README.md](data/README.md)。

---

## 七、数据约定（速览）

`data/characters/characters.csv`：

```csv
char_id,slug,name_zh,name_en,rarity,element,weapon_type,region,base_hp_lv90,...
10000046,hu_tao,胡桃,Hu Tao,5,pyro,polearm,liyue,15552,...
```

要点（完整版见 [AGENTS.md](AGENTS.md)）：

- **百分比用百分数数值**，字段以 `_pct` 结尾：`19.2` 代表 19.2%
- **数值单元格只放数字**：不写 `33.1%`、`1,234`、`约33%`
- **空单元格 = 未知**（不是 0）｜`NA` = 确实不具备｜`?` = 有争议
- **多值用 `;` 分隔**，禁止用逗号
- **跨表关联只用 ID 与 `slug`**，禁止用中文名
- 每行带 `version`（游戏版本）与 `source`（数据来源）

---

## 八、贡献

见 [CONTRIBUTING.md](CONTRIBUTING.md)。核心红线：

1. 数值必须可溯源，**不填估计值**；不确定就留空加 `?`
2. 不改动既有 `char_id` / `slug`
3. CSV 只能**追加列**，不能插列改名
4. 提交前跑 `python scripts/validate_data.py`
5. 修改 [README.md](README.md) 时必须同步 [README.en.md](README.en.md)（两者的命令与链接需保持一致，校验脚本会检查）

变更记录见 [CHANGELOG.md](CHANGELOG.md)。

---

## 九、免责声明

非官方项目，与米哈游 / HoYoverse 无关联。
游戏名称、角色名称及相关内容的版权归权利人所有。
本仓库仅收录自行整理的数据与结论，**不含任何游戏资源文件**，仅用于学习与研究。

本项目代码与自撰内容采用 [MIT 许可证](LICENSE)（Copyright © 2026 Yee）。

数据处理来源与合规说明见 [data/README.md](data/README.md)。
