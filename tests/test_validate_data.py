"""scripts/validate_data.py 的单元测试。

运行: python -m unittest discover -s tests -p "test_*.py"

校验脚本自身也会出错（本会话就修过「多值数值字段误报」与「扫到 .cache 目录」
两个 bug），所以它必须被测试覆盖——否则「校验通过」这个结论本身就不可信。
"""

import io
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

# 让 tests/ 能 import scripts/validate_data.py
REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "scripts"))

import validate_data as vd  # noqa: E402


class ValidatorTestCase(unittest.TestCase):
    """提供临时文件与错误桶重置。"""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tmp.name)
        self._reset()

    def tearDown(self):
        self._tmp.cleanup()

    @staticmethod
    def _reset():
        for bucket in (vd.CSV_ERRORS, vd.LINK_ERRORS, vd.PAIR_ERRORS, vd.EMPTY_TABLES):
            bucket.clear()

    def write(self, name, text, encoding="utf-8", newline=""):
        p = self.tmp / name
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "w", encoding=encoding, newline=newline) as f:
            f.write(text)
        return p

    def check(self, path):
        self._reset()
        vd.check_csv(path)
        return list(vd.CSV_ERRORS)


class TestIsNumericField(ValidatorTestCase):
    def test_pct_and_value_and_level_suffixes(self):
        for name in ("res_pct", "duration_sec", "base_hp_lv90", "value_lv1", "value_lv10",
                     "base_multiplier", "aura_consumed_ratio"):
            self.assertTrue(vd.is_numeric_field(name), name)

    def test_registered_names(self):
        for name in ("rarity", "level", "param_refs", "energy_value", "burst_cost"):
            self.assertTrue(vd.is_numeric_field(name), name)

    def test_overrides_are_not_numeric(self):
        # value_unit 形如 "flat;pct"，绝不能被当成数值
        for name in ("value_unit", "sub_stat", "scaling_stat"):
            self.assertFalse(vd.is_numeric_field(name), name)


class TestCheckCsv(ValidatorTestCase):
    HEADER = "id,name_zh,value,version,source\n"

    def test_valid_csv_passes(self):
        p = self.write("ok.csv", self.HEADER + "1,胡桃,33.1,7.1,datamine\n")
        self.assertEqual(self.check(p), [])

    def test_bom_is_rejected(self):
        p = self.write("bom.csv", self.HEADER + "1,胡桃,1,7.1,datamine\n", encoding="utf-8-sig")
        self.assertTrue(any("BOM" in e for e in self.check(p)))

    def test_crlf_is_rejected(self):
        p = self.write("crlf.csv", self.HEADER + "1,胡桃,1,7.1,datamine\n", newline="\r\n")
        self.assertTrue(any("CRLF" in e or "换行" in e for e in self.check(p)))

    def test_ascii_comma_in_cell_is_rejected(self):
        p = self.write("comma.csv", self.HEADER + '1,"胡,桃",1,7.1,datamine\n')
        errs = self.check(p)
        self.assertTrue(any("逗号" in e for e in errs), errs)

    def test_non_numeric_in_numeric_field_is_rejected(self):
        p = self.write("bad.csv", self.HEADER + "1,胡桃,约33%,7.1,datamine\n")
        self.assertTrue(any("应为数值" in e for e in self.check(p)))

    def test_multi_value_numeric_field_is_accepted(self):
        """回归：多值数值字段（; 分隔）曾因整格 float() 而误报。"""
        header = "char_id,label_index,param_refs,value_lv1,version,source\n"
        p = self.write("multi.csv", header + "10000046,1,5;6,593.2278;5.04,7.1,datamine\n")
        self.assertEqual(self.check(p), [])

    def test_multi_value_numeric_field_with_bad_part_is_rejected(self):
        header = "char_id,label_index,param_refs,value_lv1,version,source\n"
        p = self.write("multi_bad.csv", header + "10000046,1,5;6,593.2;abc,7.1,datamine\n")
        self.assertTrue(any("abc" in e for e in self.check(p)))

    def test_na_and_question_mark_are_nullish(self):
        p = self.write("nullish.csv", self.HEADER + "1,胡桃,NA,7.1,datamine\n2,行秋,?,7.1,datamine\n")
        self.assertEqual(self.check(p), [])

    def test_wrong_column_count_is_rejected(self):
        p = self.write("wide.csv", self.HEADER + "1,胡桃,1,7.1,datamine,多余\n")
        self.assertTrue(any("列数" in e for e in self.check(p)))

    def test_header_must_be_snake_case(self):
        p = self.write("camel.csv", "id,nameZh,version,source\n1,胡桃,7.1,datamine\n")
        self.assertTrue(any("snake_case" in e for e in self.check(p)))

    def test_duplicate_primary_key_is_rejected(self):
        p = self.write("pk.csv", self.HEADER + "1,胡桃,1,7.1,datamine\n1,行秋,2,7.1,datamine\n")
        # 该临时路径默认未登记主键，测试内显式登记
        vd.PRIMARY_KEYS[p.as_posix()] = ["id"]
        try:
            errs = self.check(p)
            self.assertTrue(any("主键" in e for e in errs), errs)
        finally:
            vd.PRIMARY_KEYS.pop(p.as_posix(), None)

    def test_empty_table_is_noted_not_errored(self):
        p = self.write("empty.csv", self.HEADER)
        errs = self.check(p)
        self.assertEqual(errs, [])
        self.assertTrue(any("empty.csv" in t for t in vd.EMPTY_TABLES))


