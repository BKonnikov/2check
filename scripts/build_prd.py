from pathlib import Path
import argparse

parser = argparse.ArgumentParser(description="Build or verify the compiled PRD.")
parser.add_argument("--check", action="store_true", help="Verify the snapshot without writing files.")
args = parser.parse_args()

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
OUT = ROOT / "dist" / "2check_MVP_1.0_PRD.md"

ORDER = [DOCS / "_meta" / "preamble.md"]
for folder in [
    "00-foundation",
    "01-domain-checks",
    "02-health-model",
    "03-runtime",
    "04-platform",
    "05-product-experience",
    "06-quality-operations",
]:
    ORDER.extend(sorted((DOCS / folder).glob("*.md")))
ORDER.extend([
    DOCS / "appendices" / "A-normative-ownership-map.md",
    DOCS / "appendices" / "B-consolidation-invariants.md",
])

missing = [p for p in ORDER if not p.exists()]
if missing:
    raise SystemExit("Missing canonical files:\n" + "\n".join(map(str, missing)))

content = "\n\n".join(p.read_text(encoding="utf-8").strip() for p in ORDER) + "\n"
if args.check:
    if not OUT.is_file() or OUT.read_bytes() != content.encode("utf-8"):
        raise SystemExit(
            f"{OUT.relative_to(ROOT)} is missing or out of date; "
            "run python3 scripts/build_prd.py"
        )
    print(f"Compiled PRD is up to date ({len(ORDER)} canonical files)")
else:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(content, encoding="utf-8")
    print(f"Built {OUT.relative_to(ROOT)} from {len(ORDER)} canonical files")
