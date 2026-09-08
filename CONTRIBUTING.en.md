# Documentation Contribution Rules

[Русский](CONTRIBUTING.md) · **English** · [Home](README.en.md)

## 1. One Working Branch

Work is performed directly in `main`. Do not create branches or pull requests unless the owner explicitly requests them. Check the working tree and `origin/main` before starting; do not overwrite other people's changes.

## 2. Concept and Requirements

The concept is the first document in both editions' navigation. The original `docs/concept.md` is frozen and is not edited without an explicit decision to revise the concept. The reading editions are in `docs/ru/01-concept.md` and `docs/en/01-concept.md`. Their wording may be edited together, checking product decisions and constraints against the original.

Requirements are edited in `docs/ru/prd/` and `docs/en/prd/`. Each rule has one responsible section. Other sections reference it; repeated descriptions do not establish additional contracts.

## 3. Two Consistent Editions

Every text, structure, or link change is applied to both editions in the same change. Compare meaning, requirement strength, exceptions, numbers, units, codes, references, and acceptance criteria. DTO keys, enumerations, API routes, and identifiers are not translated.

Hash checks detect changes made after the last translation review. They do not prove semantic equivalence: both editions must be read and compared. Record confirmation only after that review.

## 4. Editorial Style

Use precise, restrained technical language. Describe concrete behavior, conditions, and constraints. Avoid promotional claims, stock introductory phrases, rhetorical questions, unnecessary repetition, and unsupported causal conclusions. Do not mix English words into Russian sentences where a precise Russian term is available.

Do not invent personal experience, research, or statements on the author's behalf. Editing improves clarity without changing product decisions.

## 5. Validation Procedure

1. Update both language editions and their navigation.
2. Read them side by side and verify semantic equivalence.
3. Build the documents and record the completed translation review:

   ```bash
   python3 scripts/build_prd.py
   python3 scripts/update_translation_state.py --reviewed
   python3 scripts/check_docs.py
   ```

4. Review the final changes and confirm that the frozen concept is unchanged.
5. Commit the verified change to `main` and push it to `origin`.

The build creates RU and EN PRDs and a compatible Russian PRD copy at the previous location. Do not edit these outputs manually. Both concept pages are source documents and are edited as a pair. Normal validation is read-only and fails on an unreviewed translation change, contract mismatch, invalid numbering, broken link, or outdated build.

When changing the build or validation rules, also run `python3 scripts/test_docs.py`. This suite checks error detection using temporary document copies.
