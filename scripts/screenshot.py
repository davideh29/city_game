#!/usr/bin/env python3
"""
Screenshot utility for Crossroads game development.
Uses Playwright to render HTML and capture screenshots.
"""

import os
import sys
import argparse
from pathlib import Path


def screenshot_html(
    html_path: str,
    output_path: str,
    width: int = 1200,
    height: int = 800,
    wait_time: int = 1000,
    full_page: bool = False
):
    """
    Render an HTML file and capture a screenshot.

    Args:
        html_path: Path to the HTML file to render
        output_path: Path where the screenshot will be saved
        width: Viewport width in pixels
        height: Viewport height in pixels
        wait_time: Time to wait for JS to execute (ms)
        full_page: Whether to capture the full page
    """
    from playwright.sync_api import sync_playwright

    abs_path = os.path.abspath(html_path)
    file_url = f"file://{abs_path}"

    # Ensure output directory exists
    output_dir = os.path.dirname(output_path)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    # Browser stability arguments for headless mode
    browser_args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions'
    ]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=browser_args)
        page = browser.new_page(viewport={'width': width, 'height': height})

        print(f"Loading: {file_url}")
        page.goto(file_url)

        # Wait for JavaScript to execute
        page.wait_for_timeout(wait_time)

        # Take screenshot
        page.screenshot(path=output_path, full_page=full_page)
        browser.close()

    print(f"Screenshot saved: {output_path}")
    return output_path


def screenshot_with_interaction(
    html_path: str,
    output_path: str,
    width: int = 1200,
    height: int = 800,
    actions: list = None
):
    """
    Render HTML, perform interactions, and capture screenshot.

    Args:
        html_path: Path to the HTML file
        output_path: Path for the screenshot
        width: Viewport width
        height: Viewport height
        actions: List of actions to perform before screenshot
                 Each action is a dict with 'type' and parameters
    """
    from playwright.sync_api import sync_playwright

    abs_path = os.path.abspath(html_path)
    file_url = f"file://{abs_path}"

    os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)

    # Browser stability arguments for headless mode
    browser_args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions'
    ]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=browser_args)
        page = browser.new_page(viewport={'width': width, 'height': height})

        page.goto(file_url)
        page.wait_for_timeout(500)  # Initial load

        # Perform actions
        if actions:
            for action in actions:
                action_type = action.get('type')

                if action_type == 'wait':
                    page.wait_for_timeout(action.get('ms', 500))

                elif action_type == 'click':
                    selector = action.get('selector')
                    if selector:
                        page.click(selector)

                elif action_type == 'click_position':
                    x, y = action.get('x', 0), action.get('y', 0)
                    page.mouse.click(x, y)

                elif action_type == 'scroll':
                    delta = action.get('delta', -100)
                    x, y = action.get('x', width // 2), action.get('y', height // 2)
                    page.mouse.wheel(delta, delta)

                elif action_type == 'drag':
                    start_x, start_y = action.get('start_x', 0), action.get('start_y', 0)
                    end_x, end_y = action.get('end_x', 0), action.get('end_y', 0)
                    page.mouse.move(start_x, start_y)
                    page.mouse.down()
                    page.mouse.move(end_x, end_y)
                    page.mouse.up()

                elif action_type == 'evaluate':
                    script = action.get('script', '')
                    page.evaluate(script)

        # Final wait before screenshot
        page.wait_for_timeout(300)

        page.screenshot(path=output_path)
        browser.close()

    print(f"Screenshot saved: {output_path}")
    return output_path


def main():
    parser = argparse.ArgumentParser(description='Capture screenshots of HTML files')
    parser.add_argument('html_file', help='Path to HTML file')
    parser.add_argument('output_file', nargs='?', default='screenshot.png',
                        help='Output screenshot path')
    parser.add_argument('--width', type=int, default=1200, help='Viewport width')
    parser.add_argument('--height', type=int, default=800, help='Viewport height')
    parser.add_argument('--wait', type=int, default=1000, help='Wait time in ms')
    parser.add_argument('--full-page', action='store_true', help='Capture full page')

    args = parser.parse_args()

    screenshot_html(
        args.html_file,
        args.output_file,
        width=args.width,
        height=args.height,
        wait_time=args.wait,
        full_page=args.full_page
    )


if __name__ == '__main__':
    main()
