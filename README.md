# Travel Adviser

Static travel-planning site. Open `index.html` in a browser or deploy to GitHub Pages.

## Development

No build step. Use any static server to avoid CORS on module imports:

    python -m http.server 8000

Run tests: open `http://localhost:8000/tests.html` in a browser.

## Deploy

Push to `gh-pages` branch; GitHub Pages serves the site at
https://a17255.github.io/travel-adviser
