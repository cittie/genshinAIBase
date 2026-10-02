# 变更日志

本仓库有两条版本线：

- **仓库版本**（`vX.Y`）：目录结构、数据契约、规则文本的变更。
- **游戏版本**（如 `5.0`）：数据覆盖到的游戏版本。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。
变更类型：`新增` / `变更` / `修正` / `移除` / `待办`。

---

## [未发布]

### 新增
- **`data/elements/` 四张表全部填充**（此前仅有表头），来源为
  **KQM Theorycrafting Library**（`KQM-git/TCL` @ `106c0f3`，2026-10-01，`7.1 data`）：
  - `level_coefficients.csv`（100 行）：等级 → **角色 / 敌人 / 结晶护盾**三种系数。
    90 级角色系数 `1446.8535`。**源数组索引即等级**（第 0 项为占位）。
  - `reactions.csv`（20 行）：反应倍率、类别、伤害元素、是否吃暴击/防御区。
    **蒸发/融化因强/弱倍率不同而拆成两条**（附着消耗也不同）。
  - `aura_consumption.csv`（18 行）：附着消耗（单位修正与固定 U 值两种口径）。
  - `particle_energy.csv`（24 行）：微粒/晶球能量。**新增 `party_size` 主键列**——
    后台系数随队伍人数变化（4 人 60% / 3 人 70% / 2 人 80%），原三列主键表达不了。
- **新增导入脚本 `scripts/import_kqm_tcl.mjs`**：固定 commit 抓取 + 锚点校验。
  等级系数为**机器提取**（带已知锚点自检）；反应倍率/附着/能量为**人工转写**，
  每条转写都要求一个锚点字符串存在于被引用的源文件（缺失则退出码 3 拒绝写入），
  这样上游改数值时会立刻失败而不是静默保留过期值。
- **修正 `docs/mechanics/` 中三处事实错误**（对照源数据核查发现）：
  1. **剧变反应的精通系数**原写成增幅的 `2.78/(1400+EM)`，正确为 `16/(2000+EM)`；
     1000 精通时两者相差 533% vs 116%。三种反应的系数现已并列成表并标注不可混用。
  2. **超绽放 / 烈绽放的伤害元素**原写成雷 / 火，实际**都是草元素**
     （因此堆草抗削减有效，雷火抗削减无效）。
  3. **燃烧**原被归入「无伤害反应」，实际是剧变反应（倍率 0.25、造成火伤、每 0.25 秒一跳）。
- **`aura-icd.md` 补齐附着规则**：附着税 0.8×、各档位衰减速率（1U = 11.875 秒/单位）、
  时长公式 `2.5 × 附着量 + 7 秒`、以及各反应的单位修正表。
- **`energy-and-rotation.md` 补齐能量表**：12 种组合的基础能量已录入，
  并纠正「后台系数固定 80%」这一常见误解。
- **`data/characters/character_constellations.csv`（720 行）**：全量命之座（120 角色 × 6），
  含完整中文效果文本（不截断），并推导两个字段：
  - `effect_target`：受益对象 `self` / `team` / `both` / `enemy`
    （分布 615 / 79 / 25 / 1）。
  - `talent_level_up`：「天赋等级 +3」加的是哪个天赋 —— **靠天赋名与角色自身天赋表逐字比对得到，不是猜**。
    全库 238 条（119 个角色各 2 条）。
  - **关键发现：C3/C5 的顺序不是统一规律**。香菱 C3=爆发/C5=战技，而阿贝多恰好相反；
    另有 8 个角色的 +3 落在**普通攻击**上。这类结论靠记忆会写错，正是本表存在的价值。
- **`data/characters/character_talents.csv`（753 行）与 `character_talent_params.csv`（2387 行）**：
  补上仓库此前最大的缺口——**完整技能文本（不截断）与逐条效果的属性缩放来源**。
  - `character_talents`：一行一个天赋（3 战斗 + 最多 4 固有），含中文全文与属性来源汇总。
  - `character_talent_params`：一行一条属性词条（长表），`scaling_stat` 标明该效果吃什么属性，
    `value_unit` / `param_refs` / `value_lv1` / `value_lv10` 按位置一一对齐
    （一条词条可混合单位，如「治疗量 = 固定值 + 生命值上限百分比」）。
  - 直接回答了此前悬而未决的问题：**沃雅妮莎的治疗吃生命值上限**
    （`遥久之歌治疗量` = `593.2278;5.04`，即固定值 593 + 生命值上限 5.04%）。
