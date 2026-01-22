// Crossroads - Data Models

/**
 * 2D Vector class
 */
class Vec2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    add(other) {
        return new Vec2(this.x + other.x, this.y + other.y);
    }

    subtract(other) {
        return new Vec2(this.x - other.x, this.y - other.y);
    }

    scale(factor) {
        return new Vec2(this.x * factor, this.y * factor);
    }

    normalize() {
        const len = Math.sqrt(this.x * this.x + this.y * this.y);
        if (len === 0) return new Vec2(0, 0);
        return new Vec2(this.x / len, this.y / len);
    }

    clone() {
        return new Vec2(this.x, this.y);
    }

    toJSON() {
        return { x: this.x, y: this.y };
    }

    static fromJSON(data) {
        return new Vec2(data.x, data.y);
    }
}

/**
 * Road types with properties
 */
const RoadType = {
    DIRT: { id: 'dirt', name: 'Dirt Path', speed: 1.0, color: '#5d4037', width: 3, costPerUnit: { labor: 1 }, requiredTech: null },
    STONE: { id: 'stone', name: 'Stone Road', speed: 1.8, color: '#6d6d6d', width: 5, costPerUnit: { stone: 5, labor: 2 }, requiredTech: 'masonry' },
    PAVED: { id: 'paved', name: 'Paved Road', speed: 2.5, color: '#212121', width: 6, costPerUnit: { stone: 10, labor: 3 }, requiredTech: 'engineering' },
    RAIL: { id: 'rail', name: 'Railway', speed: 4.0, color: '#4a4a4a', width: 4, costPerUnit: { steel: 20, labor: 10 }, requiredTech: 'steam_power' },
};

/**
 * Resource types
 */
const ResourceType = {
    FOREST: { id: 'forest', name: 'Forest', color: '#2e7d32', produces: 'wood', regenerates: true },
    STONE: { id: 'stone', name: 'Stone Deposit', color: '#8d6e63', produces: 'stone', regenerates: false },
    IRON: { id: 'iron', name: 'Iron Ore', color: '#78909c', produces: 'iron', regenerates: false },
    FERTILE: { id: 'fertile', name: 'Fertile Land', color: '#558b2f', produces: 'food', regenerates: true },
};

/**
 * Building types
 */
const BuildingType = {
    LUMBER_CAMP: { id: 'lumber_camp', name: 'Lumber Camp', targetResource: 'forest', produces: 'wood', cost: { wood: 20 }, requiredTech: null },
    QUARRY: { id: 'quarry', name: 'Quarry', targetResource: 'stone', produces: 'stone', cost: { wood: 30 }, requiredTech: null },
    MINE: { id: 'mine', name: 'Mine', targetResource: 'iron', produces: 'iron', cost: { wood: 40, stone: 20 }, requiredTech: 'bronze_working' },
    FARM: { id: 'farm', name: 'Farm', targetResource: 'fertile', produces: 'food', cost: { wood: 15 }, requiredTech: null },
    HOUSE: { id: 'house', name: 'House', cost: { wood: 10 }, capacityBonus: 20, requiredTech: null },
    BARRACKS: { id: 'barracks', name: 'Barracks', cost: { wood: 50, stone: 30 }, requiredTech: 'bronze_working' },
    LIBRARY: { id: 'library', name: 'Library', cost: { wood: 40, stone: 30 }, researchBonus: 2, requiredTech: 'writing' },
    WALLS: { id: 'walls', name: 'Walls', cost: { stone: 100 }, defenseBonus: 1, requiredTech: 'masonry' },
};

/**
 * Unit types
 */
const UnitType = {
    MILITIA: { id: 'militia', name: 'Militia', strength: 1, speed: 1.0, cost: 10, requiredTech: null },
    INFANTRY: { id: 'infantry', name: 'Infantry', strength: 2, speed: 1.0, cost: 25, requiredTech: 'bronze_working' },
    CAVALRY: { id: 'cavalry', name: 'Cavalry', strength: 3, speed: 2.0, cost: 50, requiredTech: 'animal_husbandry' },
    ARTILLERY: { id: 'artillery', name: 'Artillery', strength: 5, speed: 0.5, cost: 100, requiredTech: 'engineering' },
};

