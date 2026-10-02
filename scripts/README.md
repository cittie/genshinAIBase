# scripts/ — 校验与生成脚本

本目录存放维护知识库的自动化脚本。**无第三方依赖**，仅用 Python 标准库。

---

## 环境要求

- Python 3.8+（推荐 3.10+）
- 无 pip 依赖

---

## validate_data.py

校验数据层与文档层的完整性。

```bash
# 运行全部检查
python scripts/validate_data.py

# 精简输出（只显示错误）
python scripts/validate_data.py --quiet

# 只检查 CSV，跳过 Markdown 与双语检查
python scripts/validate_data.py --no-links

# 只检查链接与双语一致性
python scripts/validate_data.py --only-links
```

### 检查项

**CSV 层**（`data/**/*.csv`）

| 检查 | 说明 |
|---|---|
| 编码 | UTF-8 且**无 BOM** |
| 换行 | 仅 LF，无 CR |
| 表头 | 存在，且为 `snake_case` |
| 必需列 | 必须含 `version` 与 `source` |
| 列数一致 | 每行列数 ≤ 表头列数（尾部空值可省略），超过则报错 |
| 主键唯一 | 按 `PRIMARY_KEYS` 定义检查复合主键 |
| 数值字段 | `_pct` / `_sec` / `_value` 等字段必须是数字、空、`NA`、`?` |
| 多值字段 | 字段内不得含逗号（含逗号说明用了错误的分隔方式） |
| 空行 | 无完全空行、无全空数据行 |

**Markdown 层**（`**/*.md`）

| 检查 | 说明 |
|---|---|
| 内链有效性 | 所有相对链接指向的文件必须存在 |
| 外部链接 | `http(s)://` 与纯锚点链接跳过 |
| 代码块内容 | 代码块内的示例链接不参与校验（视为文档示例） |

**双语一致性层**（`BILINGUAL_PAIRS`）

| 检查 | 说明 |
|---|---|
| 命令行集合 | 两侧 `bash` / `powershell` 等 shell 代码块中的命令必须一致（忽略注释） |
| 链接目标集合 | 两侧的相对链接目标必须一致 |
| 文件存在 | 双语对两侧文件都必须存在 |

> **为什么只比命令与链接**：这两者与语言无关，是最可靠的漂移信号。
> 正文措辞、标题译文不同是正常的，不参与比对。
> 语言切换互链（`README.md` ↔ `README.en.md`）在忽略名单 `PAIR_LINK_IGNORE` 中。

**修改双语对**：在脚本顶部的 `BILINGUAL_PAIRS` 中登记，例如

```python
BILINGUAL_PAIRS = [
    ("README.md", "README.en.md"),
    ("docs/glossary.md", "docs/glossary.en.md"),
]
```

### 退出码

| 码 | 含义 |
|---|---|
| `0` | 全部通过 |
| `1` | 存在错误 |

CI 会在 push / PR 时自动运行（见 `.github/workflows/validate.yml`）。

### 修改主键定义

新增表后，需要在脚本顶部的 `PRIMARY_KEYS` 字典中登记主键，
否则该表只做通用格式检查，不做唯一性检查。

---

## import_genshin_db.mjs

从 **genshin-db** 的数据文件导入角色数据，生成契约合规的 CSV。

genshin-db 是 npm 上的第三方包，其数据来自 **GenshinData 解包仓库 + Fandom wiki**，
因此产出行的 `source` 一律为 `datamine`。

### 准备源数据

```bash
# 下载并解包（无需 npm，只需 node 与 tar）
curl -L -o genshin-db.tgz https://registry.npmjs.org/genshin-db/-/genshin-db-5.2.14.tgz
tar -xzf genshin-db.tgz
# 数据文件：package/src/min/data.min.json（约 190MB）
```

### 运行

```bash
node scripts/import_genshin_db.mjs --in package/src/min/data.min.json
node scripts/import_genshin_db.mjs --in <path> --dry-run        # 只统计不写文件
node scripts/import_genshin_db.mjs --in <path> --targets characters
```

