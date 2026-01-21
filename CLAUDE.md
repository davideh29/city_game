# Claude Code Instructions for Crossroads

## Screenshot Regeneration Requirement

**Important**: Every time you make a change to the game (frontend code, rendering, UI, etc.), you must regenerate the screenshots by running the tests. This ensures visual documentation stays in sync with the code.

The game uses a seeded random number generator (seed: 42) for deterministic map generation, so the game state will always be the same on each run.

**Note**: Screenshot pixel data may vary between different Chromium/Playwright versions due to rendering differences, even without code changes. Only commit updated screenshots when you've made intentional visual changes.

## Setup and Dependencies

Install Python dependencies:
```bash
pip install -r requirements.txt
```

Install Playwright browsers (required for screenshot generation):
```bash
playwright install chromium
```

## Running Screenshot Tests

To regenerate all screenshots:
```bash
python3 -m pytest tests/test_screenshots.py -v
```

Or run the test file directly:
```bash
python3 tests/test_screenshots.py
```

The tests will:
1. Capture screenshots of various game states
2. Compare new screenshots with existing ones at the pixel level
3. Only update files if there are actual visual differences

Screenshots are saved to the `screenshots/` directory.

## Project Structure

- `frontend/` - Game HTML, CSS, and JavaScript
- `tests/test_screenshots.py` - Screenshot test suite
- `scripts/screenshot.py` - Screenshot utility functions
- `screenshots/` - Generated screenshot images
- `requirements.txt` - Python dependencies