- 导入器新增 `talents` target（纳入 `all`），并新增天赋回归自检
  （沃雅妮莎 3 条 + 普攻非纯攻击力的夜兰/那维莱特/希诺宁 3 条）。
- **`data/weapons/weapons.csv` 已填充 255 行**（v7.1 全量武器），`source=datamine`：
  满级基础攻击力（由成长曲线精确计算）、副属性类型与数值、被动名称与 R1 全文（中文）、实装版本。
  新增 `max_level` 列——1★/2★ 共 10 把武器等级上限为 70，其余 245 把为 90。
- **`data/artifacts/artifact_sets.csv` 已填充 63 行**、**`artifact_set_bonuses.csv` 已填充 122 行**：
  套装 ID/名称/最高稀有度、2 件套类型与数值、4 件套完整中文效果；
  效果行按规则表拆成 `effect_type` / `value` / `duration_sec` / `max_stacks` / `condition`。
  - **2 件套采用「无匹配即中止」闸门**（退出码 3）：措辞规整，漏解析说明规则表有洞，不允许静默缺项。
  - **4 件套不硬拆**：多为复合条件句，只填可机械提取的字段，覆盖度在 `data/artifacts/README.md` 公开
    （`condition` 58/61、`duration_sec` 34/61、`effect_type` 19/61、`max_stacks` 7/61）。
- 导入器新增 `weapons` / `artifacts` 两个 target 与 `all`，并新增两组回归自检：
  12 把武器（48 个数）、22 套圣遗物的 2 件套解析结果，全部与外部独立来源一致。
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
- **命座「天赋 +3」漏判胡桃**：她的措辞是「技能等级**提升**3级」而非「提高3级」。
  穷举全库后确认仅这两种措辞（250 + 2 条），现已兼容并补入回归表。
- **命座天赋名解析失败 4 条**：天赋名里含逗号、`♪`、`！`（芭芭拉「演唱，开始♪」、
  卡齐娜「出击，冲天转转！」、那维莱特「潮水啊，我已归来」），原先「先用正则截取名字」
  会被标点截断；改为**用天赋名逐个做包含匹配**，并兼容 `普通攻击·` 等类别前缀。
- **回归期望写反（不是代码错）**：曾把阿贝多的 C3 期望为爆发、C5 期望为战技，
  实际他的元素战技叫「创生法·拟造阳华」，C3 加的是战技。C3/C5 顺序并非统一规律。
- **天赋属性词条改为逐参数判定**（共修掉 3 类误判）：
  1. **`最大生命值` 是 `生命值上限` 的另一种写法**，映射表只收了后者，
     导致**钟离、迪奥娜的护盾被算成吃攻击力**；现两者都映射到 `hp`。
  2. 一条词条可引用**两个不同属性**的参数（全库 13 例，如「攻击力+元素精通」），
     早期用单一 `scaling_stat` 表达不了；现按出现顺序把属性词分配给参数，
     `scaling_stat` / `value_unit` / `param_refs` / 数值四者按位置一一对齐。
  3. 兜底规则过宽：`护盾基础吸收量|{param5:I}` 是固定值，曾因词条名含「护盾」被判为吃攻击力；
     现要求「全部参数都是百分比」才套用默认攻击力。
- **职能推导补扫 `passive4`，并排除「仅探索场景生效」的固有天赋**：
  此前漏掉一整个天赋位（27 个角色有 `passive4`），且会把
  「白天队伍移动速度 +10%，**秘境/深境螺旋中无效**」这类被动误判为队伍增益。
  修正后 `gaming` 的错误 `buffer` 行被移除（buffer 42 → 41），且未产生新的误判。
- **天赋百分比数值按契约改为百分数数值**：源数据是小数（`0.0327`），曾直接写入；
  现统一 ×100（`3.27`），并对混合单位词条改用 `value_unit` 逐参数对齐（如 `flat;pct`）。
- **`effect_target` 的元数据词误判**：「遥久之歌治疗**间隔**」含「治疗」二字，
  曾被判为吃攻击力；现元数据词（间隔/持续/冷却/消耗…）优先判为 `NA`。
- 校验脚本支持多值数值字段（`;` 分隔，如 `param_refs` / `value_lv1`）——
  原实现对整格做 `float()`，遇到多值会误报。
