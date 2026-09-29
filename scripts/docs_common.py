"""Shared, deterministic document inventory and rendering helpers."""

from collections import Counter
import hashlib
import os
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
LANGUAGES = ('ru', 'en')
PRD_NAME = '2check_MVP_1.0_PRD.md'

# One entry per specification. MVP 1.0 is frozen at 28 sections, so a later release states its
# requirements in a document of its own rather than growing that one; the checks, the RU/EN
# pairing and the rendering are the same for every edition listed here.
EDITIONS = (
    {'key': '1.0', 'folder': 'prd', 'count': 28, 'output': PRD_NAME,
     'contents': '02-prd.md', 'appendices': ('appendix-a.md', 'appendix-b.md'), 'legacy': True},
    # count is None while an edition is still being written: the sections must run from 01
    # without a gap, but the total is not yet a fact to freeze.
    {'key': '1.1', 'folder': 'prd-1.1', 'count': None, 'output': '2check_MVP_1.1_PRD.md',
     'contents': '03-prd-1.1.md', 'appendices': ('appendix-a.md',), 'legacy': False},
)
BASE_EDITION = EDITIONS[0]
STATE_FILE = ROOT / 'docs/_meta/translation-state.json'
FROZEN_CONCEPT_SHA256 = '70f107de60a21504884c7e2a65befa092ea7051a53907928a2116d898d90ac16'
NAVIGATION = re.compile(r'<!-- nav:start -->.*?<!-- nav:end -->\s*', re.DOTALL)
FENCED = re.compile(r'```[^\n]*\n(.*?)```', re.DOTALL)
CRITERIA = re.compile(r'^- \*\*AC-(\d+)\.(\d+)\*\*', re.MULTILINE)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def body(path):
    return NAVIGATION.sub('', path.read_text(encoding='utf-8')).strip()


def sections(language, edition=BASE_EDITION):
    files = sorted((ROOT / f'docs/{language}/{edition["folder"]}').glob('[0-9][0-9]-*.md'))
    total = edition['count'] or len(files)
    if not files or [int(p.name[:2]) for p in files] != list(range(1, total + 1)):
        raise ValueError(f'{language}: expected sections 01–{total:02d} in {edition["folder"]}')
    return files


def canonical_files(language, edition=BASE_EDITION):
    folder = ROOT / f'docs/{language}/{edition["folder"]}'
    files = [folder / 'preamble.md', *sections(language, edition),
             *(folder / name for name in edition['appendices'])]
    for path in files:
        if not path.is_file():
            raise ValueError(f'Missing canonical file: {path.relative_to(ROOT)}')
    return files


def translation_pairs():
    relative_paths = set()
    for language in LANGUAGES:
        folder = ROOT / f'docs/{language}'
        relative_paths.update(p.relative_to(folder) for p in folder.rglob('*.md'))
    pairs = {
        f'docs/{p.as_posix()}': (ROOT / 'docs/ru' / p, ROOT / 'docs/en' / p)
        for p in sorted(relative_paths)
    }
    for name, ru, en in [
        ('README', 'README.md', 'README.en.md'),
        ('CONTRIBUTING', 'CONTRIBUTING.md', 'CONTRIBUTING.en.md'),
        ('PR-template', '.github/PULL_REQUEST_TEMPLATE/documentation.md', '.github/PULL_REQUEST_TEMPLATE/documentation.en.md'),
    ]:
        pairs[name] = (ROOT / ru, ROOT / en)
    return pairs


def translation_hashes():
    result = {}
    for name, paths in translation_pairs().items():
        for path in paths:
            if not path.is_file():
                raise ValueError(f'Missing translation: {path.relative_to(ROOT)}')
        result[name] = {lang: digest(path) for lang, path in zip(LANGUAGES, paths)}
    return result


def relative_link(target, output):
    return Path(os.path.relpath(target, output.parent)).as_posix()


def render_prd(language, output, edition=BASE_EDITION):
    files = canonical_files(language, edition)
    count = edition['count'] or len(files) - 1 - len(edition['appendices'])
    concept = relative_link(ROOT / f'docs/{language}/01-concept.md', output)
    contents = relative_link(ROOT / f'docs/{language}/{edition["contents"]}', output)
    other = 'en' if language == 'ru' else 'ru'
    alternate = relative_link(ROOT / f'dist/{other}/{edition["output"]}', output)
    labels = ('01. Концепция', 'Разделы PRD', 'English', 'Оглавление') if language == 'ru' else ('01. Concept', 'PRD Sections', 'Русский', 'Contents')
    nav = f'[{labels[0]}]({concept}) · [{labels[1]}]({contents}) · [{labels[2]}]({alternate})'
    toc = [f'## {labels[3]}', '']
    parts = []
    for index, path in enumerate(files[1:]):
        text = body(path)
        title = text.splitlines()[0].removeprefix('# ')
        letter = chr(ord('a') + index - count)
        anchor = f'section-{index+1:02d}' if index < count else f'appendix-{letter}'
        toc.append(f'- [{title}](#{anchor})')
        parts.append(f'<a id="{anchor}"></a>\n\n{text}')
    return '\n\n'.join([body(files[0]), nav, '\n'.join(toc), *parts]) + '\n'


def generated_outputs():
    result = {}
    for edition in EDITIONS:
        for language in LANGUAGES:
            path = ROOT / f'dist/{language}/{edition["output"]}'
            result[path] = render_prd(language, path, edition)
        if edition['legacy']:
            # The Russian copy at the root of dist/ predates the two-language layout and is kept
            # so that links published before it still resolve.
            legacy = ROOT / f'dist/{edition["output"]}'
            result[legacy] = render_prd('ru', legacy, edition)
    return result


def contract_blocks(text):
    # Only the two localized interface labels differ inside PRD examples.
    return [block.replace('Домен', 'Domain').replace('Поделиться', 'Share') for block in FENCED.findall(text)]


def concept_contracts(text):
    contracts = {}
    for identifier in ('CanonicalDomain {', 'NormalizedDomainRegistration {'):
        matching = [block for block in FENCED.findall(text) if identifier in block]
        if len(matching) != 1:
            raise ValueError(f'Expected one concept contract: {identifier}')
        block = matching[0].split(identifier, 1)[1]
        contracts[identifier] = '\n'.join(re.sub(r'//.*', '', line).rstrip() for line in block.splitlines())
    return contracts


def prose_literals(text):
    prose = FENCED.sub('', text)
    return Counter(re.findall(r'(?<!`)`([^`\n]+)`(?!`)', prose))