/**
 * Settlement class
 */
class Settlement {
    constructor(data = {}) {
        this.id = data.id || generateId();
        this.name = data.name || generateSettlementName();
        this.position = data.position instanceof Vec2 ? data.position : new Vec2(data.position?.x || 0, data.position?.y || 0);
        this.ownerId = data.ownerId || null;

        // Population
        this.population = data.population || 100;
        this.families = data.families || 25;
        this.housingCapacity = data.housingCapacity || 120;

        // Economy
        this.treasury = data.treasury || 100;
        this.taxRate = data.taxRate || 0.2;
        this.publicInvestment = data.publicInvestment || 0.1;
        this.resources = data.resources || { food: 50, wood: 20, stone: 0, iron: 0 };

        // Governance
        this.contentment = data.contentment || 70;
        this.unrest = data.unrest || 0;
        this.revoltThreshold = data.revoltThreshold || 100;

        // Defense
        this.wallsLevel = data.wallsLevel || 0;
        // Garrison is now an object with units: { militia: count, infantry: count, ... }
        this.garrison = data.garrison || { units: {} };

        // Buildings
        this.buildings = data.buildings || [];

        // Production tracking
        this.productionPerTick = data.productionPerTick || { food: 0, wood: 0, stone: 0, iron: 0 };

        // Training queue: array of { unitType: string, count: number, progress: number, totalTime: number }
        this.trainingQueue = data.trainingQueue || [];
    }

    /**
     * Get total garrison strength
     */
    get garrisonStrength() {
        let strength = 0;
        for (const [unitType, count] of Object.entries(this.garrison.units || {})) {
            const typeData = UnitType[unitType.toUpperCase()];
            if (typeData) {
                strength += count * typeData.strength;
            }
        }
        return strength;
    }

    /**
     * Get total garrison units
     */
    get garrisonCount() {
        return Object.values(this.garrison.units || {}).reduce((a, b) => a + b, 0);
    }

    get radius() {
        return 20 + Math.sqrt(this.population) * 0.4;
    }

    get isCapital() {
        // First settlement of a player is their capital
        return this._isCapital || false;
    }

    set isCapital(value) {
        this._isCapital = value;
    }

    getResearchOutput() {
        let base = Math.floor(this.population / 100);
        // Add library bonuses
        const libraries = this.buildings.filter(b => b.type === 'library');
        for (const lib of libraries) {
            base += BuildingType.LIBRARY.researchBonus;
        }
        return base;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            position: this.position.toJSON(),
            ownerId: this.ownerId,
            population: this.population,
            families: this.families,
            housingCapacity: this.housingCapacity,
            treasury: this.treasury,
            taxRate: this.taxRate,
            publicInvestment: this.publicInvestment,
            resources: { ...this.resources },
            contentment: this.contentment,
            unrest: this.unrest,
            revoltThreshold: this.revoltThreshold,
            wallsLevel: this.wallsLevel,
            garrison: this.garrison ? { units: { ...this.garrison.units } } : { units: {} },
            buildings: [...this.buildings],
            productionPerTick: { ...this.productionPerTick },
            trainingQueue: [...this.trainingQueue],
            _isCapital: this._isCapital
        };
    }
}

/**
 * Mountain Range class
 * Represents a chain of mountains that block road construction
 */
class MountainRange {
    constructor(data = {}) {
        this.id = data.id || generateId();
        this.name = data.name || 'Mountain Range';
        // Waypoints define the path of the mountain range
        this.waypoints = (data.waypoints || []).map(wp => wp instanceof Vec2 ? wp : new Vec2(wp.x, wp.y));
        // Pre-calculated circles for collision and rendering
        this.circles = data.circles || [];
        // Base radius for each mountain circle
        this.baseRadius = data.baseRadius || 40;
        // How much circles overlap (0-1)
        this.overlapFactor = data.overlapFactor || 0.4;
    }

