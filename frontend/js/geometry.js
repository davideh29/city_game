// Crossroads - Geometry Library
// Functions for geometric generation: mountains, house placement, etc.

/**
 * Geometry utility functions for game rendering and collision detection
 */
const Geometry = {
    /**
     * Generate positions for mountain peaks within a circle
     * @param {number} cx - Center X of the mountain area
     * @param {number} cy - Center Y of the mountain area
     * @param {number} radius - Radius of the mountain area
     * @param {number} count - Number of peaks to generate
     * @param {number} seed - Seed for deterministic generation
     * @returns {Array} Array of {x, y, scale} for each peak
     */
    generateMountainPeaks(cx, cy, radius, count, seed) {
        const peaks = [];
        let rng = seed;

        const nextRandom = () => {
            rng = (rng * 1103515245 + 12345) & 0x7fffffff;
            return rng / 0x7fffffff;
        };

        // Place peaks in a roughly circular pattern
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + nextRandom() * 0.5;
            const dist = nextRandom() * radius * 0.6;
            const x = cx + Math.cos(angle) * dist;
            const y = cy + Math.sin(angle) * dist;
            const scale = 0.7 + nextRandom() * 0.6; // Varying sizes

            peaks.push({ x, y, scale });
        }

        // Add a central peak
        if (count > 0) {
            peaks.push({
                x: cx + (nextRandom() - 0.5) * radius * 0.2,
                y: cy + (nextRandom() - 0.5) * radius * 0.2,
                scale: 1.0 + nextRandom() * 0.3
            });
        }

        return peaks;
    },

    /**
     * Generate positions for circles in a mountain range (chain of mountains)
     * @param {Array} waypoints - Array of {x, y} defining the range path
     * @param {number} circleRadius - Base radius for each mountain circle
     * @param {number} overlapFactor - How much circles overlap (0.3-0.7 typical)
     * @param {number} seed - Seed for deterministic generation
     * @returns {Array} Array of {x, y, radius} for each mountain circle
     */
    generateMountainRangeCircles(waypoints, circleRadius, overlapFactor, seed) {
        const circles = [];
        let rng = seed;

        const nextRandom = () => {
            rng = (rng * 1103515245 + 12345) & 0x7fffffff;
            return rng / 0x7fffffff;
        };

        if (waypoints.length < 2) return circles;

        // Calculate total length
        let totalLength = 0;
        for (let i = 1; i < waypoints.length; i++) {
            const dx = waypoints[i].x - waypoints[i - 1].x;
            const dy = waypoints[i].y - waypoints[i - 1].y;
            totalLength += Math.sqrt(dx * dx + dy * dy);
        }

        // Space circles along the path
        const spacing = circleRadius * 2 * (1 - overlapFactor);
        let distance = 0;

        while (distance <= totalLength) {
            const point = this.pointAlongPath(waypoints, distance);
            const radiusVariation = circleRadius * (0.85 + nextRandom() * 0.3);

            // Add slight perpendicular offset for natural look
            const tangent = this.tangentAtDistance(waypoints, distance);
            const perpOffset = (nextRandom() - 0.5) * circleRadius * 0.3;

            circles.push({
                x: point.x + tangent.perpX * perpOffset,
                y: point.y + tangent.perpY * perpOffset,
                radius: radiusVariation
            });

            distance += spacing;
        }

        return circles;
    },

    /**
     * Get point at distance along a path
     */
    pointAlongPath(waypoints, distance) {
        let remaining = distance;

        for (let i = 0; i < waypoints.length - 1; i++) {
            const dx = waypoints[i + 1].x - waypoints[i].x;
            const dy = waypoints[i + 1].y - waypoints[i].y;
            const segLen = Math.sqrt(dx * dx + dy * dy);

            if (remaining <= segLen) {
                const t = remaining / segLen;
                return {
                    x: waypoints[i].x + dx * t,
                    y: waypoints[i].y + dy * t
                };
            }
            remaining -= segLen;
        }

        return {
            x: waypoints[waypoints.length - 1].x,
            y: waypoints[waypoints.length - 1].y
        };
    },

    /**
     * Get tangent direction at distance along path
     */
    tangentAtDistance(waypoints, distance) {
        let remaining = distance;

        for (let i = 0; i < waypoints.length - 1; i++) {
            const dx = waypoints[i + 1].x - waypoints[i].x;
            const dy = waypoints[i + 1].y - waypoints[i].y;
            const segLen = Math.sqrt(dx * dx + dy * dy);

            if (remaining <= segLen || i === waypoints.length - 2) {
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                return {
                    x: dx / len,
                    y: dy / len,
                    perpX: -dy / len,
                    perpY: dx / len
                };
            }
            remaining -= segLen;
        }

        return { x: 1, y: 0, perpX: 0, perpY: 1 };
    },

    /**
     * Generate house positions in concentric rings (extracted from renderer)
     * @param {number} cx - Center X
     * @param {number} cy - Center Y
     * @param {number} numHouses - Number of houses to place
     * @param {Array} blockedAreas - Array of {x, y, radius} areas to avoid
     * @param {number} seed - Seed for deterministic generation
     * @returns {Object} { positions: Array of {x, y}, boundingRadius: number }
     */
    generateHousePositions(cx, cy, numHouses, blockedAreas, seed) {
        if (numHouses === 0) return { positions: [], boundingRadius: 20 };

        let rng = seed;
        const nextRandom = () => {
            rng = (rng * 1103515245 + 12345) & 0x7fffffff;
            return rng / 0x7fffffff;
        };

        const positions = [];
        const houseSpacing = 12;
        const baseRingSpacing = 15;

        let placedHouses = 0;
        let ring = 0;
        const maxRings = 8;

        while (placedHouses < numHouses && ring < maxRings) {
            const ringRadius = (ring === 0) ? 0 : (ring * baseRingSpacing);
            const circumference = 2 * Math.PI * ringRadius;
            const housesInRing = (ring === 0) ? 1 : Math.max(3, Math.floor(circumference / houseSpacing));
            const angleOffset = nextRandom() * Math.PI * 2;

            for (let i = 0; i < housesInRing && placedHouses < numHouses; i++) {
                const angle = angleOffset + (i / housesInRing) * Math.PI * 2;
                const jitter = ring > 0 ? (nextRandom() - 0.5) * 4 : 0;
                const houseX = cx + Math.cos(angle) * (ringRadius + jitter);
                const houseY = cy + Math.sin(angle) * (ringRadius + jitter);

                let blocked = false;

                // Check blocked areas
                for (const area of blockedAreas) {
                    const distToBlocked = Math.sqrt(
                        Math.pow(houseX - area.x, 2) +
                        Math.pow(houseY - area.y, 2)
                    );
                    if (distToBlocked < area.radius) {
                        blocked = true;
                        break;
                    }
                }

                // Check distance from other houses
                for (const pos of positions) {
                    const distToHouse = Math.sqrt(
                        Math.pow(houseX - pos.x, 2) +
                        Math.pow(houseY - pos.y, 2)
                    );
                    if (distToHouse < houseSpacing * 0.8) {
                        blocked = true;
                        break;
                    }
                }

                if (!blocked) {
                    positions.push({ x: houseX, y: houseY });
                    placedHouses++;
                }
            }
            ring++;
        }

        // Calculate bounding radius
        let maxDist = 20;
        for (const pos of positions) {
            const dist = Math.sqrt(
                Math.pow(pos.x - cx, 2) + Math.pow(pos.y - cy, 2)
            );
            if (dist > maxDist) {
                maxDist = dist;
            }
        }

        return { positions, boundingRadius: maxDist + 8 };
    },

    /**
     * Check if a line segment intersects a circle
     * @param {number} x1 - Line start X
     * @param {number} y1 - Line start Y
     * @param {number} x2 - Line end X
     * @param {number} y2 - Line end Y
     * @param {number} cx - Circle center X
     * @param {number} cy - Circle center Y
     * @param {number} r - Circle radius
     * @returns {boolean} True if line intersects circle
     */
    lineIntersectsCircle(x1, y1, x2, y2, cx, cy, r) {
        // Vector from line start to circle center
        const dx = x2 - x1;
        const dy = y2 - y1;
        const fx = x1 - cx;
        const fy = y1 - cy;

        const a = dx * dx + dy * dy;
        const b = 2 * (fx * dx + fy * dy);
        const c = fx * fx + fy * fy - r * r;

        let discriminant = b * b - 4 * a * c;

        if (discriminant < 0) {
            return false;
        }

        discriminant = Math.sqrt(discriminant);

        const t1 = (-b - discriminant) / (2 * a);
        const t2 = (-b + discriminant) / (2 * a);

        // Check if either intersection point is within the segment
        if (t1 >= 0 && t1 <= 1) return true;
        if (t2 >= 0 && t2 <= 1) return true;

        return false;
    },

    /**
     * Check if a polyline (road) intersects any circle in a list
     * @param {Array} waypoints - Array of {x, y} points
     * @param {Array} circles - Array of {x, y, radius} circles
     * @returns {boolean} True if any segment intersects any circle
     */
    polylineIntersectsCircles(waypoints, circles) {
        for (let i = 0; i < waypoints.length - 1; i++) {
            const x1 = waypoints[i].x;
            const y1 = waypoints[i].y;
            const x2 = waypoints[i + 1].x;
            const y2 = waypoints[i + 1].y;

            for (const circle of circles) {
                if (this.lineIntersectsCircle(x1, y1, x2, y2, circle.x, circle.y, circle.radius)) {
                    return true;
                }
            }
        }
        return false;
    },

    /**
     * Check if a point is inside any circle in a list
     * @param {number} x - Point X
     * @param {number} y - Point Y
     * @param {Array} circles - Array of {x, y, radius} circles
     * @returns {boolean} True if point is inside any circle
     */
    pointInCircles(x, y, circles) {
        for (const circle of circles) {
            const dx = x - circle.x;
            const dy = y - circle.y;
            if (dx * dx + dy * dy <= circle.radius * circle.radius) {
                return true;
            }
        }
        return false;
    },

    /**
     * Get all collision circles (mountains + resources)
     * @param {Object} gameState - The game state object
     * @returns {Array} Array of {x, y, radius, type} collision circles
     */
    getCollisionCircles(gameState) {
        const circles = [];

        // Add mountain range circles
        if (gameState.mountainRanges) {
            for (const range of Object.values(gameState.mountainRanges)) {
                for (const circle of range.circles) {
                    circles.push({
                        x: circle.x,
                        y: circle.y,
                        radius: circle.radius,
                        type: 'mountain'
                    });
                }
            }
        }

        // Add resource circles
        for (const resource of Object.values(gameState.resources)) {
            circles.push({
                x: resource.position.x,
                y: resource.position.y,
                radius: resource.radius + 5, // Small padding
                type: 'resource'
            });
        }

        return circles;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Geometry };
}