| 参数 | 说明 |
|---|---|
| `--in <path>` | **必填**，`data.min.json` 路径 |
| `--out <dir>` | 仓库根目录，默认脚本上级目录 |
| `--targets <list>` | 默认 `characters`；`roles` 尚未实现 |
| `--dry-run` | 只输出统计，不写文件 |

### 它做了什么

1. 载入 `data.min.json`，校验结构。
2. 复刻 genshin-db 的 `getPromotionBonus` + 成长曲线，精确计算 **90 级**基础生命/攻击/防御。
3. 从 `stats.talents.*.combat3` 按标签里的 `{paramN}` 标记取**元素爆发能量消耗**。
4. 映射元素 / 武器类型 / 突破属性为仓库枚举；推导 `slug`；解析 `region`。
5. 输出 UTF-8 无 BOM、LF 的 CSV，并检查字段不含逗号（违反契约即报错）。

`--targets roles` 时额外做职能推导（见下方「职能推导规则」），
输出 `data/characters/character_roles.csv`；它依赖 `community_roles.csv`，缺失会直接报错。

### 关键实现细节（踩过的坑）

| 坑 | 处理 |
|---|---|
| 爆发能量的标签位置 ≠ `paramN` | 必须解析 `Energy Cost\|{paramN:I}` 里的 N（如雷电将军是 `param20` 而非第 4 个） |
| `specialized` 对暴击类折入了基础值 | `FIGHT_PROP_CRITICAL` 要减 0.05、`CRITICAL_HURT` 要减 0.5，才是「仅突破加成」 |
| 90 级属性是浮点 | 按游戏内显示**四舍五入取整**（钟离 DEF 737.812 → 738） |
| EM 不是百分比 | `FIGHT_PROP_ELEMENT_MASTERY` 输出固定值，不乘 100 |
| `region` 字段可能为空 | 回退到 `associationType` 映射；仍无法判定则留空（未知） |
| 旅行者分元素变体无角色级属性 | `aether` / `lumine` 的 `element` 留空、`burst_cost` 为 `NA`，缺口记录在 `data/characters/README.md` |

### 回归自检（重要）

脚本内置 **16 个角色 × 6 个字段 = 96 个独立验证过的数值**（来自游戏内数值与社区公认值，
不是从脚本输出抄来的）。任一不一致即**中止写入并返回退出码 2**，避免坏数据落盘。

修改脚本后必须重跑；若自检失败，先判断是脚本错了还是期望值记错了。

### 尚未实现

| target | 说明 |
|---|---|
| — | 当前 `characters` 与 `roles` 均已实现 |

---

## fetch_community_roles.py

抓取并解析 **genshin.gg** 的角色定位标签，生成可供交叉核对的来源快照
`data/characters/community_roles.csv`。零第三方依赖（仅 Python 标准库）。

```bash
python scripts/fetch_community_roles.py              # 联网抓取并写入
python scripts/fetch_community_roles.py --offline    # 只用本地缓存（.cache/community-roles）
python scripts/fetch_community_roles.py --dry-run    # 只打印统计
```

### 三个页面互相核对

| 列 | 来源 |
|---|---|
| `role_tier_list` | `https://genshin.gg/tier-list/`（基于深空螺旋与幽境危战出场率） |
| `role_builds` | `https://genshin.gg/builds/` |
| `role_character_page` | `https://genshin.gg/characters/<slug_gg>/`（仅榜上缺失的角色） |

标签只有四种，接入时规范化为 `main_dps` / `sub_dps` / `support`
（`DPS` 归入 `main_dps`）。`agree` 列记录多来源是否一致。

> ⚠️ **该来源只回答输出轴**，不区分治疗/护盾/增伤/减益。
> 辅助类职能一律由解包技能文本独立推导，见下节。

### 名称对齐

genshin.gg 使用简称，与角色英文全名不一致，需要显式映射：