class TestIterFiles(ValidatorTestCase):
    def test_excludes_cache_and_vcs_dirs(self):
        """回归：曾扫到 .cache/ 里从上游抓取的原始文件，把它们内部的相对链接误报为错误。"""
        (self.tmp / "docs").mkdir()
        (self.tmp / "docs" / "keep.md").write_text("x", encoding="utf-8")
        for d in (".cache", ".git", "node_modules"):
            (self.tmp / d).mkdir()
            (self.tmp / d / "skip.md").write_text("x", encoding="utf-8")
        found = {p.name for p in vd.iter_files("*.md", self.tmp)}
        self.assertEqual(found, {"keep.md"})

    def test_nested_cache_dir_is_excluded(self):
        (self.tmp / "a" / ".cache").mkdir(parents=True)
        (self.tmp / "a" / ".cache" / "s.md").write_text("x", encoding="utf-8")
        (self.tmp / "a" / "k.md").write_text("x", encoding="utf-8")
        found = {p.name for p in vd.iter_files("*.md", self.tmp)}
        self.assertEqual(found, {"k.md"})


class TestMarkdown(ValidatorTestCase):
    def test_links_inside_code_fences_are_ignored(self):
        """回归：围栏代码块需要用 in_fence 跟踪，否则块内的链接会被当成真链接。"""
        p = self.write("m.md", "\n".join([
            "# t",
            "[真链接](real.md)",
            "```",
            "[假链接](missing.md)",
            "```",
            "[另一个真链接](other.md)",
        ]) + "\n")
        (self.tmp / "real.md").write_text("x", encoding="utf-8")
        (self.tmp / "other.md").write_text("x", encoding="utf-8")
        vd.check_markdown_links(p)
        self.assertEqual(list(vd.LINK_ERRORS), [])

    def test_missing_link_target_is_reported(self):
        p = self.write("m2.md", "[坏链接](nope.md)\n")
        vd.check_markdown_links(p)
        self.assertTrue(any("nope.md" in e for e in vd.LINK_ERRORS))

    def test_collect_shell_commands_strips_comments(self):
        p = self.write("c.md", "\n".join([
            "```bash",
            "# 这是注释",
            "python scripts/validate_data.py   # 行尾注释",
            "node scripts/import_genshin_db.mjs --in x --targets all",
            "```",
            "```python",
            "print('不是 shell 命令')",
            "```",
        ]) + "\n")
        cmds = vd.collect_shell_commands(p)
        self.assertIn("python scripts/validate_data.py", cmds)
        self.assertIn("node scripts/import_genshin_db.mjs --in x --targets all", cmds)
        self.assertNotIn("print('不是 shell 命令')", " ".join(cmds))

    def test_bilingual_pair_detects_missing_command(self):
        a = self.write("A.md", "```bash\ncmd-one\n```\n")
        b = self.write("B.md", "```bash\ncmd-one\ncmd-two\n```\n")
        saved = list(vd.BILINGUAL_PAIRS)
        vd.BILINGUAL_PAIRS[:] = [(a, b)]
        self._reset()
        try:
            vd.check_bilingual_pairs()
            self.assertTrue(any("cmd-two" in e for e in vd.PAIR_ERRORS), vd.PAIR_ERRORS)
        finally:
            vd.BILINGUAL_PAIRS[:] = saved


class TestRepoInvariants(ValidatorTestCase):
    """对**真实仓库**的断言：这些表/字段是本知识库的对外承诺。"""

    def test_repo_validator_passes(self):
        # vd.main() 用 argparse 读 sys.argv；在 unittest 下会被 discover 的参数干扰
        argv = sys.argv
        sys.argv = ["validate_data.py"]
        try:
            buf = io.StringIO()
            with redirect_stdout(buf):
                code = vd.main()
        finally:
            sys.argv = argv
        self.assertEqual(code, 0, buf.getvalue())

    def test_all_registered_tables_exist(self):
        for rel_path in vd.PRIMARY_KEYS:
            self.assertTrue((REPO / rel_path).is_file(), f"缺少已登记的表 {rel_path}")

    def test_expected_tables_are_registered(self):
        for rel_path in (
            "data/characters/character_talents.csv",
            "data/characters/character_talent_params.csv",
            "data/characters/character_constellations.csv",
            "data/elements/level_coefficients.csv",
            "data/elements/reactions.csv",
            "data/elements/aura_consumption.csv",
            "data/elements/particle_energy.csv",
        ):
            self.assertIn(rel_path, vd.PRIMARY_KEYS)


if __name__ == "__main__":
    unittest.main()
