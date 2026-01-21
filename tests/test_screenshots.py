#!/usr/bin/env python3
"""
Screenshot tests for Crossroads game.
Generates screenshots of various game states for visual review.
Only updates screenshots if there's an actual pixel-level change.
"""

import os
import sys
import pytest
import tempfile
from pathlib import Path

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from screenshot import screenshot_html, screenshot_with_interaction

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
HTML_PATH = PROJECT_ROOT / 'frontend' / 'index.html'
SCREENSHOTS_DIR = PROJECT_ROOT / 'screenshots'


def images_are_identical(path1: Path, path2: Path) -> bool:
    """
    Compare two images at the pixel level.
    Returns True if images are identical, False otherwise.
    """
    try:
        from PIL import Image
        import hashlib

        if not path1.exists() or not path2.exists():
            return False

        # Load both images
        img1 = Image.open(path1)
        img2 = Image.open(path2)

        # Quick check: different sizes means different images
        if img1.size != img2.size:
            return False

        # Quick check: different modes means different images
        if img1.mode != img2.mode:
            return False

        # Compare raw pixel data
        return img1.tobytes() == img2.tobytes()

    except ImportError:
        # Pillow not available, fall back to file hash comparison
        import hashlib

        if not path1.exists() or not path2.exists():
            return False

        def file_hash(path):
            with open(path, 'rb') as f:
                return hashlib.sha256(f.read()).hexdigest()

        return file_hash(path1) == file_hash(path2)
    except Exception:
        return False


def save_screenshot_if_changed(temp_path: Path, final_path: Path) -> bool:
    """
    Save screenshot only if it differs from the existing one.
    Returns True if the file was updated, False if unchanged.
    """
    import shutil

    if not final_path.exists():
        # No existing screenshot, save the new one
        shutil.move(str(temp_path), str(final_path))
        return True

    if images_are_identical(temp_path, final_path):
        # Images are identical, no need to update
        temp_path.unlink()  # Clean up temp file
        return False

    # Images differ, update the screenshot
    shutil.move(str(temp_path), str(final_path))
    return True


@pytest.fixture(scope='module')
def ensure_screenshots_dir():
    """Ensure screenshots directory exists."""
    SCREENSHOTS_DIR.mkdir(exist_ok=True)
    return SCREENSHOTS_DIR


