"""Build both language editions and the legacy Russian output."""

import argparse
import sys

sys.dont_write_bytecode = True
from docs_common import ROOT, generated_outputs


def main():
    parser = argparse.ArgumentParser(description='Build or verify both PRD language editions.')
    parser.add_argument('--check', action='store_true', help='Verify generated files without writing them.')
    args = parser.parse_args()
    outputs = generated_outputs()
    stale = []
    for path, content in outputs.items():
        data = content.encode('utf-8')
        if args.check:
            if not path.is_file() or path.read_bytes() != data:
                stale.append(str(path.relative_to(ROOT)))
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
    if stale:
        raise SystemExit('Missing or outdated generated files: ' + ', '.join(stale) + '; run python3 scripts/build_prd.py')
    print('Generated documents are up to date: RU + EN.' if args.check else 'Built RU + EN PRDs from 31 canonical files each; legacy Russian copy updated.')


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError) as error:
        raise SystemExit(str(error))
