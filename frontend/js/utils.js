// Crossroads - Utility Functions

/**
 * Seeded pseudo-random number generator (Linear Congruential Generator)
 * Use this for deterministic random generation (e.g., for reproducible test screenshots)
 */
class SeededRandom {
    constructor(seed = 12345) {
        this.seed = seed;
        this.state = seed;
    }

    /**
     * Reset the generator to its initial seed
     */
    reset() {
        this.state = this.seed;
    }

    /**
     * Set a new seed and reset
     */
    setSeed(seed) {
        this.seed = seed;
        this.state = seed;
    }

    /**
     * Get next random number between 0 and 1
     */
    next() {
        this.state = (this.state * 1103515245 + 12345) & 0x7fffffff;
        return this.state / 0x7fffffff;
    }

    /**
     * Get random integer between min and max (inclusive)
     */
    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    /**
     * Get random float between min and max
     */
    nextFloat(min, max) {
        return this.next() * (max - min) + min;
    }

    /**
     * Get random element from array
     */
    nextElement(arr) {
        return arr[Math.floor(this.next() * arr.length)];
    }

    /**
     * Shuffle array in place using Fisher-Yates
     */
    shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(this.next() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
}

// Global seeded RNG instance with fixed seed for deterministic map generation
const globalRng = new SeededRandom(42);

/**
 * Generate a unique ID
 */
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

/**
 * Clamp a value between min and max
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation
 */
function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Format a number with commas
 */
function formatNumber(num) {
    return Math.floor(num).toLocaleString();
}

/**
 * Format a percentage
 */
function formatPercent(value) {
    return Math.round(value * 100) + '%';
}

/**
 * Get a random element from an array
 */
function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get random integer between min and max (inclusive)
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get random float between min and max
 */
function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Shuffle an array in place
 */
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Deep clone an object
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if point is inside circle
 */
function pointInCircle(px, py, cx, cy, radius) {
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy <= radius * radius;
}

/**
 * Distance from point to line segment
 */
function pointToLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
        param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if point is near a polyline
 */
function pointNearPolyline(px, py, waypoints, threshold) {
    for (let i = 0; i < waypoints.length - 1; i++) {
        const dist = pointToLineDistance(
            px, py,
            waypoints[i].x, waypoints[i].y,
            waypoints[i + 1].x, waypoints[i + 1].y
        );
        if (dist <= threshold) {
            return true;
        }
    }
    return false;
}

/**
 * Get the total length of a polyline
 */
function polylineLength(waypoints) {
    let total = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
        const dx = waypoints[i + 1].x - waypoints[i].x;
        const dy = waypoints[i + 1].y - waypoints[i].y;
        total += Math.sqrt(dx * dx + dy * dy);
    }
    return total;
}

/**
 * Get point at distance along polyline
 */
function pointAlongPolyline(waypoints, distance) {
    let remaining = distance;

    for (let i = 0; i < waypoints.length - 1; i++) {
        const dx = waypoints[i + 1].x - waypoints[i].x;
        const dy = waypoints[i + 1].y - waypoints[i].y;
        const segLen = Math.sqrt(dx * dx + dy * dy);

        if (remaining <= segLen) {
            const t = remaining / segLen;
            return new Vec2(
                waypoints[i].x + dx * t,
                waypoints[i].y + dy * t
            );
        }
        remaining -= segLen;
    }

    // Return last point if distance exceeds polyline length
    const last = waypoints[waypoints.length - 1];
    return new Vec2(last.x, last.y);
}

/**
 * Settlement name generator
 */
const SETTLEMENT_PREFIXES = [
    'North', 'South', 'East', 'West', 'New', 'Old', 'Upper', 'Lower', 'Great', 'Little'
];

const SETTLEMENT_ROOTS = [
    'river', 'stone', 'iron', 'oak', 'pine', 'maple', 'hill', 'dale', 'vale', 'field',
    'wood', 'brook', 'spring', 'ford', 'bridge', 'mill', 'port', 'haven', 'burg', 'ton'
];

const SETTLEMENT_SUFFIXES = [
    'ton', 'ville', 'burg', 'ford', 'ham', 'wick', 'by', 'worth', 'dale', 'stead'
];

function generateSettlementName() {
    const usePrefix = Math.random() < 0.3;
    const useSuffix = Math.random() < 0.7;

    let name = '';

    if (usePrefix) {
        name += randomElement(SETTLEMENT_PREFIXES) + ' ';
    }

    const root = randomElement(SETTLEMENT_ROOTS);
    name += root.charAt(0).toUpperCase() + root.slice(1);

    if (useSuffix && !usePrefix) {
        name += randomElement(SETTLEMENT_SUFFIXES);
    }

    return name;
}

/**
 * Army name generator
 */
const ARMY_ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
const ARMY_NAMES = ['Legion', 'Division', 'Brigade', 'Regiment', 'Battalion', 'Guard', 'Corps'];

function generateArmyName(index = 0) {
    const ordinal = ARMY_ORDINALS[index % ARMY_ORDINALS.length];
    const name = randomElement(ARMY_NAMES);
    return `${ordinal} ${name}`;
}

/**
 * Get contentment bar color class
 */
function getContentmentClass(contentment) {
    if (contentment >= 60) return 'success';
    if (contentment >= 30) return 'warning';
    return 'danger';
}

/**
 * Get morale bar color class
 */
function getMoraleClass(morale) {
    if (morale >= 70) return 'success';
    if (morale >= 40) return 'warning';
    return 'danger';
}

// Export for use in other modules (if using modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SeededRandom,
        globalRng,
        generateId,
        clamp,
        lerp,
        formatNumber,
        formatPercent,
        randomElement,
        randomInt,
        randomFloat,
        shuffleArray,
        deepClone,
        pointInCircle,
        pointToLineDistance,
        pointNearPolyline,
        polylineLength,
        pointAlongPolyline,
        generateSettlementName,
        generateArmyName,
        getContentmentClass,
        getMoraleClass
    };
}