    /**
     * Generate the circles for this mountain range
     * Call this after setting waypoints
     */
    generateCircles(seed) {
        if (typeof Geometry !== 'undefined') {
            this.circles = Geometry.generateMountainRangeCircles(
                this.waypoints,
                this.baseRadius,
                this.overlapFactor,
                seed || this.hashWaypoints()
            );
            // Generate peaks for each circle
            for (const circle of this.circles) {
                circle.peaks = Geometry.generateMountainPeaks(
                    circle.x,
                    circle.y,
                    circle.radius * 0.8,
                    3 + Math.floor(Math.random() * 3),
                    seed || this.hashWaypoints() + circle.x
                );
            }
        }
        return this.circles;
    }

    /**
     * Simple hash of waypoints for deterministic generation
     */
    hashWaypoints() {
        let hash = 0;
        for (const wp of this.waypoints) {
            hash = ((hash << 5) - hash) + Math.floor(wp.x) + Math.floor(wp.y);
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    /**
     * Get bounding box of the mountain range
     */
    getBounds() {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (const circle of this.circles) {
            minX = Math.min(minX, circle.x - circle.radius);
            minY = Math.min(minY, circle.y - circle.radius);
            maxX = Math.max(maxX, circle.x + circle.radius);
            maxY = Math.max(maxY, circle.y + circle.radius);
        }

        return { minX, minY, maxX, maxY };
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            waypoints: this.waypoints.map(wp => wp.toJSON()),
            circles: this.circles.map(c => ({
                x: c.x,
                y: c.y,
                radius: c.radius,
                peaks: c.peaks
            })),
            baseRadius: this.baseRadius,
            overlapFactor: this.overlapFactor
        };
    }
}

/**
 * Natural Resource class
 */
class NaturalResource {
    constructor(data = {}) {
        this.id = data.id || generateId();
        this.resourceType = data.resourceType || 'forest';
        this.position = data.position instanceof Vec2 ? data.position : new Vec2(data.position?.x || 0, data.position?.y || 0);
        this.radius = data.radius || 30;
        this.totalAmount = data.totalAmount || 1000;
        this.amountRemaining = data.amountRemaining ?? this.totalAmount;
        this.extractionRate = data.extractionRate || 5;
        this.regenerationRate = data.regenerationRate || 0;

        // Building assigned to extract this resource
        this.assignedBuilding = data.assignedBuilding || null;
    }

    get typeData() {
        return ResourceType[this.resourceType.toUpperCase()] || ResourceType.FOREST;
    }

    toJSON() {
        return {
            id: this.id,
            resourceType: this.resourceType,
            position: this.position.toJSON(),
            radius: this.radius,
            totalAmount: this.totalAmount,
            amountRemaining: this.amountRemaining,
            extractionRate: this.extractionRate,
            regenerationRate: this.regenerationRate,
            assignedBuilding: this.assignedBuilding
        };
    }
}

/**
 * Road class
 */
class Road {
    constructor(data = {}) {
        this.id = data.id || generateId();
        this.waypoints = (data.waypoints || []).map(wp => wp instanceof Vec2 ? wp : new Vec2(wp.x, wp.y));
        this.roadType = data.roadType || 'dirt';
        this.ownerId = data.ownerId || null;
        // Track actual built length (in world units) for gradual construction
        // If builtLength is provided, use it; otherwise derive from legacy constructionProgress
        if (data.builtLength !== undefined) {
            this._builtLength = data.builtLength;
        } else if (data.constructionProgress !== undefined) {
            // Legacy support: convert percentage to length
            this._builtLength = data.constructionProgress * this.totalLength;
        } else {
            this._builtLength = this.totalLength; // Default to complete
        }
        this.condition = data.condition ?? 1.0;
    }

    get typeData() {
        return RoadType[this.roadType.toUpperCase()] || RoadType.DIRT;
    }

    get totalLength() {
        return polylineLength(this.waypoints);
    }

    get builtLength() {
        return this._builtLength;
    }

    set builtLength(value) {
        this._builtLength = Math.min(value, this.totalLength);
    }

    get constructionProgress() {
        const total = this.totalLength;
        if (total === 0) return 1.0;
        return Math.min(1.0, this._builtLength / total);
    }

