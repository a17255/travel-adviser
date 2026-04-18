# Travel Adviser

Static travel-planning site. Open `index.html` in a browser or deploy to GitHub Pages.

## Development

No build step. Use any static server to avoid CORS on module imports:

    python -m http.server 8000

Run tests: open `http://localhost:8000/tests.html` in a browser.

## Deploy

Push to `gh-pages` branch; GitHub Pages serves the site at
https://a17255.github.io/travel-adviser

## Deploy to GitHub Pages

    git checkout --orphan gh-pages
    git reset
    git add index.html plan.html tests.html css js templates assets README.md
    git commit -m "deploy"
    git push origin gh-pages --force
    git checkout main

Enable Pages in repo Settings → Pages → branch `gh-pages`.
Site live at https://a17255.github.io/travel-adviser
