// Crossroads - Game State & Logic

/**
 * Game constants
 */
const GAME_CONSTANTS = {
    FOOD_PER_PERSON_PER_TICK: 0.1,
    BASE_GROWTH_RATE: 0.002,
    STARVATION_RATE: 0.005,
    INCOME_PER_PERSON: 0.5,
    CASUALTY_RATE: 0.05,
    CONSTRUCTION_RATE: 0.1, // Progress per tick
    BASE_ARMY_SPEED: 5, // Units per tick
    OFF_ROAD_SPEED_MULT: 0.2,

    MAP_WIDTH: 2000,
    MAP_HEIGHT: 2000
};

/**
 * Game class - manages game state and logic
 */
class Game {
    constructor() {
        this.state = null;
        this.playerId = null;
        this.techTree = TECH_TREE;

        // Timing
        this.isPaused = true;
        this.tickInterval = null;
        this.tickSpeed = 1; // Ticks per second
        this.maxSpeed = 4;

        // AI
        this.aiManager = null;

        // Callbacks
        this.onTick = null;
    }

    /**
     * Start a new game
     */
    startNewGame() {
        // Reset the seeded RNG for deterministic map generation
        globalRng.reset();

        // Create initial state
        this.state = {
            tick: 0,
            settlements: {},
            resources: {},
            roads: {},
            buildings: {},
            armies: {},
            battles: {},
            players: {}
        };

        // Create players
        const humanPlayer = new Player({
            id: 'player1',
            name: 'Player',
            color: '#4fc3f7',
            isAI: false
        });

        const aiPlayer = new Player({
            id: 'ai1',
            name: 'AI Opponent',
            color: '#f44336',
            isAI: true
        });

        this.state.players[humanPlayer.id] = humanPlayer;
        this.state.players[aiPlayer.id] = aiPlayer;

        this.playerId = humanPlayer.id;

        // Generate map
        this.generateMap();

        // Setup AI
        this.aiManager = new AIManager(this);
        this.aiManager.registerAI(aiPlayer.id);

        // Start paused
        this.isPaused = true;

        // Dispatch event
        this.dispatchEvent('gameStarted', { state: this.state });
    }

    /**
     * Generate initial map
     */
    generateMap() {
        const mapWidth = GAME_CONSTANTS.MAP_WIDTH;
        const mapHeight = GAME_CONSTANTS.MAP_HEIGHT;

        // Create player's starting settlement
        const playerSettlement = new Settlement({
            name: generateSettlementName(),
            position: new Vec2(mapWidth * 0.25, mapHeight * 0.5),
            ownerId: this.playerId,
            population: 150,
            housingCapacity: 200,
            resources: { food: 100, wood: 50, stone: 20, iron: 0 }
        });
        playerSettlement.isCapital = true;
        this.state.settlements[playerSettlement.id] = playerSettlement;

        // Create AI's starting settlement
        const aiSettlement = new Settlement({
            name: generateSettlementName(),
            position: new Vec2(mapWidth * 0.75, mapHeight * 0.5),
            ownerId: 'ai1',
            population: 150,
            housingCapacity: 200,
            resources: { food: 100, wood: 50, stone: 20, iron: 0 }
        });
        aiSettlement.isCapital = true;
        this.state.settlements[aiSettlement.id] = aiSettlement;

        // Generate resources around the map
        this.generateResources(mapWidth, mapHeight);

        // Create initial roads from settlements to nearby resources
        this.createInitialRoads(playerSettlement);
        this.createInitialRoads(aiSettlement);
    }

    /**
     * Generate natural resources
     */
    generateResources(mapWidth, mapHeight) {
        const resourceConfigs = [
            { type: 'forest', count: 12, totalAmount: Infinity, regenerationRate: 0.5 },
            { type: 'fertile', count: 8, totalAmount: Infinity, regenerationRate: 0 },
            { type: 'stone', count: 6, totalAmount: 2000, regenerationRate: 0 },
            { type: 'iron', count: 4, totalAmount: 1500, regenerationRate: 0 }
        ];

        for (const config of resourceConfigs) {
            for (let i = 0; i < config.count; i++) {
                const resource = new NaturalResource({
                    resourceType: config.type,
                    position: new Vec2(
                        globalRng.nextFloat(100, mapWidth - 100),
                        globalRng.nextFloat(100, mapHeight - 100)
                    ),
                    radius: globalRng.nextFloat(25, 40),
                    totalAmount: config.totalAmount,
                    extractionRate: globalRng.nextFloat(3, 7),
                    regenerationRate: config.regenerationRate
                });

                // Make sure resources aren't too close to settlements
                let tooClose = false;
                for (const settlement of Object.values(this.state.settlements)) {
                    if (resource.position.distanceTo(settlement.position) < 100) {
                        tooClose = true;
                        break;
                    }
                }

                if (!tooClose) {
                    this.state.resources[resource.id] = resource;
                }
            }
        }
    }