    get isComplete() {
        return this._builtLength >= this.totalLength;
    }

    /**
     * Get the waypoints that represent the currently built portion of the road
     * Returns waypoints from start up to the current construction point
     */
    getBuiltWaypoints() {
        if (this.isComplete) return this.waypoints;
        if (this._builtLength <= 0) return [this.waypoints[0]];

        const result = [];
        let remaining = this._builtLength;

        for (let i = 0; i < this.waypoints.length - 1; i++) {
            result.push(this.waypoints[i]);

            const dx = this.waypoints[i + 1].x - this.waypoints[i].x;
            const dy = this.waypoints[i + 1].y - this.waypoints[i].y;
            const segLen = Math.sqrt(dx * dx + dy * dy);

            if (remaining <= segLen) {
                // Construction point is within this segment
                const t = remaining / segLen;
                result.push(new Vec2(
                    this.waypoints[i].x + dx * t,
                    this.waypoints[i].y + dy * t
                ));
                break;
            }
            remaining -= segLen;
        }

        // If we went through all segments, include the last point
        if (remaining >= 0 && result.length === this.waypoints.length) {
            return this.waypoints;
        }

        return result;
    }

    /**
     * Get the current construction point (where workers are building)
     */
    getConstructionPoint() {
        if (this.isComplete) return null;
        return pointAlongPolyline(this.waypoints, this._builtLength);
    }

    toJSON() {
        return {
            id: this.id,
            waypoints: this.waypoints.map(wp => wp.toJSON()),
            roadType: this.roadType,
            ownerId: this.ownerId,
            builtLength: this._builtLength,
            constructionProgress: this.constructionProgress, // For backwards compatibility
            condition: this.condition
        };
    }
}

/**
 * Building class
 */
class Building {
    constructor(data = {}) {
        this.id = data.id || generateId();
        this.type = data.type || 'house';
        this.position = data.position instanceof Vec2 ? data.position : new Vec2(data.position?.x || 0, data.position?.y || 0);
        this.settlementId = data.settlementId || null;
        this.resourceId = data.resourceId || null; // For extraction buildings
        this.constructionProgress = data.constructionProgress ?? 1.0;
        this.ownerId = data.ownerId || null;
    }

    get typeData() {
        return BuildingType[this.type.toUpperCase()] || BuildingType.HOUSE;
    }

    get isComplete() {
        return this.constructionProgress >= 1.0;
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            position: this.position.toJSON(),
            settlementId: this.settlementId,
            resourceId: this.resourceId,
            constructionProgress: this.constructionProgress,
            ownerId: this.ownerId
        };
    }
}

/**
 * Army class
 */
class Army {
    constructor(data = {}) {
        this.id = data.id || generateId();
        this.name = data.name || generateArmyName();
        this.ownerId = data.ownerId || null;
        this.position = data.position instanceof Vec2 ? data.position : new Vec2(data.position?.x || 0, data.position?.y || 0);

        // Units
        this.units = data.units || { militia: 50 };

        // Status
        this.morale = data.morale ?? 100;
        this.supplies = data.supplies ?? 10;
        this.condition = data.condition ?? 1.0;

        // Movement
        this.destination = data.destination ? (data.destination instanceof Vec2 ? data.destination : new Vec2(data.destination.x, data.destination.y)) : null;
        this.path = (data.path || []).map(p => p instanceof Vec2 ? p : new Vec2(p.x, p.y));
        this.pathProgress = data.pathProgress || 0;

        // Combat
        this.inBattle = data.inBattle || false;
    }

    get totalStrength() {
        let strength = 0;
        for (const [unitType, count] of Object.entries(this.units)) {
            const typeData = UnitType[unitType.toUpperCase()];
            if (typeData) {
                strength += count * typeData.strength;
            }
        }
        return strength;
    }

    get totalUnits() {
        return Object.values(this.units).reduce((a, b) => a + b, 0);
    }

