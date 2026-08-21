# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Personal blog of Islam Umarov, built with Jekyll using the `jekyll-theme-chirpy` gem theme (v6.0). Deployed to GitHub Pages via `.github/workflows/jekyll.yml` on push to `main`.

## Commands

```bash
bundle install         # install gems (Ruby 3.1+ per CI; repo targets 3.2 compat)
bundle exec jekyll serve   # local dev server, live rebuild
bundle exec jekyll build   # build to ./_site
bundle exec htmlproofer ./_site   # link/html check (gem in :test group, used in CI-style checks)
```

New post via jekyll-compose plugin:
```bash
bundle exec jekyll post "Post Title"   # creates _posts/YYYY-MM-DD-post-title.md
bundle exec jekyll draft "Draft Title" # creates _drafts/draft-title.md
```

There is no test suite beyond html-proofer; no lint step configured beyond Jekyll build itself succeeding.

## Structure

- `_posts/` — published posts (filename `YYYY-MM-DD-title.md`, front matter: `layout: post`, `title`, `date`, `tags`, `categories`).
- `_drafts/` — unpublished posts, no date prefix in filename.
- `_tabs/` — top-level nav pages (About, Archives, Categories, Tags) — theme convention, not standard Jekyll `_pages`.
- `_data/` — site data (`contact.yml`, `share.yml`, `locales/`, `assets/`).
- `_plugins/posts-lastmod-hook.rb` — sets a post's `last_modified_at` from its git history (last commit touching the file) if it has more than one commit. Post dates/lastmod are therefore tied to real git history, not just front matter.
- `assets/lib` — git submodule (`chirpy-static-assets`), theme's static JS/CSS assets. Run `git submodule update --init` if missing.
- `_config.yml` — main site config (title, social links, theme options, SEO/analytics settings). Most theme behavior (avatar, TOC, comments, PWA, etc.) is configured here rather than in code.

## Notes

- Theme itself (layouts, includes, sass) lives in the `jekyll-theme-chirpy` gem, not in this repo — only overrides placed in matching paths here would take effect.
- `about.markdown` / `index.markdown` / `index.html` are thin front-matter stubs; real About content is `_tabs/about.md`.