- **修复 4 件套 `effect_target` 的误判**：原规则「文本含 party 即判为 `team`」会把
  `gilded_dreams`（饰金之梦，「使**装备者**获得强化」，队友只是触发条件）错判为全队增益。
  改为「全队词 + 受益者是否本人」的规则判定，枚举新增 `both`（`heart_of_the_furnace`、
  `night_of_the_skys_unveiling` 属于自身+全队兼有），并新增 14 套人工核对过的受益对象回归自检。
- **配队规则补 §3.5「同轴辅助优先」**（[rules/team-building.md](rules/team-building.md)）：
  实战中发现，按「先挑元素共鸣 → 再按共鸣筛角色」的顺序作答，会**结构性排除主 C 自身元素的辅助**。
  判定顺序改为把「先找与主 C 伤害类型同元素的辅助」列为第 4 步并标注不可跳过，
  同时把这次的真实失误作为反面教训写入规则，附四种常见同轴辅助形态。
- 武器/圣遗物导入过程中发现并修复 9 类问题（全部写入 `scripts/README.md` 的回归清单）：
  1. EM 副属性算成 16538.4（`SUBSTAT` 映射后传入的是枚举值 `em`，函数却判断原始 `FIGHT_PROP_*` 名）。
  2. EM 应输出整数（游戏内显示 165 而非 165.4）。
  3. 元素类 2 件套数值取到元素名（`(\w+) DMG Bonus \+(\d+)%` 的数值在第 2 捕获组）→ 规则表新增 `valueGroup`。
  4. 「烬城勇者绘卷」2 件套是回能而非属性加成，无法解析 → 新增 `energy_regen` 类型。
  5. 3 把同名武器（Prized Isshin Blade）导致 slug 冲突崩溃 → 新增 `uniqueSlug()` 按源 key 后缀消歧。
  6. `Wolf's Gravestone` 生成 `wolf_s_gravestone` → `toSlug` 先剥离撇号。
  7. `prizedisshinblade-01` 副属性输出 0（源数据 `baseStatText` 为字面量 `"NaN"`）→ 按契约留空。
  8. 4 件套 `effect_type` 仅 1/61 有值（措辞为「X is increased by Y%」）→ 补 9 条规则后提升到 19/61。
  9. `max_stacks` 漏掉「stacks up to N times」语序 → 叠层正则兼容两种语序（5 → 7 套）。
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
- 补齐许可证：远端初始提交已加入 MIT 许可证（Copyright © 2026 Yee），
  [CONTRIBUTING.md](CONTRIBUTING.md) 与两份 README 同步登记，`CHANGELOG` 的「确定 LICENSE」待办移除。
- `weapons.csv` 表头新增 `max_level` 列（原表无数据行，属契约修订而非破坏性变更）；
  配套把 `base_atk_lv90` / `sub_stat_value_lv90` 的语义定义为「满级值」。
- `toSlug()` 改为先剥离撇号再替换：`Wolf's Gravestone` 由 `wolf_s_gravestone` 变为 `wolfs_gravestone`。
  已核对 `characters.csv` 与 `character_roles.csv` 重新生成后**逐字节未变**（角色英文名不含撇号）。
- `.gitignore` 新增 `genshin-db*.tgz`、`data.min.json`、`/package/`、`.cache/`，
  避免按 README 步骤下载的源数据与抓取缓存被误提交。

### 待办
- [ ] 复核 `character_roles.csv` 中 `confidence=low` 的行（`agree=false` 的 5 个来源冲突角色）
- [ ] 补齐旅行者分元素变体（`traveleranemo` ~ `travelerpyro`）：源数据仅有天赋与命座记录
- [ ] `character_roles.damage_source` 需要伤害构成数据才能填，当前全表留空
- [ ] 武器 `obtain_method` 与圣遗物 `obtain_domain` 全表为空：源数据没有获取途径，需另找来源
- [ ] 4 件套效果的完整结构化拆解（当前 `effect_type` 仅 19/61 有值，需要人工校对）
- [ ] 待建 `weapon_refinements.csv`（R1~R5 被动数值）与 `artifact_substat_tiers.csv`（副词条档位）
- [ ] 填充 `data/artifacts/artifact_main_stats.csv`（各主词条满级数值档位各不相同，需逐条录入）
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
