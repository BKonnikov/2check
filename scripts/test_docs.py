"""Exercise documentation checks against isolated, deliberately invalid copies."""

from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

REPO=Path(__file__).resolve().parents[1]

with tempfile.TemporaryDirectory(prefix='2check-bilingual-tests-') as tmp:
    root=Path(tmp)
    for folder in ('docs','dist','scripts','.github'):
        shutil.copytree(REPO/folder,root/folder)
    for file in REPO.glob('*.md'):
        shutil.copyfile(file,root/file.name)
    baseline={p.relative_to(root):p.read_bytes() for p in root.rglob('*') if p.is_file()}

    def reset():
        for file in root.rglob('*'):
            if file.is_file() and file.relative_to(root) not in baseline:
                file.unlink()
        for file,content in baseline.items():
            (root/file).parent.mkdir(parents=True,exist_ok=True)
            (root/file).write_bytes(content)

    def run(script,*args):
        return subprocess.run([sys.executable,str(root/'scripts'/script),*args],capture_output=True,text=True)

    def accept_changes():
        for script,args in [('build_prd.py',()),('update_translation_state.py',('--reviewed',))]:
            result=run(script,*args)
            assert result.returncode==0,result.stdout+result.stderr

    def assert_check(name,error=None):
        before={p.relative_to(root):p.read_bytes() for p in root.rglob('*') if p.is_file()}
        result=run('check_docs.py')
        after={p.relative_to(root):p.read_bytes() for p in root.rglob('*') if p.is_file()}
        assert before==after,f'{name}: validation wrote files'
        output=result.stdout+result.stderr
        if error:
            assert result.returncode!=0 and error in output,(name,output)
        else:
            assert result.returncode==0,(name,output)
        print(f'PASS: {name}')

    assert_check('both complete editions pass without writes')

    file=root/'docs/en/prd/01-product-goal-positioning.md'
    file.write_text(file.read_text()+'\nAn unreviewed editorial change.\n')
    assert_check('one-language edit is detected','Unreviewed RU/EN changes')
    reset()

    file=root/'docs/en/prd/06-common-data-contracts-exposure.md'
    file.write_text(file.read_text().replace('  titleCode: string','  titleCodeChanged: string'))
    accept_changes()
    assert_check('contract mismatch fails even after review metadata is updated','technical blocks differ')
    reset()

    (root/'docs/en/prd/01-product-goal-positioning.md').unlink()
    assert_check('missing language counterpart fails','Missing translation')
    reset()

    for lang in ('ru','en'):
        file=root/f'docs/{lang}/prd/01-product-goal-positioning.md'
        file.write_text(file.read_text().replace('AC-1.2','AC-1.9'))
    accept_changes()
    assert_check('matching but invalid AC numbering fails','non-sequential AC')
    reset()

    file=root/'docs/concept.md'
    file.write_text(file.read_text()+'\nChanged frozen source.\n')
    accept_changes()
    assert_check('frozen concept changes fail','frozen docs/concept.md has changed')
    reset()

    for lang in ('ru','en'):
        file=root/f'docs/{lang}/README.md'
        file.write_text(file.read_text()+'\n[Missing](missing-page.md)\n')
    accept_changes()
    assert_check('broken links in both editions fail','Broken link')
    reset()

    file=root/'dist/en/2check_MVP_1.0_PRD.md'
    file.write_text(file.read_text()+'\nStale output.\n')
    assert_check('stale English build fails without being rewritten','Outdated generated file')
    result=run('build_prd.py','--check')
    assert result.returncode!=0 and 'outdated' in (result.stdout+result.stderr)
    print('PASS: standalone build verification detects stale output')
    reset()

    file=root/'docs/en/prd/08-dns.md'
    file.write_text(file.read_text().replace('default minimum quorum is 2','default minimum quorum is 3'))
    accept_changes()
    assert_check('different numerical requirements fail','numerical values differ')
    reset()

    file=root/'docs/en/01-concept.md'
    file.write_text(file.read_text().replace('asciiHostname: string','hostname: string'))
    accept_changes()
    assert_check('concept contracts remain aligned with the frozen source','Concept data contracts differ')
    reset()

    file=root/'docs/ru/01-concept.md'
    file.write_text(file.read_text().replace('15–30', '15–40'))
    accept_changes()
    assert_check('concept numeric drift fails after recorded review','numerical values differ')
    reset()

    result=run('update_translation_state.py')
    assert result.returncode!=0,'review confirmation unexpectedly optional'
    print('PASS: translation review confirmation is explicit')

    before={p.relative_to(root):p.read_bytes() for p in root.rglob('*') if p.is_file()}
    result=run('build_prd.py')
    assert result.returncode==0,result.stdout+result.stderr
    after={p.relative_to(root):p.read_bytes() for p in root.rglob('*') if p.is_file()}
    assert before==after,'a clean rebuild changed content'
    print('PASS: rebuilding both editions is deterministic')
