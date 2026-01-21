// Crossroads - Canvas Renderer

/**
 * Renderer class for drawing the game map
 */
class Renderer {
    constructor(canvas, camera) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.camera = camera;

        // Colors from design doc
        this.colors = {
            mapBackground: '#16213e',
            gridLines: '#1e2d50',
            selection: '#4fc3f7',
            selectionGlow: 'rgba(79, 195, 247, 0.3)',

            players: {
                player1: '#4fc3f7',
                player2: '#f44336',
                neutral: '#9e9e9e'
            },

            resources: {
                forest: '#2e7d32',
                stone: '#8d6e63',
                iron: '#78909c',
                fertile: '#558b2f'
            },

            roads: {
                dirt: '#5d4037',
                stone: '#6d6d6d',
                paved: '#212121',
                rail: '#4a4a4a'
            }
        };

        // Selected entity
        this.selectedEntity = null;
        this.selectedType = null;

        // Hover state
        this.hoveredEntity = null;
        this.hoveredType = null;

        // Road building preview
        this.roadPreview = null;

        // Resize handler
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    /**
     * Resize canvas to fit container
     */
    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    /**
     * Main render function
     */
    render(gameState) {
        const ctx = this.ctx;

        // Clear canvas
        ctx.fillStyle = this.colors.mapBackground;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply camera transform
        this.camera.applyTransform(ctx);

        // Draw grid (optional, subtle)
        this.drawGrid(ctx);

        // Draw roads first (under everything)
        for (const road of Object.values(gameState.roads)) {
            this.drawRoad(ctx, road, gameState);
        }

        // Draw road preview if building
        if (this.roadPreview && this.roadPreview.waypoints.length > 0) {
            this.drawRoadPreview(ctx);
        }

        // Draw natural resources
        for (const resource of Object.values(gameState.resources)) {
            this.drawResource(ctx, resource);
        }

        // Draw buildings
        for (const building of Object.values(gameState.buildings)) {
            this.drawBuilding(ctx, building, gameState);
        }

        // Draw settlements
        for (const settlement of Object.values(gameState.settlements)) {
            this.drawSettlement(ctx, settlement, gameState);
        }

        // Draw armies
        for (const army of Object.values(gameState.armies)) {
            this.drawArmy(ctx, army, gameState);
        }

        // Draw battles
        for (const battle of Object.values(gameState.battles)) {
            this.drawBattle(ctx, battle);
        }

        // Draw selection highlight
        if (this.selectedEntity) {
            this.drawSelection(ctx);
        }

        // Restore camera transform
        this.camera.restoreTransform(ctx);

        // Draw UI overlays (in screen space)
        this.drawMinimap(ctx, gameState);
    }

    /**
     * Draw grid lines
     */
    drawGrid(ctx) {
        const gridSize = 200;
        const bounds = this.camera.getVisibleBounds();

        ctx.strokeStyle = this.colors.gridLines;
        ctx.lineWidth = 1 / this.camera.zoom;

        const startX = Math.floor(bounds.left / gridSize) * gridSize;
        const startY = Math.floor(bounds.top / gridSize) * gridSize;

        ctx.beginPath();
        for (let x = startX; x <= bounds.right; x += gridSize) {
            ctx.moveTo(x, bounds.top);
            ctx.lineTo(x, bounds.bottom);
        }
        for (let y = startY; y <= bounds.bottom; y += gridSize) {
            ctx.moveTo(bounds.left, y);
            ctx.lineTo(bounds.right, y);
        }
        ctx.stroke();
    }

    /**
     * Draw a settlement
     */
    drawSettlement(ctx, settlement, gameState) {
        const { x, y } = settlement.position;
        const radius = settlement.radius;
        const player = gameState.players[settlement.ownerId];
        const color = player ? player.color : this.colors.players.neutral;

        // Glow effect
        const gradient = ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius * 1.5);
        gradient.addColorStop(0, color + '40');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Main circle
        ctx.fillStyle = this.colors.mapBackground;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = color;
        ctx.lineWidth = 3 / this.camera.zoom;
        ctx.stroke();

