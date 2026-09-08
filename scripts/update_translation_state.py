"""Record a completed human/editorial comparison of the RU and EN editions."""

import argparse
import json
import sys

sys.dont_write_bytecode = True
from docs_common import STATE_FILE, translation_hashes


def main():
    parser = argparse.ArgumentParser(description='Record reviewed RU/EN pairs; this does not translate or review text.')
    parser.add_argument('--reviewed', action='store_true', help='Confirm that both editions were read and compared.')
    args = parser.parse_args()
    if not args.reviewed:
        parser.error('Read and compare both editions first, then pass --reviewed.')
    state = {'schemaVersion': 1, 'pairs': translation_hashes()}
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Recorded editorial review of {len(state["pairs"])} RU/EN pairs.')


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError) as error:
        raise SystemExit(str(error))