class TestGameScreenshots:
    """Test class for generating game screenshots."""

    def _capture_and_compare(self, final_path: Path, capture_func, **kwargs):
        """
        Helper to capture screenshot to temp file and only save if changed.
        Returns True if file was updated, False if unchanged.
        """
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
            temp_path = Path(tmp.name)

        capture_func(temp_path=str(temp_path), **kwargs)

        assert temp_path.exists(), "Screenshot was not created"
        assert temp_path.stat().st_size > 0, "Screenshot file is empty"

        was_updated = save_screenshot_if_changed(temp_path, final_path)
        return was_updated

    def test_initial_game_state(self, ensure_screenshots_dir):
        """
        Capture the initial game state after loading.
        Shows: Map with settlements, resources, and roads.
        """
        output_path = ensure_screenshots_dir / 'game_initial_state.png'

        def capture(temp_path):
            screenshot_html(
                str(HTML_PATH),
                temp_path,
                width=1400,
                height=900,
                wait_time=1500
            )

        self._capture_and_compare(output_path, capture)
        assert output_path.exists(), "Screenshot was not created"

    def test_settlements_tab(self, ensure_screenshots_dir):
        """
        Capture the settlements tab in the sidebar.
        Shows: Settlement list with stats and controls.
        """
        output_path = ensure_screenshots_dir / 'sidebar_settlements.png'

        actions = [
            {'type': 'wait', 'ms': 1000},
            {'type': 'click', 'selector': '[data-tab="settlements"]'},
            {'type': 'wait', 'ms': 500},
        ]

        def capture(temp_path):
            screenshot_with_interaction(
                str(HTML_PATH),
                temp_path,
                width=1400,
                height=900,
                actions=actions
            )

        self._capture_and_compare(output_path, capture)
        assert output_path.exists()

    def test_armies_tab(self, ensure_screenshots_dir):
        """
        Capture the armies tab in the sidebar.
        Shows: Army list (may be empty initially).
        """
        output_path = ensure_screenshots_dir / 'sidebar_armies.png'

        actions = [
            {'type': 'wait', 'ms': 1000},
            {'type': 'click', 'selector': '[data-tab="armies"]'},
            {'type': 'wait', 'ms': 500},
        ]

        def capture(temp_path):
            screenshot_with_interaction(
                str(HTML_PATH),
                temp_path,
                width=1400,
                height=900,
                actions=actions
            )

        self._capture_and_compare(output_path, capture)
        assert output_path.exists()

    def test_research_tab(self, ensure_screenshots_dir):
        """
        Capture the research tab showing available technologies.
        Shows: Tech tree and research progress.
        """
        output_path = ensure_screenshots_dir / 'sidebar_research.png'

        actions = [
            {'type': 'wait', 'ms': 1000},
            {'type': 'click', 'selector': '[data-tab="research"]'},
            {'type': 'wait', 'ms': 500},
        ]

        def capture(temp_path):
            screenshot_with_interaction(
                str(HTML_PATH),
                temp_path,
                width=1400,
                height=900,
                actions=actions
            )

        self._capture_and_compare(output_path, capture)
        assert output_path.exists()

    def test_build_tab(self, ensure_screenshots_dir):
        """
        Capture the build tab showing construction options.
        Shows: Road types and building options.
        """
        output_path = ensure_screenshots_dir / 'sidebar_build.png'

        actions = [
            {'type': 'wait', 'ms': 1000},
            {'type': 'click', 'selector': '[data-tab="build"]'},
            {'type': 'wait', 'ms': 500},
        ]

        def capture(temp_path):
            screenshot_with_interaction(
                str(HTML_PATH),
                temp_path,
                width=1400,
                height=900,
                actions=actions
            )

        self._capture_and_compare(output_path, capture)
        assert output_path.exists()

    def test_legend_tab(self, ensure_screenshots_dir):
        """
        Capture the legend tab showing game symbols and colors.
        Shows: Resources, roads, settlements, armies, buildings, and units.
        """
        output_path = ensure_screenshots_dir / 'sidebar_legend.png'

        actions = [
            {'type': 'wait', 'ms': 1000},
            {'type': 'click', 'selector': '[data-tab="legend"]'},
            {'type': 'wait', 'ms': 500},
        ]

        def capture(temp_path):
            screenshot_with_interaction(
                str(HTML_PATH),
                temp_path,
                width=1400,
                height=900,
                actions=actions
            )

        self._capture_and_compare(output_path, capture)
        assert output_path.exists()

    def test_game_running(self, ensure_screenshots_dir):
        """
        Capture the game after running for several ticks.
        Shows: Game progression with resource accumulation.
        """
        output_path = ensure_screenshots_dir / 'game_running.png'

        actions = [
            {'type': 'wait', 'ms': 1000},
            # Click play button
            {'type': 'click', 'selector': '#btn-play-pause'},
            # Let the game run for a bit
            {'type': 'wait', 'ms': 3000},
            # Pause
            {'type': 'click', 'selector': '#btn-play-pause'},
            {'type': 'wait', 'ms': 500},
        ]

        def capture(temp_path):
            screenshot_with_interaction(
                str(HTML_PATH),
                temp_path,
                width=1400,
                height=900,
                actions=actions
            )

        self._capture_and_compare(output_path, capture)
        assert output_path.exists()

    def test_zoomed_out_view(self, ensure_screenshots_dir):
        """
        Capture a zoomed-out view of the entire map.
        Shows: Overview of map with all entities.
        """
        output_path = ensure_screenshots_dir / 'map_zoomed_out.png'

        actions = [
            {'type': 'wait', 'ms': 1000},
            # Zoom out using JavaScript
            {'type': 'evaluate', 'script': 'if(window.camera) { camera.setZoom(0.3); }'},
            {'type': 'wait', 'ms': 500},
            # Center the map
            {'type': 'evaluate', 'script': 'if(window.camera) { camera.centerOn(1000, 1000); }'},
            {'type': 'wait', 'ms': 500},
        ]

        def capture(temp_path):
            screenshot_with_interaction(
                str(HTML_PATH),
                temp_path,
                width=1400,
                height=900,
                actions=actions
            )

        self._capture_and_compare(output_path, capture)
        assert output_path.exists()

    def test_zoomed_in_settlement(self, ensure_screenshots_dir):
        """
        Capture a zoomed-in view of a settlement.
        Shows: Settlement details at close zoom.
        """
        output_path = ensure_screenshots_dir / 'settlement_zoomed.png'

        actions = [
            {'type': 'wait', 'ms': 1000},
            # Zoom in using JavaScript
            {'type': 'evaluate', 'script': '''
                if(window.camera && window.game) {
                    const settlements = Object.values(game.state.settlements);
                    if (settlements.length > 0) {
                        const s = settlements[0];
                        camera.centerOn(s.position.x, s.position.y);
                        camera.setZoom(2.0);
                    }
                }
            '''},
            {'type': 'wait', 'ms': 500},
        ]

        def capture(temp_path):
            screenshot_with_interaction(
                str(HTML_PATH),
                temp_path,
                width=1400,
                height=900,
                actions=actions
            )

        self._capture_and_compare(output_path, capture)
        assert output_path.exists()

    def test_settlement_selected(self, ensure_screenshots_dir):
        """
        Capture a settlement when selected.
        Shows: Selection highlight and details panel.
        """
        output_path = ensure_screenshots_dir / 'settlement_selected.png'

        actions = [
            {'type': 'wait', 'ms': 1000},
            # Select first player settlement via JavaScript
            {'type': 'evaluate', 'script': '''
                if(window.game && window.inputHandler) {
                    const settlements = Object.values(game.state.settlements);
                    const playerSettlement = settlements.find(s => s.ownerId === game.playerId);
                    if (playerSettlement) {
                        inputHandler.selectEntity(playerSettlement, 'settlement');
                        camera.centerOn(playerSettlement.position.x, playerSettlement.position.y);
                    }
                }
            '''},
            {'type': 'wait', 'ms': 500},
        ]

        def capture(temp_path):
            screenshot_with_interaction(
                str(HTML_PATH),
                temp_path,
                width=1400,
                height=900,
                actions=actions
            )

        self._capture_and_compare(output_path, capture)
        assert output_path.exists()

    def test_road_building_mode(self, ensure_screenshots_dir):
        """
        Capture the UI when in road building mode.
        Shows: Tool indicator and crosshair cursor.
        """
        output_path = ensure_screenshots_dir / 'road_building_mode.png'

        actions = [
            {'type': 'wait', 'ms': 1000},
            # Switch to build tab and click road button
            {'type': 'click', 'selector': '[data-tab="build"]'},
            {'type': 'wait', 'ms': 300},
            {'type': 'click', 'selector': '[data-build="road-dirt"]'},
            {'type': 'wait', 'ms': 500},
        ]

        def capture(temp_path):
            screenshot_with_interaction(
                str(HTML_PATH),
                temp_path,
                width=1400,
                height=900,
                actions=actions
            )

        self._capture_and_compare(output_path, capture)
        assert output_path.exists()

    def test_road_under_construction(self, ensure_screenshots_dir):
        """
        Capture a road that is currently under construction.
        Shows: Partially built road with construction symbol at the build point,
        solid portion for built section, and dashed preview for unbuilt section.
        """
        output_path = ensure_screenshots_dir / 'road_under_construction.png'

        actions = [
            {'type': 'wait', 'ms': 1000},
            # Build a new long road using JavaScript that will take time to complete
            {'type': 'evaluate', 'script': '''
                if(window.game) {
                    // Find player's first settlement
                    const settlements = Object.values(game.state.settlements);
                    const playerSettlement = settlements.find(s => s.ownerId === game.playerId);

                    if (playerSettlement) {
                        // Create a long road heading left/up from the settlement
                        // (away from the map center where mountains are)
                        const startX = playerSettlement.position.x;
                        const startY = playerSettlement.position.y;

                        // Create waypoints for a road that goes 500 units to the left
                        const waypoints = [
                            new Vec2(startX, startY),
                            new Vec2(startX - 150, startY - 50),
                            new Vec2(startX - 300, startY - 100),
                            new Vec2(startX - 450, startY - 50)
                        ];

                        // Build the road (starts with builtLength = 0)
                        const newRoad = game.buildRoad(waypoints, 'dirt');

                        if (newRoad) {
                            // Run a few ticks to partially build the road
                            // With ROAD_CONSTRUCTION_SPEED of 20 units/tick,
                            // running 8 ticks builds about 160 units of the ~550 unit road
                            for (let i = 0; i < 8; i++) {
                                game.processConstruction();
                            }

                            // Get the construction point and center camera on it
                            const constructionPoint = newRoad.getConstructionPoint();
                            if (constructionPoint) {
                                camera.centerOn(constructionPoint.x, constructionPoint.y);
                                camera.setZoom(1.2);
                            }
                        }
                    }
                }
            '''},
            {'type': 'wait', 'ms': 500},
        ]

        def capture(temp_path):
            screenshot_with_interaction(
                str(HTML_PATH),
                temp_path,
                width=1400,
                height=900,
                actions=actions
            )

        self._capture_and_compare(output_path, capture)
        assert output_path.exists()

    def test_different_resolutions(self, ensure_screenshots_dir):
        """
        Test that the game renders correctly at different resolutions.
        """
        resolutions = [
            (1920, 1080, 'fullhd'),
            (1280, 720, 'hd'),
            (1024, 768, 'standard'),
        ]

        for width, height, name in resolutions:
            output_path = ensure_screenshots_dir / f'resolution_{name}.png'

            def capture(temp_path, w=width, h=height):
                screenshot_html(
                    str(HTML_PATH),
                    temp_path,
                    width=w,
                    height=h,
                    wait_time=1500
                )

            self._capture_and_compare(output_path, capture)
            assert output_path.exists()


