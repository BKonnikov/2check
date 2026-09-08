"""Shared, deterministic document inventory and rendering helpers."""

from collections import Counter
import hashlib
import os
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
LANGUAGES = ('ru', 'en')
PRD_NAME = '2check_MVP_1.0_PRD.md'
STATE_FILE = ROOT / 'docs/_meta/translation-state.json'
FROZEN_CONCEPT_SHA256 = '70f107de60a21504884c7e2a65befa092ea7051a53907928a2116d898d90ac16'
NAVIGATION = re.compile(r'<!-- nav:start -->.*?<!-- nav:end -->\s*', re.DOTALL)
FENCED = re.compile(r'```[^\n]*\n(.*?)```', re.DOTALL)
CRITERIA = re.compile(r'^- \*\*AC-(\d+)\.(\d+)\*\*', re.MULTILINE)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def body(path):
    return NAVIGATION.sub('', path.read_text(encoding='utf-8')).strip()


def sections(language):
    files = sorted((ROOT / f'docs/{language}/prd').glob('[0-9][0-9]-*.md'))
    if [int(p.name[:2]) for p in files] != list(range(1, 29)):
        raise ValueError(f'{language}: expected exactly sections 01–28')
    return files


def canonical_files(language):
    folder = ROOT / f'docs/{language}/prd'
    files = [folder / 'preamble.md', *sections(language), folder / 'appendix-a.md', folder / 'appendix-b.md']
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


def render_prd(language, output):
    files = canonical_files(language)
    concept = relative_link(ROOT / f'docs/{language}/01-concept.md', output)
    contents = relative_link(ROOT / f'docs/{language}/02-prd.md', output)
    other = 'en' if language == 'ru' else 'ru'
    alternate = relative_link(ROOT / f'dist/{other}/{PRD_NAME}', output)
    labels = ('01. Концепция', 'Разделы PRD', 'English', 'Оглавление') if language == 'ru' else ('01. Concept', 'PRD Sections', 'Русский', 'Contents')
    nav = f'[{labels[0]}]({concept}) · [{labels[1]}]({contents}) · [{labels[2]}]({alternate})'
    toc = [f'## {labels[3]}', '']
    parts = []
    for index, path in enumerate(files[1:]):
        text = body(path)
        title = text.splitlines()[0].removeprefix('# ')
        anchor = f'section-{index+1:02d}' if index < 28 else f'appendix-{"a" if index == 28 else "b"}'
        toc.append(f'- [{title}](#{anchor})')
        parts.append(f'<a id="{anchor}"></a>\n\n{text}')
    return '\n\n'.join([body(files[0]), nav, '\n'.join(toc), *parts]) + '\n'


def generated_outputs():
    result = {}
    for language in LANGUAGES:
        path = ROOT / f'dist/{language}/{PRD_NAME}'
        result[path] = render_prd(language, path)
    legacy = ROOT / f'dist/{PRD_NAME}'
    result[legacy] = render_prd('ru', legacy)
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
