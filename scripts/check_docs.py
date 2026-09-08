from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

errors = []
section_files = []
for folder in [
    "00-foundation", "01-domain-checks", "02-health-model", "03-runtime",
    "04-platform", "05-product-experience", "06-quality-operations"
]:
    section_files.extend(sorted((DOCS / folder).glob("*.md")))

if len(section_files) != 28:
    errors.append(f"Expected 28 PRD section files, found {len(section_files)}")

all_text = "\n".join(p.read_text(encoding="utf-8") for p in section_files + list((DOCS / "appendices").glob("*.md")))

obsolete = ["CheckMessage", "providerConfigVersion", "dependency_unavailable"]
for term in obsolete:
    if term in all_text:
        errors.append(f"Obsolete term present: {term}")

if re.search(r"AC-\d+\.NEW", all_text):
    errors.append("Temporary AC-*.NEW numbering is present")
if "Следующий раздел" in all_text:
    errors.append("Temporary 'Следующий раздел' footer is present")

# Section numbering and AC sequences
for p in section_files:
    txt = p.read_text(encoding="utf-8")
    m = re.match(r"# (\d+)\.", txt)
    if not m:
        errors.append(f"Missing numeric H1 in {p}")
        continue
    sec = int(m.group(1))
    criteria = re.findall(r"^(?:-\s+\*\*|###\s+)AC-(\d+)\.(\d+)\b", txt, re.MULTILINE)
    ac = [int(number) for _, number in criteria]
    if not ac:
        errors.append(f"Missing Acceptance Criteria in §{sec}")
    if any(int(section) != sec for section, _ in criteria):
        errors.append(f"Acceptance Criteria reference the wrong section in §{sec}")
    if ac != list(range(1, len(ac)+1)):
        errors.append(f"Non-sequential AC numbering in §{sec}: {ac}")

# Critical cross-section invariants
s10 = (DOCS / "01-domain-checks" / "10-ssl-tls.md").read_text(encoding="utf-8")
if "dependencyMode = ANY" not in s10 and "dependencyMode: ANY" not in s10:
    errors.append("§10 must explicitly bind TLS certificate checks to dependencyMode=ANY")

s17 = (DOCS / "03-runtime" / "17-internal-web-api-contract.md").read_text(encoding="utf-8")
if "PENDING | RUNNING" not in s17:
    errors.append("§17 CreateScanResponse must expose PENDING | RUNNING acceptance states")
if "422" not in s17 or "PARTIAL" not in s17:
    errors.append("§17 must explicitly reject PARTIAL with all three categories via 422")

# Ensure generated snapshot matches canonical sources without silently rebuilding it.
snapshot_check = subprocess.run(
    [sys.executable, str(ROOT / "scripts" / "build_prd.py"), "--check"],
    capture_output=True,
    text=True,
)
if snapshot_check.returncode:
    errors.append((snapshot_check.stdout + snapshot_check.stderr).strip())

if errors:
    print("Documentation integrity check FAILED:\n")
    for e in errors:
        print(f"- {e}")
    raise SystemExit(1)
print("Documentation integrity check PASSED")