    /**
     * Create initial roads from settlement to nearby resources
     */
    createInitialRoads(settlement) {
        // Find closest forest and fertile land
        const forests = Object.values(this.state.resources).filter(r => r.resourceType === 'forest');
        const fertile = Object.values(this.state.resources).filter(r => r.resourceType === 'fertile');

        let closestForest = null;
        let closestFertile = null;
        let minForestDist = Infinity;
        let minFertileDist = Infinity;

        for (const f of forests) {
            const dist = settlement.position.distanceTo(f.position);
            if (dist < minForestDist && dist < 400) {
                minForestDist = dist;
                closestForest = f;
            }
        }

        for (const f of fertile) {
            const dist = settlement.position.distanceTo(f.position);
            if (dist < minFertileDist && dist < 400) {
                minFertileDist = dist;
                closestFertile = f;
            }
        }

        // Build roads
        if (closestForest) {
            const road = new Road({
                waypoints: [settlement.position.clone(), closestForest.position.clone()],
                roadType: 'dirt',
                ownerId: settlement.ownerId,
                constructionProgress: 1.0
            });
            this.state.roads[road.id] = road;

            // Build lumber camp
            const camp = new Building({
                type: 'lumber_camp',
                position: closestForest.position.add(new Vec2(20, 0)),
                resourceId: closestForest.id,
                ownerId: settlement.ownerId,
                constructionProgress: 1.0
            });
            this.state.buildings[camp.id] = camp;
            closestForest.assignedBuilding = camp.id;
        }

        if (closestFertile) {
            const road = new Road({
                waypoints: [settlement.position.clone(), closestFertile.position.clone()],
                roadType: 'dirt',
                ownerId: settlement.ownerId,
                constructionProgress: 1.0
            });
            this.state.roads[road.id] = road;

            // Build farm
            const farm = new Building({
                type: 'farm',
                position: closestFertile.position.add(new Vec2(20, 0)),
                resourceId: closestFertile.id,
                ownerId: settlement.ownerId,
                constructionProgress: 1.0
            });
            this.state.buildings[farm.id] = farm;
            closestFertile.assignedBuilding = farm.id;
        }
    }

    /**
     * Process one game tick
     */
    processTick() {
        if (this.isPaused) return;

        this.state.tick++;

        // Process in order
        this.processResources();
        this.processSettlements();
        this.processConstruction();
        this.processResearch();
        this.processArmyMovement();
        this.processBattles();
        this.checkVictoryConditions();

        // Process AI
        if (this.aiManager) {
            this.aiManager.processTurn(this.state.tick);
        }

        // Update player totals
        this.updatePlayerTotals();

        // Dispatch tick event
        this.dispatchEvent('tickUpdated', { tick: this.state.tick });

        // Callback
        if (this.onTick) {
            this.onTick(this.state.tick);
        }
    }

    /**
     * Process resource extraction
     */
    processResources() {
        for (const building of Object.values(this.state.buildings)) {
            if (!building.isComplete) continue;
            if (!building.resourceId) continue;

            const resource = this.state.resources[building.resourceId];
            if (!resource) continue;

            // Extract resources
            const extracted = Math.min(resource.extractionRate, resource.amountRemaining);
            if (extracted <= 0) continue;

            resource.amountRemaining -= extracted;

            // Find nearest connected settlement
            const settlement = this.findNearestConnectedSettlement(building.position, building.ownerId);
            if (settlement) {
                const resourceType = resource.typeData.produces;
                settlement.resources[resourceType] = (settlement.resources[resourceType] || 0) + extracted;
                settlement.productionPerTick[resourceType] = extracted;
            }
        }

        // Resource regeneration
        for (const resource of Object.values(this.state.resources)) {
            if (resource.regenerationRate > 0 && resource.amountRemaining < resource.totalAmount) {
                resource.amountRemaining = Math.min(
                    resource.totalAmount,
                    resource.amountRemaining + resource.regenerationRate
                );
            }
        }
    }

