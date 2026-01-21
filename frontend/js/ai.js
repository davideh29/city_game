// Crossroads - AI Player Logic

/**
 * AI Player class
 * Implements a simple but functional AI opponent
 */
class AIPlayer {
    constructor(game, playerId) {
        this.game = game;
        this.playerId = playerId;

        // AI state
        this.lastActionTick = 0;
        this.actionCooldown = 10; // Ticks between major actions

        // Strategy weights
        this.aggressiveness = 0.5 + Math.random() * 0.3; // 0.5-0.8
        this.expansionPriority = 0.6 + Math.random() * 0.3;
        this.researchPriority = 0.4 + Math.random() * 0.3;
    }

    /**
     * Process AI turn
     */
    processTurn(tick) {
        const state = this.game.state;
        const player = state.players[this.playerId];

        if (!player) return;

        // Don't act every tick
        if (tick - this.lastActionTick < this.actionCooldown) {
            return;
        }

        this.lastActionTick = tick;

        // Get AI's settlements and armies
        const settlements = Object.values(state.settlements).filter(s => s.ownerId === this.playerId);
        const armies = Object.values(state.armies).filter(a => a.ownerId === this.playerId);

        if (settlements.length === 0) {
            // AI has lost
            return;
        }

        // Priority actions
        this.manageResearch(player);
        this.manageSettlements(settlements);
        this.manageEconomy(settlements);
        this.manageMilitary(settlements, armies);
        this.manageExpansion(settlements, armies);
    }

    /**
     * Manage research
     */
    manageResearch(player) {
        // If not researching, start something
        if (!player.currentResearch) {
            const availableTechs = getAvailableTechs(player);

            if (availableTechs.length > 0) {
                // Prioritize military if being aggressive, economy otherwise
                let priorityTechs = availableTechs;

                if (this.aggressiveness > 0.6) {
                    const militaryTechs = availableTechs.filter(t =>
                        t.id.includes('military') || t.id.includes('working') ||
                        t.id.includes('tactics') || t.id.includes('war')
                    );
                    if (militaryTechs.length > 0) {
                        priorityTechs = militaryTechs;
                    }
                }

                // Pick a random tech from priorities
                const tech = randomElement(priorityTechs);
                this.game.startResearch(tech.id, this.playerId);
            }
        }
    }

    /**
     * Manage settlements
     */
    manageSettlements(settlements) {
        for (const settlement of settlements) {
            // Build houses if population is near capacity
            if (settlement.population > settlement.housingCapacity * 0.8) {
                const hasEnoughWood = settlement.resources.wood >= 10;
                if (hasEnoughWood) {
                    this.game.buildInSettlement(settlement.id, 'house', this.playerId);
                }
            }

            // Build barracks if we don't have one
            const hasBarracks = settlement.buildings.some(b => b.type === 'barracks');
            if (!hasBarracks && settlement.resources.wood >= 50 && settlement.resources.stone >= 30) {
                const player = this.game.state.players[this.playerId];
                if (player.researchedTechs.has('bronze_working')) {
                    this.game.buildInSettlement(settlement.id, 'barracks', this.playerId);
                }
            }
        }
    }

    /**
     * Manage economy - build resource extraction
     */
    manageEconomy(settlements) {
        const state = this.game.state;

        // Find unassigned resources near our settlements
        for (const settlement of settlements) {
            // Skip if low on wood for building
            if (settlement.resources.wood < 20) continue;

            // Find nearby resources
            for (const resource of Object.values(state.resources)) {
                if (resource.assignedBuilding) continue;

                const dist = settlement.position.distanceTo(resource.position);
                if (dist > 200) continue;

                // Check if we have a road to it
                const hasRoad = this.hasRoadNearResource(resource);

                // Build appropriate extraction building
                let buildingType = null;
                switch (resource.resourceType) {
                    case 'forest':
                        buildingType = 'lumber_camp';
                        break;
                    case 'stone':
                        buildingType = 'quarry';
                        break;
                    case 'iron':
                        const player = state.players[this.playerId];
                        if (player.researchedTechs.has('bronze_working')) {
                            buildingType = 'mine';
                        }
                        break;
                    case 'fertile':
                        buildingType = 'farm';
                        break;
                }

                if (buildingType) {
                    // Build road if needed
                    if (!hasRoad) {
                        this.buildRoadToResource(settlement, resource);
                    }

                    // Build extraction building
                    this.game.buildBuilding(
                        buildingType,
                        resource.position.add(new Vec2(20, 0)),
                        resource.id,
                        this.playerId
                    );
                    break; // Only build one per tick
                }
            }
        }
    }

