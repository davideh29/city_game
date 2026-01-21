// Crossroads - UI Manager

/**
 * UI Manager class for sidebar, modals, and notifications
 */
class UIManager {
    constructor(game) {
        this.game = game;

        // Cache DOM elements
        this.elements = {
            // Sidebar
            sidebarTabs: document.getElementById('sidebar-tabs'),
            sidebarContent: document.getElementById('sidebar-content'),
            settlementsList: document.getElementById('settlements-list'),
            armiesList: document.getElementById('armies-list'),
            currentResearch: document.getElementById('current-research'),
            availableResearch: document.getElementById('available-research'),
            buildOptions: document.getElementById('build-options'),
            buildInfo: document.getElementById('build-info'),
            legendContent: document.getElementById('legend-content'),

            // Selection panel
            selectionPanel: document.getElementById('selection-panel'),
            selectionTitle: document.getElementById('selection-title'),
            selectionContent: document.getElementById('selection-content'),
            selectionActions: document.getElementById('selection-actions'),

            // Entity info bar
            entityInfoBar: document.getElementById('entity-info-bar'),
            entityInfoTitle: document.getElementById('entity-info-title'),
            entityInfoClose: document.getElementById('entity-info-close'),
            armyUnitsDisplay: document.getElementById('army-units-display'),
            armyUnitsList: document.getElementById('army-units-list'),
            armyStrengthValue: document.getElementById('army-strength-value'),
            armyMoraleValue: document.getElementById('army-morale-value'),
            settlementMilitaryDisplay: document.getElementById('settlement-military-display'),
            garrisonUnitsList: document.getElementById('garrison-units-list'),
            trainingSection: document.getElementById('training-section'),
            trainingQueueList: document.getElementById('training-queue-list'),
            battleInfoDisplay: document.getElementById('battle-info-display'),
            battleStatusText: document.getElementById('battle-status-text'),
            battleAttackerStrength: document.getElementById('battle-attacker-strength'),
            battleDefenderStrength: document.getElementById('battle-defender-strength'),

            // Bottom bar
            resFoodEl: document.getElementById('res-food'),
            resWoodEl: document.getElementById('res-wood'),
            resStoneEl: document.getElementById('res-stone'),
            resIronEl: document.getElementById('res-iron'),
            resResearchEl: document.getElementById('res-research'),
            tickCounter: document.getElementById('tick-counter'),
            playPauseBtn: document.getElementById('btn-play-pause'),
            speedDisplay: document.getElementById('speed-display'),

            // Modal
            modalOverlay: document.getElementById('modal-overlay'),
            modalContainer: document.getElementById('modal-container'),
            modalTitle: document.getElementById('modal-title'),
            modalContent: document.getElementById('modal-content'),
            modalActions: document.getElementById('modal-actions'),
            modalClose: document.getElementById('modal-close'),

            // Game over
            gameOverScreen: document.getElementById('game-over-screen'),
            gameOverTitle: document.getElementById('game-over-title'),
            gameOverMessage: document.getElementById('game-over-message'),
            newGameBtn: document.getElementById('btn-new-game')
        };

        // Current tab
        this.currentTab = 'settlements';

        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Setup UI event listeners
     */
    setupEventListeners() {
        // Tab switching
        this.elements.sidebarTabs.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-btn')) {
                this.switchTab(e.target.dataset.tab);
            }
        });

        // Play/Pause button
        this.elements.playPauseBtn.addEventListener('click', () => {
            this.game.togglePause();
        });

        // Speed controls
        document.getElementById('btn-speed-up').addEventListener('click', () => {
            this.game.increaseSpeed();
        });

        document.getElementById('btn-speed-down').addEventListener('click', () => {
            this.game.decreaseSpeed();
        });

        // Build buttons
        this.elements.buildOptions.addEventListener('click', (e) => {
            const btn = e.target.closest('.build-btn');
            if (btn && !btn.disabled) {
                this.handleBuildClick(btn.dataset.build);
            }
        });

        // Modal close
        this.elements.modalClose.addEventListener('click', () => this.closeModal());
        this.elements.modalOverlay.addEventListener('click', (e) => {
            if (e.target === this.elements.modalOverlay) {
                this.closeModal();
            }
        });

        // Selection panel close
        document.getElementById('selection-close').addEventListener('click', () => {
            this.hideEntityDetails();
            if (window.inputHandler) {
                window.inputHandler.clearSelection();
            }
        });

        // Entity info bar close
        this.elements.entityInfoClose.addEventListener('click', () => {
            this.hideEntityInfoBar();
            if (window.inputHandler) {
                window.inputHandler.clearSelection();
            }
        });

        // New game button
        this.elements.newGameBtn.addEventListener('click', () => {
            this.game.startNewGame();
            this.elements.gameOverScreen.classList.add('hidden');
        });

        // Listen for game events
        document.addEventListener('tickUpdated', (e) => this.onTickUpdated(e.detail));
        document.addEventListener('entitySelected', (e) => this.onEntitySelected(e.detail));
        document.addEventListener('selectionCleared', () => this.hideEntityDetails());
        document.addEventListener('battleStarted', (e) => this.onBattleStarted(e.detail));
        document.addEventListener('battleEnded', (e) => this.onBattleEnded(e.detail));
        document.addEventListener('researchComplete', (e) => this.onResearchComplete(e.detail));
        document.addEventListener('gameOver', (e) => this.onGameOver(e.detail));
    }

    /**
     * Switch sidebar tab
     */
    switchTab(tabName) {
        // Update tab buttons
        const tabBtns = this.elements.sidebarTabs.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        const tabContents = this.elements.sidebarContent.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabName}`);
        });

        this.currentTab = tabName;

        // Refresh content
        this.refreshCurrentTab();
    }

    /**
     * Refresh current tab content
     */
    refreshCurrentTab() {
        switch (this.currentTab) {
            case 'settlements':
                this.updateSettlementsList();
                break;
            case 'armies':
                this.updateArmiesList();
                break;
            case 'research':
                this.updateResearchPanel();
                break;
            case 'build':
                this.updateBuildPanel();
                break;
            case 'legend':
                this.updateLegendPanel();
                break;
        }
    }

    /**
     * Update settlements list
     */
    updateSettlementsList() {
        const state = this.game.state;
        const player = state.players[this.game.playerId];
        const settlements = Object.values(state.settlements).filter(s => s.ownerId === this.game.playerId);

        this.elements.settlementsList.innerHTML = settlements.map(settlement => `
            <div class="entity-card" data-id="${settlement.id}" data-type="settlement">
                <div class="entity-card-header">
                    <span class="entity-name">${settlement.name}</span>
                    ${settlement.isCapital ? '<span class="entity-icon" title="Capital">&#9733;</span>' : ''}
                </div>
                <div class="entity-stats">
                    <span class="stat-item" title="Population">
                        <span class="stat-icon">&#128101;</span>
                        ${formatNumber(settlement.population)}
                    </span>
                    <span class="stat-item" title="Housing">
                        <span class="stat-icon">&#127968;</span>
                        ${settlement.housingCapacity}
                    </span>
                    <span class="stat-item" title="Treasury">
                        <span class="stat-icon">&#128176;</span>
                        ${formatNumber(settlement.treasury)}
                    </span>
                    <span class="stat-item" title="Tax Rate">
                        <span class="stat-icon">&#128200;</span>
                        ${formatPercent(settlement.taxRate)}
                    </span>
                </div>
                <div class="progress-bar" title="Contentment: ${Math.floor(settlement.contentment)}%">
                    <div class="progress-fill ${getContentmentClass(settlement.contentment)}" style="width: ${settlement.contentment}%"></div>
                </div>
                <div class="entity-actions">
                    <button class="entity-btn" data-action="goto" data-id="${settlement.id}">Go To</button>
                    <button class="entity-btn" data-action="view" data-id="${settlement.id}">Details</button>
                </div>
            </div>
        `).join('');

        // Add click handlers
        this.elements.settlementsList.querySelectorAll('.entity-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.entity-btn')) {
                    const id = card.dataset.id;
                    const settlement = state.settlements[id];
                    if (window.inputHandler) {
                        window.inputHandler.selectEntity(settlement, 'settlement');
                    }
                }
            });
        });

        this.elements.settlementsList.querySelectorAll('.entity-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const id = btn.dataset.id;
                const settlement = state.settlements[id];

                if (action === 'goto') {
                    window.camera.panTo(settlement.position.x, settlement.position.y);
                } else if (action === 'view') {
                    this.showSettlementDetails(settlement);
                }
            });
        });
    }

    /**
     * Update armies list
     */
    updateArmiesList() {
        const state = this.game.state;
        const armies = Object.values(state.armies).filter(a => a.ownerId === this.game.playerId);

        if (armies.length === 0) {
            this.elements.armiesList.innerHTML = `
                <p class="text-muted">No armies. Create one from a settlement with a barracks.</p>
            `;
            return;
        }

        this.elements.armiesList.innerHTML = armies.map(army => `
            <div class="entity-card" data-id="${army.id}" data-type="army">
                <div class="entity-card-header">
                    <span class="entity-name">${army.name}</span>
                    ${army.inBattle ? '<span class="entity-icon text-danger">&#9876;</span>' : ''}
                </div>
                <div class="entity-stats">
                    <span class="stat-item" title="Total Units">
                        <span class="stat-icon">&#9876;</span>
                        ${army.totalUnits}
                    </span>
                    <span class="stat-item" title="Strength">
                        <span class="stat-icon">&#128170;</span>
                        ${army.totalStrength}
                    </span>
                </div>
                <div class="progress-bar" title="Morale: ${Math.floor(army.morale)}%">
                    <div class="progress-fill ${getMoraleClass(army.morale)}" style="width: ${army.morale}%"></div>
                </div>
                <div class="entity-actions">
                    <button class="entity-btn" data-action="goto" data-id="${army.id}">Go To</button>
                    <button class="entity-btn" data-action="select" data-id="${army.id}">Select</button>
                </div>
            </div>
        `).join('');

        // Add click handlers
        this.elements.armiesList.querySelectorAll('.entity-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const id = btn.dataset.id;
                const army = state.armies[id];

                if (action === 'goto') {
                    window.camera.panTo(army.position.x, army.position.y);
                } else if (action === 'select') {
                    window.camera.panTo(army.position.x, army.position.y);
                    if (window.inputHandler) {
                        window.inputHandler.selectEntity(army, 'army');
                    }
                }
            });
        });
    }

    /**
     * Update research panel
     */
    updateResearchPanel() {
        const state = this.game.state;
        const player = state.players[this.game.playerId];
        const techTree = this.game.techTree;

        // Current research
        if (player.currentResearch) {
            const tech = techTree[player.currentResearch];
            const progress = (player.researchProgress / tech.cost) * 100;

            this.elements.currentResearch.innerHTML = `
                <div class="tech-item researching">
                    <div class="tech-name">${tech.name}</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="tech-cost">${Math.floor(player.researchProgress)} / ${tech.cost} points</div>
                </div>
            `;
        } else {
            this.elements.currentResearch.innerHTML = `
                <p class="text-muted">Not researching. Select a technology below.</p>
            `;
        }

        // Available research
        const availableTechs = Object.values(techTree).filter(tech => {
            if (player.researchedTechs.has(tech.id)) return false;
            if (tech.id === player.currentResearch) return false;
            return player.canResearch(tech, techTree);
        });

        this.elements.availableResearch.innerHTML = availableTechs.map(tech => `
            <div class="tech-item" data-tech-id="${tech.id}">
                <div class="tech-name">${tech.name}</div>
                <div class="tech-cost">${tech.cost} research points</div>
                ${tech.unlocks.length > 0 ? `<div class="tech-unlocks">Unlocks: ${tech.unlocks.join(', ')}</div>` : ''}
            </div>
        `).join('');

        // Add click handlers
        this.elements.availableResearch.querySelectorAll('.tech-item').forEach(item => {
            item.addEventListener('click', () => {
                const techId = item.dataset.techId;
                this.game.startResearch(techId);
            });
        });

        // Show researched techs
        if (player.researchedTechs.size > 0) {
            const researchedHtml = `
                <h4 style="margin-top: 16px; color: var(--text-secondary);">Researched</h4>
                ${Array.from(player.researchedTechs).map(techId => {
                    const tech = techTree[techId];
                    return `<div class="tech-item researched">${tech.name}</div>`;
                }).join('')}
            `;
            this.elements.availableResearch.innerHTML += researchedHtml;
        }
    }

    /**
     * Update build panel
     */
    updateBuildPanel() {
        const state = this.game.state;
        const player = state.players[this.game.playerId];

        // Update button states based on research
        const buildBtns = this.elements.buildOptions.querySelectorAll('.build-btn');
        buildBtns.forEach(btn => {
            const buildType = btn.dataset.build;

            // Check if it's a road
            if (buildType.startsWith('road-')) {
                const roadTypeId = buildType.replace('road-', '').toUpperCase();
                const roadType = RoadType[roadTypeId];
                if (roadType && roadType.requiredTech) {
                    btn.disabled = !player.researchedTechs.has(roadType.requiredTech);
                } else {
                    btn.disabled = false;
                }
            } else {
                // Building
                const buildingType = BuildingType[buildType.toUpperCase().replace('-', '_')];
                if (buildingType && buildingType.requiredTech) {
                    btn.disabled = !player.researchedTechs.has(buildingType.requiredTech);
                } else {
                    btn.disabled = false;
                }
            }
        });
    }

    /**
     * Update legend panel with game symbols and colors
     */
    updateLegendPanel() {
        const legendHtml = `
            <!-- Resources Section -->
            <div class="legend-section">
                <h4>Resources</h4>
                <div class="legend-items">
                    ${Object.values(ResourceType).map(res => `
                        <div class="legend-item">
                            <span class="legend-swatch" style="background: ${res.color};"></span>
                            <span class="legend-name">${res.name}</span>
                            <span class="legend-desc">Produces ${res.produces}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Roads Section -->
            <div class="legend-section">
                <h4>Roads</h4>
                <div class="legend-items">
                    ${Object.values(RoadType).map(road => `
                        <div class="legend-item">
                            <span class="legend-swatch legend-road" style="background: ${road.color}; height: ${road.width}px;"></span>
                            <span class="legend-name">${road.name}</span>
                            <span class="legend-desc">Speed ${road.speed}x</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Settlements Section -->
            <div class="legend-section">
                <h4>Settlements</h4>
                <div class="legend-items">
                    <div class="legend-item">
                        <span class="legend-symbol" style="color: var(--player-1);">&#9679;</span>
                        <span class="legend-name">Your Settlement</span>
                        <span class="legend-desc">Circle with glow</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-symbol" style="color: var(--player-2);">&#9679;</span>
                        <span class="legend-name">Enemy Settlement</span>
                        <span class="legend-desc">Red colored</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-symbol" style="color: var(--neutral);">&#9679;</span>
                        <span class="legend-name">Neutral Settlement</span>
                        <span class="legend-desc">Gray colored</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-symbol" style="color: var(--warning);">&#9733;</span>
                        <span class="legend-name">Capital</span>
                        <span class="legend-desc">Star marker</span>
                    </div>
                </div>
            </div>

            <!-- Armies Section -->
            <div class="legend-section">
                <h4>Armies</h4>
                <div class="legend-items">
                    <div class="legend-item">
                        <span class="legend-symbol" style="color: var(--player-1);">&#9650;</span>
                        <span class="legend-name">Your Army</span>
                        <span class="legend-desc">Triangle shape</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-symbol" style="color: var(--player-2);">&#9650;</span>
                        <span class="legend-name">Enemy Army</span>
                        <span class="legend-desc">Red colored</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-symbol" style="color: var(--danger);">&#9876;</span>
                        <span class="legend-name">Battle</span>
                        <span class="legend-desc">Crossed swords</span>
                    </div>
                </div>
            </div>

            <!-- Buildings Section -->
            <div class="legend-section">
                <h4>Buildings</h4>
                <div class="legend-items">
                    <div class="legend-item">
                        <span class="legend-building">L</span>
                        <span class="legend-name">Lumber Camp</span>
                        <span class="legend-desc">Harvests wood</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-building">Q</span>
                        <span class="legend-name">Quarry</span>
                        <span class="legend-desc">Harvests stone</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-building">M</span>
                        <span class="legend-name">Mine</span>
                        <span class="legend-desc">Harvests iron</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-building">F</span>
                        <span class="legend-name">Farm</span>
                        <span class="legend-desc">Produces food</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-building">H</span>
                        <span class="legend-name">House</span>
                        <span class="legend-desc">+20 housing</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-building">B</span>
                        <span class="legend-name">Barracks</span>
                        <span class="legend-desc">Train units</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-building">R</span>
                        <span class="legend-name">Library</span>
                        <span class="legend-desc">+2 research</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-building">W</span>
                        <span class="legend-name">Walls</span>
                        <span class="legend-desc">Defense bonus</span>
                    </div>
                </div>
            </div>

            <!-- Units Section -->
            <div class="legend-section">
                <h4>Units</h4>
                <div class="legend-items">
                    ${Object.values(UnitType).map(unit => `
                        <div class="legend-item">
                            <span class="legend-stat">${unit.strength}</span>
                            <span class="legend-name">${unit.name}</span>
                            <span class="legend-desc">Cost: ${unit.cost}g</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        this.elements.legendContent.innerHTML = legendHtml;
    }

    /**
     * Handle build button click
     */
    handleBuildClick(buildType) {
        if (buildType.startsWith('road-')) {
            const roadType = buildType.replace('road-', '');
            if (window.inputHandler) {
                window.inputHandler.setTool('road', { roadType });
            }
        } else {
            const buildingType = buildType.replace('-', '_');
            if (window.inputHandler) {
                window.inputHandler.setTool('building', { buildingType });
            }
        }
    }

    /**
     * Show entity details in selection panel
     */
    showEntityDetails(entity, type) {
        this.elements.selectionPanel.classList.remove('hidden');

        switch (type) {
            case 'settlement':
                this.showSettlementDetails(entity);
                this.showEntityInfoBar(entity, 'settlement');
                break;
            case 'army':
                this.showArmyDetails(entity);
                this.showEntityInfoBar(entity, 'army');
                break;
            case 'resource':
                this.showResourceDetails(entity);
                this.hideEntityInfoBar();
                break;
            case 'building':
                this.showBuildingDetails(entity);
                this.hideEntityInfoBar();
                break;
        }
    }

    /**
     * Hide entity details panel
     */
    hideEntityDetails() {
        this.elements.selectionPanel.classList.add('hidden');
        this.hideEntityInfoBar();
    }

    /**
     * Show entity info bar at bottom of screen
     */
    showEntityInfoBar(entity, type) {
        this.elements.entityInfoBar.classList.remove('hidden');

        // Hide all displays first
        this.elements.armyUnitsDisplay.classList.add('hidden');
        this.elements.settlementMilitaryDisplay.classList.add('hidden');
        this.elements.battleInfoDisplay.classList.add('hidden');

        if (type === 'army') {
            this.updateArmyInfoBar(entity);
        } else if (type === 'settlement') {
            this.updateSettlementInfoBar(entity);
        }
    }

    /**
     * Hide entity info bar
     */
    hideEntityInfoBar() {
        this.elements.entityInfoBar.classList.add('hidden');
    }

    /**
     * Update army info bar with unit composition
     */
    updateArmyInfoBar(army) {
        this.elements.entityInfoTitle.textContent = army.name;
        this.elements.armyUnitsDisplay.classList.remove('hidden');

        // Generate unit chips
        let unitsHtml = '';
        if (Object.keys(army.units).length === 0) {
            unitsHtml = '<span class="no-units-text">No units</span>';
        } else {
            for (const [unitType, count] of Object.entries(army.units)) {
                if (count > 0) {
                    const typeData = UnitType[unitType.toUpperCase()];
                    const displayName = typeData ? typeData.name : unitType;
                    unitsHtml += `
                        <div class="unit-chip">
                            <span class="unit-chip-icon ${unitType}">${typeData ? typeData.strength : '?'}</span>
                            <span class="unit-chip-count">${count}</span>
                            <span class="unit-chip-name">${displayName}</span>
                        </div>
                    `;
                }
            }
        }

        this.elements.armyUnitsList.innerHTML = unitsHtml;
        this.elements.armyStrengthValue.textContent = army.totalStrength;
        this.elements.armyMoraleValue.textContent = `${Math.floor(army.morale)}%`;
        this.elements.armyMoraleValue.className = getMoraleClass(army.morale);
    }

    /**
     * Update settlement info bar with garrison and training queue
     */
    updateSettlementInfoBar(settlement) {
        this.elements.entityInfoTitle.textContent = settlement.name;
        this.elements.settlementMilitaryDisplay.classList.remove('hidden');

        // Generate garrison chips
        let garrisonHtml = '';
        const garrison = settlement.garrison || {};
        const garrisonUnits = garrison.units || {};

        if (Object.keys(garrisonUnits).length === 0) {
            garrisonHtml = '<span class="no-units-text">No garrison</span>';
        } else {
            for (const [unitType, count] of Object.entries(garrisonUnits)) {
                if (count > 0) {
                    const typeData = UnitType[unitType.toUpperCase()];
                    const displayName = typeData ? typeData.name : unitType;
                    garrisonHtml += `
                        <div class="unit-chip">
                            <span class="unit-chip-icon ${unitType}">${typeData ? typeData.strength : '?'}</span>
                            <span class="unit-chip-count">${count}</span>
                            <span class="unit-chip-name">${displayName}</span>
                        </div>
                    `;
                }
            }
        }

        this.elements.garrisonUnitsList.innerHTML = garrisonHtml;

        // Generate training queue display
        let trainingHtml = '';
        const trainingQueue = settlement.trainingQueue || [];

        if (trainingQueue.length === 0) {
            trainingHtml = '<span class="no-units-text">Nothing training</span>';
        } else {
            for (const item of trainingQueue) {
                const typeData = UnitType[item.unitType.toUpperCase()];
                const displayName = typeData ? typeData.name : item.unitType;
                const progress = (item.progress / item.totalTime) * 100;
                const ticksRemaining = item.totalTime - item.progress;

                trainingHtml += `
                    <div class="training-item">
                        <span class="unit-chip-icon ${item.unitType}">${typeData ? typeData.strength : '?'}</span>
                        <div class="training-progress">
                            <div class="training-progress-bar">
                                <div class="training-progress-fill" style="width: ${progress}%"></div>
                            </div>
                            <span class="training-time">${item.count}x ${displayName} - ${ticksRemaining} ticks</span>
                        </div>
                    </div>
                `;
            }
        }

        this.elements.trainingQueueList.innerHTML = trainingHtml;
    }

    /**
     * Update battle info bar
     */
    updateBattleInfoBar(battle) {
        this.elements.entityInfoTitle.textContent = 'Battle in Progress';
        this.elements.battleInfoDisplay.classList.remove('hidden');

        const attacker = this.game.state.armies[battle.attackerId];
        const defender = this.game.state.armies[battle.defenderId] || battle._garrison;

        this.elements.battleStatusText.textContent = battle.locationType === 'siege' ? 'Siege' : 'Field Battle';
        this.elements.battleAttackerStrength.textContent = attacker ? attacker.totalStrength : '0';
        this.elements.battleDefenderStrength.textContent = defender ? defender.totalStrength : '0';
    }

    /**
     * Show settlement details
     */
    showSettlementDetails(settlement) {
        this.elements.selectionTitle.textContent = settlement.name;

        const isOwned = settlement.ownerId === this.game.playerId;

        // Garrison info
        const garrison = settlement.garrison || { units: {} };
        const garrisonUnits = garrison.units || {};
        let garrisonHtml = '';
        if (Object.keys(garrisonUnits).length > 0) {
            garrisonHtml = '<h4>Garrison</h4>';
            for (const [unitType, count] of Object.entries(garrisonUnits)) {
                if (count > 0) {
                    const typeData = UnitType[unitType.toUpperCase()];
                    garrisonHtml += `
                        <div class="info-row">
                            <span class="info-label">${typeData ? typeData.name : unitType}</span>
                            <span>${count}</span>
                        </div>
                    `;
                }
            }
        }

        // Training queue info
        let trainingHtml = '';
        if (settlement.trainingQueue && settlement.trainingQueue.length > 0) {
            trainingHtml = '<h4>Training</h4>';
            for (const item of settlement.trainingQueue) {
                const typeData = UnitType[item.unitType.toUpperCase()];
                const displayName = typeData ? typeData.name : item.unitType;
                const progress = Math.floor((item.progress / item.totalTime) * 100);
                const ticksRemaining = item.totalTime - item.progress;
                trainingHtml += `
                    <div class="info-row">
                        <span class="info-label">${item.count}x ${displayName}</span>
                        <span>${progress}% (${ticksRemaining} ticks)</span>
                    </div>
                `;
            }
        }

        this.elements.selectionContent.innerHTML = `
            <div class="info-panel">
                <div class="info-row">
                    <span class="info-label">Population</span>
                    <span>${formatNumber(settlement.population)} / ${settlement.housingCapacity}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Treasury</span>
                    <span>${formatNumber(settlement.treasury)} gold</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Tax Rate</span>
                    <span>${formatPercent(settlement.taxRate)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Contentment</span>
                    <span class="${getContentmentClass(settlement.contentment)}">${Math.floor(settlement.contentment)}%</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Unrest</span>
                    <span>${Math.floor(settlement.unrest)} / ${settlement.revoltThreshold}</span>
                </div>
                ${garrisonHtml}
                ${trainingHtml}
                <h4>Resources</h4>
                <div class="info-row">
                    <span class="info-label">Food</span>
                    <span>${formatNumber(settlement.resources.food || 0)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Wood</span>
                    <span>${formatNumber(settlement.resources.wood || 0)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Stone</span>
                    <span>${formatNumber(settlement.resources.stone || 0)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Iron</span>
                    <span>${formatNumber(settlement.resources.iron || 0)}</span>
                </div>
            </div>
        `;

        if (isOwned) {
            const hasBarracks = settlement.buildings.some(b => b.type === 'barracks' && b.isComplete);
            const hasGarrison = Object.keys(garrisonUnits).length > 0;
            this.elements.selectionActions.innerHTML = `
                <button class="secondary-btn" onclick="ui.showTaxModal('${settlement.id}')">Set Tax</button>
                ${hasBarracks ? `<button class="secondary-btn" onclick="ui.showCreateArmyModal('${settlement.id}')">Train Units</button>` : ''}
                ${hasGarrison ? `<button class="secondary-btn" onclick="ui.showDeployGarrisonModal('${settlement.id}')">Deploy Army</button>` : ''}
                <button class="secondary-btn" onclick="ui.showBuildModal('${settlement.id}')">Build</button>
            `;
        } else {
            this.elements.selectionActions.innerHTML = '';
        }
    }

    /**
     * Show army details
     */
    showArmyDetails(army) {
        this.elements.selectionTitle.textContent = army.name;

        const isOwned = army.ownerId === this.game.playerId;

        let unitsHtml = '';
        for (const [unitType, count] of Object.entries(army.units)) {
            const typeData = UnitType[unitType.toUpperCase()];
            unitsHtml += `
                <div class="info-row">
                    <span class="info-label">${typeData ? typeData.name : unitType}</span>
                    <span>${count}</span>
                </div>
            `;
        }

        this.elements.selectionContent.innerHTML = `
            <div class="info-panel">
                <div class="info-row">
                    <span class="info-label">Total Units</span>
                    <span>${army.totalUnits}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Strength</span>
                    <span>${army.totalStrength}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Morale</span>
                    <span class="${getMoraleClass(army.morale)}">${Math.floor(army.morale)}%</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Supplies</span>
                    <span>${Math.floor(army.supplies)} days</span>
                </div>
                <h4>Units</h4>
                ${unitsHtml}
            </div>
        `;

        if (isOwned) {
            this.elements.selectionActions.innerHTML = `
                <p class="text-muted">Right-click on map to move</p>
            `;
        } else {
            this.elements.selectionActions.innerHTML = '';
        }
    }

    /**
     * Show resource details
     */
    showResourceDetails(resource) {
        const typeData = resource.typeData;
        this.elements.selectionTitle.textContent = typeData.name;

        const percentRemaining = (resource.amountRemaining / resource.totalAmount) * 100;

        this.elements.selectionContent.innerHTML = `
            <div class="info-panel">
                <div class="info-row">
                    <span class="info-label">Type</span>
                    <span>${typeData.name}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Produces</span>
                    <span>${typeData.produces}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Remaining</span>
                    <span>${formatNumber(resource.amountRemaining)} (${Math.floor(percentRemaining)}%)</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Extraction Rate</span>
                    <span>${resource.extractionRate}/tick</span>
                </div>
                ${resource.assignedBuilding ? '<div class="info-row"><span class="info-label">Status</span><span class="text-success">Being harvested</span></div>' : ''}
            </div>
        `;

        this.elements.selectionActions.innerHTML = '';
    }

    /**
     * Show building details
     */
    showBuildingDetails(building) {
        const typeData = building.typeData;
        this.elements.selectionTitle.textContent = typeData.name;

        this.elements.selectionContent.innerHTML = `
            <div class="info-panel">
                <div class="info-row">
                    <span class="info-label">Type</span>
                    <span>${typeData.name}</span>
                </div>
                ${!building.isComplete ? `
                    <div class="info-row">
                        <span class="info-label">Construction</span>
                        <span>${Math.floor(building.constructionProgress * 100)}%</span>
                    </div>
                ` : ''}
            </div>
        `;

        this.elements.selectionActions.innerHTML = '';
    }

    /**
     * Update resource display in bottom bar
     */
    updateResources(player) {
        this.elements.resFoodEl.textContent = formatNumber(player.totalResources.food || 0);
        this.elements.resWoodEl.textContent = formatNumber(player.totalResources.wood || 0);
        this.elements.resStoneEl.textContent = formatNumber(player.totalResources.stone || 0);
        this.elements.resIronEl.textContent = formatNumber(player.totalResources.iron || 0);
        this.elements.resResearchEl.textContent = formatNumber(player.researchPerTick || 0);
    }

    /**
     * Update tick counter
     */
    updateTick(tick) {
        this.elements.tickCounter.textContent = formatNumber(tick);
    }

    /**
     * Update play/pause button
     */
    updatePlayPauseButton(isPaused) {
        this.elements.playPauseBtn.innerHTML = isPaused ? '&#9654;' : '&#10074;&#10074;';
        this.elements.playPauseBtn.classList.toggle('play', isPaused);
        this.elements.playPauseBtn.classList.toggle('pause', !isPaused);
    }

    /**
     * Update speed display
     */
    updateSpeedDisplay(speed) {
        this.elements.speedDisplay.textContent = `${speed}x`;
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Create notifications container if it doesn't exist
        let container = document.getElementById('notifications');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notifications';
            document.body.appendChild(container);
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        container.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Show modal
     */
    showModal(title, content, actions = []) {
        this.elements.modalTitle.textContent = title;
        this.elements.modalContent.innerHTML = content;

        this.elements.modalActions.innerHTML = actions.map(action =>
            `<button class="${action.primary ? 'primary-btn' : 'secondary-btn'}" onclick="${action.onclick}">${action.label}</button>`
        ).join('');

        this.elements.modalOverlay.classList.remove('hidden');
    }

    /**
     * Close modal
     */
    closeModal() {
        this.elements.modalOverlay.classList.add('hidden');
    }

    /**
     * Show create army modal (now uses training system)
     */
    showCreateArmyModal(settlementId) {
        const settlement = this.game.state.settlements[settlementId];
        const player = this.game.state.players[this.game.playerId];

        // Get all unit types with availability status
        const unitEntries = Object.entries(UnitType).map(([id, type]) => {
            const available = !type.requiredTech || player.researchedTechs.has(type.requiredTech);
            return { id, type, available };
        });

        const popPerUnit = GAME_CONSTANTS.POPULATION_PER_UNIT;

        const content = `
            <p>Train units at ${settlement.name}</p>
            <p class="text-muted">Units will be added to the garrison when training completes.</p>
            <div class="unit-selector">
                ${unitEntries.map(({ id, type, available }) => `
                    <div class="unit-item ${!available ? 'locked' : ''}">
                        <div class="unit-info">
                            <span>${type.name}</span>
                            <span class="text-muted">(${type.cost}g + ${popPerUnit} pop)</span>
                            ${!available ? `<span class="text-warning" style="font-size: 10px;">Requires: ${type.requiredTech}</span>` : ''}
                        </div>
                        <input type="number" class="unit-count-input" data-unit="${type.id}" min="0" value="0" max="100" ${!available ? 'disabled' : ''}>
                    </div>
                `).join('')}
            </div>
            <div class="modal-stats">
                <p>Available gold: <strong>${formatNumber(settlement.treasury)}</strong></p>
                <p>Available population: <strong>${formatNumber(settlement.population)}</strong></p>
            </div>
        `;

        this.showModal('Train Units', content, [
            { label: 'Cancel', onclick: 'ui.closeModal()' },
            { label: 'Train', primary: true, onclick: `ui.trainUnits('${settlementId}')` }
        ]);
    }

    /**
     * Train units from modal
     */
    trainUnits(settlementId) {
        const inputs = document.querySelectorAll('.unit-count-input:not(:disabled)');
        let anyQueued = false;

        inputs.forEach(input => {
            const count = parseInt(input.value) || 0;
            if (count > 0) {
                this.game.trainUnits(settlementId, input.dataset.unit, count);
                anyQueued = true;
            }
        });

        if (!anyQueued) {
            this.showNotification('Select at least one unit', 'warning');
            return;
        }

        this.closeModal();
        this.showNotification('Training started!', 'success');
    }

    /**
     * Create army from garrison (deploy garrison units)
     */
    createArmy(settlementId) {
        const inputs = document.querySelectorAll('.unit-count-input');
        const units = {};

        inputs.forEach(input => {
            const count = parseInt(input.value) || 0;
            if (count > 0) {
                units[input.dataset.unit] = count;
            }
        });

        if (Object.keys(units).length === 0) {
            this.showNotification('Select at least one unit', 'warning');
            return;
        }

        this.game.deployGarrison(settlementId, units);
        this.closeModal();
    }

    /**
     * Show deploy garrison modal - create army from garrisoned units
     */
    showDeployGarrisonModal(settlementId) {
        const settlement = this.game.state.settlements[settlementId];
        const garrison = settlement.garrison || { units: {} };

        if (Object.keys(garrison.units).length === 0) {
            this.showNotification('No units in garrison', 'warning');
            return;
        }

        const content = `
            <p>Deploy garrison units from ${settlement.name} as a new army</p>
            <div class="unit-selector">
                ${Object.entries(garrison.units).map(([unitType, count]) => {
                    const typeData = UnitType[unitType.toUpperCase()];
                    return count > 0 ? `
                        <div class="unit-item">
                            <div class="unit-info">
                                <span>${typeData ? typeData.name : unitType}</span>
                                <span class="text-muted">(${count} available)</span>
                            </div>
                            <input type="number" class="unit-count-input" data-unit="${unitType}" min="0" value="0" max="${count}">
                        </div>
                    ` : '';
                }).join('')}
            </div>
        `;

        this.showModal('Deploy Army', content, [
            { label: 'Cancel', onclick: 'ui.closeModal()' },
            { label: 'Deploy', primary: true, onclick: `ui.createArmy('${settlementId}')` }
        ]);
    }

    /**
     * Show tax rate modal
     */
    showTaxModal(settlementId) {
        const settlement = this.game.state.settlements[settlementId];

        const content = `
            <p>Set tax rate for ${settlement.name}</p>
            <div style="margin: 20px 0;">
                <input type="range" id="tax-slider" min="0" max="100" value="${settlement.taxRate * 100}" style="width: 100%;">
                <div style="display: flex; justify-content: space-between; margin-top: 8px;">
                    <span>0%</span>
                    <span id="tax-value">${Math.floor(settlement.taxRate * 100)}%</span>
                    <span>100%</span>
                </div>
            </div>
            <p class="text-muted">Higher taxes increase income but reduce contentment.</p>
        `;

        this.showModal('Set Tax Rate', content, [
            { label: 'Cancel', onclick: 'ui.closeModal()' },
            { label: 'Apply', primary: true, onclick: `ui.setTaxRate('${settlementId}')` }
        ]);

        // Add slider listener
        setTimeout(() => {
            const slider = document.getElementById('tax-slider');
            const valueDisplay = document.getElementById('tax-value');
            slider.addEventListener('input', () => {
                valueDisplay.textContent = `${slider.value}%`;
            });
        }, 0);
    }

    /**
     * Set tax rate from modal
     */
    setTaxRate(settlementId) {
        const slider = document.getElementById('tax-slider');
        const rate = parseInt(slider.value) / 100;
        this.game.setTaxRate(settlementId, rate);
        this.closeModal();
    }

    /**
     * Show build modal for settlement
     */
    showBuildModal(settlementId) {
        const settlement = this.game.state.settlements[settlementId];
        const player = this.game.state.players[this.game.playerId];

        const buildings = Object.entries(BuildingType).filter(([id, type]) => {
            if (type.requiredTech && !player.researchedTechs.has(type.requiredTech)) {
                return false;
            }
            // Only show non-extraction buildings in settlement build modal
            return !type.targetResource;
        });

        const content = `
            <p>Build in ${settlement.name}</p>
            <div class="entity-list">
                ${buildings.map(([id, type]) => {
                    const costStr = Object.entries(type.cost).map(([res, amt]) => `${amt} ${res}`).join(', ');
                    return `
                        <div class="entity-card" onclick="ui.buildInSettlement('${settlementId}', '${type.id}')">
                            <div class="entity-name">${type.name}</div>
                            <div class="text-muted">Cost: ${costStr}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        this.showModal('Build', content, [
            { label: 'Close', onclick: 'ui.closeModal()' }
        ]);
    }

    /**
     * Build in settlement from modal
     */
    buildInSettlement(settlementId, buildingType) {
        this.game.buildInSettlement(settlementId, buildingType);
        this.closeModal();
    }

    /**
     * Event handlers
     */
    onTickUpdated(detail) {
        this.updateTick(detail.tick);
        const player = this.game.state.players[this.game.playerId];
        if (player) {
            this.updateResources(player);
        }
        this.refreshCurrentTab();
    }

    onEntitySelected(detail) {
        this.showEntityDetails(detail.entity, detail.type);
    }

    onBattleStarted(detail) {
        this.showNotification(`Battle started at (${Math.floor(detail.battle.location.x)}, ${Math.floor(detail.battle.location.y)})!`, 'warning');
    }

    onBattleEnded(detail) {
        const result = detail.result;
        const winner = result.status === 'attacker_wins' ? 'Attacker' : 'Defender';
        this.showNotification(`Battle ended! ${winner} wins!`, result.status === 'attacker_wins' ? 'success' : 'error');
    }

    onResearchComplete(detail) {
        this.showNotification(`Research complete: ${detail.techName}!`, 'success');
    }

    onGameOver(detail) {
        this.elements.gameOverTitle.textContent = detail.victory ? 'Victory!' : 'Defeat';
        this.elements.gameOverTitle.className = detail.victory ? 'victory' : 'defeat';
        this.elements.gameOverMessage.textContent = detail.message;
        this.elements.gameOverScreen.classList.remove('hidden');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UIManager };
}