    /**
     * Find nearest settlement connected by road
     */
    findNearestConnectedSettlement(position, ownerId) {
        let nearest = null;
        let minDist = Infinity;

        for (const settlement of Object.values(this.state.settlements)) {
            if (settlement.ownerId !== ownerId) continue;

            const dist = position.distanceTo(settlement.position);
            if (dist < minDist) {
                // Check if connected by road
                const connected = this.isConnectedByRoad(position, settlement.position, ownerId);
                if (connected) {
                    minDist = dist;
                    nearest = settlement;
                }
            }
        }

        return nearest;
    }

    /**
     * Check if two positions are connected by road
     */
    isConnectedByRoad(pos1, pos2, ownerId) {
        // Simplified: check if both positions are near any road owned by player
        for (const road of Object.values(this.state.roads)) {
            if (road.ownerId !== ownerId) continue;
            if (!road.isComplete) continue;

            const near1 = pointNearPolyline(pos1.x, pos1.y, road.waypoints, 50);
            const near2 = pointNearPolyline(pos2.x, pos2.y, road.waypoints, 50);

            if (near1 && near2) return true;
        }

        // Also allow if positions are close enough
        return pos1.distanceTo(pos2) < 100;
    }

    /**
     * Process settlement population and economy
     */
    processSettlements() {
        for (const settlement of Object.values(this.state.settlements)) {
            // 1. Food consumption
            const foodNeeded = settlement.population * GAME_CONSTANTS.FOOD_PER_PERSON_PER_TICK;
            const foodAvailable = settlement.resources.food || 0;
            let foodSatisfied = true;

            if (foodAvailable >= foodNeeded) {
                settlement.resources.food -= foodNeeded;
            } else {
                settlement.resources.food = 0;
                foodSatisfied = false;
            }

            // 2. Population growth/decline
            if (foodSatisfied && settlement.population < settlement.housingCapacity) {
                settlement.population += Math.max(1, Math.floor(settlement.population * GAME_CONSTANTS.BASE_GROWTH_RATE));
            } else if (!foodSatisfied) {
                const deaths = Math.max(1, Math.floor(settlement.population * GAME_CONSTANTS.STARVATION_RATE));
                settlement.population = Math.max(10, settlement.population - deaths);
                settlement.contentment -= 5;
            }

            // 3. Housing pressure
            if (settlement.population > settlement.housingCapacity) {
                settlement.contentment -= 2;
            }

            // 4. Tax collection
            const income = settlement.population * GAME_CONSTANTS.INCOME_PER_PERSON * settlement.taxRate;
            settlement.treasury += income;

            // 5. Contentment adjustment
            let contentmentDelta = 0;

            // Tax rate effects
            if (settlement.taxRate > 0.3) {
                contentmentDelta -= (settlement.taxRate - 0.3) * 10;
            } else if (settlement.taxRate < 0.2) {
                contentmentDelta += (0.2 - settlement.taxRate) * 5;
            }

            // Public investment bonus
            if (settlement.publicInvestment > 0.2) {
                contentmentDelta += 2;
            }

            // Garrison bonus
            if (settlement.garrison) {
                contentmentDelta += 1;
            }

            // Apply contentment change
            settlement.contentment = clamp(settlement.contentment + contentmentDelta + 0.5, 0, 100);

            // 6. Unrest accumulation
            if (settlement.contentment < 30) {
                settlement.unrest += (30 - settlement.contentment) / 10;
            } else {
                settlement.unrest = Math.max(0, settlement.unrest - 1);
            }

            // 7. Revolt check
            if (settlement.unrest >= settlement.revoltThreshold) {
                this.triggerRevolt(settlement);
            }
        }
    }

    /**
     * Trigger a revolt in a settlement
     */
    triggerRevolt(settlement) {
        // Reset unrest
        settlement.unrest = 0;

        // Settlement becomes neutral
        settlement.ownerId = null;

        this.dispatchEvent('settlementRevolted', { settlement });
    }

