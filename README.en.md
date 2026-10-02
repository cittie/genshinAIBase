# Genshin Impact AI Knowledge Base (genshinAIBase)

[简体中文](README.md) ｜ **English**

> 🤖 **If you are an AI agent or an automation script, read [AGENTS.md](AGENTS.md) first** — the data contract, retrieval order, and output requirements live there.
> This file is for humans and focuses on **how to get the environment running from scratch**.

An **AI-oriented** structured knowledge base for Genshin Impact: Markdown for mechanics and decision rules, CSV for numbers and enums.

---

## What This Repository Solves

| Problem type | Example question | Where to look |
|---|---|---|
| Team building | Which role is my main DPS missing? How do I pair elemental resonances? | [rules/team-building.md](rules/team-building.md) |
| Artifact selection | 4-piece or 2+2? Which main stats? | [rules/artifact-selection.md](rules/artifact-selection.md) |
| Weapon selection | What are the budget alternatives to the signature weapon? | [rules/weapon-selection.md](rules/weapon-selection.md) |
| Mechanics Q&A | How is the DEF multiplier computed? How much does an amplifying reaction add? | [docs/README.md](docs/README.md) |
| Stat priority | How should CRIT be balanced? Which substats are dead on this character? | [rules/stat-priority.md](rules/stat-priority.md) |
| Terminology | What do the community abbreviations and slang mean? | [docs/glossary.md](docs/glossary.md) |

---

## 1. Requirements

| Dependency | Version | Purpose | Required |
|---|---|---|---|
| **Python** | 3.8+ | Run the CSV / link validator | ✅ Yes |
| **git** | Any recent version | Clone the repository, commit changes | ✅ Yes |
| **Node.js** | 18+ | Regenerate data (build CSVs from source data) | ⬜ Optional |
| **curl + tar** | System defaults are fine | Download and unpack the source dataset | ⬜ Optional |

> **No `pip install` and no `npm install` are needed.**
> The validator uses only the Python standard library, and the importer uses only Node built-in modules.
> The repository ships no third-party runtime code — cloning it is enough.

Check your local versions:

```bash
python --version
node --version
git --version
```

---

## 2. Quick Start

### Step 1 — Get the repository

```bash
git clone <repo-url>
cd genshinAIBase
```

### Step 2 — Self-check (verify the environment works)

```bash
python scripts/validate_data.py
```

If you see `[OK] 校验通过`, the environment is fully working. This step checks:

- Every CSV: encoding (UTF-8 without BOM), line endings (LF), consistent column counts, primary-key uniqueness
- Numeric field formats and multi-value separators
- Every Markdown file: whether its **relative links point to files that actually exist**

To see errors only, without the summary:

```bash
python scripts/validate_data.py --quiet
```

> **Run this after every change.** CI (`.github/workflows/validate.yml`) runs the same script on push and pull requests.

### Step 3 (Optional) — Regenerate the data

The repository already contains the generated CSVs, so **you do not need this step for normal reading.**
Run it only when you want to upgrade the data version (for example, after a game update).

Download and unpack the source data (a ~38 MB tarball expanding to a 190 MB JSON file):

```bash
curl -L -o genshin-db.tgz https://registry.npmjs.org/genshin-db/-/genshin-db-5.2.14.tgz
tar -xzf genshin-db.tgz
```

First run a **dry run** to confirm the row counts and regression checks pass, writing no files:

```bash
node scripts/import_genshin_db.mjs --in package/src/min/data.min.json --dry-run
```

When that looks right, write the files and validate immediately:

```bash
node scripts/import_genshin_db.mjs --in package/src/min/data.min.json
python scripts/validate_data.py
```

Clean up the download (it is already in `.gitignore`, but deleting it saves disk space):

```bash
rm genshin-db.tgz
```

**If you hit `JavaScript heap out of memory`** (the source file is 190 MB, which can exceed the default heap on low-memory machines), raise the Node heap limit and rerun:

```bash
node --max-old-space-size=4096 scripts/import_genshin_db.mjs --in package/src/min/data.min.json
```

The importer has a built-in **regression gate**: 96 externally verified numbers
(16 characters × 6 fields). If any single one disagrees it aborts the write and exits with code 2.
When it fails, first decide whether the script broke or the expectation was mis-remembered.

Details: [scripts/README.md](scripts/README.md).

### Running the unit tests

The scripts' pure logic is unit-tested. **After changing any script you must run all
three commands below and have them pass** (CI enforces the same three):

```bash
python -m unittest discover -s tests -p "test_*.py"
node --test
python scripts/validate_data.py
```

> Run all three: the unit tests prove the **logic** is correct, and the validator proves
> the **data** satisfies the contract. Test cases deliberately target bugs that actually
> happened before; comments carry the matching regression number.

---

## 3. Windows Troubleshooting

### `python` produces no output at all

On Windows, `python` may resolve to the Microsoft Store stub, which neither prints nor errors.
Use the `py` launcher instead:

