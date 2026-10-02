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
node scripts/import_genshin_db.mjs --in <path> --targets all     # 全部四类
```

| 参数 | 说明 |
|---|---|
| `--in <path>` | **必填**，`data.min.json` 路径 |
| `--out <dir>` | 仓库根目录，默认脚本上级目录 |
| `--targets <list>` | 逗号分隔，默认 `characters`；可选 `characters` `roles` `weapons` `artifacts` `talents` `constellations` `all` |
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
| — | `characters` / `roles` / `weapons` / `artifacts` 均已实现 |

---

## 命座导入（`--targets constellations`）

| 产物 | 行数 | 说明 |
|---|---|---|
| `data/characters/character_constellations.csv` | 720 | 一行一个命座（每人 6 行） |

### 两个推导字段

| 字段 | 判定方式 |
|---|---|
| `effect_target` | 中文文本规则：含队伍词且含对敌减益 → `both`；仅队伍词 → `team`；仅对敌减益 → `enemy`；其余 → `self` |
| `talent_level_up` | **用天赋名逐个做包含匹配**，与该角色自身的天赋表对照 |

### 踩过的坑

| # | 问题 | 修法 |
|---|---|---|
| 20 | 胡桃的「技能等级**提升**3级」漏判（我只匹配「提高」） | 穷举全库措辞变体：仅 250 条「提高」+ 2 条「提升」（胡桃 c3/c5）。两种都接受 |
| 21 | 天赋名里含逗号、`♪`、`！` 导致正则截取失败（芭芭拉、卡齐娜、那维莱特共 4 条） | 放弃「先截取名字」，改为**用天赋名做包含匹配**，并兼容 `普通攻击·` 等类别前缀 |
| 22 | 回归期望把阿贝多的 C3/C5 写反 | **代码是对的、期望是错的**：阿贝多元素战技叫「创生法·拟造阳华」，所以 C3 加战技；香菱 C3 加爆发。C3/C5 顺序**不是统一规律**，回归表已补 7 个角色 |

### 值得记住的结论

**「+3 加的是哪个天赋」不能靠记忆推断**：香菱 C3=爆发/C5=战技，阿贝多恰好相反；
另有 8 个角色的 +3 落在**普通攻击**上（林尼、菲米尼、莱欧斯利、那维莱特、阿蕾奇诺、赛索斯、瓦雷莎、桑多涅 c3/c5）。

---

## 天赋导入（`--targets talents`）

| 产物 | 行数 | 说明 |
|---|---|---|
| `data/characters/character_talents.csv` | 753 | 一行一个天赋：完整中文技能文本 + 属性来源汇总 |
| `data/characters/character_talent_params.csv` | 2387 | 一行一条属性词条（长表）：属性来源 + 数值 |

### 属性词条解析规则

游戏自己的标签写法就是权威依据，形如 `技能伤害|{param1:F2P}生命值上限`：

| 步骤 | 处理 |
|---|---|
| 1 | 按 `\|` 拆出词条名与模板，取 `{paramN:FMT}` 的参数序号与格式 |
| 2 | **按出现顺序**把属性词（`生命值上限`/`最大生命值`/`攻击力`/`防御力`/`元素精通`）分配给「它之前最近的一批参数」；尾部参数继承最后一个属性词 |
| 3 | 无属性词时：元数据词（间隔/持续/冷却/消耗/数量/层数/范围/速度/概率/次数/充能）或非面板机制（生命之契/当前生命值/元素能量/战意/夜魂值/体力/燃素）→ `NA` |
| 4 | 否则仅当**全部参数都是百分比**且词条名含「伤害（不含伤害加成）/治疗/恢复/护盾/吸收」→ `atk`（游戏默认）；固定值词条判 `NA` |
| 5 | 单位**逐参数**判定：格式以 `P` 结尾 → `pct`；含「秒」→ `sec`；否则 `flat` |
| 6 | 百分比 ×100 输出为百分数数值（契约要求） |

> `scaling_stat` / `value_unit` / `param_refs` / `value_lv1` / `value_lv10` 五列**按位置一一对齐**，
> 因此同一行内可以出现 `hp;hp`、`pct;flat`、`atk;em` 这类多值。

### 踩过的坑

| # | 问题 | 修法 |
|---|---|---|
| 11 | 「遥久之歌治疗**间隔**」含「治疗」二字被判为吃攻击力 | 元数据词（间隔/持续/冷却/消耗/数量/层数/范围/速度/概率/次数/充能）优先判为 `NA` |
| 12 | 百分比按原始小数写入（`0.0327`） | 统一 ×100（`3.27`），与契约「百分比用百分数数值」一致 |
| 13 | 混合单位词条无法用单一 `value_unit` 表达 | 改为逐参数对齐：`param_refs=5;6` 对应 `value_unit=flat;pct` |
| 14 | 英文天赋名含逗号（`Beware, It's Super Hot!`）触发契约检查 | `fullText()` 统一清洗，并同样应用于名称字段 |
| 15 | 职能推导漏扫 `passive4`（27 个角色有） | 补入扫描列表；同时新增「仅探索场景生效」过滤，避免把「队伍移动速度 +10%（秘境中无效）」当成队伍增益 |
| 16 | 校验脚本把多值数值字段误报（对整格 `float()`） | 改为按 `;` 拆开逐段校验 |
| 17 | 钟离/迪奥娜的护盾算成吃攻击力 | 中文标签里 **`最大生命值` 是 `生命值上限` 的另一种写法**，映射表只收了后者。补别名 |
| 18 | 「攻击力+元素精通」这类词条只能标一个属性 | 一条词条可引用两个不同属性的参数（全库 13 例）。改为**逐参数分配**：按出现顺序把属性词分给「它之前最近的一批参数」，尾部参数继承最后一个属性词 |
| 19 | `护盾基础吸收量\|{param5:I}` 被判为吃攻击力 | 兜底规则过宽。现要求「**全部参数都是百分比**」才套用默认攻击力；固定值词条（如护盾基础吸收量）判 `NA` |

