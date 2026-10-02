#!/usr/bin/env python3
"""抓取并解析 genshin.gg 的角色定位标签，生成可审计的来源快照表。

用法:
    python scripts/fetch_community_roles.py                 # 联网抓取并写入
    python scripts/fetch_community_roles.py --offline       # 只用本地缓存
    python scripts/fetch_community_roles.py --work <dir>    # 指定 HTML 缓存目录
    python scripts/fetch_community_roles.py --dry-run       # 只打印统计

只使用 Python 标准库。产物: data/characters/community_roles.csv

定位来源与口径
--------------
genshin.gg 对每个角色给出一个粗粒度标签，取值只有四种：

    Main DPS / Sub DPS / Support / DPS

它**只回答输出轴**（这个角色是不是主要伤害来源、在场上还是后台），
不区分治疗/护盾/增伤/减益。因此本表只用于推导 `main_dps` / `sub_dps`，
辅助类职能由 `scripts/import_genshin_db.mjs` 从解包技能文本独立推导。

规范映射（写入本表时已规范化）:

    Main DPS -> main_dps     Sub DPS -> sub_dps
    DPS      -> main_dps     Support -> support

抓取三个页面（后两者用于交叉核对）:

    https://genshin.gg/tier-list/           强度榜，覆盖全角色
    https://genshin.gg/builds/              配装总览，覆盖全角色
    https://genshin.gg/characters/<slug>/   个例补充（榜上缺失的角色）

一致性列 `agree`: 三个来源中所有非空标签规范化后若全部相同为 `true`，
存在分歧为 `false`，只有一个来源有标签则留空（无法交叉核对）。
"""

from __future__ import annotations

import argparse
import csv
import gzip
import pathlib
import re
import sys
import urllib.request
from datetime import date

REPO_DEFAULT = pathlib.Path(__file__).resolve().parent.parent

TIER_LIST_URL = "https://genshin.gg/tier-list/"
BUILDS_URL = "https://genshin.gg/builds/"
CHARACTER_URL = "https://genshin.gg/characters/{}/"

# 榜单上缺失、需单独抓角色页补齐的 genshin.gg slug
EXTRA_CHARACTER_SLUGS = ["vodyanitsa", "vesna"]

ROLE_CANON = {
    "main dps": "main_dps",
    "sub dps": "sub_dps",
    "dps": "main_dps",
    "support": "support",
}

# genshin.gg 使用简称，与角色的英文全名不一致，需要显式对齐
ALIAS = {
    "childe": "tartaglia",
    "ayaka": "kamisatoayaka",
    "ayato": "kamisatoayato",
    "heizou": "shikanoinheizou",
    "itto": "aratakiitto",
    "kazuha": "kaedeharakazuha",
    "kokomi": "sangonomiyakokomi",
    "raiden": "raidenshogun",
    "sara": "kujousara",
}

# 反向映射：本仓库 slug -> genshin.gg 用的键。genshin.gg 的名称与英文全名
# 完全无重合时（如 Tartaglia 在 genshin.gg 上叫 Childe），只能显式指定。
SLUG_TO_GG = {
    "tartaglia": "childe",
}

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")

HEADER = [
    "char_id", "slug", "name_gg", "slug_gg",
    "role_tier_list", "role_builds", "role_character_page",
    "agree", "url", "fetched_at", "version", "source",
]

TIER_VERSION_RE = re.compile(r"Version\s+(\d+\.\d+)")


def norm(text: str) -> str:
    return re.sub(r"[^a-z0-9]", "", text.lower())


def canon(label: str) -> str:
    return ROLE_CANON.get(label.strip().lower(), "")


def fetch(url: str, cache: pathlib.Path, offline: bool) -> str:
    if cache.exists() and (offline or cache.stat().st_size > 0):
        return cache.read_text(encoding="utf-8", errors="replace")
    if offline:
        raise SystemExit(f"[offline] 缺少缓存: {cache}")
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Encoding": "gzip"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        raw = resp.read()
        if resp.headers.get("Content-Encoding") == "gzip":
            raw = gzip.decompress(raw)
    html = raw.decode("utf-8", errors="replace")
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(html, encoding="utf-8")
    return html


def parse_tier_list(html: str) -> dict:
    out = {}
    for m in re.finditer(r'<a href="/characters/([^"]+)/"(.*?)</a>', html, re.S):
        slug, body = m.group(1), m.group(2)
        name = re.search(r'tierlist-name">([^<]*)<', body)
        role = re.search(r'tierlist-role">([^<]*)<', body)
        if name and role:
            out[norm(slug)] = (name.group(1).strip(), canon(role.group(1)))
    return out


