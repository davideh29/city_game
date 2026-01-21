// Crossroads - Main Entry Point

/**
 * Initialize the game
 */
function initGame() {
    // Get canvas element
    const canvas = document.getElementById('game-canvas');

    // Create game instance
    const game = new Game();

    // Create camera
    const camera = new Camera(canvas);
    camera.setMapBounds(GAME_CONSTANTS.MAP_WIDTH, GAME_CONSTANTS.MAP_HEIGHT);

    // Create renderer
    const renderer = new Renderer(canvas, camera);

    // Create input handler
    const inputHandler = new InputHandler(canvas, camera, renderer, game);
    inputHandler.setupDoubleClick();

    // Create UI manager
    const ui = new UIManager(game);

    // Make instances globally accessible
    window.game = game;
    window.camera = camera;
    window.renderer = renderer;
    window.inputHandler = inputHandler;
    window.ui = ui;

    // Start new game
    game.startNewGame();

    // Center camera on player's starting settlement
    const playerSettlements = Object.values(game.state.settlements).filter(s => s.ownerId === game.playerId);
    if (playerSettlements.length > 0) {
        camera.centerOn(playerSettlements[0].position.x, playerSettlements[0].position.y);
    }

    // Set up render loop
    function renderLoop() {
        renderer.render(game.state);
        requestAnimationFrame(renderLoop);
    }
    renderLoop();

    // Initial UI update
    ui.updatePlayPauseButton(game.isPaused);
    ui.updateSpeedDisplay(game.tickSpeed);
    ui.refreshCurrentTab();

    // Log startup
    console.log('Crossroads initialized!');
    console.log('Player ID:', game.playerId);
    console.log('Settlements:', Object.keys(game.state.settlements).length);
    console.log('Resources:', Object.keys(game.state.resources).length);
}

/**
 * Initialize when DOM is ready
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}
