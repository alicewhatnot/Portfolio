# Alice Gillbanks — portfolio site

A static site for GitHub Pages: header with name/socials, a filterable career + project
timeline, and a click-to-expand dialog per entry. All content lives in `data.json`.

## Structure

```
index.html      the site
admin.html       content editor (see "Editing" below)
data.json        all editable content — profile + timeline entries
css/style.css    main styles
css/admin.css    editor-only styles
js/app.js        renders the timeline, handles filtering + dialog
js/admin.js      editor logic (talks to the GitHub API)
```

## Running locally

Because the page loads `data.json` with `fetch()`, opening `index.html` directly
(`file://…`) won't work in most browsers — you need a local server:

```
cd site
python3 -m http.server 8000
```

then visit `http://localhost:8000`.

## Deploying

Push this folder to a GitHub repo and enable Pages (Settings → Pages → deploy from
branch). If it's a project site rather than a `username.github.io` repo, no path
changes are needed — everything here uses relative links.

## Editing content day-to-day

**The simplest and most secure option is to just edit `data.json` directly** — either
in GitHub's web editor or locally and `git push`. No login required, full git history
of every change, zero attack surface. For a personal portfolio this is genuinely the
best trade-off, and it's worth using this as your default even with the in-browser
editor below available.

## About the "sign in and edit" panel (`admin.html`)

You asked for a sign-in that lets you add/edit/remove content, and whether that's even
possible on GitHub Pages. Short answer: **there's no real backend, so there's no real
login** — no server to check a password against, no session cookies, no database. But
it's not *impossible* to get something that behaves like one. Two honest options:

### Option A — what's built here: a repo-scoped access token

`admin.html` asks for a **GitHub fine-grained personal access token** instead of a
username/password. When you "sign in," the page uses that token to call GitHub's API
directly from your browser: it reads `data.json`, lets you edit it in a form, and
commits the change straight back to the repo.

- The token is held in `sessionStorage` only (never written to disk, never sent
  anywhere except `api.github.com`) and disappears when you close the tab.
- **Create a token scoped to just this repo**, not your whole account: GitHub →
  Settings → Developer settings → Personal access tokens → **Fine-grained tokens** →
  generate one, set "Repository access" to only this repository, and under
  Permissions grant **Contents: Read and write** (nothing else needed). Give it an
  expiry and regenerate it periodically.
- This is reasonably safe for personal use but isn't a "real" secure login: anyone
  with your token has write access to the repo for as long as it's valid, and if you
  ever paste it somewhere public (or use this on a shared computer and don't sign
  out), it's compromised. Treat it like a password you're handing to a script.

### Option B — a more polished login: Decap CMS

If you want an actual "log in with GitHub" button, an admin UI with proper auth, and
image uploads, look at [Decap CMS](https://decapcms.org/) (formerly Netlify CMS) —
it's built exactly for this: a git-backed CMS that sits on top of a static site and
authenticates via GitHub OAuth. It needs one small piece of infrastructure outside
GitHub Pages itself (a tiny OAuth-handshake endpoint — Decap's docs list a few free
ways to host this, e.g. a Cloudflare Worker), but it's the "correct" version of what
`admin.html` approximates. Worth migrating to if you outgrow the token-based editor.

## Content schema (`data.json`)

```jsonc
{
  "profile": {
    "name": "…",
    "subheading": "…",
    "reading": "…",       // "Currently reading:"
    "interest": "…",      // "Currently interested in:"
    "github": "https://github.com/…",
    "instagram": "https://instagram.com/…"
  },
  "timeline": [
    {
      "id": "unique-slug",
      "type": "career" | "project",
      "date": "2026-07",           // YYYY-MM, used for sorting
      "dateLabel": "Summer 2026",  // optional display override
      "title": "…",
      "summary": "one line for the card",
      "description": "longer text for the dialog",
      "tags": ["Swift", "SwiftUI"],
      "link": ""                   // optional, shown as "View more →" in the dialog
    }
  ]
}
```

Entries are sorted by `date` automatically and placed on the timeline in order —
you don't need to keep the array itself sorted.