    get speed() {
        // Average speed of all units, weighted by count
        let totalSpeed = 0;
        let totalCount = 0;
        for (const [unitType, count] of Object.entries(this.units)) {
            const typeData = UnitType[unitType.toUpperCase()];
            if (typeData && count > 0) {
                totalSpeed += typeData.speed * count;
                totalCount += count;
            }
        }
        return totalCount > 0 ? totalSpeed / totalCount : 1.0;
    }

    applyCasualties(amount) {
        let remaining = amount;
        const unitTypes = Object.keys(this.units);

        // Distribute casualties across unit types
        for (const unitType of unitTypes) {
            if (remaining <= 0) break;
            const toRemove = Math.min(this.units[unitType], Math.ceil(remaining / unitTypes.length));
            this.units[unitType] -= toRemove;
            remaining -= toRemove;
        }

        // Clean up zeroed units
        for (const unitType of Object.keys(this.units)) {
            if (this.units[unitType] <= 0) {
                delete this.units[unitType];
            }
        }
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            ownerId: this.ownerId,
            position: this.position.toJSON(),
            units: { ...this.units },
            morale: this.morale,
            supplies: this.supplies,
            condition: this.condition,
            destination: this.destination?.toJSON() || null,
            path: this.path.map(p => p.toJSON()),
            pathProgress: this.pathProgress,
            inBattle: this.inBattle
        };
    }
}

/**
 * Battle class
 */
class Battle {
    constructor(data = {}) {
        this.id = data.id || generateId();
        this.location = data.location instanceof Vec2 ? data.location : new Vec2(data.location?.x || 0, data.location?.y || 0);
        this.locationType = data.locationType || 'field'; // 'field', 'road', 'siege'

        this.attackerId = data.attackerId || null;
        this.defenderId = data.defenderId || null;
        this.attackerStartingStrength = data.attackerStartingStrength || 0;
        this.defenderStartingStrength = data.defenderStartingStrength || 0;

        this.terrainModifier = data.terrainModifier ?? 1.0;
        this.fortificationModifier = data.fortificationModifier ?? 1.0;

        this.startedTick = data.startedTick || 0;
        this.status = data.status || 'ongoing'; // 'ongoing', 'attacker_wins', 'defender_wins'
        this.casualties = data.casualties || { attacker: 0, defender: 0 };
    }

    toJSON() {
        return {
            id: this.id,
            location: this.location.toJSON(),
            locationType: this.locationType,
            attackerId: this.attackerId,
            defenderId: this.defenderId,
            attackerStartingStrength: this.attackerStartingStrength,
            defenderStartingStrength: this.defenderStartingStrength,
            terrainModifier: this.terrainModifier,
            fortificationModifier: this.fortificationModifier,
            startedTick: this.startedTick,
            status: this.status,
            casualties: { ...this.casualties }
        };
    }
}

/**
 * Player class
 */
class Player {
    constructor(data = {}) {
        this.id = data.id || generateId();
        this.name = data.name || 'Player';
        this.color = data.color || '#4fc3f7';
        this.isAI = data.isAI || false;

        // Research
        this.researchedTechs = new Set(data.researchedTechs || []);
        this.currentResearch = data.currentResearch || null;
        this.researchProgress = data.researchProgress || 0;

        // Global resources (sum of all settlements)
        this.totalResources = data.totalResources || { food: 0, wood: 0, stone: 0, iron: 0 };
        this.researchPerTick = data.researchPerTick || 0;
    }

    hasResearched(techId) {
        return this.researchedTechs.has(techId);
    }

    canResearch(tech, techTree) {
        // Check prerequisites
        for (const prereqId of tech.prerequisites) {
            if (!this.researchedTechs.has(prereqId)) {
                return false;
            }
        }
        return true;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            color: this.color,
            isAI: this.isAI,
            researchedTechs: Array.from(this.researchedTechs),
            currentResearch: this.currentResearch,
            researchProgress: this.researchProgress,
            totalResources: { ...this.totalResources },
            researchPerTick: this.researchPerTick
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Vec2,
        RoadType,
        ResourceType,
        BuildingType,
        UnitType,
        Settlement,
        MountainRange,
        NaturalResource,
        Road,
        Building,
        Army,
        Battle,
        Player
    };
}