| 情况 | 处理 |
|---|---|
| 取英文名的首词或末词即可匹配 | 自动（如 `Raiden Shogun` → `raiden`、`Kaedehara Kazuha` → `kazuha`） |
| 完全无重合 | `SLUG_TO_GG` 显式指定（如 `tartaglia` → `childe`） |

---

## 职能推导规则（`--targets roles`）

`character_roles.csv` 是**推导字段**，因此规则必须可审计：每条职能行都把判定所依据的
**整句原文**写进 `notes`，并用 `confidence` 标注可信度。

| role | 判定条件 | `source` | `confidence` |
|---|---|---|---|
| `healer` | 治疗动词 且 受益对象是队友/范围内角色 | `datamine` | `high` |
| `shielder` | 生成护盾或给出 `DMG Absorption` | `datamine` | `high` |
| `debuffer` | 降低敌人 RES/DEF **且**句中出现 opponents/enemies | `datamine` | `high` |
| `buffer` | 给予队伍属性/伤害增益（受益对象明确） | `datamine` | `high` |
| `main_dps` / `sub_dps` | 社区定位标签 | `community` | `medium` / `low` |
| `support` | 社区标 Support 但文本未匹配到具体职能（兜底） | `community` | `low` |

### 踩过的坑（回归清单，改规则前先看这里）

机械类职能判定最容易犯的错是**只看动词不看受益对象**。以下 6 类都曾经误判：

| # | 误判 | 反例原文 | 修法 |
|---|---|---|---|
| 1 | 恢复能量当成治疗 | 雷电将军：「regenerate **Energy** for all nearby party members」 | 句中含 Energy/Stamina 且无 HP/health 则跳过 |
| 2 | 自我减益当成减益敌人 | 荒泷一斗：「Decreases **Itto's** Elemental and Physical RES」 | 要求句中出现 opponents/enemies |
| 3 | 减伤当成减抗 | 北斗：「resistance to interruption, and decreases DMG taken」 | 同上 |
| 4 | 自我增益当成队伍增益 | 希诺宁/娜维娅/林尼/卡齐娜/玛薇卡/瓦蕾莎/兹白 | 拦截 4 类措辞：被动态、主动态、倒装、受益者本人；并排除 `For each X party member` 条件句 |
| 5 | 治疗漏判 | 多莉「the connected character」、行秋「the current character」、希诺宁「active character**s**」 | 目标词补 `connected/current`，并放行复数 |
| 6 | `is_primary` 多行 | 纯辅助角色有多个职能行 | 每角色恰好一行，按 `shielder > debuffer > healer > buffer` 归主 |

> **不要用关键词命中代替「动词 + 对象」判定**。上表每一类都是真实发生过的错误，
> 且都能骗过朴素的正则。

### 刻意不做的事

| 字段 | 为何留空 |
|---|---|
| `damage_source` | 曾用「各天赋倍率条目数量」推断，但条目数不反映伤害占比（香菱普攻 10 条倍率，实际伤害来自元素爆发），宁可留空 |
| `damage_type` 的物理流派 | 只有突破属性为物理伤害加成者记为 `physical`，优菈/辛焱/菲米尼无法可靠识别 |

---

## 待建脚本

| 脚本 | 用途 |
|---|---|
| `build_index.py` | 扫描 `guides/character-builds/` 自动生成角色索引，写回 `index/INDEX.md` |
| `check_schema.py` | 对比 CSV 表头与 `data/*/README.md` 中的字段字典，确保同步 |
| `stats.py` | 统计数据覆盖率（各表已填行数 / 待填数） |
| `import_weapons_artifacts.mjs` | 复用同一数据源导入武器与圣遗物（源数据已确认含 255 把武器、63 套圣遗物） |

---

## 相关

- 数据契约：[`../AGENTS.md`](../AGENTS.md)
- 贡献流程：[`../CONTRIBUTING.md`](../CONTRIBUTING.md)
- 表与主键登记：[`../data/schema/README.md`](../data/schema/README.md)
