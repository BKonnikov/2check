"""Read-only validation of paired sources, contracts, navigation, and builds."""

from collections import Counter
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit

sys.dont_write_bytecode = True
from docs_common import (
    ROOT, LANGUAGES, STATE_FILE, FROZEN_CONCEPT_SHA256, CRITERIA, FENCED,
    body, canonical_files, concept_contracts, contract_blocks, digest, generated_outputs,
    prose_literals, sections, translation_hashes, translation_pairs,
)


def anchors(text):
    found = set(re.findall(r'<a\s+id="([^"]+)"', text))
    used = Counter()
    for heading in re.findall(r'^#{1,6} (.+)$', FENCED.sub('', text), re.MULTILINE):
        heading = re.sub(r'\[([^]]+)\]\([^)]+\)', r'\1', heading)
        slug = re.sub(r'[^\w\- ]', '', heading.lower()).replace(' ', '-')
        suffix = used[slug]
        used[slug] += 1
        found.add(slug + (f'-{suffix}' if suffix else ''))
    return found


def main():
    errors = []
    if digest(ROOT / 'docs/concept.md') != FROZEN_CONCEPT_SHA256:
        errors.append('The frozen docs/concept.md has changed.')

    current = translation_hashes()
    try:
        recorded = json.loads(STATE_FILE.read_text(encoding='utf-8'))['pairs']
    except (OSError, ValueError, KeyError):
        recorded = {}
    if current != recorded:
        changed = sorted(name for name in current.keys() | recorded.keys() if current.get(name) != recorded.get(name))
        errors.append('Unreviewed RU/EN changes: ' + ', '.join(changed) + '. Compare both editions and record with update_translation_state.py --reviewed.')

    counts = {}
    for language in LANGUAGES:
        files = sections(language)
        counts[language] = 0
        for number, path in enumerate(files, 1):
            text = body(path)
            if not text.startswith(f'# {number}. '):
                errors.append(f'{language}: section heading does not match {path.name}')
            criteria = [(int(section), int(item)) for section, item in CRITERIA.findall(text)]
            if not criteria or criteria != [(number, i) for i in range(1, len(criteria)+1)]:
                errors.append(f'{language}: missing or non-sequential AC in section {number}')
            counts[language] += len(criteria)
            if language == 'en':
                # Cyrillic is permitted only in the language switch, removed by body().
                if re.search('[А-Яа-яЁё]', text):
                    errors.append(f'en: untranslated Cyrillic text in {path.name}')
        all_text = '\n'.join(body(p) for p in canonical_files(language))
        for term in ('CheckMessage', 'providerConfigVersion', 'dependency_unavailable'):
            if term in all_text:
                errors.append(f'{language}: obsolete term {term}')
        if re.search(r'AC-\d+\.NEW', all_text) or 'Следующий раздел' in all_text:
            errors.append(f'{language}: temporary consolidation marker remains')
        tls = body(files[9])
        if 'dependencyMode = ANY' not in tls and 'dependencyMode: ANY' not in tls:
            errors.append(f'{language}: TLS certificate dependencyMode=ANY is missing')
        api = body(files[16])
        if 'PENDING | RUNNING' not in api or '422' not in api or 'PARTIAL' not in api:
            errors.append(f'{language}: required API acceptance/scope invariant is missing')

    concept_pair = (ROOT / 'docs/ru/01-concept.md', ROOT / 'docs/en/01-concept.md')
    original_contracts = concept_contracts((ROOT / 'docs/concept.md').read_text(encoding='utf-8'))
    for concept in concept_pair:
        if concept_contracts(body(concept)) != original_contracts:
            errors.append(f'Concept data contracts differ from the frozen source: {concept.relative_to(ROOT)}')

    for ru, en in [concept_pair, *zip(sections('ru'), sections('en'))]:
        left, right = body(ru), body(en)
        if ru.name != en.name:
            errors.append(f'RU/EN section filenames differ: {ru.name} / {en.name}')
        if CRITERIA.findall(left) != CRITERIA.findall(right):
            errors.append(f'RU/EN acceptance criteria differ: {ru.name}')
        heading_pattern = r'^#{1,6} (\d+(?:\.\d+)*)\.'
        if re.findall(heading_pattern, left, re.MULTILINE) != re.findall(heading_pattern, right, re.MULTILINE):
            errors.append(f'RU/EN subsection numbering differs: {ru.name}')
        if ru != concept_pair[0] and contract_blocks(left) != contract_blocks(right):
            errors.append(f'RU/EN technical blocks differ: {ru.name}')
        if prose_literals(left) != prose_literals(right):
            errors.append(f'RU/EN inline contract literals differ: {ru.name}')
        if Counter(re.findall(r'§(\d+(?:\.\d+)*)', left)) != Counter(re.findall(r'§(\d+(?:\.\d+)*)', right)):
            errors.append(f'RU/EN section references differ: {ru.name}')
        numbers = r'(?<![\w])\d+(?:[./]\d+)*'
        if Counter(re.findall(numbers, left)) != Counter(re.findall(numbers, right)):
            errors.append(f'RU/EN numerical values differ: {ru.name}')

    for path, expected in generated_outputs().items():
        if not path.is_file() or path.read_bytes() != expected.encode('utf-8'):
            errors.append(f'Outdated generated file: {path.relative_to(ROOT)}')

    # Check every Markdown link, including links in newly added pages.
    documents = [*ROOT.glob('*.md'), *(ROOT/'docs').rglob('*.md'), *(ROOT/'dist').rglob('*.md'), *(ROOT/'.github').rglob('*.md')]
    link_count = 0
    for document in documents:
        prose = FENCED.sub('', document.read_text(encoding='utf-8'))
        for raw in re.findall(r'\[[^]\n]+\]\(([^)]+)\)', prose):
            target = urlsplit(raw.strip('<>'))
            if target.scheme or target.netloc:
                continue
            path = (document.parent / unquote(target.path)).resolve() if target.path else document
            link_count += 1
            if not path.exists():
                errors.append(f'Broken link in {document.relative_to(ROOT)}: {raw}')
            elif target.fragment and path.is_file() and path.suffix == '.md':
                if unquote(target.fragment) not in anchors(path.read_text(encoding='utf-8')):
                    errors.append(f'Broken anchor in {document.relative_to(ROOT)}: {raw}')

    if errors:
        print('Documentation integrity check FAILED:')
        for error in errors:
            print(f'- {error}')
        return 1
    print(f'Documentation integrity check PASSED: RU + EN, {len(current)} reviewed pairs, {counts["ru"]} AC per edition, {link_count} local links.')
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (OSError, ValueError) as error:
        raise SystemExit(str(error))
