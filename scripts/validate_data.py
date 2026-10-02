#!/usr/bin/env python3
"""校验 genshinAIBase 的数据层与文档层。

用法:
    python scripts/validate_data.py
    python scripts/validate_data.py --quiet
    python scripts/validate_data.py --no-links
    python scripts/validate_data.py --only-links

仅使用 Python 标准库。约定见 AGENTS.md §3 与 data/schema/README.md。
"""

from __future__ import annotations

import argparse
import csv
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"

# ---------------------------------------------------------------------------
# 主键定义（新增表后在此登记）
# ---------------------------------------------------------------------------
PRIMARY_KEYS: dict[str, list[str]] = {
    "data/characters/characters.csv": ["char_id"],
    "data/characters/character_roles.csv": ["char_id", "role"],
    "data/characters/community_roles.csv": ["char_id"],
    "data/characters/character_talents.csv": ["char_id", "talent_type"],
    "data/characters/character_talent_params.csv": ["char_id", "talent_type", "label_index"],
    "data/weapons/weapons.csv": ["weapon_id"],
    "data/artifacts/artifact_sets.csv": ["set_id"],
    "data/artifacts/artifact_set_bonuses.csv": ["set_id", "pieces", "effect_index"],
    "data/artifacts/artifact_main_stats.csv": ["slot", "main_stat"],
    "data/elements/reactions.csv": ["reaction_id"],
    "data/elements/aura_consumption.csv": ["reaction_id"],
    "data/elements/particle_energy.csv": ["pickup_type", "element_relation", "field_state"],
    "data/enemies/enemies.csv": ["enemy_id"],
    "data/enemies/enemy_resistance.csv": ["enemy_id", "element"],
    "data/teams/team_archetypes.csv": ["archetype_id"],
    "data/teams/elemental_resonance.csv": ["resonance_id"],
}

# 数值字段判定
NUMERIC_SUFFIXES = ("_pct", "_sec", "_value", "_ratio", "_multiplier", "_lv90", "_lv20_5star",
                    "_lv1", "_lv10")
NUMERIC_NAMES = {
    "rarity", "level", "hp", "atk", "def", "pieces", "effect_index", "max_stacks",
    "burst_cost", "value", "value_base", "aura_consumed_unit", "energy_value",
    "param_refs",
}
# 明确不是数值的同名/近名字段（避免误判）
NON_NUMERIC_OVERRIDE = {"value_unit", "sub_stat", "scaling_stat"}

NULLISH = {"", "NA", "?", "N/A", "na", "null"}
SNAKE_RE = re.compile(r"^[a-z][a-z0-9_]*$")
MD_LINK_RE = re.compile(r"\[[^\]]*\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")
FENCE_RE = re.compile(r"^\s*(?:>\s*)*(?:`{3,}|~{3,})\s*([A-Za-z0-9_+.-]*)")

# 双语文档对：两侧的命令与链接目标必须一致
BILINGUAL_PAIRS = [
    ("README.md", "README.en.md"),
]
# 被视为「命令行」的代码块语言标记
SHELL_FENCE_LANGS = {
    "bash", "sh", "shell", "zsh", "console", "powershell", "pwsh", "cmd", "ps1", "bat",
}
# 语言切换互链：两侧天然指向对方，不参与链接一致性比对
PAIR_LINK_IGNORE = {"README.md", "README.en.md"}

CSV_ERRORS: list[str] = []
LINK_ERRORS: list[str] = []
PAIR_ERRORS: list[str] = []
EMPTY_TABLES: list[str] = []