    /**
     * Process construction progress
     */
    processConstruction() {
        // Roads
        for (const road of Object.values(this.state.roads)) {
            if (!road.isComplete) {
                road.constructionProgress = Math.min(1.0, road.constructionProgress + GAME_CONSTANTS.CONSTRUCTION_RATE);
            }
        }

        // Buildings
        for (const building of Object.values(this.state.buildings)) {
            if (!building.isComplete) {
                building.constructionProgress = Math.min(1.0, building.constructionProgress + GAME_CONSTANTS.CONSTRUCTION_RATE);
            }
        }
    }

    /**
     * Process research progress
     */
    processResearch() {
        for (const player of Object.values(this.state.players)) {
            if (!player.currentResearch) continue;

            // Calculate research points from settlements
            let researchPoints = 0;
            for (const settlement of Object.values(this.state.settlements)) {
                if (settlement.ownerId === player.id) {
                    researchPoints += settlement.getResearchOutput();
                }
            }

            player.researchPerTick = researchPoints;
            player.researchProgress += researchPoints;

            // Check if research is complete
            const tech = this.techTree[player.currentResearch];
            if (player.researchProgress >= tech.cost) {
                this.completeResearch(player, tech);
            }
        }
    }

    /**
     * Complete research
     */
    completeResearch(player, tech) {
        player.researchedTechs.add(tech.id);
        player.currentResearch = null;
        player.researchProgress = 0;

        // Apply tech effects
        applyTechEffects(player, tech.id, this.state);

        // Check for scientific victory
        if (tech.effects && tech.effects.victory === 'scientific') {
            this.endGame(player.id, 'scientific');
        }

        this.dispatchEvent('researchComplete', { playerId: player.id, techId: tech.id, techName: tech.name });
    }

