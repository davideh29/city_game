# Crossroads - Game Design Document

> **Purpose**: This document serves as the complete specification for implementing Crossroads. It is intended to be used by Claude Code (browser-based) to build the MVP, with iterative visual testing via automated screenshots.

---

## Table of Contents

1. [Vision & Overview](#vision--overview)
2. [Core Gameplay](#core-gameplay)
3. [Game Systems](#game-systems)
   - [Map & Positioning](#map--positioning)
   - [Settlements & Governance](#settlements--governance)
   - [Natural Resources](#natural-resources)
   - [Roads & Infrastructure](#roads--infrastructure)
   - [Research System](#research-system)
   - [Armies & Combat](#armies--combat)
   - [Rivers & Dams](#rivers--dams)
4. [User Interface](#user-interface)
5. [Visual Design](#visual-design)
6. [Technical Architecture](#technical-architecture)
7. [Data Models](#data-models)
8. [Development Strategy](#development-strategy)
9. [MVP Scope](#mvp-scope)
10. [Implementation Phases](#implementation-phases)
11. [File Structure](#file-structure)

---

## Vision & Overview

### Elevator Pitch

**Crossroads** is a strategic city-building game where players develop settlements, build road networks, manage economies, and command armies across a continuous 2D map. Starting from rural villages, players research technologies to unlock advanced infrastructure, growing their civilization from primitive settlements to futuristic metropolises.

### Core Identity

- **Genre**: 4X Strategy / City Builder / RTS hybrid
- **Perspective**: Top-down 2D with pan and zoom
- **Players**: Single-player vs AI or multiplayer (2-8 players)
- **Platform**: Web-based (browser)
- **Session Length**: 30 minutes to several hours

### What Makes It Unique

1. **Continuous coordinate system** - No grid tiles; everything exists at floating-point positions
2. **User-placed infrastructure** - Roads follow paths the player draws, not predetermined routes
3. **Population governance simulation** - Citizens have contentment, can revolt if mismanaged
4. **Continuous technological progression** - No discrete "ages"; buildings and visuals evolve incrementally based on research
5. **Tick-based battles** - Combat unfolds over multiple game ticks, allowing for reinforcements and tactical decisions

---

## Core Gameplay

### Game Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                     CORE GAME LOOP                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   1. EXPAND      - Found new settlements, claim resources       │
│         ↓                                                       │
│   2. CONNECT     - Build roads between settlements/resources    │
│         ↓                                                       │
│   3. DEVELOP     - Construct buildings, grow population         │
│         ↓                                                       │
│   4. RESEARCH    - Unlock new technologies and capabilities     │
│         ↓                                                       │
│   5. DEFEND/ATTACK - Manage armies, protect or conquer          │
│         ↓                                                       │
│   (repeat)                                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Tick System

The game advances in discrete **ticks**. Each tick represents approximately 1 game-hour.

**Per-tick processing order:**
1. Resource extraction and production
2. Population consumption (food)
3. Population growth/decline
4. Contentment and unrest calculation
5. Treasury updates (taxes, expenses)
6. Unit movement along paths
7. Battle resolution (if any)
8. Construction progress
9. Research progress

**Tick speed**: Configurable (e.g., 1 tick per 2 real seconds), pausable in single-player.

### Win Conditions

| Condition | Description |
|-----------|-------------|
| **Domination** | Control 75% of all settlements |
| **Economic** | Accumulate 100,000 gold in treasury |
| **Scientific** | Complete the final technology in the research tree |
| **Elimination** | Be the last player remaining |

---

## Game Systems

### Map & Positioning

#### Coordinate System

- All entities exist at `(x: float, y: float)` positions
- Map dimensions: 10,000 × 10,000 units (configurable)
- Camera supports pan (drag) and zoom (scroll)
- No grid snapping; positions are continuous

#### Entity Positioning

| Entity Type | Position | Area | Notes |
|-------------|----------|------|-------|
| Settlement | Point | Radius (scales with pop) | Clickable, grows visually |
| Natural Resource | Point | Circle or square | Extraction radius |
| Building | Point | Small footprint | Near or inside settlements |
| Road/Railway | Polyline | Width for rendering | User-defined waypoints |
| River | Polyline | Width | Pre-generated, blocks movement |
| Dam | Point | Spans river | Built on rivers |
| Army | Point | None | Moves along roads |
| Construction Crew | Point | None | Builds roads/structures |

---

### Settlements & Governance

Settlements are the core economic and population centers.

#### Settlement Properties

```
Settlement:
├── Identity
│   ├── id: string
│   ├── name: string
│   ├── position: {x, y}
│   └── owner_id: string
│
├── Population
│   ├── population: int            # Total people
│   ├── families: int              # Household units
│   ├── housing_capacity: int      # Max population from homes
│   └── growth_rate: float         # Modified by food, happiness
│
├── Economy
│   ├── treasury: float            # Local gold reserves
│   ├── tax_rate: float            # 0.0 to 1.0 (0% to 100%)
│   ├── public_investment: float   # % of income to infrastructure
│   └── resources: {type: amount}  # Local stockpiles
│
├── Governance
│   ├── contentment: float         # 0-100 scale
│   ├── unrest: float              # Accumulates when unhappy
│   └── revolt_threshold: float    # Unrest level triggering revolt
│
├── Defense
│   ├── walls_level: int           # 0 = none, higher = stronger
│   └── garrison: Army | null      # Stationed defensive force
│
└── Infrastructure
    └── buildings: Building[]       # Constructed structures
```

#### Population Dynamics (Per Tick)

```python
def process_population_tick(settlement):
    # 1. Food consumption
    food_needed = settlement.population * FOOD_PER_PERSON_PER_TICK
    food_available = settlement.resources.get('food', 0)
    
    if food_available >= food_needed:
        settlement.resources['food'] -= food_needed
        food_satisfied = True
    else:
        settlement.resources['food'] = 0
        food_satisfied = False
    
    # 2. Population growth/decline
    if food_satisfied and settlement.population < settlement.housing_capacity:
        settlement.population += int(settlement.population * BASE_GROWTH_RATE)
    elif not food_satisfied:
        settlement.population -= int(settlement.population * STARVATION_RATE)
        settlement.contentment -= 5
    
    # 3. Housing pressure
    if settlement.population > settlement.housing_capacity:
        settlement.contentment -= 2
    
    # 4. Tax collection
    income = settlement.population * INCOME_PER_PERSON * settlement.tax_rate
    settlement.treasury += income
    
    # 5. Contentment adjustment
    settlement.contentment += calculate_contentment_delta(settlement)
    settlement.contentment = clamp(settlement.contentment, 0, 100)
    
    # 6. Unrest accumulation
    if settlement.contentment < 30:
        settlement.unrest += (30 - settlement.contentment) / 10
    else:
        settlement.unrest = max(0, settlement.unrest - 1)
    
    # 7. Revolt check
    if settlement.unrest >= settlement.revolt_threshold:
        trigger_revolt(settlement)
```

#### Contentment Factors

| Factor | Effect |
|--------|--------|
| Tax rate > 30% | -1 per 10% over threshold |
| Tax rate < 20% | +1 per 10% under |
| Food shortage | -5 per tick |
| Housing shortage | -2 per tick |
| Public investment > 20% | +2 per tick |
| Under siege | -3 per tick |
| Recent battle at walls | -10 immediately |
| Garrison present | +1 (security) |
| No road to capital | -2 per tick |

#### Revolt Mechanics

When `unrest >= revolt_threshold`:
1. **Minor Revolt**: Production halts for 10 ticks, garrison takes 10% casualties
2. **Major Revolt**: Settlement becomes neutral (no owner) for 20 ticks
3. **Defection**: If enemy army nearby, settlement may join enemy

---

### Natural Resources

Resources are points on the map with an extraction area.

#### Resource Definition

```
NaturalResource:
├── id: string
├── resource_type: string        # "forest", "iron", "stone", etc.
├── position: {x, y}
├── radius: float                # Visual/extraction area
├── total_amount: float          # Finite supply (or Infinity)
├── amount_remaining: float
├── extraction_rate: float       # Max units per tick
├── regeneration_rate: float     # Units restored per tick (forests)
└── required_tech: string | null # Research needed to exploit
```

#### Resource Types

| Type | Finite? | Regenerates? | Required Building | Used For |
|------|---------|--------------|-------------------|----------|
| Forest | No | Yes (slow) | Lumber Camp | Wood (construction) |
| Stone Deposit | Yes | No | Quarry | Stone (roads, buildings) |
| Iron Ore | Yes | No | Mine | Iron → Steel |
| Coal Seam | Yes | No | Mine | Energy, Steel production |
| Fertile Land | No | N/A | Farm | Food production |
| River | N/A | N/A | Dam | Power generation |
| Oil Field | Yes | No | Oil Well | Late-game energy |
| Rare Earth | Yes | No | Advanced Mine | Late-game tech |

#### Resource Extraction

To extract from a resource:
1. Build the required building adjacent to (within radius of) the resource
2. Assign workers (from nearby settlement)
3. Each tick, `min(extraction_rate, amount_remaining)` is harvested
4. Resources are stored in the nearest connected settlement

---

### Roads & Infrastructure

Roads connect settlements, resources, and strategic points. Players define exact paths.

#### Road Properties

```
Road:
├── id: string
├── waypoints: [{x, y}, ...]     # User-defined path points
├── road_type: RoadType
├── owner_id: string
├── construction_progress: float # 0.0 to 1.0
├── condition: float             # 1.0 = perfect, degrades over time
└── assigned_crew: Crew | null   # If under construction
```

#### Road Types

| Type | Speed Multiplier | Cost per Unit Length | Required Tech |
|------|------------------|---------------------|---------------|
| Dirt Path | 1.0x | 1 labor | None |
| Stone Road | 1.8x | 5 stone, 2 labor | Masonry |
| Paved Road | 2.5x | 10 materials, 3 labor | Engineering |
| Railway | 4.0x | 20 steel, 10 labor | Steam Power |
| Maglev | 6.0x | 50 composites, 20 labor | Magnetic Levitation |

#### Road Building Flow

1. Player selects "Build Road" tool
2. Player clicks starting point (snaps to entities if close)
3. Player clicks waypoints to define path
4. Player clicks endpoint (snaps to entities if close)
5. System calculates total length and cost
6. System shows preview with cost breakdown
7. Player confirms
8. Construction crew is dispatched (if available)
9. Crew travels to start point
10. Construction progresses each tick based on crew size
11. Road becomes usable when `construction_progress >= 1.0`

#### Other Infrastructure

| Structure | Function | Required Tech |
|-----------|----------|---------------|
| Bridge | Cross rivers without dam | Engineering |
| Tunnel | Pass through mountains | Advanced Engineering |
| Dam | Block river, generate power | Hydraulics |
| Walls | Defend settlement | Fortification |

---

### Research System

Research unlocks new buildings, units, roads, and capabilities. **There are no discrete epochs**—progression is continuous.

#### Research Mechanics

```
Technology:
├── id: string
├── name: string
├── description: string
├── cost: int                    # Research points needed
├── prerequisites: [tech_id, ...]
├── unlocks_buildings: [building_id, ...]
├── unlocks_units: [unit_id, ...]
├── unlocks_roads: [road_type, ...]
└── unlocks_abilities: [ability_id, ...]
```

#### Research Point Generation

- Base: Each settlement generates research points based on population
- Bonus: Libraries, universities, research labs multiply output
- Focus: Player can allocate % of economy to research vs. production

#### Technology Tree (Simplified)

```
                           [Start]
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         Agriculture      Construction      Military
              │               │               │
      ┌───────┴───────┐       │       ┌───────┴───────┐
      ▼               ▼       ▼       ▼               ▼
  Irrigation    Animal    Masonry   Bronze        Tactics
      │        Husbandry     │      Working          │
      ▼               │      ▼          │           ▼
 Crop Rotation        │  Architecture   ▼      Combined Arms
      │               │      │      Iron Working      │
      ▼               ▼      ▼          │            ▼
  Fertilizers    Cavalry  Engineering   ▼     Mechanized War
      │               │      │       Steel            │
      ▼               │      ▼          │            ▼
  Genetic Eng.        │  Railroads      ▼      Autonomous
                      │      │      Composites   Warfare
                      │      ▼          │
                      │   Maglev        ▼
                      │             Nanotech
                      │
                      └──────────────────┘
```

#### Visual Progression

As technologies are researched, settlement visuals automatically update:

| Tech Level | Visual Indicators |
|------------|-------------------|
| Primitive | Huts, wooden fences, dirt paths |
| Agricultural | Farms visible, granaries |
| Construction | Stone buildings, organized layout |
| Industrial | Factories, smokestacks, railways |
| Modern | Paved roads, taller buildings, lights |
| Future | Glass/steel towers, clean energy, maglev |

This is **automatic and cosmetic**—players don't manually upgrade building appearances.

---

### Armies & Combat

#### Army Properties

```
Army:
├── id: string
├── name: string
├── owner_id: string
├── position: {x, y}
│
├── Units
│   └── units: {unit_type: count}  # e.g., {"infantry": 100, "cavalry": 20}
│
├── Status
│   ├── morale: float              # 0-100, affects combat
│   ├── supplies: float            # Days of food/ammo
│   └── condition: float           # Health/readiness
│
├── Movement
│   ├── destination: {x, y} | null
│   ├── path: [{x, y}, ...]        # Waypoints to destination
│   └── speed: float               # Modified by road type
│
└── Combat
    └── current_battle: Battle | null
```

#### Unit Types

| Unit | Strength | Speed | Cost | Required Tech |
|------|----------|-------|------|---------------|
| Militia | 1 | 1.0 | 10 gold | None |
| Infantry | 2 | 1.0 | 25 gold | Bronze Working |
| Cavalry | 3 | 2.0 | 50 gold | Animal Husbandry |
| Artillery | 5 | 0.5 | 100 gold | Engineering |
| Tanks | 10 | 1.5 | 200 gold | Mechanized War |
| Drones | 8 | 3.0 | 150 gold | Autonomous Warfare |

#### Movement Rules

- Armies can only move along roads (or very slowly off-road: 0.1x speed)
- Movement speed = base speed × road speed multiplier × army condition
- Armies can be intercepted while moving
- Reaching destination at a settlement allows garrisoning

#### Battle System

Battles occur when opposing armies meet. They unfold over multiple ticks.

```
Battle:
├── id: string
├── location: {x, y}
├── location_type: "field" | "road" | "siege"
│
├── Participants
│   ├── attacker: Army
│   ├── defender: Army
│   ├── attacker_starting_strength: float
│   └── defender_starting_strength: float
│
├── Modifiers
│   ├── terrain_modifier: float        # Affects defender
│   └── fortification_modifier: float  # Walls bonus
│
└── State
    ├── started_tick: int
    ├── status: "ongoing" | "attacker_wins" | "defender_wins"
    └── casualties: {attacker: int, defender: int}
```

#### Battle Resolution (Per Tick)

```python
def resolve_battle_tick(battle):
    # Calculate effective power
    att_power = battle.attacker.total_strength * (battle.attacker.morale / 100)
    def_power = battle.defender.total_strength * (battle.defender.morale / 100)
    def_power *= battle.terrain_modifier * battle.fortification_modifier
    
    # Calculate casualties (proportional to enemy power)
    att_casualties = int(def_power * CASUALTY_RATE / att_power)
    def_casualties = int(att_power * CASUALTY_RATE / def_power)
    
    # Apply casualties
    battle.attacker.apply_casualties(att_casualties)
    battle.defender.apply_casualties(def_casualties)
    
    # Morale impact
    att_morale_loss = (att_casualties / battle.attacker_starting_strength) * 30
    def_morale_loss = (def_casualties / battle.defender_starting_strength) * 30
    battle.attacker.morale -= att_morale_loss
    battle.defender.morale -= def_morale_loss
    
    # Check for rout
    if battle.attacker.morale < 20 or battle.attacker.total_strength < 10:
        return "defender_wins"
    if battle.defender.morale < 20 or battle.defender.total_strength < 10:
        return "attacker_wins"
    
    return "ongoing"
```

#### Battle Types & Modifiers

| Type | Trigger | Defender Modifier |
|------|---------|-------------------|
| Field Battle | Armies meet in open | 1.0x |
| Road Ambush | Attacker initiates on road | 0.8x (attacker advantage) |
| River Crossing | Battle at bridge/ford | 1.5x |
| Siege (no walls) | Attack on settlement | 1.2x |
| Siege (walls lvl 1) | Attack on walled settlement | 2.0x |
| Siege (walls lvl 2) | Attack on fortified settlement | 2.5x |
| Siege (walls lvl 3) | Attack on citadel | 3.0x |

---

### Rivers & Dams

#### Rivers

Rivers are pre-generated map features that affect gameplay.

```
River:
├── id: string
├── name: string
├── waypoints: [{x, y}, ...]  # Defines river path
├── width: float               # Visual width
└── flow_rate: float           # Affects dam power output
```

**River Effects:**
- Block army movement (must cross at bridge or ford)
- Settlements adjacent to rivers get +20% farm productivity
- Can be dammed for power generation

#### Dams

```
Dam:
├── id: string
├── position: {x, y}          # Must intersect a river
├── river_id: string
├── owner_id: string
├── power_output: float       # Based on river flow_rate
├── construction_progress: float
└── construction_cost: {stone: 100, steel: 50, labor: 200}
```

**Dam Benefits:**
- Generates power for settlements within connection radius
- Powered settlements get production bonuses
- Creates crossing point (units can cross at dam)

---

## User Interface

### Layout Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│  CROSSROADS                                              [⚙] [?] [≡]   │
├─────────────────────────────────────────────────────────┬───────────────┤
│                                                         │ [Settlements] │
│                                                         │ [Armies]      │
│                                                         │ [Research]    │
│                                                         │ [Economy]     │
│                                                         ├───────────────┤
│                    GAME MAP                             │               │
│                                                         │   SIDEBAR     │
│               (Canvas with pan/zoom)                    │   CONTENT     │
│                                                         │               │
│  - Settlements (circles)                                │  - List view  │
│  - Roads (lines)                                        │  - Details    │
│  - Resources (icons)                                    │  - Actions    │
│  - Armies (triangles)                                   │               │
│  - Rivers (blue curves)                                 │               │
│                                                         │               │
├─────────────────────────────────────────────────────────┴───────────────┤
│  [🌾 Food] [🪵 Wood] [🪨 Stone] [⚙️ Iron] [🔬 Research]    Tick │ [▶ Play] │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### Header Bar
- **Logo/Title**: "CROSSROADS" on the left
- **Action Buttons**: Settings (⚙), Help (?), Menu (≡) on the right

#### Main Map Area
- HTML5 Canvas element
- Handles: click, drag (pan), scroll (zoom)
- Renders all game entities
- Shows selection highlights
- Displays tooltips on hover

#### Sidebar (280px width)
Tabbed interface with four sections:

**Tab 1: Settlements**
```
┌─────────────────────────────┐
│ 🏘 SETTLEMENTS (4)          │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ 📍 Riverside            │ │
│ │ 👥 1,240  🏠 52 homes   │ │
│ │ 💰 2,450  📊 18% tax    │ │
│ │ [▓▓▓▓▓▓▓░░░] 72%       │ │ ← Contentment bar
│ │ [View] [Go To]          │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ 📍 Ironhold             │ │
│ │ ...                     │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

**Tab 2: Armies**
```
┌─────────────────────────────┐
│ ⚔ ARMIES (2)               │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ 🗡 1st Legion            │ │
│ │ Infantry: 450           │ │
│ │ Cavalry: 80             │ │
│ │ Status: En route        │ │
│ │ Morale: ████████░░ 82%  │ │
│ │ [Select] [Orders]       │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

**Tab 3: Research**
```
┌─────────────────────────────┐
│ 🔬 RESEARCH                 │
├─────────────────────────────┤
│ Currently Researching:      │
│ ┌─────────────────────────┐ │
│ │ Engineering             │ │
│ │ [████████░░░░] 67%     │ │
│ │ 340 / 500 points        │ │
│ └─────────────────────────┘ │
│                             │
│ Available:                  │
│ • Masonry (250 pts)         │
│ • Animal Husbandry (200)    │
│                             │
│ [View Full Tree]            │
└─────────────────────────────┘
```

**Tab 4: Economy**
```
┌─────────────────────────────┐
│ 📊 ECONOMY                  │
├─────────────────────────────┤
│ Treasury: 12,450 gold       │
│                             │
│ Income:     +245 /tick      │
│ Expenses:   -180 /tick      │
│ Net:        +65 /tick       │
│                             │
│ Breakdown:                  │
│ • Taxes:       +220         │
│ • Trade:       +25          │
│ • Military:    -120         │
│ • Construction: -40         │
│ • Research:    -20          │
└─────────────────────────────┘
```

#### Bottom Bar
- **Resource Display**: Global totals for Food, Wood, Stone, Iron, Research/tick
- **Tick Counter**: Current game tick
- **Play/Pause Button**: Control game progression
- **Speed Controls** (optional): 1x, 2x, 4x speed

### Interaction Patterns

| Action | Trigger | Result |
|--------|---------|--------|
| Select entity | Left-click | Highlight entity, show details in sidebar |
| Pan map | Left-drag on empty space | Move camera |
| Zoom | Scroll wheel | Zoom in/out centered on cursor |
| Context menu | Right-click on entity | Show available actions |
| Build road | Click "Build Road" → click points | Create road waypoints |
| Move army | Select army → right-click destination | Set army path |

---

## Visual Design

### Design Principles

1. **Simple & Scalable**: Vector-based or simple shapes that work at any zoom
2. **Color-Coded**: Player colors, resource types, road types are distinct
3. **Minimal**: Convey information without clutter
4. **Consistent**: Same visual language throughout

### Color Palette

```
Background:
  Map:        #16213e (dark blue-gray)
  Sidebar:    #0f0f23 (darker)
  Cards:      #1a1a2e (slightly lighter)

Player Colors:
  Player 1:   #4fc3f7 (cyan)
  Player 2:   #f44336 (red)
  Player 3:   #4caf50 (green)
  Player 4:   #ff9800 (orange)
  Neutral:    #9e9e9e (gray)

Resources:
  Forest:     #2e7d32 (green)
  Stone:      #8d6e63 (brown)
  Iron:       #78909c (blue-gray)
  Coal:       #424242 (dark gray)
  Fertile:    #558b2f (light green)

Infrastructure:
  Dirt Road:  #5d4037 (brown)
  Stone Road: #6d6d6d (gray)
  Paved Road: #212121 (dark)
  Railway:    #4a4a4a (with cross-ties)

UI:
  Accent:     #4fc3f7 (cyan)
  Text:       #eeeeee (light)
  Muted:      #888888 (gray)
  Success:    #4caf50 (green)
  Warning:    #ff9800 (orange)
  Danger:     #f44336 (red)
```

### Entity Rendering

#### Settlements

```
Size: radius = 20 + sqrt(population) * 0.4

Appearance:
┌────────────────────────────────────────┐
│  Small (pop < 200)    Medium (200-800) │
│        ◯                    ◉          │
│    (simple circle)    (circle + dots)  │
│                                        │
│  Large (800-2000)     Huge (2000+)     │
│        ◎                    ⬤          │
│  (circle + squares)  (filled + detail) │
└────────────────────────────────────────┘

- Outer glow in player color
- Border in player color (3px)
- Interior shows building density as small shapes
- Name label below
```

#### Roads

```
Dirt Path:    ············  (dotted brown line, 3px)
Stone Road:   ━━━━━━━━━━━━  (solid gray line, 5px)
Paved Road:   ═══════════   (double black line, 6px)
Railway:      ─┼─┼─┼─┼─┼─   (line with cross-ties, 4px)

Under Construction: dashed line in road color
```

#### Resources

```
Forest:       Cluster of green circles (trees)
Stone:        Brown/gray rectangle
Iron:         Gray hexagon
Coal:         Black diamond
Fertile:      Dotted green circle outline
```

#### Armies

```
Shape: Triangle pointing in movement direction
Size:  8 + sqrt(unit_count) * 0.3

Color: Player color (fill)
Border: White (2px)

Moving: Dashed circle around (animation pulse)
In Battle: Crossed swords icon overlay
```

#### Rivers

```
Style: Curved blue line with lighter inner stroke
Width: 18px outer, 10px inner
Color: #1e88e5 outer, #42a5f5 inner
```

### Zoom Levels

| Zoom Level | Visible Elements |
|------------|------------------|
| Far (0.25x) | Settlement circles, major roads, large armies |
| Normal (1x) | All entities, names, unit counts |
| Close (2x+) | Building details, resource amounts, tooltips |

---

## Technical Architecture

### Stack Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                      │
│                                                                         │
│   HTML5 Canvas (game rendering)                                         │
│   + Vanilla JavaScript / TypeScript                                     │
│   + CSS (UI styling)                                                    │
│                                                                         │
│   No heavy frameworks for MVP - keep it simple                          │
└─────────────────────────────────────────┬───────────────────────────────┘
                                          │
                                          │ WebSocket (real-time state)
                                          │ REST API (setup, auth)
                                          │
┌─────────────────────────────────────────▼───────────────────────────────┐
│                           BACKEND                                       │
│                                                                         │
│   Python 3.11+                                                          │
│   + FastAPI (API framework)                                             │
│   + WebSockets (real-time updates)                                      │
│                                                                         │
│   Game loop runs server-side                                            │
│   AI players execute server-side                                        │
└─────────────────────────────────────────┬───────────────────────────────┘
                                          │
┌─────────────────────────────────────────▼───────────────────────────────┐
│                          DATABASE                                       │
│                                                                         │
│   SQLite (development) → PostgreSQL (production)                        │
│   Redis (optional: real-time state cache, pub/sub)                      │
└─────────────────────────────────────────────────────────────────────────┘
```

### Why This Stack?

| Choice | Rationale |
|--------|-----------|
| **Vanilla JS** | No framework learning curve; direct canvas control; easy to migrate later |
| **HTML5 Canvas** | Perfect for 2D rendering; good performance; simple API |
| **Python/FastAPI** | Fast iteration; async support; auto-generated API docs |
| **SQLite → PostgreSQL** | Start simple, scale when needed |

### Communication Protocol

#### REST Endpoints (Setup)

```
POST   /api/games              Create new game
GET    /api/games/:id          Get game state
POST   /api/games/:id/join     Join a game
GET    /api/games/:id/players  List players
```

#### WebSocket Messages (Gameplay)

```javascript
// Client → Server
{action: "move_army", army_id: "...", destination: {x, y}}
{action: "build_road", waypoints: [...], road_type: "stone"}
{action: "set_tax_rate", settlement_id: "...", rate: 0.25}
{action: "start_research", tech_id: "engineering"}
{action: "create_army", settlement_id: "...", units: {...}}

// Server → Client
{event: "tick", tick: 1234, changes: [...]}
{event: "battle_started", battle: {...}}
{event: "battle_resolved", result: {...}}
{event: "research_complete", tech_id: "..."}
{event: "settlement_revolted", settlement_id: "..."}
```

---

## Data Models

### Python Backend Models

```python
from dataclasses import dataclass, field
from typing import Optional
from enum import Enum
import math


@dataclass
class Vec2:
    x: float
    y: float
    
    def distance_to(self, other: 'Vec2') -> float:
        return math.sqrt((self.x - other.x)**2 + (self.y - other.y)**2)


class RoadType(Enum):
    DIRT = ("dirt", 1.0)
    STONE = ("stone", 1.8)
    PAVED = ("paved", 2.5)
    RAIL = ("rail", 4.0)
    MAGLEV = ("maglev", 6.0)
    
    def __init__(self, id: str, speed: float):
        self.id = id
        self.speed = speed


@dataclass
class Settlement:
    id: str
    name: str
    position: Vec2
    owner_id: str
    
    population: int = 100
    families: int = 25
    housing_capacity: int = 120
    
    treasury: float = 100.0
    tax_rate: float = 0.2
    public_investment: float = 0.1
    resources: dict = field(default_factory=dict)
    
    contentment: float = 70.0
    unrest: float = 0.0
    
    walls_level: int = 0
    buildings: list = field(default_factory=list)
    
    @property
    def radius(self) -> float:
        return 20 + math.sqrt(self.population) * 0.4


@dataclass
class NaturalResource:
    id: str
    resource_type: str
    position: Vec2
    radius: float
    total_amount: float
    extraction_rate: float
    amount_remaining: float = None
    regeneration_rate: float = 0.0
    
    def __post_init__(self):
        if self.amount_remaining is None:
            self.amount_remaining = self.total_amount


@dataclass
class Road:
    id: str
    waypoints: list[Vec2]
    road_type: RoadType
    owner_id: str
    construction_progress: float = 1.0
    condition: float = 1.0
    
    @property
    def total_length(self) -> float:
        return sum(
            self.waypoints[i].distance_to(self.waypoints[i + 1])
            for i in range(len(self.waypoints) - 1)
        )
    
    @property
    def is_complete(self) -> bool:
        return self.construction_progress >= 1.0


@dataclass
class Army:
    id: str
    name: str
    owner_id: str
    position: Vec2
    
    units: dict = field(default_factory=lambda: {"infantry": 100})
    morale: float = 100.0
    supplies: float = 10.0
    
    destination: Optional[Vec2] = None
    path: list[Vec2] = field(default_factory=list)
    
    @property
    def total_strength(self) -> float:
        strength_values = {"militia": 1, "infantry": 2, "cavalry": 3, "artillery": 5}
        return sum(
            count * strength_values.get(unit_type, 1)
            for unit_type, count in self.units.items()
        )
    
    @property
    def total_units(self) -> int:
        return sum(self.units.values())


@dataclass
class Battle:
    id: str
    location: Vec2
    location_type: str  # "field", "road", "siege"
    attacker: Army
    defender: Army
    terrain_modifier: float = 1.0
    fortification_modifier: float = 1.0
    started_tick: int = 0
    status: str = "ongoing"


@dataclass
class River:
    id: str
    name: str
    waypoints: list[Vec2]
    width: float = 20.0
    flow_rate: float = 1.0


@dataclass
class Technology:
    id: str
    name: str
    cost: int
    prerequisites: list[str] = field(default_factory=list)
    unlocks_buildings: list[str] = field(default_factory=list)
    unlocks_units: list[str] = field(default_factory=list)
    unlocks_roads: list[str] = field(default_factory=list)


@dataclass
class GameState:
    id: str
    tick: int = 0
    settlements: dict[str, Settlement] = field(default_factory=dict)
    resources: dict[str, NaturalResource] = field(default_factory=dict)
    roads: dict[str, Road] = field(default_factory=dict)
    armies: dict[str, Army] = field(default_factory=dict)
    rivers: dict[str, River] = field(default_factory=dict)
    battles: dict[str, Battle] = field(default_factory=dict)
    players: dict[str, 'Player'] = field(default_factory=dict)


@dataclass
class Player:
    id: str
    name: str
    color: str
    is_ai: bool = False
    researched_techs: set = field(default_factory=set)
    current_research: Optional[str] = None
    research_progress: float = 0.0
```

### JavaScript Frontend Models

```javascript
// models.js

class Vec2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    
    distanceTo(other) {
        return Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
    }
    
    add(other) {
        return new Vec2(this.x + other.x, this.y + other.y);
    }
    
    scale(factor) {
        return new Vec2(this.x * factor, this.y * factor);
    }
}

const RoadType = {
    DIRT: { id: 'dirt', speed: 1.0, color: '#5d4037', width: 3 },
    STONE: { id: 'stone', speed: 1.8, color: '#6d6d6d', width: 5 },
    PAVED: { id: 'paved', speed: 2.5, color: '#212121', width: 6 },
    RAIL: { id: 'rail', speed: 4.0, color: '#4a4a4a', width: 4 },
};

class Settlement {
    constructor(data) {
        Object.assign(this, data);
        this.position = new Vec2(data.position.x, data.position.y);
    }
    
    get radius() {
        return 20 + Math.sqrt(this.population) * 0.4;
    }
}

class Army {
    constructor(data) {
        Object.assign(this, data);
        this.position = new Vec2(data.position.x, data.position.y);
    }
    
    get totalUnits() {
        return Object.values(this.units).reduce((a, b) => a + b, 0);
    }
}

// ... similar classes for other entities
```

---

## Development Strategy

### Screenshot-Based Visual Testing

Since development happens in Claude Code (browser), we use **Playwright** to render HTML and capture screenshots. This allows:

1. Building the real frontend code (HTML/CSS/JS)
2. Testing visuals without running locally
3. Iterating on design in conversation
4. Reviewing screenshots as part of PRs

#### Screenshot Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SCREENSHOT-BASED DEVELOPMENT                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   1. Claude writes/modifies HTML/CSS/JS                                 │
│                    ↓                                                    │
│   2. Claude runs screenshot script with Playwright                      │
│                    ↓                                                    │
│   3. Screenshot saved to repository (e.g., /screenshots/map_v1.png)     │
│                    ↓                                                    │
│   4. User reviews screenshots in PR                                     │
│                    ↓                                                    │
│   5. Iterate until visuals are correct                                  │
│                    ↓                                                    │
│   6. Merge code → test interactively locally if needed                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Screenshot Script

```python
# scripts/screenshot.py

from playwright.sync_api import sync_playwright
import os
import sys

def screenshot_html(
    html_path: str,
    output_path: str,
    width: int = 1200,
    height: int = 800
):
    """Render an HTML file and capture a screenshot."""
    abs_path = os.path.abspath(html_path)
    file_url = f"file://{abs_path}"
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': width, 'height': height})
        page.goto(file_url)
        page.wait_for_timeout(500)  # Wait for JS to execute
        page.screenshot(path=output_path, full_page=False)
        browser.close()
    
    print(f"Screenshot saved: {output_path}")

if __name__ == "__main__":
    html_file = sys.argv[1] if len(sys.argv) > 1 else "index.html"
    output_file = sys.argv[2] if len(sys.argv) > 2 else "screenshot.png"
    screenshot_html(html_file, output_file)
```

#### Screenshot Naming Convention

```
/screenshots/
├── map_empty_v1.png           # Empty map state
├── map_settlements_v1.png     # Map with settlements
├── map_roads_v1.png           # Map with roads
├── map_full_v1.png            # Full game state
├── sidebar_settlements_v1.png # Sidebar tab
├── sidebar_armies_v1.png
├── battle_in_progress_v1.png
└── ...
```

#### PR Review Process

1. Claude creates/modifies code
2. Claude generates screenshots
3. Claude commits code + screenshots to branch
4. PR shows visual diff of screenshots
5. User reviews and requests changes if needed
6. Iterate until approved

---

## MVP Scope

### What's IN the MVP

| Feature | Details |
|---------|---------|
| **Map Rendering** | Canvas with pan/zoom, render all entity types |
| **Settlements** | Create, view details, population simulation |
| **Roads** | Build between points, different types, construction progress |
| **Resources** | Forest, stone, iron, fertile land; extraction |
| **Armies** | Create, move along roads, simple combat |
| **Battles** | Tick-based resolution, field and siege types |
| **Research** | Basic tech tree (10-15 technologies) |
| **Sidebar UI** | Settlements and Armies tabs |
| **Single-player** | Play against one AI opponent |
| **Tick System** | Play/pause, tick processing |

### What's OUT of MVP (Future)

| Feature | Reason |
|---------|--------|
| Multiplayer | Requires server infrastructure |
| Full tech tree | Start with basics, expand later |
| Rivers & Dams | Add after core loop works |
| Complex AI | Start with simple aggression |
| Sound/Music | Polish feature |
| Saving/Loading | Add after core gameplay |
| Multiple AI opponents | Start with 1v1 |
| Economy tab | Settlements tab covers basics |
| Research tab | Can show in modal for MVP |
| Animations | Static rendering first |

### MVP Success Criteria

The MVP is complete when a player can:

1. ✅ Start a new game with a settlement
2. ✅ Pan and zoom the map
3. ✅ See settlement details in sidebar
4. ✅ Build a road to a resource
5. ✅ Observe resource extraction happening
6. ✅ See population grow with food supply
7. ✅ Research a technology
8. ✅ Create an army
9. ✅ Move army along roads
10. ✅ Fight a battle against AI army
11. ✅ Win or lose the game

---

## Implementation Phases

### Phase 1: Project Setup & Map Rendering (Week 1)

**Goal**: Render a static map with basic entities

**Tasks**:
- [ ] Initialize project structure (see File Structure)
- [ ] Create HTML shell with canvas and sidebar layout
- [ ] Implement camera (pan with drag, zoom with scroll)
- [ ] Render settlements as circles
- [ ] Render resources with icons
- [ ] Render roads as lines
- [ ] Basic selection (click to select entity)
- [ ] Generate screenshots to verify visuals

**Deliverable**: Screenshot showing map with 3-4 settlements, resources, and roads

---

### Phase 2: Sidebar & Entity Details (Week 1-2)

**Goal**: Display and interact with entities via sidebar

**Tasks**:
- [ ] Implement tab switching (Settlements / Armies)
- [ ] Create settlement cards with stats
- [ ] "Go To" button centers map on settlement
- [ ] Click settlement in sidebar highlights on map
- [ ] Click settlement on map shows details in sidebar
- [ ] Create army cards (even if no armies yet)

**Deliverable**: Screenshot showing sidebar with settlement details

---

### Phase 3: Game State & Tick System (Week 2)

**Goal**: Implement game loop and basic simulation

**Tasks**:
- [ ] Create GameState class with all entities
- [ ] Implement tick processing function
- [ ] Add Play/Pause button
- [ ] Process population growth per tick
- [ ] Process resource consumption (food)
- [ ] Update contentment based on factors
- [ ] Display tick counter in UI
- [ ] Show resource totals in bottom bar

**Deliverable**: Game runs, population grows/shrinks based on food

---

### Phase 4: Road Building (Week 2-3)

**Goal**: Player can build roads interactively

**Tasks**:
- [ ] Add "Build Road" button/tool
- [ ] Click to place waypoints
- [ ] Show preview line while building
- [ ] Calculate cost based on length and type
- [ ] Confirm/cancel road construction
- [ ] Construction progress over ticks
- [ ] Road type selector (dirt, stone, paved)

**Deliverable**: Player can draw and build a road between two settlements

---

### Phase 5: Resource Extraction (Week 3)

**Goal**: Resources can be harvested with buildings

**Tasks**:
- [ ] Define building types (lumber camp, mine, quarry, farm)
- [ ] Place building near resource (click resource → build)
- [ ] Building construction takes time
- [ ] Completed buildings extract resources per tick
- [ ] Resources flow to nearest connected settlement
- [ ] Show extraction visually (optional: small animation)

**Deliverable**: Player builds lumber camp, wood accumulates in settlement

---

### Phase 6: Research System (Week 3-4)

**Goal**: Player can research technologies

**Tasks**:
- [ ] Define basic tech tree (10-15 techs)
- [ ] Research modal/panel showing available techs
- [ ] Click to start researching
- [ ] Research progress per tick
- [ ] Unlocks buildings/units when complete
- [ ] Show research progress in UI

**Deliverable**: Player researches "Masonry", unlocks stone roads

---

### Phase 7: Armies & Movement (Week 4)

**Goal**: Create and move armies

**Tasks**:
- [ ] "Create Army" button in settlement
- [ ] Select units to add to army
- [ ] Army appears on map at settlement
- [ ] Click army to select
- [ ] Right-click to set destination
- [ ] Calculate path along roads
- [ ] Army moves along path each tick
- [ ] Show movement in Armies tab

**Deliverable**: Player creates army, moves it to another settlement

---

### Phase 8: Combat System (Week 4-5)

**Goal**: Armies can fight battles

**Tasks**:
- [ ] Detect when armies meet (same position)
- [ ] Create Battle when opposing armies collide
- [ ] Battle resolution per tick
- [ ] Casualties, morale changes
- [ ] Battle ends when one side routs
- [ ] Siege modifier when attacking settlement
- [ ] Show battle indicator on map
- [ ] Battle results notification

**Deliverable**: Two armies fight, one wins

---

### Phase 9: AI Opponent (Week 5)

**Goal**: Basic AI that plays the game

**Tasks**:
- [ ] AI player with own settlements
- [ ] AI builds roads to resources
- [ ] AI creates armies periodically
- [ ] AI attacks player settlements
- [ ] AI defends when attacked
- [ ] Simple decision making (greedy expansion)

**Deliverable**: Player can play full game against AI

---

### Phase 10: Win Conditions & Polish (Week 5-6)

**Goal**: Complete game loop

**Tasks**:
- [ ] Check win conditions each tick
- [ ] Victory/defeat screen
- [ ] New game button
- [ ] Balance: costs, timings, combat values
- [ ] Visual polish: colors, sizes, spacing
- [ ] Bug fixes from playtesting

**Deliverable**: Complete playable MVP

---

## File Structure

```
crossroads/
├── README.md
├── DESIGN.md                    # This document
│
├── frontend/
│   ├── index.html               # Main HTML file
│   ├── css/
│   │   └── styles.css           # All styles
│   ├── js/
│   │   ├── main.js              # Entry point
│   │   ├── game.js              # GameState, tick processing
│   │   ├── renderer.js          # Canvas rendering
│   │   ├── camera.js            # Pan/zoom handling
│   │   ├── input.js             # Mouse/keyboard handling
│   │   ├── ui.js                # Sidebar, modals, buttons
│   │   ├── models.js            # Entity classes
│   │   └── utils.js             # Helper functions
│   └── assets/
│       └── (optional icons/fonts)
│
├── backend/
│   ├── requirements.txt         # Python dependencies
│   ├── main.py                  # FastAPI app entry
│   ├── game/
│   │   ├── __init__.py
│   │   ├── models.py            # Data models
│   │   ├── state.py             # GameState management
│   │   ├── tick.py              # Tick processing logic
│   │   ├── combat.py            # Battle resolution
│   │   ├── ai.py                # AI player logic
│   │   └── tech_tree.py         # Technology definitions
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes.py            # REST endpoints
│   │   └── websocket.py         # WebSocket handlers
│   └── data/
│       └── technologies.json    # Tech tree data
│
├── scripts/
│   ├── screenshot.py            # Playwright screenshot utility
│   └── generate_map.py          # Random map generation
│
├── screenshots/                 # Generated screenshots for PR review
│   └── .gitkeep
│
└── tests/
    ├── test_game_logic.py
    └── test_combat.py
```

---

## Appendix: Quick Reference

### Key Constants

```python
# Game balance constants (tune these)
FOOD_PER_PERSON_PER_TICK = 0.1
BASE_GROWTH_RATE = 0.001  # 0.1% per tick
STARVATION_RATE = 0.005
INCOME_PER_PERSON = 0.5
CASUALTY_RATE = 0.05  # 5% of power dealt as casualties
```

### Keyboard Shortcuts (Future)

| Key | Action |
|-----|--------|
| Space | Play/Pause |
| Escape | Deselect / Cancel |
| 1-4 | Switch sidebar tabs |
| R | Build Road mode |
| Delete | Delete selected |

### Common Canvas Operations

```javascript
// Pan
ctx.translate(offsetX, offsetY);

// Zoom (centered on point)
ctx.translate(centerX, centerY);
ctx.scale(zoom, zoom);
ctx.translate(-centerX, -centerY);

// Draw circle
ctx.beginPath();
ctx.arc(x, y, radius, 0, Math.PI * 2);
ctx.fill();

// Draw line
ctx.beginPath();
ctx.moveTo(x1, y1);
ctx.lineTo(x2, y2);
ctx.stroke();
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-21 | Initial design document |

---

*End of Design Document*
