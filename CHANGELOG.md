# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Screenshots and an animated walkthrough of the live demo in the README.
- CodeQL code scanning workflow (JavaScript/TypeScript and Actions) and Dependabot updates for npm, Docker and GitHub Actions.
- Roadmap tracked as GitHub issues under the v0.2.0 milestone.
- This changelog.

## [0.1.0] - 2026-10-25

First public release.

### Added

- Palette of ten node types (text, email, number, dropdown, multi-select, checkbox, radio group, date, paragraph, nestable section).
- Drag and drop with dnd-kit (pointer and keyboard sensors), plus up/down/duplicate/delete buttons as a no-drag alternative.
- Property panel with auto-camelCased unique keys, option editor and per-type validation (length, numeric range, selection counts, regex with custom message).
- Conditional visibility rules on fields and sections; hidden fields are excluded from validation and from the submitted payload.
- Export to JSON Schema draft-07 plus a UI schema (`ui:widget`, `ui:placeholder`, `ui:help`, `ui:order`, `ui:condition`), and import of the combined document or any plain draft-07 object schema.
- `FormRenderer` built on react-hook-form with a zod schema generated from the definition.
- Preview modal, undo/redo (50 steps), autosaved draft in `localStorage`, dark mode.
- 40 Vitest tests, strict TypeScript, ESLint, CI on Node 18/20, nginx Dockerfile.
- Live demo kit: GitHub Pages build, Codespaces dev container and Render blueprint.

### Fixed

- The build base path is read from `BASE_PATH`, so the app works under a GitHub Pages sub-path.

[Unreleased]: https://github.com/AkibUllah/react-form-builder/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/AkibUllah/react-form-builder/releases/tag/v0.1.0
