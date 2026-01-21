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
            mapBackground: '#7cb342',  // Grass green background
            gridLines: '#689f38',      // Slightly darker green grid
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

            mountains: {
                fill: '#9e9e9e',       // Gray mountain fill
                stroke: '#757575',      // Darker gray stroke
                snow: '#fafafa',        // Snow caps
                circle: '#bdbdbd'       // Circle outline
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

        // Draw mountain ranges (terrain layer, below roads)
        if (gameState.mountainRanges) {
            for (const range of Object.values(gameState.mountainRanges)) {
                this.drawMountainRange(ctx, range);
            }
        }

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
     * Draw a settlement with houses as triangles
     */
    drawSettlement(ctx, settlement, gameState) {
        const { x, y } = settlement.position;
        const player = gameState.players[settlement.ownerId];
        const color = player ? player.color : this.colors.players.neutral;

        // Calculate house positions first to determine actual bounds
        const { positions: housePositions, boundingRadius } = this.calculateHousePositions(settlement, gameState);
        const radius = boundingRadius;

        // Glow effect
        const gradient = ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius * 1.3);
        gradient.addColorStop(0, color + '30');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius * 1.3, 0, Math.PI * 2);
        ctx.fill();

        // Main circle - use a light fill for visibility on white background
        ctx.fillStyle = '#fafafa';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = color;
        ctx.lineWidth = 2 / this.camera.zoom;
        ctx.stroke();

        // Draw houses as small triangles
        ctx.fillStyle = color + 'cc';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1 / this.camera.zoom;

        const houseSize = 5 / this.camera.zoom;
        for (const pos of housePositions) {
            this.drawHouseTriangle(ctx, pos.x, pos.y, houseSize);
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
            ctx.strokeStyle = '#757575';
            ctx.lineWidth = 2 / this.camera.zoom;
            ctx.setLineDash([5 / this.camera.zoom, 3 / this.camera.zoom]);
            ctx.beginPath();
            ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Name label - use darker color for white background
        if (this.camera.zoom >= 0.5) {
            ctx.fillStyle = '#333333';
            ctx.font = `${12 / this.camera.zoom}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(settlement.name, x, y + radius + 15 / this.camera.zoom);
        }

        // Check if settlement is under siege
        const isUnderSiege = this.isSettlementUnderSiege(settlement, gameState);
        if (isUnderSiege) {
            this.drawSiegeIndicator(ctx, x, y, radius);
        }

        // Show garrison strength if has garrison
        const garrisonCount = settlement.garrisonCount || 0;
        if (garrisonCount > 0 && this.camera.zoom >= 0.6) {
            // Draw small shield icon with garrison count
            const shieldX = x + radius - 5 / this.camera.zoom;
            const shieldY = y - radius + 5 / this.camera.zoom;
            const shieldSize = 12 / this.camera.zoom;

            ctx.fillStyle = '#455a64';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1 / this.camera.zoom;

            // Shield shape
            ctx.beginPath();
            ctx.moveTo(shieldX, shieldY - shieldSize);
            ctx.lineTo(shieldX + shieldSize * 0.7, shieldY - shieldSize * 0.5);
            ctx.lineTo(shieldX + shieldSize * 0.7, shieldY + shieldSize * 0.3);
            ctx.lineTo(shieldX, shieldY + shieldSize);
            ctx.lineTo(shieldX - shieldSize * 0.7, shieldY + shieldSize * 0.3);
            ctx.lineTo(shieldX - shieldSize * 0.7, shieldY - shieldSize * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Garrison count
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${8 / this.camera.zoom}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(garrisonCount.toString(), shieldX, shieldY);
        }
    }

    /**
     * Check if a settlement is currently under siege
     */
    isSettlementUnderSiege(settlement, gameState) {
        for (const battle of Object.values(gameState.battles)) {
            if (battle.locationType === 'siege' && battle._settlement && battle._settlement.id === settlement.id) {
                return true;
            }
        }
        return false;
    }

    /**
     * Draw siege indicator around a settlement
     */
    drawSiegeIndicator(ctx, x, y, radius) {
        const time = Date.now() / 400;
        const pulseScale = 1 + Math.sin(time) * 0.1;

        // Pulsing red ring
        ctx.strokeStyle = '#f44336';
        ctx.lineWidth = 4 / this.camera.zoom;
        ctx.setLineDash([8 / this.camera.zoom, 4 / this.camera.zoom]);
        ctx.beginPath();
        ctx.arc(x, y, (radius + 15) * pulseScale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Crossed swords icon above
        const iconY = y - radius - 25 / this.camera.zoom;
        const iconSize = 18 / this.camera.zoom * pulseScale;

        ctx.fillStyle = '#f44336';
        ctx.font = `${iconSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚔', x, iconY);

        // "UNDER ATTACK" text
        if (this.camera.zoom >= 0.7) {
            ctx.fillStyle = '#f44336';
            ctx.font = `bold ${10 / this.camera.zoom}px sans-serif`;
            ctx.fillText('UNDER SIEGE', x, iconY + 15 / this.camera.zoom);
        }
    }

    /**
     * Draw a small house triangle (roof pointing up)
     */
    drawHouseTriangle(ctx, hx, hy, size) {
        ctx.beginPath();
        ctx.moveTo(hx, hy - size);           // Top point
        ctx.lineTo(hx - size, hy + size);    // Bottom left
        ctx.lineTo(hx + size, hy + size);    // Bottom right
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    /**
     * Draw a mountain range
     */
    drawMountainRange(ctx, range) {
        if (!range.circles || range.circles.length === 0) return;

        // Draw each mountain circle in the range
        for (const circle of range.circles) {
            this.drawMountainCircle(ctx, circle);
        }
    }

    /**
     * Draw a single mountain circle with peaks inside
     */
    drawMountainCircle(ctx, circle) {
        const { x, y, radius, peaks } = circle;

        // Draw the containing circle (semi-transparent)
        ctx.fillStyle = this.colors.mountains.circle + '40';
        ctx.strokeStyle = this.colors.mountains.circle;
        ctx.lineWidth = 1 / this.camera.zoom;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw mountain peaks inside the circle
        if (peaks && peaks.length > 0) {
            for (const peak of peaks) {
                this.drawMountainPeak(ctx, peak.x, peak.y, radius * 0.25 * peak.scale);
            }
        } else {
            // Fallback: draw default peaks
            this.drawMountainPeak(ctx, x, y, radius * 0.35);
            this.drawMountainPeak(ctx, x - radius * 0.3, y + radius * 0.15, radius * 0.25);
            this.drawMountainPeak(ctx, x + radius * 0.3, y + radius * 0.15, radius * 0.25);
        }
    }

    /**
     * Draw a single mountain peak (triangle with snow cap)
     */
    drawMountainPeak(ctx, px, py, size) {
        // Main mountain body
        ctx.fillStyle = this.colors.mountains.fill;
        ctx.strokeStyle = this.colors.mountains.stroke;
        ctx.lineWidth = 1 / this.camera.zoom;

        ctx.beginPath();
        ctx.moveTo(px, py - size);              // Peak
        ctx.lineTo(px - size * 0.8, py + size); // Bottom left
        ctx.lineTo(px + size * 0.8, py + size); // Bottom right
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Snow cap on peak
        ctx.fillStyle = this.colors.mountains.snow;
        ctx.beginPath();
        ctx.moveTo(px, py - size);                      // Peak
        ctx.lineTo(px - size * 0.25, py - size * 0.4);  // Left snow line
        ctx.lineTo(px + size * 0.25, py - size * 0.4);  // Right snow line
        ctx.closePath();
        ctx.fill();
    }

    /**
     * Calculate house positions within a settlement, avoiding resources
     * Uses the Geometry library for consistent positioning
     * Returns { positions: array of {x, y}, boundingRadius: number }
     */
    calculateHousePositions(settlement, gameState) {
        const { x, y } = settlement.position;

        // Number of houses scales linearly with population (1 house per 25 people)
        const numHouses = Math.min(50, Math.floor(settlement.population / 25));

        if (numHouses === 0) return { positions: [], boundingRadius: 20 };

        // Find resources that overlap with this settlement
        const blockedAreas = [];
        for (const resource of Object.values(gameState.resources)) {
            const dist = Math.sqrt(
                Math.pow(resource.position.x - x, 2) +
                Math.pow(resource.position.y - y, 2)
            );
            // If resource is inside or near the settlement area
            if (dist < 150) {
                blockedAreas.push({
                    x: resource.position.x,
                    y: resource.position.y,
                    radius: resource.radius + 10 // Add padding
                });
            }
        }

        // Use a seeded pseudo-random for consistent positions
        const seed = settlement.id ? this.hashString(settlement.id) : 12345;

        // Use the Geometry library for house positioning
        return Geometry.generateHousePositions(x, y, numHouses, blockedAreas, seed);
    }

    /**
     * Simple string hash function for consistent pseudo-random positioning
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    /**
     * Draw a natural resource
     */
    drawResource(ctx, resource) {
        const { x, y } = resource.position;
        const radius = resource.radius;
        const color = this.colors.resources[resource.resourceType] || '#888888';

        // Draw containing circle for the resource
        ctx.fillStyle = color + '15';  // Very light fill
        ctx.strokeStyle = color + '60'; // Semi-transparent stroke
        ctx.lineWidth = 2 / this.camera.zoom;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

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
     * Draw a road, clipping at settlement boundaries
     */
    drawRoad(ctx, road, gameState) {
        if (road.waypoints.length < 2) return;

        const typeData = road.typeData;
        const color = typeData.color;
        const width = typeData.width;

        // Get adjusted waypoints that stop at settlement boundaries
        const adjustedWaypoints = this.getAdjustedRoadWaypoints(road.waypoints, gameState);

        if (adjustedWaypoints.length < 2) return;

        if (road.isComplete) {
            // Draw complete road as solid line
            ctx.strokeStyle = color;
            ctx.lineWidth = width / this.camera.zoom;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            ctx.moveTo(adjustedWaypoints[0].x, adjustedWaypoints[0].y);
            for (let i = 1; i < adjustedWaypoints.length; i++) {
                ctx.lineTo(adjustedWaypoints[i].x, adjustedWaypoints[i].y);
            }
            ctx.stroke();

            // Railway cross-ties
            if (road.roadType === 'rail' && this.camera.zoom >= 0.5) {
                this.drawRailwayTiesAdjusted(ctx, adjustedWaypoints, road.totalLength);
            }
        } else {
            // Road is under construction - draw built portion solid, rest dashed

            // First, draw the unbuilt (planned) portion as dashed
            ctx.strokeStyle = color + '60'; // Semi-transparent
            ctx.lineWidth = width / this.camera.zoom;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.setLineDash([10 / this.camera.zoom, 5 / this.camera.zoom]);

            ctx.beginPath();
            ctx.moveTo(adjustedWaypoints[0].x, adjustedWaypoints[0].y);
            for (let i = 1; i < adjustedWaypoints.length; i++) {
                ctx.lineTo(adjustedWaypoints[i].x, adjustedWaypoints[i].y);
            }
            ctx.stroke();
            ctx.setLineDash([]);

            // Now draw the built portion as solid
            const builtWaypoints = road.getBuiltWaypoints();
            if (builtWaypoints.length >= 2) {
                // Adjust built waypoints for settlement boundaries
                const adjustedBuiltWaypoints = this.getAdjustedRoadWaypoints(builtWaypoints, gameState);

                if (adjustedBuiltWaypoints.length >= 2) {
                    ctx.strokeStyle = color;
                    ctx.lineWidth = width / this.camera.zoom;

                    ctx.beginPath();
                    ctx.moveTo(adjustedBuiltWaypoints[0].x, adjustedBuiltWaypoints[0].y);
                    for (let i = 1; i < adjustedBuiltWaypoints.length; i++) {
                        ctx.lineTo(adjustedBuiltWaypoints[i].x, adjustedBuiltWaypoints[i].y);
                    }
                    ctx.stroke();

                    // Railway cross-ties for built portion
                    if (road.roadType === 'rail' && this.camera.zoom >= 0.5) {
                        this.drawRailwayTiesAdjusted(ctx, adjustedBuiltWaypoints, road.builtLength);
                    }
                }
            }

            // Draw construction symbol at the build point
            this.drawConstructionSymbol(ctx, road);
        }
    }

    /**
     * Draw an animated construction symbol at the road's current build point
     */
    drawConstructionSymbol(ctx, road) {
        const constructionPoint = road.getConstructionPoint();
        if (!constructionPoint) return;

        const { x, y } = constructionPoint;
        const time = Date.now() / 300; // Animation speed
        const baseSize = 10 / this.camera.zoom;

        // Pulsing orange circle
        const pulseScale = 1 + Math.sin(time) * 0.2;
        const size = baseSize * pulseScale;

        // Outer glow
        ctx.fillStyle = 'rgba(255, 152, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(x, y, size * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Inner filled circle
        ctx.fillStyle = '#ff9800';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();

        // Construction icon (small pickaxe/tool shape)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 / this.camera.zoom;
        ctx.lineCap = 'round';

        // Draw a simple construction tool shape
        const iconSize = size * 0.6;
        ctx.beginPath();
        // Handle
        ctx.moveTo(x - iconSize, y + iconSize);
        ctx.lineTo(x + iconSize * 0.3, y - iconSize * 0.3);
        // Head
        ctx.moveTo(x, y - iconSize * 0.5);
        ctx.lineTo(x + iconSize * 0.5, y);
        ctx.stroke();
    }

    /**
     * Adjust road waypoints to stop at settlement boundaries instead of centers
     */
    getAdjustedRoadWaypoints(waypoints, gameState) {
        if (waypoints.length < 2) return waypoints;

        const settlements = Object.values(gameState.settlements);
        const adjusted = waypoints.map(wp => ({ x: wp.x, y: wp.y }));

        // Adjust first waypoint
        const firstPoint = adjusted[0];
        const secondPoint = adjusted[1];
        for (const settlement of settlements) {
            const dist = Math.sqrt(
                Math.pow(firstPoint.x - settlement.position.x, 2) +
                Math.pow(firstPoint.y - settlement.position.y, 2)
            );
            if (dist < settlement.radius) {
                // Point is inside settlement, move to boundary
                const intersection = this.lineCircleIntersection(
                    settlement.position.x, settlement.position.y, settlement.radius,
                    firstPoint.x, firstPoint.y,
                    secondPoint.x, secondPoint.y
                );
                if (intersection) {
                    adjusted[0] = intersection;
                }
                break;
            }
        }

        // Adjust last waypoint
        const lastPoint = adjusted[adjusted.length - 1];
        const secondLastPoint = adjusted[adjusted.length - 2];
        for (const settlement of settlements) {
            const dist = Math.sqrt(
                Math.pow(lastPoint.x - settlement.position.x, 2) +
                Math.pow(lastPoint.y - settlement.position.y, 2)
            );
            if (dist < settlement.radius) {
                // Point is inside settlement, move to boundary
                const intersection = this.lineCircleIntersection(
                    settlement.position.x, settlement.position.y, settlement.radius,
                    lastPoint.x, lastPoint.y,
                    secondLastPoint.x, secondLastPoint.y
                );
                if (intersection) {
                    adjusted[adjusted.length - 1] = intersection;
                }
                break;
            }
        }

        return adjusted;
    }

    /**
     * Find intersection of a line segment with a circle boundary
     * Returns the intersection point closest to point (x1, y1)
     */
    lineCircleIntersection(cx, cy, r, x1, y1, x2, y2) {
        // Direction from inside point to outside point
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return null;

        // Normalized direction
        const ux = dx / len;
        const uy = dy / len;

        // Vector from circle center to starting point
        const fx = x1 - cx;
        const fy = y1 - cy;

        // Quadratic equation coefficients for ray-circle intersection
        const a = ux * ux + uy * uy;
        const b = 2 * (fx * ux + fy * uy);
        const c = fx * fx + fy * fy - r * r;

        const discriminant = b * b - 4 * a * c;
        if (discriminant < 0) return null;

        const sqrtDisc = Math.sqrt(discriminant);
        const t1 = (-b - sqrtDisc) / (2 * a);
        const t2 = (-b + sqrtDisc) / (2 * a);

        // We want the intersection going from inside to outside (positive t)
        let t = t1 >= 0 ? t1 : t2;
        if (t < 0) t = t2;

        return {
            x: x1 + t * ux,
            y: y1 + t * uy
        };
    }

    /**
     * Draw railway cross-ties
     */
    drawRailwayTies(ctx, road) {
        this.drawRailwayTiesAdjusted(ctx, road.waypoints, road.totalLength);
    }

    /**
     * Draw railway cross-ties for adjusted waypoints
     */
    drawRailwayTiesAdjusted(ctx, waypoints, totalLength) {
        const tieSpacing = 15;
        const tieWidth = 8;

        ctx.strokeStyle = '#6d4c41';
        ctx.lineWidth = 2 / this.camera.zoom;

        // Calculate actual length of adjusted waypoints
        let adjustedLength = 0;
        for (let i = 1; i < waypoints.length; i++) {
            const dx = waypoints[i].x - waypoints[i - 1].x;
            const dy = waypoints[i].y - waypoints[i - 1].y;
            adjustedLength += Math.sqrt(dx * dx + dy * dy);
        }

        let distance = 0;

        while (distance < adjustedLength) {
            const point = pointAlongPolyline(waypoints, distance);
            const nextPoint = pointAlongPolyline(waypoints, distance + 1);

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
     * Draw an army as a circle with unit count inside
     */
    drawArmy(ctx, army, gameState) {
        const { x, y } = army.position;
        const player = gameState.players[army.ownerId];
        const color = player ? player.color : this.colors.players.neutral;

        // Measure text to determine circle size
        const unitCount = army.totalUnits.toString();
        const baseFontSize = 12 / this.camera.zoom;
        ctx.font = `bold ${baseFontSize}px sans-serif`;
        const textMetrics = ctx.measureText(unitCount);
        const textWidth = textMetrics.width;

        // Circle radius scales to fit the number text with padding
        const minRadius = 12 / this.camera.zoom;
        const radius = Math.max(minRadius, (textWidth / 2) + 6 / this.camera.zoom);

        // Draw direction indicator if moving
        if (army.destination) {
            const dx = army.destination.x - x;
            const dy = army.destination.y - y;
            const angle = Math.atan2(dy, dx);
            const arrowLength = radius + 8 / this.camera.zoom;

            // Draw arrow pointing toward destination
            ctx.strokeStyle = color + 'aa';
            ctx.lineWidth = 2 / this.camera.zoom;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
            ctx.lineTo(x + Math.cos(angle) * arrowLength, y + Math.sin(angle) * arrowLength);
            ctx.stroke();

            // Arrow head
            const headSize = 4 / this.camera.zoom;
            const headAngle = 0.5;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(angle) * arrowLength, y + Math.sin(angle) * arrowLength);
            ctx.lineTo(
                x + Math.cos(angle - headAngle) * (arrowLength - headSize),
                y + Math.sin(angle - headAngle) * (arrowLength - headSize)
            );
            ctx.moveTo(x + Math.cos(angle) * arrowLength, y + Math.sin(angle) * arrowLength);
            ctx.lineTo(
                x + Math.cos(angle + headAngle) * (arrowLength - headSize),
                y + Math.sin(angle + headAngle) * (arrowLength - headSize)
            );
            ctx.stroke();
        }

        // Draw outer glow when selected or moving
        if (army.destination || army.inBattle) {
            const glowRadius = radius + 4 / this.camera.zoom;
            const gradient = ctx.createRadialGradient(x, y, radius, x, y, glowRadius);
            gradient.addColorStop(0, color + '60');
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw main circle
        ctx.fillStyle = color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 / this.camera.zoom;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw unit count text
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${baseFontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(unitCount, x, y);

        // In battle indicator - pulsing crossed swords above
        if (army.inBattle) {
            const time = Date.now() / 300;
            const pulseScale = 1 + Math.sin(time) * 0.2;
            const iconSize = 14 / this.camera.zoom * pulseScale;

            ctx.fillStyle = '#f44336';
            ctx.font = `${iconSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⚔', x, y - radius - 10 / this.camera.zoom);
        }

        // Moving indicator ring (dashed)
        if (army.destination) {
            ctx.strokeStyle = color + '60';
            ctx.lineWidth = 2 / this.camera.zoom;
            ctx.setLineDash([3 / this.camera.zoom, 3 / this.camera.zoom]);
            ctx.beginPath();
            ctx.arc(x, y, radius + 5 / this.camera.zoom, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
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