class TestResourceRendering:
    """Test resource node rendering."""

    def _capture_and_compare(self, final_path: Path, capture_func, **kwargs):
        """
        Helper to capture screenshot to temp file and only save if changed.
        Returns True if file was updated, False if unchanged.
        """
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
            temp_path = Path(tmp.name)

        capture_func(temp_path=str(temp_path), **kwargs)

        assert temp_path.exists(), "Screenshot was not created"
        assert temp_path.stat().st_size > 0, "Screenshot file is empty"

        was_updated = save_screenshot_if_changed(temp_path, final_path)
        return was_updated

    def test_forest_resource(self, ensure_screenshots_dir):
        """Capture forest resource rendering."""
        output_path = ensure_screenshots_dir / 'resource_forest.png'

        actions = [
            {'type': 'wait', 'ms': 1000},
            {'type': 'evaluate', 'script': '''
                if(window.game && window.camera) {
                    const forests = Object.values(game.state.resources).filter(r => r.resourceType === 'forest');
                    if (forests.length > 0) {
                        camera.centerOn(forests[0].position.x, forests[0].position.y);
                        camera.setZoom(2.0);
                    }
                }
            '''},
            {'type': 'wait', 'ms': 500},
        ]

        def capture(temp_path):
            screenshot_with_interaction(
                str(HTML_PATH),
                temp_path,
                width=800,
                height=600,
                actions=actions
            )

        self._capture_and_compare(output_path, capture)
        assert output_path.exists()


