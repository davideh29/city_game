#!/usr/bin/env python3
"""
Screenshot tests for Crossroads game.
Generates screenshots of various game states for visual review.
"""

import os
import sys
import pytest
from pathlib import Path

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from screenshot import screenshot_html, screenshot_with_interaction

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
HTML_PATH = PROJECT_ROOT / 'frontend' / 'index.html'
SCREENSHOTS_DIR = PROJECT_ROOT / 'screenshots'


@pytest.fixture(scope='module')
def ensure_screenshots_dir():
    """Ensure screenshots directory exists."""
    SCREENSHOTS_DIR.mkdir(exist_ok=True)
    return SCREENSHOTS_DIR


class TestGameScreenshots:
    """Test class for generating game screenshots."""

    def test_initial_game_state(self, ensure_screenshots_dir):
        """
        Capture the initial game state after loading.
        Shows: Map with settlements, resources, and roads.
        """
        output_path = ensure_screenshots_dir / 'game_initial_state.png'

        screenshot_html(
            str(HTML_PATH),
            str(output_path),
            width=1400,
            height=900,
            wait_time=1500
        )

        assert output_path.exists(), "Screenshot was not created"
        assert output_path.stat().st_size > 0, "Screenshot file is empty"

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

        screenshot_with_interaction(
            str(HTML_PATH),
            str(output_path),
            width=1400,
            height=900,
            actions=actions
        )

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

        screenshot_with_interaction(
            str(HTML_PATH),
            str(output_path),
            width=1400,
            height=900,
            actions=actions
        )

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

        screenshot_with_interaction(
            str(HTML_PATH),
            str(output_path),
            width=1400,
            height=900,
            actions=actions
        )

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

        screenshot_with_interaction(
            str(HTML_PATH),
            str(output_path),
            width=1400,
            height=900,
            actions=actions
        )

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

        screenshot_with_interaction(
            str(HTML_PATH),
            str(output_path),
            width=1400,
            height=900,
            actions=actions
        )

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

        screenshot_with_interaction(
            str(HTML_PATH),
            str(output_path),
            width=1400,
            height=900,
            actions=actions
        )

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

        screenshot_with_interaction(
            str(HTML_PATH),
            str(output_path),
            width=1400,
            height=900,
            actions=actions
        )

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

        screenshot_with_interaction(
            str(HTML_PATH),
            str(output_path),
            width=1400,
            height=900,
            actions=actions
        )

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

        screenshot_with_interaction(
            str(HTML_PATH),
            str(output_path),
            width=1400,
            height=900,
            actions=actions
        )

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

        screenshot_with_interaction(
            str(HTML_PATH),
            str(output_path),
            width=1400,
            height=900,
            actions=actions
        )

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

            screenshot_html(
                str(HTML_PATH),
                str(output_path),
                width=width,
                height=height,
                wait_time=1500
            )

            assert output_path.exists()


class TestResourceRendering:
    """Test resource node rendering."""

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

        screenshot_with_interaction(
            str(HTML_PATH),
            str(output_path),
            width=800,
            height=600,
            actions=actions
        )

        assert output_path.exists()


class TestUIComponents:
    """Test UI component rendering."""

    def test_bottom_bar(self, ensure_screenshots_dir):
        """Capture the bottom resource bar."""
        output_path = ensure_screenshots_dir / 'ui_bottom_bar.png'

        # Capture just the bottom portion
        actions = [
            {'type': 'wait', 'ms': 1000},
        ]

        screenshot_with_interaction(
            str(HTML_PATH),
            str(output_path),
            width=1400,
            height=900,
            actions=actions
        )

        assert output_path.exists()

    def test_minimap(self, ensure_screenshots_dir):
        """Capture the minimap in the corner."""
        output_path = ensure_screenshots_dir / 'ui_minimap.png'

        actions = [
            {'type': 'wait', 'ms': 1000},
            {'type': 'evaluate', 'script': 'if(window.camera) { camera.setZoom(0.5); camera.centerOn(1000, 1000); }'},
            {'type': 'wait', 'ms': 500},
        ]

        screenshot_with_interaction(
            str(HTML_PATH),
            str(output_path),
            width=1400,
            height=900,
            actions=actions
        )

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