    /**
     * Process army movement
     */
    processArmyMovement() {
        for (const army of Object.values(this.state.armies)) {
            if (army.inBattle) continue;
            if (!army.destination) continue;

            // Calculate speed based on road
            let speed = GAME_CONSTANTS.BASE_ARMY_SPEED * army.speed;

            // Check if on road
            const onRoad = this.isArmyOnRoad(army);
            if (!onRoad) {
                speed *= GAME_CONSTANTS.OFF_ROAD_SPEED_MULT;
            }

            // Move toward destination
            const dx = army.destination.x - army.position.x;
            const dy = army.destination.y - army.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= speed) {
                // Arrived
                army.position.x = army.destination.x;
                army.position.y = army.destination.y;
                army.destination = null;
                army.path = [];
            } else {
                // Move
                army.position.x += (dx / dist) * speed;
                army.position.y += (dy / dist) * speed;
            }

            // Check for encounters
            this.checkArmyEncounters(army);
        }
    }

    /**
     * Check if army is on a road
     */
    isArmyOnRoad(army) {
        for (const road of Object.values(this.state.roads)) {
            if (!road.isComplete) continue;
            if (pointNearPolyline(army.position.x, army.position.y, road.waypoints, 20)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check for army encounters
     */
    checkArmyEncounters(army) {
        // Check for enemy armies
        for (const otherArmy of Object.values(this.state.armies)) {
            if (otherArmy.id === army.id) continue;
            if (otherArmy.ownerId === army.ownerId) continue;
            if (otherArmy.inBattle) continue;

            const dist = army.position.distanceTo(otherArmy.position);
            if (dist < 30) {
                // Start battle
                this.startBattle(army, otherArmy);
                return;
            }
        }

        // Check for enemy settlements
        for (const settlement of Object.values(this.state.settlements)) {
            if (settlement.ownerId === army.ownerId) continue;
            if (!settlement.ownerId) continue; // Skip neutral

            const dist = army.position.distanceTo(settlement.position);
            if (dist < settlement.radius + 10) {
                // Siege battle
                this.startSiege(army, settlement);
                return;
            }
        }
    }

    /**
     * Start a battle between two armies
     */
    startBattle(attacker, defender) {
        attacker.inBattle = true;
        defender.inBattle = true;
        attacker.destination = null;
        defender.destination = null;

        const battle = new Battle({
            location: attacker.position.clone(),
            locationType: 'field',
            attackerId: attacker.id,
            defenderId: defender.id,
            attackerStartingStrength: attacker.totalStrength,
            defenderStartingStrength: defender.totalStrength,
            startedTick: this.state.tick
        });

        this.state.battles[battle.id] = battle;

        this.dispatchEvent('battleStarted', { battle });
    }

    /**
     * Start a siege
     */
    startSiege(army, settlement) {
        // Create a pseudo-army for the settlement defender
        const garrison = settlement.garrison || {
            id: 'garrison_' + settlement.id,
            name: 'Garrison',
            ownerId: settlement.ownerId,
            position: settlement.position.clone(),
            units: { militia: Math.floor(settlement.population / 20) },
            morale: 80,
            get totalStrength() {
                return Object.values(this.units).reduce((a, b) => a + b, 0);
            }
        };

        army.inBattle = true;
        army.destination = null;

        // Fortification modifier based on walls
        const fortMod = 1.0 + (settlement.wallsLevel * 0.5);

        const battle = new Battle({
            location: settlement.position.clone(),
            locationType: 'siege',
            attackerId: army.id,
            defenderId: garrison.id,
            attackerStartingStrength: army.totalStrength,
            defenderStartingStrength: garrison.totalStrength,
            fortificationModifier: fortMod,
            startedTick: this.state.tick
        });

        // Store garrison temporarily
        battle._garrison = garrison;
        battle._settlement = settlement;

        this.state.battles[battle.id] = battle;

        this.dispatchEvent('battleStarted', { battle });
    }

    /**
     * Process all battles
     */
    processBattles() {
        for (const battle of Object.values(this.state.battles)) {
            if (battle.status !== 'ongoing') continue;

            const result = this.resolveBattleTick(battle);

            if (result !== 'ongoing') {
                battle.status = result;
                this.endBattle(battle);
            }
        }
    }

    /**
     * Resolve one tick of a battle
     */
    resolveBattleTick(battle) {
        const attacker = this.state.armies[battle.attackerId];
        let defender = this.state.armies[battle.defenderId];

        // Handle garrison defenders
        if (!defender && battle._garrison) {
            defender = battle._garrison;
        }

        if (!attacker || !defender) {
            return 'attacker_wins'; // Defender doesn't exist
        }

        // Calculate effective power
        let attPower = attacker.totalStrength * (attacker.morale / 100);
        let defPower = defender.totalStrength * (defender.morale / 100);
        defPower *= battle.terrainModifier * battle.fortificationModifier;

        // Avoid division by zero
        if (attPower <= 0) return 'defender_wins';
        if (defPower <= 0) return 'attacker_wins';

        // Calculate casualties
        const attCasualties = Math.max(1, Math.floor(defPower * GAME_CONSTANTS.CASUALTY_RATE));
        const defCasualties = Math.max(1, Math.floor(attPower * GAME_CONSTANTS.CASUALTY_RATE));

        // Apply casualties
        attacker.applyCasualties(attCasualties);
        if (defender.applyCasualties) {
            defender.applyCasualties(defCasualties);
        } else {
            // Garrison
            for (const unitType of Object.keys(defender.units)) {
                defender.units[unitType] = Math.max(0, defender.units[unitType] - Math.ceil(defCasualties / Object.keys(defender.units).length));
            }
        }

        battle.casualties.attacker += attCasualties;
        battle.casualties.defender += defCasualties;

        // Morale impact
        const attMoraleLoss = (attCasualties / battle.attackerStartingStrength) * 20;
        const defMoraleLoss = (defCasualties / battle.defenderStartingStrength) * 20;

        attacker.morale = Math.max(0, attacker.morale - attMoraleLoss);
        if (defender.morale !== undefined) {
            defender.morale = Math.max(0, defender.morale - defMoraleLoss);
        }

        // Check for rout
        if (attacker.morale < 20 || attacker.totalUnits < 5) {
            return 'defender_wins';
        }
        if ((defender.morale !== undefined && defender.morale < 20) || defender.totalStrength < 5) {
            return 'attacker_wins';
        }

        return 'ongoing';
    }

    /**
     * End a battle
     */
    endBattle(battle) {
        const attacker = this.state.armies[battle.attackerId];

        // Release armies from battle
        if (attacker) {
            attacker.inBattle = false;
        }

        const defender = this.state.armies[battle.defenderId];
        if (defender) {
            defender.inBattle = false;
        }

        // Handle siege results
        if (battle.locationType === 'siege' && battle._settlement) {
            const settlement = battle._settlement;

            if (battle.status === 'attacker_wins') {
                // Attacker captures settlement
                settlement.ownerId = attacker ? attacker.ownerId : null;
                settlement.contentment = 30; // Low contentment after capture

                this.dispatchEvent('settlementCaptured', {
                    settlement,
                    capturedBy: attacker ? attacker.ownerId : null
                });
            }
        }

        // Remove defeated armies
        if (attacker && attacker.totalUnits <= 0) {
            delete this.state.armies[attacker.id];
        }
        if (defender && defender.totalUnits <= 0) {
            delete this.state.armies[defender.id];
        }

        // Remove battle
        delete this.state.battles[battle.id];

        this.dispatchEvent('battleEnded', { result: battle });
    }

    /**
     * Check victory conditions
     */
    checkVictoryConditions() {
        // Get settlement counts
        const settlementCounts = {};
        for (const settlement of Object.values(this.state.settlements)) {
            if (settlement.ownerId) {
                settlementCounts[settlement.ownerId] = (settlementCounts[settlement.ownerId] || 0) + 1;
            }
        }

        const totalSettlements = Object.values(this.state.settlements).length;

        for (const [playerId, count] of Object.entries(settlementCounts)) {
            // Domination victory: 75% of settlements
            if (count >= totalSettlements * 0.75) {
                this.endGame(playerId, 'domination');
                return;
            }
        }

        // Elimination: only one player left
        const playersWithSettlements = Object.keys(settlementCounts);
        if (playersWithSettlements.length === 1) {
            this.endGame(playersWithSettlements[0], 'elimination');
            return;
        }

        // Economic victory
        for (const player of Object.values(this.state.players)) {
            let totalTreasury = 0;
            for (const settlement of Object.values(this.state.settlements)) {
                if (settlement.ownerId === player.id) {
                    totalTreasury += settlement.treasury;
                }
            }
            if (totalTreasury >= 100000) {
                this.endGame(player.id, 'economic');
                return;
            }
        }
    }

    /**
     * End the game
     */
    endGame(winnerId, victoryType) {
        this.isPaused = true;

        const isPlayerWinner = winnerId === this.playerId;
        const messages = {
            domination: isPlayerWinner ? 'You have conquered the land!' : 'Your empire has fallen.',
            elimination: isPlayerWinner ? 'You are the last one standing!' : 'Your civilization has been eliminated.',
            economic: isPlayerWinner ? 'Your wealth knows no bounds!' : 'The enemy has achieved economic supremacy.',
            scientific: isPlayerWinner ? 'Your research has unlocked the future!' : 'The enemy has achieved scientific victory.'
        };

        this.dispatchEvent('gameOver', {
            victory: isPlayerWinner,
            winnerId,
            victoryType,
            message: messages[victoryType]
        });
    }

    /**
     * Update player totals
     */
    updatePlayerTotals() {
        for (const player of Object.values(this.state.players)) {
            player.totalResources = { food: 0, wood: 0, stone: 0, iron: 0 };
            player.researchPerTick = 0;

            for (const settlement of Object.values(this.state.settlements)) {
                if (settlement.ownerId === player.id) {
                    for (const [resource, amount] of Object.entries(settlement.resources)) {
                        player.totalResources[resource] = (player.totalResources[resource] || 0) + amount;
                    }
                    player.researchPerTick += settlement.getResearchOutput();
                }
            }
        }
    }

    /**
     * Game actions
     */

    buildRoad(waypoints, roadType, ownerId = null) {
        ownerId = ownerId || this.playerId;

        const road = new Road({
            waypoints: waypoints.map(wp => wp.clone()),
            roadType: roadType,
            ownerId: ownerId,
            constructionProgress: 0
        });

        this.state.roads[road.id] = road;
        return road;
    }

    removeRoad(roadId) {
        delete this.state.roads[roadId];
    }

    buildBuilding(type, position, resourceId, ownerId = null) {
        ownerId = ownerId || this.playerId;

        const building = new Building({
            type: type,
            position: position.clone(),
            resourceId: resourceId,
            ownerId: ownerId,
            constructionProgress: 0
        });

        this.state.buildings[building.id] = building;

        // Assign building to resource
        if (resourceId && this.state.resources[resourceId]) {
            this.state.resources[resourceId].assignedBuilding = building.id;
        }

        return building;
    }

    buildInSettlement(settlementId, buildingType, ownerId = null) {
        const settlement = this.state.settlements[settlementId];
        if (!settlement) return;

        ownerId = ownerId || settlement.ownerId;

        const buildingData = BuildingType[buildingType.toUpperCase()];
        if (!buildingData) return;

        // Check cost
        let canAfford = true;
        for (const [resource, amount] of Object.entries(buildingData.cost)) {
            if ((settlement.resources[resource] || 0) < amount) {
                canAfford = false;
                break;
            }
        }

        if (!canAfford) {
            this.dispatchEvent('actionFailed', { reason: 'Not enough resources' });
            return;
        }

        // Deduct cost
        for (const [resource, amount] of Object.entries(buildingData.cost)) {
            settlement.resources[resource] -= amount;
        }

        // Create building
        const offset = new Vec2(
            randomFloat(-30, 30),
            randomFloat(-30, 30)
        );
        const position = settlement.position.add(offset);

        const building = new Building({
            type: buildingType,
            position: position,
            settlementId: settlementId,
            ownerId: ownerId,
            constructionProgress: 0
        });

        this.state.buildings[building.id] = building;
        settlement.buildings.push(building);

        // Apply immediate effects
        if (buildingData.capacityBonus) {
            settlement.housingCapacity += buildingData.capacityBonus;
        }
        if (buildingData.defenseBonus) {
            settlement.wallsLevel += buildingData.defenseBonus;
        }

        return building;
    }

    removeBuilding(buildingId) {
        const building = this.state.buildings[buildingId];
        if (building && building.resourceId) {
            const resource = this.state.resources[building.resourceId];
            if (resource) {
                resource.assignedBuilding = null;
            }
        }
        delete this.state.buildings[buildingId];
    }

    createArmy(settlementId, units, ownerId = null) {
        const settlement = this.state.settlements[settlementId];
        if (!settlement) return;

        ownerId = ownerId || settlement.ownerId;

        // Calculate cost
        let totalCost = 0;
        for (const [unitType, count] of Object.entries(units)) {
            const typeData = UnitType[unitType.toUpperCase()];
            if (typeData) {
                totalCost += typeData.cost * count;
            }
        }

        if (settlement.treasury < totalCost) {
            this.dispatchEvent('actionFailed', { reason: 'Not enough gold' });
            return;
        }

        settlement.treasury -= totalCost;

        const army = new Army({
            name: generateArmyName(Object.keys(this.state.armies).length),
            position: settlement.position.clone(),
            ownerId: ownerId,
            units: units
        });

        this.state.armies[army.id] = army;
        return army;
    }

    moveArmy(armyId, destination, ownerId = null) {
        const army = this.state.armies[armyId];
        if (!army) return;

        ownerId = ownerId || this.playerId;
        if (army.ownerId !== ownerId) return;

        army.destination = destination.clone();
    }

    setTaxRate(settlementId, rate) {
        const settlement = this.state.settlements[settlementId];
        if (settlement && settlement.ownerId === this.playerId) {
            settlement.taxRate = clamp(rate, 0, 1);
        }
    }

    startResearch(techId, playerId = null) {
        playerId = playerId || this.playerId;
        const player = this.state.players[playerId];
        if (!player) return;

        const tech = this.techTree[techId];
        if (!tech) return;

        if (!canResearchTech(player, techId)) {
            this.dispatchEvent('actionFailed', { reason: 'Prerequisites not met' });
            return;
        }

        player.currentResearch = techId;
        player.researchProgress = 0;
    }

    /**
     * Game control
     */

    togglePause() {
        this.isPaused = !this.isPaused;

        if (!this.isPaused && !this.tickInterval) {
            this.startTickLoop();
        }

        this.dispatchEvent('pauseToggled', { isPaused: this.isPaused });

        if (window.ui) {
            window.ui.updatePlayPauseButton(this.isPaused);
        }
    }

    startTickLoop() {
        if (this.tickInterval) return;

        const tickMs = 1000 / this.tickSpeed;
        this.tickInterval = setInterval(() => {
            this.processTick();
        }, tickMs);
    }

    stopTickLoop() {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
    }

    setSpeed(speed) {
        this.tickSpeed = clamp(speed, 1, this.maxSpeed);

        // Restart tick loop with new speed
        if (!this.isPaused) {
            this.stopTickLoop();
            this.startTickLoop();
        }

        if (window.ui) {
            window.ui.updateSpeedDisplay(this.tickSpeed);
        }
    }

    increaseSpeed() {
        this.setSpeed(this.tickSpeed + 1);
    }

    decreaseSpeed() {
        this.setSpeed(this.tickSpeed - 1);
    }

    /**
     * Dispatch custom event
     */
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Game, GAME_CONSTANTS };
}