def rel(path: Path) -> str:
    try:
        return path.relative_to(ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def err(bucket: list[str], path: Path, line: int | None, msg: str) -> None:
    loc = rel(path) + (f":{line}" if line else "")
    bucket.append(f"{loc}: {msg}")


def is_numeric_field(name: str) -> bool:
    if name in NON_NUMERIC_OVERRIDE:
        return False
    if name in NUMERIC_NAMES:
        return True
    return name.endswith(NUMERIC_SUFFIXES)


def check_csv(path: Path) -> None:
    raw = path.read_bytes()

    if raw.startswith(b"\xef\xbb\xbf"):
        err(CSV_ERRORS, path, None, "文件含 UTF-8 BOM，应保存为无 BOM 的 UTF-8")

    if b"\r" in raw:
        err(CSV_ERRORS, path, None, "存在 CR 字符，换行必须为 LF")

    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        err(CSV_ERRORS, path, None, f"无法按 UTF-8 解码: {exc}")
        return

    lines = text.split("\n")
    if lines and lines[-1] == "":
        lines.pop()

    if not lines:
        err(CSV_ERRORS, path, None, "文件为空（至少需要表头行）")
        return

    for idx, line in enumerate(lines, start=1):
        if line.strip() == "":
            err(CSV_ERRORS, path, idx, "空行")

    reader = list(csv.reader(lines))
    header = reader[0]
    if not header or all(h.strip() == "" for h in header):
        err(CSV_ERRORS, path, 1, "表头为空")
        return

    header = [h.strip() for h in header]

    for name in header:
        if not SNAKE_RE.match(name):
            err(CSV_ERRORS, path, 1, f"表头字段 '{name}' 不是 snake_case")

    for required in ("version", "source"):
        if required not in header:
            err(CSV_ERRORS, path, 1, f"缺少必需列 '{required}'")

    if len(set(header)) != len(header):
        dupes = {h for h in header if header.count(h) > 1}
        err(CSV_ERRORS, path, 1, f"表头存在重复列: {sorted(dupes)}")

    width = len(header)
    numeric_cols = {i for i, n in enumerate(header) if is_numeric_field(n)}

    keys = PRIMARY_KEYS.get(rel(path))
    key_idx: list[int] = []
    if keys:
        missing = [k for k in keys if k not in header]
        if missing:
            err(CSV_ERRORS, path, 1, f"主键列不存在: {missing}")
        else:
            key_idx = [header.index(k) for k in keys]
    seen: dict[tuple, int] = {}

    records = 0
    for lineno, row in enumerate(reader[1:], start=2):
        if not row:
            continue
        if len(row) > width:
            err(CSV_ERRORS, path, lineno, f"列数 {len(row)} 超过表头列数 {width}")
            continue
        if len(row) < width:
            row = row + [""] * (width - len(row))

        if all(c.strip() == "" for c in row):
            err(CSV_ERRORS, path, lineno, "整行为空（数据行不得全空）")
            continue

        records += 1

        for i, cell in enumerate(row):
            value = cell.strip()
            name = header[i]

            if "," in cell:
                err(CSV_ERRORS, path, lineno,
                    f"字段 '{name}' 含逗号；多值请用 ';' 分隔，文本请改写")

            if i in numeric_cols and value not in NULLISH:
                # 允许多值数值字段：`;` 分隔，如 param_refs / value_lv1（与 value_unit 按位置对齐）
                for part in value.split(";"):
                    part = part.strip()
                    if part in NULLISH:
                        continue
                    try:
                        float(part)
                    except ValueError:
                        err(CSV_ERRORS, path, lineno,
                            f"字段 '{name}' 应为数值或空/NA/?，实际片段为 '{part}'")
                        break

        if key_idx:
            key = tuple(row[i].strip() for i in key_idx)
            if all(k == "" for k in key):
                err(CSV_ERRORS, path, lineno, "主键全为空")
            elif key in seen:
                err(CSV_ERRORS, path, lineno,
                    f"主键重复 {key}（首次出现于第 {seen[key]} 行）")
            else:
                seen[key] = lineno

    if records == 0:
        EMPTY_TABLES.append(rel(path))


def parse_markdown(path: Path):
    """产出 (行号, 代码块语言标记, 去掉引用前缀后的内容, 是否在代码块内)。"""
    text = path.read_text(encoding="utf-8", errors="replace")
    in_fence = False
    info = ""
    for lineno, raw in enumerate(text.split("\n"), start=1):
        content = re.sub(r"^(?:\s*>\s*)*", "", raw)
        fence = FENCE_RE.match(raw)
        if fence:
            if in_fence:
                in_fence = False
                info = ""
            else:
                in_fence = True
                info = fence.group(1).lower()
            continue
        yield lineno, info, content, in_fence


def iter_markdown_links(path: Path):
    """产出 (行号, 目标路径)，跳过代码块内的示例链接。"""
    for lineno, _, line, in_fence in parse_markdown(path):
        if in_fence:
            continue
        for match in MD_LINK_RE.finditer(line):
            target = match.group(1).strip().strip("<>")
            if not target or target.startswith(("#", "http://", "https://", "mailto:", "tel:")):
                continue
            target = target.split("#", 1)[0]
            if not target:
                continue
            if any(tok in target for tok in ("{{", "}}", "<", ">")):
                continue
            yield lineno, target


def collect_shell_commands(path: Path) -> set:
    """收集带 shell 语言标记的代码块中的命令行（去掉注释与空行）。"""
    commands = set()
    for _, info, line, in_fence in parse_markdown(path):
        if not in_fence or info not in SHELL_FENCE_LANGS:
            continue
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        stripped = re.sub(r"\s+#.*$", "", stripped).strip()
        if stripped:
            commands.add(stripped)
    return commands


def check_markdown_links(path: Path) -> None:
    try:
        list(parse_markdown(path))
    except OSError as exc:
        err(LINK_ERRORS, path, None, f"读取失败: {exc}")
        return

    for lineno, target in iter_markdown_links(path):
        resolved = (path.parent / target).resolve()
        try:
            resolved.relative_to(ROOT.resolve())
            inside = True
        except ValueError:
            inside = False
        if not resolved.exists():
            where = "" if inside else "（指向仓库外）"
            err(LINK_ERRORS, path, lineno, f"链接目标不存在{where}: {target}")


def check_bilingual_pairs() -> None:
    """双语 README 必须保持同构：命令行集合与链接目标集合一致。

    命令与路径本身与语言无关，因此是最可靠的漂移检测信号；
    正文措辞不同是正常的，不参与比对。
    """
    for left_rel, right_rel in BILINGUAL_PAIRS:
        left, right = ROOT / left_rel, ROOT / right_rel
        for path in (left, right):
            if not path.exists():
                PAIR_ERRORS.append(f"{rel(path)}: 双语文件缺失")
        if not left.exists() or not right.exists():
            continue

        # 命令行一致性
        lc, rc = collect_shell_commands(left), collect_shell_commands(right)
        for cmd in sorted(lc - rc):
            PAIR_ERRORS.append(f"{right_rel}: 缺少 {left_rel} 中的命令: {cmd}")
        for cmd in sorted(rc - lc):
            PAIR_ERRORS.append(f"{left_rel}: 缺少 {right_rel} 中的命令: {cmd}")

        # 链接目标一致性
        ll = {t for _, t in iter_markdown_links(left)} - PAIR_LINK_IGNORE
        rl = {t for _, t in iter_markdown_links(right)} - PAIR_LINK_IGNORE
        for target in sorted(ll - rl):
            PAIR_ERRORS.append(f"{right_rel}: 缺少 {left_rel} 中的链接: {target}")
        for target in sorted(rl - ll):
            PAIR_ERRORS.append(f"{left_rel}: 缺少 {right_rel} 中的链接: {target}")


def iter_files(pattern: str, base: Path):
    return sorted(p for p in base.rglob(pattern) if p.is_file())


def main() -> int:
    try:  # Windows 控制台默认可能不是 UTF-8
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, OSError):
        pass

    parser = argparse.ArgumentParser(description="校验 genshinAIBase 数据与文档")
    parser.add_argument("--quiet", action="store_true", help="只输出错误")
    parser.add_argument("--no-links", action="store_true", help="跳过 Markdown 链接检查")
    parser.add_argument("--only-links", action="store_true", help="只检查 Markdown 链接")
    args = parser.parse_args()

    csv_files = iter_files("*.csv", DATA_DIR) if not args.only_links else []
    md_files = iter_files("*.md", ROOT) if not args.no_links else []

    for path in csv_files:
        check_csv(path)
    for path in md_files:
        check_markdown_links(path)
    if not args.no_links:
        check_bilingual_pairs()

    errors = CSV_ERRORS + LINK_ERRORS + PAIR_ERRORS

    if not args.quiet:
        print(f"仓库根目录: {rel(ROOT)}")
        print(f"  CSV 文件 : {len(csv_files)}")
        print(f"  Markdown : {len(md_files)}")
        print(f"  双语对   : {len(BILINGUAL_PAIRS)}")
        print()

    if EMPTY_TABLES and not args.quiet:
        print(f"[提示] {len(EMPTY_TABLES)} 张表仅有表头、0 条数据（骨架阶段属正常）：")
        for item in EMPTY_TABLES:
            print(f"         - {item}")
        print()

    for bucket_name, bucket in (
        ("CSV", CSV_ERRORS),
        ("链接", LINK_ERRORS),
        ("双语一致性", PAIR_ERRORS),
    ):
        if bucket:
            print(f"--- {bucket_name} 错误 ({len(bucket)}) ---")
            for item in bucket:
                print(f"  [错误] {item}")
            print()

    if errors:
        print(f"[FAIL] 校验失败：{len(errors)} 个错误")
        return 1

    print("[OK] 校验通过")
    return 0


if __name__ == "__main__":
    sys.exit(main())
