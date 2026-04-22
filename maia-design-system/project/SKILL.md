---
name: maia-design
description: Use this skill to generate well-branded interfaces and assets for Maia — a calm, dark, glassmorphic personal-knowledge OS — for production or throwaway prototypes, mocks, slides, etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files:

- `colors_and_type.css` — all color + type + spacing + radius + shadow tokens
- `assets/` — Maia logos
- `preview/` — visual reference cards (type specimens, palette, components)
- `ui_kits/maia-app/` — high-fidelity component recreations: Dock, Command Palette, Home/Opus/Codex/Conexa/Ledger pages, glass cards

If creating visual artifacts (slides, mocks, throwaway prototypes, etc.), copy assets out and create static HTML files for the user to view. Start by importing `colors_and_type.css` and picking the component you need from `ui_kits/maia-app/`. Honor Maia's rules: pitch-black backgrounds, zinc-scale foreground, thick-glass cards with 16px blur, 0.5px white/5 borders, 24px radii, IBM Plex Mono for UI voice + Onest for prose, ALL-CAPS micro-labels with 0.15em tracking, Lucide icons with 1.8px stroke, ease-out motion at 200–500ms. No emoji. No gradients. No warm colors.

If working on production code, you can copy assets and read the rules in README.md to become an expert designer for this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.