```powershell
py scripts/validate_data.py
```

Or run `Get-Command python` to find the real path and invoke that interpreter.

### Garbled Chinese text or symbols in the console

The Windows console may default to the GBK code page, which garbles Chinese output and can even raise `UnicodeEncodeError`:

```powershell
$env:PYTHONIOENCODING="utf-8"
```

(The validator already has an output-encoding fallback, but setting this is still recommended.)

---

## 4. Using It as an AI Knowledge Base

**Do not dump the whole repository into a context window.** Retrieve along this path instead:

```
AGENTS.md  →  index/INDEX.md  →  rules/*.md  →  data/**/*.csv  →  docs/mechanics/
```

That is: read the contract → locate files via the index → read the decision rules → pull the numbers → consult mechanics only when something is unclear.

### Minimal context packages

| Task | Files worth feeding |
|---|---|
| Team building | [AGENTS.md](AGENTS.md), [rules/team-building.md](rules/team-building.md), [data/characters/characters.csv](data/characters/characters.csv) |
| Artifact selection | [AGENTS.md](AGENTS.md), [rules/artifact-selection.md](rules/artifact-selection.md), [rules/stat-priority.md](rules/stat-priority.md) |
| Weapon selection | [AGENTS.md](AGENTS.md), [rules/weapon-selection.md](rules/weapon-selection.md) |
| Full navigation | [index/INDEX.md](index/INDEX.md) |

### Example prompt

```
You are a Genshin Impact team-building advisor.

1. Read AGENTS.md first to learn the data contract (units, missing values,
   join keys) and the retrieval order.
2. Use index/INDEX.md to locate the relevant files, then read rules/ and the
   CSVs under data/.
3. Always cite concrete file paths. If a number is not in this repository,
   say "not covered by this repository" explicitly. Never fill in estimates.
4. Separate mechanical facts (docs/ + data/) from strength judgements
   (rules/ + guides/).
```

---

## 5. Directory Overview

```
AGENTS.md      AI entry point: data contract, retrieval order, output requirements
README.md      Simplified Chinese version of this file
README.en.md   This file (English)
index/         Repository-wide navigation, locating files by topic
docs/          Objective mechanics: damage formula, reactions, stats, energy, artifact/weapon/talent systems
rules/         AI decision rules: stat priority, team building, artifacts, weapons
data/          Structured data (CSV): characters, weapons, artifacts, elements, enemies, teams
guides/        Guide-style content: character builds, team comps (subjective; states its baseline and version)
scripts/       Validator and data importer
```

Full details: [index/INDEX.md](index/INDEX.md).

---

## 6. Data Coverage Status

| Data | Status |
|---|---|
| Character base data (124 characters, full v7.1) | ✅ **Populated**, `source=datamine` |
| Character roles (functional roles / damage type) | ⏳ Pending (a derived field that needs evidence) |
| Weapons / artifacts / reactions / enemies / teams | ⏳ Header only (the field contract is frozen) |

Field definitions: [data/schema/README.md](data/schema/README.md) and [data/README.md](data/README.md).

---

## 7. Data Conventions (At a Glance)

`data/characters/characters.csv`:

```csv
char_id,slug,name_zh,name_en,rarity,element,weapon_type,region,base_hp_lv90,...
10000046,hu_tao,胡桃,Hu Tao,5,pyro,polearm,liyue,15552,...
```

Key rules (full version in [AGENTS.md](AGENTS.md)):

- **Percentages are stored as percent numbers**, in fields ending with `_pct`: `19.2` means 19.2%
- **Numeric cells contain digits only**: never `33.1%`, `1,234`, or `about 33%`
- **An empty cell means unknown** (not zero) ｜ `NA` means genuinely not applicable ｜ `?` means disputed
- **Multi-value fields are separated by `;`**, never by commas
- **Cross-table joins use IDs and `slug` only**, never Chinese names
- Every row carries `version` (game version) and `source` (data provenance)

---

## 8. Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The hard rules:

1. Numbers must be traceable; **never fill in estimates** — leave the cell empty and add `?` when unsure
2. Never change an existing `char_id` or `slug`
3. CSV columns may only be **appended**, never inserted or renamed
4. Run `python scripts/validate_data.py` before committing
5. When you edit [README.md](README.md) you must update [README.en.md](README.en.md) in the same change
   (their commands and links must stay in sync; the validator checks this)

Change history: [CHANGELOG.md](CHANGELOG.md).

---

## 9. Disclaimer

This is an unofficial project, not affiliated with or endorsed by miHoYo / HoYoverse.
Game titles, character names, and related content belong to their respective rights holders.
This repository contains only self-curated data and conclusions, **ships no game asset files**, and is intended for study and research only.

The code and original written content in this project are released under the [MIT License](LICENSE) (Copyright © 2026 Yee).

Data provenance and compliance notes: [data/README.md](data/README.md).