### 设计取舍

| 取舍 | 理由 |
|---|---|
| **只存中文技能文本** | 仓库以中文为主（AGENTS.md §7.3），且中文标点不含 ASCII 逗号，天然满足 CSV 契约；英文原文在上游源数据中 |
| **用长表存属性词条** | 一条技能有多个效果、各自可能吃不同属性，符合 schema「一对多优先长表」原则 |
| **固有天赋无属性词条行** | 固有天赋是纯文本，源数据不含参数 |
| **旅行者分元素变体不纳入** | 其天赋记录存在但无角色级属性，`slug` 无法关联 `characters.csv`，纳入会破坏连接 |

---

## 武器与圣遗物导入（`--targets weapons,artifacts`）

| 产物 | 行数 | 来源字段 |
|---|---|---|
| `data/weapons/weapons.csv` | 255 | `stats.weapons` 成长曲线 + 中文被动文本 |
| `data/artifacts/artifact_sets.csv` | 63 | `data.*.artifacts` 的 `effect2Pc` / `effect4Pc` |
| `data/artifacts/artifact_set_bonuses.csv` | 122 | 同上，按规则表拆成结构化行 |

### 踩过的坑（回归清单）

| # | 问题 | 修法 |
|---|---|---|
| 1 | EM 副属性算成 16538.4（差 100 倍） | `SUBSTAT` 映射后传的是枚举值 `em`，而函数里判断的是原始 `FIGHT_PROP_ELEMENT_MASTERY`，导致 EM 走了百分比分支 |
| 2 | EM 输出 165.4 而非 165 | EM 在游戏内是整数显示，改为整数取整（百分数仍保留 1 位） |
| 3 | 元素类 2 件套数值取到 `Anemo` 而非 `15` | `(\w+) DMG Bonus \+(\d+)%` 的数值在第 2 捕获组，规则表新增 `valueGroup` |
| 4 | 烬城勇者绘卷 2 件套无法解析 | 它是「回复元素能量」而非属性加成，新增 `energy_regen` 类型 |
| 5 | 3 把同名武器 slug 冲突导致脚本崩溃 | 新增 `uniqueSlug()`，用源 key 的区分后缀消歧并打印警告 |
| 6 | `Wolf's Gravestone` → `wolf_s_gravestone` | `toSlug` 先剥离撇号再替换，得 `wolfs_gravestone` |
| 7 | `prizedisshinblade-01` 副属性输出 0 | 源数据 `baseStatText` 是字面量 `"NaN"`、`base.specialized=0`，按契约留空而非写 0 |
| 8 | 4 件套 `effect_type` 只有 1/61 有值 | 4 件套多用「X is increased by Y%」句式，补 9 条规则后提升到 19/61 |
| 9 | `max_stacks` 漏掉「stacks up to 2 times」语序 | `singleNumber` 支持多捕获组，叠层正则兼容两种语序（5 → 7 套） |
| 10 | `effect_target` 把「饰金之梦」4 件套判成全队 | 该套原文是「使**装备者**获得强化」，队友只是触发条件。原启发式「文本含 party 即 team」不成立，改为「全队词 + 受益者是否本人」的规则，并新增 14 套人工核对过的受益对象回归自检；枚举补充 `both` |

### 设计取舍

| 取舍 | 理由 |
|---|---|
| **2 件套解析失败即中止（退出码 3）** | 2 件套措辞规整，漏解析说明规则表有洞，静默通过会让数据悄悄缺项 |
| **4 件套不硬拆** | 多为复合条件句，强行拆出单一 `effect_type` + `value` 会产生误导；只填可机械提取的字段，并在 `data/artifacts/README.md` 公布覆盖度 |
| **`obtain_method` / `obtain_domain` 留空** | 源数据没有这两个字段，不推测 |
| **部分武器/圣遗物文本用中文** | 中文标点不含 ASCII 逗号，天然满足「单元格禁用逗号」契约；同时与 `name_zh` 一致 |

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