    /**
     * Check if there's a road near a resource
     */
    hasRoadNearResource(resource) {
        const state = this.game.state;

        for (const road of Object.values(state.roads)) {
            if (road.ownerId !== this.playerId) continue;
            if (!road.isComplete) continue;

            for (const wp of road.waypoints) {
                if (wp.distanceTo(resource.position) < 50) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Build a road from settlement to resource
     */
    buildRoadToResource(settlement, resource) {
        const waypoints = [
            settlement.position.clone(),
            resource.position.clone()
        ];

        this.game.buildRoad(waypoints, 'dirt', this.playerId);
    }

    /**
     * Manage military
     */
    manageMilitary(settlements, armies) {
        const state = this.game.state;

        // Create armies if we have few
        if (armies.length < settlements.length && Math.random() < 0.3) {
            // Find a settlement with barracks
            for (const settlement of settlements) {
                const hasBarracks = settlement.buildings.some(b => b.type === 'barracks');
                if (!hasBarracks) continue;

                // Check if we can afford units
                if (settlement.treasury < 100) continue;

                // Create a small army
                const units = { militia: 20 };

                // Add better units if available
                const player = state.players[this.playerId];
                if (player.researchedTechs.has('bronze_working')) {
                    units.infantry = 10;
                }
                if (player.researchedTechs.has('animal_husbandry')) {
                    units.cavalry = 5;
                }

                this.game.createArmy(settlement.id, units, this.playerId);
                break;
            }
        }

        // Move idle armies
        for (const army of armies) {
            if (army.inBattle) continue;
            if (army.destination) continue;

            // Decide what to do
            if (Math.random() < this.aggressiveness) {
                // Attack enemy
                this.attackEnemy(army);
            } else {
                // Defend or patrol
                this.defendTerritory(army, settlements);
            }
        }
    }

    /**
     * Attack enemy settlements
     */
    attackEnemy(army) {
        const state = this.game.state;

        // Find enemy settlements
        const enemySettlements = Object.values(state.settlements).filter(s =>
            s.ownerId && s.ownerId !== this.playerId
        );

        if (enemySettlements.length === 0) return;

        // Find closest enemy settlement
        let closest = null;
        let closestDist = Infinity;

        for (const settlement of enemySettlements) {
            const dist = army.position.distanceTo(settlement.position);
            if (dist < closestDist) {
                closestDist = dist;
                closest = settlement;
            }
        }

        if (closest) {
            this.game.moveArmy(army.id, closest.position, this.playerId);
        }
    }

    /**
     * Defend territory
     */
    defendTerritory(army, settlements) {
        // Move to protect a random settlement
        const settlement = randomElement(settlements);
        if (settlement) {
            // Move near settlement but not exactly on it
            const offset = new Vec2(
                randomFloat(-50, 50),
                randomFloat(-50, 50)
            );
            const dest = settlement.position.add(offset);
            this.game.moveArmy(army.id, dest, this.playerId);
        }
    }

    /**
     * Manage expansion
     */
    manageExpansion(settlements, armies) {
        // AI doesn't create new settlements in MVP
        // This could be expanded later
    }
}

/**
 * AI Manager - handles all AI players
 */
class AIManager {
    constructor(game) {
        this.game = game;
        this.aiPlayers = {};
    }

    /**
     * Register an AI player
     */
    registerAI(playerId) {
        this.aiPlayers[playerId] = new AIPlayer(this.game, playerId);
    }

    /**
     * Process all AI turns
     */
    processTurn(tick) {
        for (const ai of Object.values(this.aiPlayers)) {
            ai.processTurn(tick);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AIPlayer, AIManager };
}