def parse_builds(html: str) -> dict:
    out = {}
    for block in html.split('<div class="builds-list-item">')[1:]:
        slug = re.search(r'href="/characters/([^"]+)/"', block)
        name = re.search(r'build-name">([^<]*)<', block)
        role = re.search(r'build-role">([^<]*)<', block)
        if slug and name and role:
            out[norm(slug.group(1))] = (name.group(1).strip(), canon(role.group(1)))
    return out


def parse_character(html: str) -> str:
    m = re.search(r'class="character-role">([^<]*)<', html)
    return canon(m.group(1)) if m else ""


def candidates(name_en: str, slug: str):
    words = [w for w in re.split(r"\s+", name_en) if w]
    out = [norm(slug)]
    if words:
        out.append(norm(name_en))
        out.append(norm(words[0]))
        out.append(norm(words[-1]))
    seen, uniq = set(), []
    for c in out:
        if c and c not in seen:
            seen.add(c)
            uniq.append(c)
    return uniq


def main() -> int:
    parser = argparse.ArgumentParser(description="生成 genshin.gg 角色定位来源快照")
    parser.add_argument("--repo", default=str(REPO_DEFAULT))
    parser.add_argument("--work", default=None, help="HTML 缓存目录，默认 <repo>/.cache/community-roles")
    parser.add_argument("--offline", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, OSError):
        pass

    repo = pathlib.Path(args.repo).resolve()
    work = pathlib.Path(args.work) if args.work else repo / ".cache" / "community-roles"

    tier_html = fetch(TIER_LIST_URL, work / "tier-list.html", args.offline)
    builds_html = fetch(BUILDS_URL, work / "builds.html", args.offline)
    tier = parse_tier_list(tier_html)
    builds = parse_builds(builds_html)

    pages = {}
    for slug_gg in EXTRA_CHARACTER_SLUGS:
        html = fetch(CHARACTER_URL.format(slug_gg), work / f"char_{slug_gg}.html", args.offline)
        pages[slug_gg] = parse_character(html)

    m = TIER_VERSION_RE.search(tier_html)
    version = m.group(1) if m else ""
    today = date.today().isoformat()

    chars = list(csv.DictReader((repo / "data/characters/characters.csv").open(encoding="utf-8")))

    rows, unmatched, used = [], [], set()
    known = set(tier) | set(builds) | set(pages)
    for row in chars:
        hit = None
        explicit = SLUG_TO_GG.get(row["slug"])
        if explicit and explicit in known:
            hit = explicit
        if hit is None:
            for c in candidates(row["name_en"], row["slug"]):
                if c in known:
                    hit = c
                    break
                if c in ALIAS and ALIAS[c] in known:
                    hit = ALIAS[c]
                    break
        if hit is None:
            unmatched.append(row)
            continue
        used.add(hit)

        name_gg = (tier.get(hit) or builds.get(hit) or ("", ""))[0]
        r_tier = tier.get(hit, ("", ""))[1]
        r_builds = builds.get(hit, ("", ""))[1]
        r_page = pages.get(hit, "")

        labels = [x for x in (r_tier, r_builds, r_page) if x]
        agree = "" if len(labels) < 2 else ("true" if len(set(labels)) == 1 else "false")

        rows.append([
            row["char_id"], row["slug"], name_gg, hit,
            r_tier, r_builds, r_page, agree,
            TIER_LIST_URL, today, version, "community",
        ])

    rows.sort(key=lambda r: int(r[0]))

    print(f"tier-list 覆盖 {len(tier)} 个；builds 覆盖 {len(builds)} 个；角色页补充 {len(pages)} 个")
    print(f"角色表 {len(chars)} 行；写入 {len(rows)} 行")
    conflicted = [r for r in rows if r[7] == "false"]
    print(f"来源冲突 {len(conflicted)} 行:")
    for r in conflicted:
        print(f"  {r[1]:24} tier-list={r[4] or '-':9} builds={r[5] or '-':9} page={r[6] or '-'}")
    single = [r for r in rows if r[7] == ""]
    print(f"仅单一来源、无法交叉核对 {len(single)} 行")
    if unmatched:
        print(f"未能匹配到社区标签 {len(unmatched)} 行（多为旅行者分元素变体，源数据无角色级记录）:")
        for r in unmatched:
            print(f"  {r['slug']:24} {r['name_en']}")

    if args.dry_run:
        print("[dry-run] 未写文件")
        return 0

    out = repo / "data/characters/community_roles.csv"
    with out.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.writer(fh, lineterminator="\n")
        writer.writerow(HEADER)
        writer.writerows(rows)
    print(f"已写入 {out.relative_to(repo)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
