// Crossroads - Input Handler

/**
 * Input handler for mouse and keyboard events
 */
class InputHandler {
    constructor(canvas, camera, renderer, game) {
        this.canvas = canvas;
        this.camera = camera;
        this.renderer = renderer;
        this.game = game;

        // Current tool/mode
        this.currentTool = 'select'; // 'select', 'road', 'building'
        this.buildingType = null;
        this.roadType = 'dirt';

        // Mouse state
        this.mousePos = new Vec2(0, 0);
        this.worldPos = new Vec2(0, 0);
        this.isMouseDown = false;
        this.mouseButton = 0;

        // Selection state
        this.selectedEntity = null;
        this.selectedType = null;

        // Bind event handlers
        this.setupEventListeners();
    }

    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Keyboard events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));

        // Prevent default drag behavior
        this.canvas.addEventListener('dragstart', (e) => e.preventDefault());
    }

    /**
     * Mouse down handler
     */
    onMouseDown(e) {
        this.isMouseDown = true;
        this.mouseButton = e.button;
        this.updateMousePosition(e);

        if (e.button === 0) { // Left click
            if (this.currentTool === 'select') {
                // Start panning if clicking on empty space
                const entity = this.findEntityAtPosition(this.worldPos);
                if (!entity) {
                    this.camera.startPan(e.clientX, e.clientY);
                    this.canvas.classList.add('grabbing');
                }
            } else if (this.currentTool === 'road') {
                // Add waypoint for road building
                this.renderer.addRoadPreviewWaypoint(this.worldPos);
                this.updateRoadToolIndicator();
            } else if (this.currentTool === 'building') {
                // Try to place building
                this.tryPlaceBuilding(this.worldPos);
            }
        } else if (e.button === 2) { // Right click
            // Issue move command if army is selected
            if (this.selectedType === 'army' && this.selectedEntity) {
                this.game.moveArmy(this.selectedEntity.id, this.worldPos);
            }
        }
    }

    /**
     * Mouse move handler
     */
    onMouseMove(e) {
        this.updateMousePosition(e);

        if (this.isMouseDown && this.mouseButton === 0) {
            if (this.currentTool === 'select' && this.camera.isPanning) {
                this.camera.updatePan(e.clientX, e.clientY);
            }
        }

        // Update road preview
        if (this.currentTool === 'road' && this.renderer.roadPreview) {
            this.renderer.updateRoadPreviewCurrent(this.worldPos);
            // Update time estimate in tool indicator
            if (this.renderer.roadPreview.waypoints.length > 0) {
                this.updateRoadToolIndicator();
            }
        }
    }

    /**
     * Mouse up handler
     */
    onMouseUp(e) {
        this.updateMousePosition(e);

        if (e.button === 0) { // Left click
            if (this.currentTool === 'select') {
                if (this.camera.isPanning) {
                    this.camera.endPan();
                    this.canvas.classList.remove('grabbing');
                } else {
                    // Select entity at click position
                    this.selectEntityAt(this.worldPos);
                }
            }
        }

        this.isMouseDown = false;
    }

    /**
     * Mouse wheel handler
     */
    onWheel(e) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 1 : -1;
        this.camera.zoomAt(e.clientX, e.clientY, delta);
    }

    /**
     * Key down handler
     */
    onKeyDown(e) {
        switch (e.key) {
            case 'Escape':
                this.cancelCurrentAction();
                break;
            case ' ':
                e.preventDefault();
                this.game.togglePause();
                break;
            case 'r':
            case 'R':
                if (!e.ctrlKey) {
                    this.setTool('road');
                }
                break;
            case 'Delete':
            case 'Backspace':
                if (this.selectedEntity) {
                    this.deleteSelected();
                }
                break;
            case '1':
                this.switchTab('settlements');
                break;
            case '2':
                this.switchTab('armies');
                break;
            case '3':
                this.switchTab('research');
                break;
            case '4':
                this.switchTab('build');
                break;
        }
    }

    /**
     * Key up handler
     */
    onKeyUp(e) {
        // Handle key releases if needed
    }

    /**
     * Update mouse position
     */
    updateMousePosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mousePos.x = e.clientX - rect.left;
        this.mousePos.y = e.clientY - rect.top;
        this.worldPos = this.camera.screenToWorld(e.clientX, e.clientY);
    }

    /**
     * Find entity at world position
     */
    findEntityAtPosition(worldPos) {
        const state = this.game.state;

        // Check settlements
        for (const settlement of Object.values(state.settlements)) {
            if (pointInCircle(worldPos.x, worldPos.y, settlement.position.x, settlement.position.y, settlement.radius)) {
                return { entity: settlement, type: 'settlement' };
            }
        }

        // Check armies
        for (const army of Object.values(state.armies)) {
            const radius = 10 + Math.sqrt(army.totalUnits) * 0.3;
            if (pointInCircle(worldPos.x, worldPos.y, army.position.x, army.position.y, radius)) {
                return { entity: army, type: 'army' };
            }
        }

        // Check resources
        for (const resource of Object.values(state.resources)) {
            if (pointInCircle(worldPos.x, worldPos.y, resource.position.x, resource.position.y, resource.radius)) {
                return { entity: resource, type: 'resource' };
            }
        }

        // Check buildings
        for (const building of Object.values(state.buildings)) {
            if (pointInCircle(worldPos.x, worldPos.y, building.position.x, building.position.y, 15)) {
                return { entity: building, type: 'building' };
            }
        }

        // Check roads
        for (const road of Object.values(state.roads)) {
            if (pointNearPolyline(worldPos.x, worldPos.y, road.waypoints, 10 / this.camera.zoom)) {
                return { entity: road, type: 'road' };
            }
        }

        return null;
    }

    /**
     * Select entity at position
     */
    selectEntityAt(worldPos) {
        const result = this.findEntityAtPosition(worldPos);

        if (result) {
            this.selectEntity(result.entity, result.type);
        } else {
            this.clearSelection();
        }
    }

    /**
     * Select an entity
     */
    selectEntity(entity, type) {
        this.selectedEntity = entity;
        this.selectedType = type;
        this.renderer.setSelection(entity, type);

        // Update UI
        if (window.ui) {
            window.ui.showEntityDetails(entity, type);
        }

        // Dispatch event
        const event = new CustomEvent('entitySelected', {
            detail: { entity, type }
        });
        document.dispatchEvent(event);
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedEntity = null;
        this.selectedType = null;
        this.renderer.clearSelection();

        // Update UI
        if (window.ui) {
            window.ui.hideEntityDetails();
        }

        // Dispatch event
        const event = new CustomEvent('selectionCleared');
        document.dispatchEvent(event);
    }

    /**
     * Set current tool
     */
    setTool(tool, options = {}) {
        // Cancel any current action
        this.cancelCurrentAction();

        this.currentTool = tool;

        if (tool === 'road') {
            this.roadType = options.roadType || 'dirt';
            this.renderer.startRoadPreview(this.roadType);
            this.canvas.classList.add('crosshair');

            // Show tool indicator with initial message
            this.updateRoadToolIndicator();
        } else if (tool === 'building') {
            this.buildingType = options.buildingType;
            this.canvas.classList.add('crosshair');

            const indicator = document.getElementById('tool-indicator');
            indicator.textContent = `Placing ${BuildingType[this.buildingType.toUpperCase()].name} - Click near a resource to place`;
            indicator.classList.remove('hidden');
        } else {
            this.canvas.classList.remove('crosshair');
            document.getElementById('tool-indicator').classList.add('hidden');
        }
    }

    /**
     * Cancel current action
     */
    cancelCurrentAction() {
        if (this.currentTool === 'road') {
            this.renderer.cancelRoadPreview();
        }

        this.currentTool = 'select';
        this.buildingType = null;
        this.canvas.classList.remove('crosshair');
        document.getElementById('tool-indicator').classList.add('hidden');
    }

    /**
     * Finish road building
     */
    finishRoadBuilding() {
        const preview = this.renderer.endRoadPreview();
        if (preview && preview.waypoints.length >= 2) {
            this.game.buildRoad(preview.waypoints, preview.roadType);
        }

        this.setTool('select');
    }

    /**
     * Try to place a building
     */
    tryPlaceBuilding(worldPos) {
        if (!this.buildingType) return;

        // Find nearby resource for extraction buildings
        const buildingData = BuildingType[this.buildingType.toUpperCase()];
        if (buildingData.targetResource) {
            // Find resource within range
            const resource = this.findNearbyResource(worldPos, buildingData.targetResource);
            if (resource) {
                this.game.buildBuilding(this.buildingType, worldPos, resource.id);
                this.setTool('select');
            } else {
                if (window.ui) {
                    window.ui.showNotification(`Must place ${buildingData.name} near a ${buildingData.targetResource}`, 'warning');
                }
            }
        } else {
            // Non-extraction building - place near settlement
            const settlement = this.findNearbySettlement(worldPos);
            if (settlement) {
                this.game.buildBuilding(this.buildingType, worldPos, null, settlement.id);
                this.setTool('select');
            } else {
                if (window.ui) {
                    window.ui.showNotification(`Must place ${buildingData.name} near a settlement`, 'warning');
                }
            }
        }
    }

    /**
     * Find nearby resource of specific type
     */
    findNearbyResource(worldPos, resourceType) {
        const state = this.game.state;
        const maxDistance = 50;

        for (const resource of Object.values(state.resources)) {
            if (resource.resourceType === resourceType) {
                const dist = worldPos.distanceTo(resource.position);
                if (dist < maxDistance + resource.radius) {
                    return resource;
                }
            }
        }

        return null;
    }

    /**
     * Find nearby settlement
     */
    findNearbySettlement(worldPos) {
        const state = this.game.state;
        const maxDistance = 100;

        for (const settlement of Object.values(state.settlements)) {
            const dist = worldPos.distanceTo(settlement.position);
            if (dist < maxDistance + settlement.radius) {
                return settlement;
            }
        }

        return null;
    }

    /**
     * Delete selected entity
     */
    deleteSelected() {
        if (!this.selectedEntity) return;

        // Only allow deleting certain things
        if (this.selectedType === 'road') {
            this.game.removeRoad(this.selectedEntity.id);
            this.clearSelection();
        } else if (this.selectedType === 'building') {
            this.game.removeBuilding(this.selectedEntity.id);
            this.clearSelection();
        }
    }

    /**
     * Switch sidebar tab
     */
    switchTab(tabName) {
        if (window.ui) {
            window.ui.switchTab(tabName);
        }
    }

    /**
     * Update the road building tool indicator with length and time estimate
     */
    updateRoadToolIndicator() {
        const indicator = document.getElementById('tool-indicator');
        const roadTypeName = RoadType[this.roadType.toUpperCase()].name;

        if (!this.renderer.roadPreview || this.renderer.roadPreview.waypoints.length === 0) {
            indicator.textContent = `Building ${roadTypeName} - Click to place waypoints, double-click to finish`;
            indicator.classList.remove('hidden');
            return;
        }

        // Calculate total length including current mouse position
        const waypoints = [...this.renderer.roadPreview.waypoints];
        if (this.renderer.roadPreview.currentPoint) {
            waypoints.push(this.renderer.roadPreview.currentPoint);
        }

        let totalLength = 0;
        for (let i = 0; i < waypoints.length - 1; i++) {
            const dx = waypoints[i + 1].x - waypoints[i].x;
            const dy = waypoints[i + 1].y - waypoints[i].y;
            totalLength += Math.sqrt(dx * dx + dy * dy);
        }

        // Calculate estimated ticks to complete
        const constructionSpeed = GAME_CONSTANTS.ROAD_CONSTRUCTION_SPEED;
        const estimatedTicks = Math.ceil(totalLength / constructionSpeed);

        // Format time estimate
        let timeStr;
        if (estimatedTicks === 0) {
            timeStr = 'instant';
        } else if (estimatedTicks === 1) {
            timeStr = '1 tick';
        } else {
            timeStr = `${estimatedTicks} ticks`;
        }

        indicator.textContent = `Building ${roadTypeName} - Length: ${Math.round(totalLength)} | Est. time: ${timeStr} | Double-click to finish`;
        indicator.classList.remove('hidden');
    }

    /**
     * Handle double click for finishing road
     */
    setupDoubleClick() {
        let lastClickTime = 0;
        const doubleClickDelay = 300;

        this.canvas.addEventListener('click', (e) => {
            const now = Date.now();
            if (now - lastClickTime < doubleClickDelay) {
                // Double click
                if (this.currentTool === 'road') {
                    this.finishRoadBuilding();
                }
            }
            lastClickTime = now;
        });
    }
}

// Initialize double click handler
InputHandler.prototype.setupDoubleClick.call = function() {};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { InputHandler };
}
