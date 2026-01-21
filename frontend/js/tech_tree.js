// Crossroads - Technology Tree

/**
 * Technology definitions
 * Each tech has:
 * - id: unique identifier
 * - name: display name
 * - cost: research points required
 * - prerequisites: array of tech ids that must be researched first
 * - unlocks: array of what this tech unlocks (for display)
 */
const TECH_TREE = {
    // Tier 1 - Starting techs (no prerequisites)
    agriculture: {
        id: 'agriculture',
        name: 'Agriculture',
        cost: 50,
        prerequisites: [],
        unlocks: ['Farms produce more food', 'Irrigation'],
        effects: {
            farmBonus: 1.5
        }
    },

    construction: {
        id: 'construction',
        name: 'Construction',
        cost: 50,
        prerequisites: [],
        unlocks: ['Houses', 'Masonry'],
        effects: {
            housingBonus: 1.2
        }
    },

    military: {
        id: 'military',
        name: 'Military Training',
        cost: 50,
        prerequisites: [],
        unlocks: ['Barracks', 'Bronze Working'],
        effects: {}
    },

    writing: {
        id: 'writing',
        name: 'Writing',
        cost: 60,
        prerequisites: [],
        unlocks: ['Library', 'Improved research'],
        effects: {
            researchBonus: 1.2
        }
    },

    // Tier 2
    irrigation: {
        id: 'irrigation',
        name: 'Irrigation',
        cost: 100,
        prerequisites: ['agriculture'],
        unlocks: ['Farms near rivers +50% output'],
        effects: {
            riverFarmBonus: 1.5
        }
    },

    animal_husbandry: {
        id: 'animal_husbandry',
        name: 'Animal Husbandry',
        cost: 100,
        prerequisites: ['agriculture'],
        unlocks: ['Cavalry units'],
        effects: {}
    },

    masonry: {
        id: 'masonry',
        name: 'Masonry',
        cost: 100,
        prerequisites: ['construction'],
        unlocks: ['Stone Roads', 'Walls'],
        effects: {}
    },

    bronze_working: {
        id: 'bronze_working',
        name: 'Bronze Working',
        cost: 100,
        prerequisites: ['military'],
        unlocks: ['Infantry units', 'Mine'],
        effects: {}
    },

    tactics: {
        id: 'tactics',
        name: 'Tactics',
        cost: 120,
        prerequisites: ['military'],
        unlocks: ['+20% combat strength'],
        effects: {
            combatBonus: 1.2
        }
    },

    // Tier 3
    crop_rotation: {
        id: 'crop_rotation',
        name: 'Crop Rotation',
        cost: 200,
        prerequisites: ['irrigation'],
        unlocks: ['Farms produce +50% food'],
        effects: {
            farmBonus: 1.5
        }
    },

    architecture: {
        id: 'architecture',
        name: 'Architecture',
        cost: 200,
        prerequisites: ['masonry'],
        unlocks: ['Larger settlements', 'Engineering'],
        effects: {
            housingBonus: 1.5
        }
    },

    iron_working: {
        id: 'iron_working',
        name: 'Iron Working',
        cost: 200,
        prerequisites: ['bronze_working'],
        unlocks: ['+50% unit strength'],
        effects: {
            unitStrengthBonus: 1.5
        }
    },

    combined_arms: {
        id: 'combined_arms',
        name: 'Combined Arms',
        cost: 200,
        prerequisites: ['tactics', 'animal_husbandry'],
        unlocks: ['Mixed armies +30% strength'],
        effects: {
            combinedArmsBonus: 1.3
        }
    },

    // Tier 4
    engineering: {
        id: 'engineering',
        name: 'Engineering',
        cost: 350,
        prerequisites: ['architecture'],
        unlocks: ['Paved Roads', 'Artillery', 'Bridges'],
        effects: {}
    },

    steel: {
        id: 'steel',
        name: 'Steel Working',
        cost: 350,
        prerequisites: ['iron_working'],
        unlocks: ['Steel units +100% strength', 'Railways'],
        effects: {
            unitStrengthBonus: 2.0
        }
    },

    economics: {
        id: 'economics',
        name: 'Economics',
        cost: 300,
        prerequisites: ['writing', 'architecture'],
        unlocks: ['+50% tax income'],
        effects: {
            taxBonus: 1.5
        }
    },

    // Tier 5
    steam_power: {
        id: 'steam_power',
        name: 'Steam Power',
        cost: 500,
        prerequisites: ['engineering', 'steel'],
        unlocks: ['Railways', 'Factories'],
        effects: {
            productionBonus: 2.0
        }
    },

    mechanized_war: {
        id: 'mechanized_war',
        name: 'Mechanized Warfare',
        cost: 600,
        prerequisites: ['steel', 'combined_arms'],
        unlocks: ['Tank units'],
        effects: {}
    },

    // Victory tech
    advanced_technology: {
        id: 'advanced_technology',
        name: 'Advanced Technology',
        cost: 1000,
        prerequisites: ['steam_power', 'economics'],
        unlocks: ['Scientific Victory'],
        effects: {
            victory: 'scientific'
        }
    }
};

/**
 * Get tech by id
 */
function getTech(techId) {
    return TECH_TREE[techId];
}

/**
 * Get all techs
 */
function getAllTechs() {
    return Object.values(TECH_TREE);
}

/**
 * Check if a player can research a tech
 */
function canResearchTech(player, techId) {
    const tech = TECH_TREE[techId];
    if (!tech) return false;

    // Already researched
    if (player.researchedTechs.has(techId)) return false;

    // Check prerequisites
    for (const prereq of tech.prerequisites) {
        if (!player.researchedTechs.has(prereq)) {
            return false;
        }
    }

    return true;
}

/**
 * Get available techs for a player
 */
function getAvailableTechs(player) {
    return Object.values(TECH_TREE).filter(tech =>
        !player.researchedTechs.has(tech.id) &&
        canResearchTech(player, tech.id)
    );
}

/**
 * Apply tech effects to game
 */
function applyTechEffects(player, techId, gameState) {
    const tech = TECH_TREE[techId];
    if (!tech || !tech.effects) return;

    // Store effects on player for later calculations
    if (!player.techEffects) {
        player.techEffects = {};
    }

    for (const [effect, value] of Object.entries(tech.effects)) {
        if (typeof value === 'number') {
            player.techEffects[effect] = (player.techEffects[effect] || 1) * value;
        } else {
            player.techEffects[effect] = value;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TECH_TREE,
        getTech,
        getAllTechs,
        canResearchTech,
        getAvailableTechs,
        applyTechEffects
    };
}