        // Inner details based on population
        ctx.fillStyle = color + '60';
        if (settlement.population >= 200) {
            // Draw some small shapes to represent buildings
            const innerRadius = radius * 0.6;
            const numDots = Math.min(8, Math.floor(settlement.population / 200));
            for (let i = 0; i < numDots; i++) {
                const angle = (i / numDots) * Math.PI * 2;
                const dotX = x + Math.cos(angle) * innerRadius * 0.6;
                const dotY = y + Math.sin(angle) * innerRadius * 0.6;
                ctx.beginPath();
                ctx.arc(dotX, dotY, 3 / this.camera.zoom, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Capital marker
        if (settlement.isCapital) {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, 5 / this.camera.zoom, 0, Math.PI * 2);
            ctx.fill();
        }

        // Walls indicator
        if (settlement.wallsLevel > 0) {
            ctx.strokeStyle = '#9e9e9e';
            ctx.lineWidth = 2 / this.camera.zoom;
            ctx.setLineDash([5 / this.camera.zoom, 3 / this.camera.zoom]);
            ctx.beginPath();
            ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Name label
        if (this.camera.zoom >= 0.5) {
            ctx.fillStyle = '#eeeeee';
            ctx.font = `${12 / this.camera.zoom}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(settlement.name, x, y + radius + 15 / this.camera.zoom);
        }
    }

    /**
     * Draw a natural resource
     */
    drawResource(ctx, resource) {
        const { x, y } = resource.position;
        const radius = resource.radius;
        const color = this.colors.resources[resource.resourceType] || '#888888';

        // Different shapes for different resource types
        switch (resource.resourceType) {
            case 'forest':
                // Draw multiple tree circles
                ctx.fillStyle = color;
                const treePositions = [
                    { dx: 0, dy: 0 },
                    { dx: -12, dy: -8 },
                    { dx: 12, dy: -8 },
                    { dx: -8, dy: 10 },
                    { dx: 8, dy: 10 }
                ];
                for (const pos of treePositions) {
                    ctx.beginPath();
                    ctx.arc(x + pos.dx, y + pos.dy, 8, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;

            case 'stone':
                // Draw rectangle
                ctx.fillStyle = color;
                ctx.fillRect(x - radius * 0.7, y - radius * 0.5, radius * 1.4, radius);
                break;

            case 'iron':
                // Draw hexagon
                ctx.fillStyle = color;
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
                    const px = x + Math.cos(angle) * radius * 0.7;
                    const py = y + Math.sin(angle) * radius * 0.7;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                break;

            case 'fertile':
                // Draw dotted circle outline
                ctx.strokeStyle = color;
                ctx.lineWidth = 3 / this.camera.zoom;
                ctx.setLineDash([5 / this.camera.zoom, 5 / this.camera.zoom]);
                ctx.beginPath();
                ctx.arc(x, y, radius * 0.8, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                break;

            default:
                // Default circle
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2);
                ctx.fill();
        }

        // Show remaining amount if zoomed in
        if (this.camera.zoom >= 1.0 && resource.amountRemaining < resource.totalAmount) {
            const percent = resource.amountRemaining / resource.totalAmount;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = `${10 / this.camera.zoom}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(`${Math.floor(percent * 100)}%`, x, y + radius + 12 / this.camera.zoom);
        }
    }

    /**
     * Draw a road
     */
    drawRoad(ctx, road, gameState) {
        if (road.waypoints.length < 2) return;

        const typeData = road.typeData;
        const color = typeData.color;
        const width = typeData.width;

        // Set line style based on completion
        if (!road.isComplete) {
            ctx.setLineDash([10 / this.camera.zoom, 5 / this.camera.zoom]);
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = width / this.camera.zoom;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(road.waypoints[0].x, road.waypoints[0].y);
        for (let i = 1; i < road.waypoints.length; i++) {
            ctx.lineTo(road.waypoints[i].x, road.waypoints[i].y);
        }
        ctx.stroke();

        // Railway cross-ties
        if (road.roadType === 'rail' && road.isComplete && this.camera.zoom >= 0.5) {
            this.drawRailwayTies(ctx, road);
        }

        ctx.setLineDash([]);

        // Construction progress indicator
        if (!road.isComplete) {
            const progressPoint = pointAlongPolyline(road.waypoints, road.totalLength * road.constructionProgress);
            ctx.fillStyle = '#ff9800';
            ctx.beginPath();
            ctx.arc(progressPoint.x, progressPoint.y, 6 / this.camera.zoom, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * Draw railway cross-ties
     */
    drawRailwayTies(ctx, road) {
        const tieSpacing = 15;
        const tieWidth = 8;

        ctx.strokeStyle = '#6d4c41';
        ctx.lineWidth = 2 / this.camera.zoom;

        let distance = 0;
        const totalLength = road.totalLength;

        while (distance < totalLength) {
            const point = pointAlongPolyline(road.waypoints, distance);
            const nextPoint = pointAlongPolyline(road.waypoints, distance + 1);

            // Calculate perpendicular direction
            const dx = nextPoint.x - point.x;
            const dy = nextPoint.y - point.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) {
                const perpX = -dy / len * tieWidth / this.camera.zoom;
                const perpY = dx / len * tieWidth / this.camera.zoom;

                ctx.beginPath();
                ctx.moveTo(point.x - perpX, point.y - perpY);
                ctx.lineTo(point.x + perpX, point.y + perpY);
                ctx.stroke();
            }

            distance += tieSpacing / this.camera.zoom;
        }
    }

    /**
     * Draw road building preview
     */
    drawRoadPreview(ctx) {
        const waypoints = this.roadPreview.waypoints;
        if (waypoints.length < 1) return;

        ctx.strokeStyle = this.colors.selection;
        ctx.lineWidth = 3 / this.camera.zoom;
        ctx.setLineDash([5 / this.camera.zoom, 5 / this.camera.zoom]);

        ctx.beginPath();
        ctx.moveTo(waypoints[0].x, waypoints[0].y);
        for (let i = 1; i < waypoints.length; i++) {
            ctx.lineTo(waypoints[i].x, waypoints[i].y);
        }

        // Draw to current mouse position if set
        if (this.roadPreview.currentPoint) {
            ctx.lineTo(this.roadPreview.currentPoint.x, this.roadPreview.currentPoint.y);
        }

        ctx.stroke();
        ctx.setLineDash([]);

        // Draw waypoint markers
        ctx.fillStyle = this.colors.selection;
        for (const wp of waypoints) {
            ctx.beginPath();
            ctx.arc(wp.x, wp.y, 5 / this.camera.zoom, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * Draw a building
     */
    drawBuilding(ctx, building, gameState) {
        const { x, y } = building.position;
        const player = gameState.players[building.ownerId];
        const color = player ? player.color : this.colors.players.neutral;

        // Building size
        const size = 12;

        // Draw based on building type
        ctx.fillStyle = color + 'aa';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2 / this.camera.zoom;

        ctx.beginPath();
        ctx.rect(x - size / 2, y - size / 2, size, size);
        ctx.fill();
        ctx.stroke();

        // Construction progress
        if (!building.isComplete) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(x - size / 2, y - size / 2, size * (1 - building.constructionProgress), size);
        }

        // Building type icon (simplified)
        if (this.camera.zoom >= 0.8) {
            ctx.fillStyle = '#fff';
            ctx.font = `${10 / this.camera.zoom}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const typeIcons = {
                lumber_camp: 'L',
                quarry: 'Q',
                mine: 'M',
                farm: 'F',
                house: 'H',
                barracks: 'B',
                library: 'R',
                walls: 'W'
            };
            ctx.fillText(typeIcons[building.type] || '?', x, y);
        }
    }

    /**
     * Draw an army
     */
    drawArmy(ctx, army, gameState) {
        const { x, y } = army.position;
        const player = gameState.players[army.ownerId];
        const color = player ? player.color : this.colors.players.neutral;

        // Size based on unit count
        const size = 8 + Math.sqrt(army.totalUnits) * 0.3;

        // Calculate direction for triangle
        let angle = 0;
        if (army.destination) {
            const dx = army.destination.x - x;
            const dy = army.destination.y - y;
            angle = Math.atan2(dy, dx);
        }

        // Draw triangle
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        ctx.fillStyle = color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 / this.camera.zoom;

        ctx.beginPath();
        ctx.moveTo(size, 0);
        ctx.lineTo(-size * 0.6, -size * 0.6);
        ctx.lineTo(-size * 0.6, size * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();

        // Moving indicator
        if (army.destination) {
            ctx.strokeStyle = color + '60';
            ctx.lineWidth = 2 / this.camera.zoom;
            ctx.setLineDash([3 / this.camera.zoom, 3 / this.camera.zoom]);
            ctx.beginPath();
            ctx.arc(x, y, size + 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // In battle indicator
        if (army.inBattle) {
            ctx.fillStyle = '#f44336';
            ctx.font = `${14 / this.camera.zoom}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('⚔', x, y - size - 8 / this.camera.zoom);
        }

        // Unit count label
        if (this.camera.zoom >= 0.7) {
            ctx.fillStyle = '#eeeeee';
            ctx.font = `${10 / this.camera.zoom}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(army.totalUnits.toString(), x, y + size + 12 / this.camera.zoom);
        }
    }

    /**
     * Draw a battle
     */
    drawBattle(ctx, battle) {
        const { x, y } = battle.location;

        // Pulsing red circle
        const time = Date.now() / 500;
        const pulseRadius = 30 + Math.sin(time) * 10;

        ctx.strokeStyle = '#f44336';
        ctx.lineWidth = 3 / this.camera.zoom;
        ctx.beginPath();
        ctx.arc(x, y, pulseRadius / this.camera.zoom, 0, Math.PI * 2);
        ctx.stroke();

        // Crossed swords icon
        ctx.fillStyle = '#f44336';
        ctx.font = `${24 / this.camera.zoom}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚔', x, y);
    }

    /**
     * Draw selection highlight
     */
    drawSelection(ctx) {
        const entity = this.selectedEntity;
        if (!entity || !entity.position) return;

        const { x, y } = entity.position;
        let radius = 30;

        // Adjust radius based on entity type
        if (this.selectedType === 'settlement') {
            radius = entity.radius + 10;
        } else if (this.selectedType === 'army') {
            radius = 15 + Math.sqrt(entity.totalUnits) * 0.3;
        } else if (this.selectedType === 'resource') {
            radius = entity.radius + 5;
        }

        // Glow effect
        ctx.fillStyle = this.colors.selectionGlow;
        ctx.beginPath();
        ctx.arc(x, y, radius + 10, 0, Math.PI * 2);
        ctx.fill();

        // Selection ring
        ctx.strokeStyle = this.colors.selection;
        ctx.lineWidth = 2 / this.camera.zoom;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Corner markers
        const cornerSize = 8 / this.camera.zoom;
        const corners = [
            { x: x - radius, y: y - radius },
            { x: x + radius, y: y - radius },
            { x: x - radius, y: y + radius },
            { x: x + radius, y: y + radius }
        ];

        ctx.lineWidth = 3 / this.camera.zoom;
        for (const corner of corners) {
            ctx.beginPath();
            ctx.moveTo(corner.x, corner.y + cornerSize * Math.sign(y - corner.y));
            ctx.lineTo(corner.x, corner.y);
            ctx.lineTo(corner.x + cornerSize * Math.sign(x - corner.x), corner.y);
            ctx.stroke();
        }
    }

    /**
     * Draw minimap
     */
    drawMinimap(ctx, gameState) {
        const minimapSize = 150;
        const minimapMargin = 10;
        const minimapX = this.canvas.width - minimapSize - minimapMargin;
        const minimapY = this.canvas.height - minimapSize - minimapMargin;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);

        // Border
        ctx.strokeStyle = '#333355';
        ctx.lineWidth = 1;
        ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize);

        // Scale factor
        const scale = minimapSize / Math.max(this.camera.mapWidth, this.camera.mapHeight);

        // Draw settlements as dots
        for (const settlement of Object.values(gameState.settlements)) {
            const player = gameState.players[settlement.ownerId];
            const color = player ? player.color : this.colors.players.neutral;
            const mx = minimapX + settlement.position.x * scale;
            const my = minimapY + settlement.position.y * scale;

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(mx, my, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw armies as small triangles
        for (const army of Object.values(gameState.armies)) {
            const player = gameState.players[army.ownerId];
            const color = player ? player.color : this.colors.players.neutral;
            const mx = minimapX + army.position.x * scale;
            const my = minimapY + army.position.y * scale;

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(mx, my - 2);
            ctx.lineTo(mx - 2, my + 2);
            ctx.lineTo(mx + 2, my + 2);
            ctx.closePath();
            ctx.fill();
        }

        // Draw viewport rectangle
        const bounds = this.camera.getVisibleBounds();
        const viewX = minimapX + Math.max(0, bounds.left) * scale;
        const viewY = minimapY + Math.max(0, bounds.top) * scale;
        const viewW = Math.min(bounds.right - bounds.left, this.camera.mapWidth) * scale;
        const viewH = Math.min(bounds.bottom - bounds.top, this.camera.mapHeight) * scale;

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(viewX, viewY, viewW, viewH);
    }

    /**
     * Set selected entity
     */
    setSelection(entity, type) {
        this.selectedEntity = entity;
        this.selectedType = type;
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedEntity = null;
        this.selectedType = null;
    }

    /**
     * Start road preview
     */
    startRoadPreview(roadType) {
        this.roadPreview = {
            roadType: roadType,
            waypoints: [],
            currentPoint: null
        };
    }

    /**
     * Add waypoint to road preview
     */
    addRoadPreviewWaypoint(point) {
        if (this.roadPreview) {
            this.roadPreview.waypoints.push(point.clone());
        }
    }

    /**
     * Update road preview current point
     */
    updateRoadPreviewCurrent(point) {
        if (this.roadPreview) {
            this.roadPreview.currentPoint = point;
        }
    }

    /**
     * End road preview
     */
    endRoadPreview() {
        const preview = this.roadPreview;
        this.roadPreview = null;
        return preview;
    }

    /**
     * Cancel road preview
     */
    cancelRoadPreview() {
        this.roadPreview = null;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Renderer };
}
