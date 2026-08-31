# Alice Gillbanks — Portfolio Site

This is the source code for my personal portfolio website, hosted on GitHub Pages.

The website contains a profile section and an interactive timeline showing my career, projects and other work. Timeline entries can be filtered and clicked to show more information.

Most of the content is stored in `data.json`, making it easy to update without changing the website itself.

## Structure

```text
index.html      Main website
admin.html      Content editor
data.json       Website content

css/
├── style.css   Main styles
└── admin.css   Admin page styles

js/
├── app.js      Main website functionality
└── admin.js    Content editor functionality
```

## Running Locally

The site needs to be run through a local server because it loads `data.json`.

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deployment

The site is designed to be hosted using GitHub Pages.

Upload the files to a GitHub repository and enable Pages through **Settings → Pages**.

## Editing Content

The main website content is stored in `data.json`. This includes the profile information and all timeline entries.

The file can be edited directly on GitHub or locally and then pushed to the repository.

There is also an editor at `admin.html` which allows the content to be changed through a form. It uses a GitHub fine-grained personal access token to save changes directly to the repository.

The token only needs **Contents: Read and write** access to the repository and is stored in `sessionStorage` while the editor is being used.

## `data.json`

The file is structured as follows:

```jsonc
{
  "profile": {
    "name": "…",
    "subheading": "…",
    "reading": "…",
    "interest": "…",
    "github": "https://github.com/…",
    "instagram": "https://instagram.com/…"
  },
  "timeline": [
    {
      "id": "unique-slug",
      "type": "career" | "project",
      "date": "2026-07",
      "dateLabel": "Summer 2026",
      "title": "…",
      "summary": "one line for the card",
      "description": "longer text for the dialog",
      "tags": ["Swift", "SwiftUI"],
      "link": ""
    }
  ]
}
```

Timeline entries are automatically sorted by `date`, so they do not need to be entered in order.
