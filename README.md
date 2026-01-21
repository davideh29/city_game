# Crossroads

A 4X strategy city-building game built with vanilla JavaScript and HTML5 Canvas.

## Project Structure

```
├── frontend/           # Browser-based game client
│   ├── index.html      # Main entry point - open in browser to play
│   ├── css/            # Stylesheets
│   └── js/             # Game logic, rendering, UI
├── backend/            # Server code (future multiplayer support)
├── scripts/            # Development utilities
│   └── screenshot.py   # Playwright screenshot helper
├── tests/              # Test suite
│   └── test_screenshots.py  # Visual regression tests
├── screenshots/        # Generated test screenshots for PR review
├── MVP_design.md       # Complete game design specification
└── requirements.txt    # Python dependencies
```

## Playing the Game

Open `frontend/index.html` in a web browser. No build step required.

**Controls:**
- **Pan**: Click and drag on empty map space
- **Zoom**: Mouse scroll wheel
- **Select**: Click on settlements, armies, or resources
- **Move army**: Select army, then right-click destination
- **Play/Pause**: Space bar or click the play button
- **Build road**: Press R or use Build tab, click to place waypoints, double-click to finish

## Development

### Prerequisites

- Python 3.11+
- Node.js (for Playwright browser binaries)

### Installing Dependencies

```bash
pip install -r requirements.txt
python -m playwright install chromium
```

### Running Tests

The project uses Playwright for screenshot-based visual testing. Tests render the game in a headless browser and capture screenshots for review.

```bash
# Run all screenshot tests
python -m pytest tests/test_screenshots.py -v

# Run a specific test
python -m pytest tests/test_screenshots.py::TestGameScreenshots::test_initial_game_state -v
```

Screenshots are saved to `/screenshots/` and should be committed with code changes so reviewers can see visual differences in PRs.

### Adding New Screenshot Tests

Edit `tests/test_screenshots.py` to add new test cases. Use the helper functions from `scripts/screenshot.py`:

```python
from scripts.screenshot import screenshot_html, screenshot_with_interaction

# Simple screenshot
screenshot_html(
    html_path="frontend/index.html",
    output_path="screenshots/my_test.png",
    width=1200,
    height=800
)

# Screenshot with JavaScript interaction
screenshot_with_interaction(
    html_path="frontend/index.html",
    output_path="screenshots/my_interactive_test.png",
    interaction_script="document.querySelector('.some-button').click();",
    wait_after=500
)
```

### Manual Screenshot Generation

```bash
python scripts/screenshot.py frontend/index.html screenshots/output.png
```

## Architecture

The game is client-side only for the MVP. Key components:

| File | Purpose |
|------|---------|
| `js/game.js` | Game state, tick processing, win conditions |
| `js/renderer.js` | Canvas drawing for all entities |
| `js/camera.js` | Pan/zoom viewport management |
| `js/input.js` | Mouse/keyboard event handling |
| `js/ui.js` | Sidebar, modals, notifications |
| `js/models.js` | Data classes (Settlement, Army, Road, etc.) |
| `js/ai.js` | AI opponent logic |
| `js/tech_tree.js` | Technology definitions |

## Game Design Reference

See `MVP_design.md` for the complete game design specification including:
- All game systems and mechanics
- Data models and constants
- UI layout specifications
- Technology tree
- Combat formulas

## Making Changes

1. Read relevant sections of `MVP_design.md` for context
2. Make code changes in `frontend/js/`
3. Run screenshot tests to verify visual changes
4. Commit both code and updated screenshots
5. Screenshots in PR diff show visual changes for review