class TestUIComponents:
    """Test UI component rendering."""

    def _capture_and_compare(self, final_path: Path, capture_func, **kwargs):
        """
        Helper to capture screenshot to temp file and only save if changed.
        Returns True if file was updated, False if unchanged.
        """
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
            temp_path = Path(tmp.name)

        capture_func(temp_path=str(temp_path), **kwargs)

        assert temp_path.exists(), "Screenshot was not created"
        assert temp_path.stat().st_size > 0, "Screenshot file is empty"

        was_updated = save_screenshot_if_changed(temp_path, final_path)
        return was_updated

    def test_bottom_bar(self, ensure_screenshots_dir):
        """Capture the bottom resource bar."""
        output_path = ensure_screenshots_dir / 'ui_bottom_bar.png'

        # Capture just the bottom portion
        actions = [
            {'type': 'wait', 'ms': 1000},
        ]

        def capture(temp_path):
            screenshot_with_interaction(
                str(HTML_PATH),
                temp_path,
                width=1400,
                height=900,
                actions=actions
            )

        self._capture_and_compare(output_path, capture)
        assert output_path.exists()

    def test_minimap(self, ensure_screenshots_dir):
        """Capture the minimap in the corner."""
        output_path = ensure_screenshots_dir / 'ui_minimap.png'

        actions = [
            {'type': 'wait', 'ms': 1000},
            {'type': 'evaluate', 'script': 'if(window.camera) { camera.setZoom(0.5); camera.centerOn(1000, 1000); }'},
            {'type': 'wait', 'ms': 500},
        ]

        def capture(temp_path):
            screenshot_with_interaction(
                str(HTML_PATH),
                temp_path,
                width=1400,
                height=900,
                actions=actions
            )

        self._capture_and_compare(output_path, capture)
        assert output_path.exists()


def run_all_screenshots():
    """Run all screenshot tests and generate images."""
    SCREENSHOTS_DIR.mkdir(exist_ok=True)

    # Run pytest
    pytest.main([
        __file__,
        '-v',
        '--tb=short',
        f'--html={SCREENSHOTS_DIR}/report.html',
        '--self-contained-html'
    ])


if __name__ == '__main__':
    # If run directly, execute all screenshot tests
    SCREENSHOTS_DIR.mkdir(exist_ok=True)

    # Run with pytest
    exit_code = pytest.main([
        __file__,
        '-v',
        '--tb=short'
    ])

    sys.exit(exit_code)
