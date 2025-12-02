// ============================================================================
// F1 Strategy DSL Specification
// ============================================================================
// This file documents the DSL grammar and provides examples for the LLM prompt

export const DSL_SPECIFICATION = `
# F1 STRATEGY DSL SPECIFICATION

## Overview
This DSL (Domain-Specific Language) describes F1 race strategies in a structured,
parseable text format. Each DSL document contains sections for race configuration,
car profile, track characteristics, strategy definition, critical turns, and
historical winner data.

## Grammar Rules
- Each section starts with a keyword on its own line or at the start of a line.
- Values use the format KEY=VALUE or KEY="VALUE" (quotes for strings with spaces).
- Blocks are delimited with END keyword.
- Comments are not supported; output pure DSL only.
- All keywords are UPPERCASE.

## Sections (in order)

### 1. RACE Line (required)
RACE <TRACK_NAME> LAPS=<NUMBER> WEATHER=<cool|normal|hot|wet> FIELD=<NUMBER>

Example:
RACE MONZA LAPS=53 WEATHER=normal FIELD=20

### 2. CAR Line (required)
CAR START=P<NUMBER> PACE=<front_runner|midfield|backmarker> RISK=<conservative|balanced|aggressive> TARGET=P<NUMBER>

- TARGET is optional; if not applicable, omit or use TARGET=NONE

Example:
CAR START=P12 PACE=midfield RISK=balanced TARGET=P8

### 3. TRACK Lines (required, two lines)
TRACK AERO=<downforce_reliant|drag_reliant|balanced>
TRACK OVERTAKING=<easy|medium|hard> CHANCE=<0.0-1.0>

Example:
TRACK AERO=drag_reliant
TRACK OVERTAKING=medium CHANCE=0.55

### 4. STRATEGY Block (required)
STRATEGY "<LABEL>"
  STINT <NUMBER> TIRE=<SOFT|MEDIUM|HARD|INTERMEDIATE|WET> LAPS=<NUMBER>
  STINT <NUMBER> TIRE=<COMPOUND> LAPS=<NUMBER>
  ...
END

- At least 1 stint required
- Total stint laps should equal race laps
- Label describes the strategy approach

Example:
STRATEGY "Aggressive Two-Stop"
  STINT 1 TIRE=SOFT LAPS=18
  STINT 2 TIRE=MEDIUM LAPS=18
  STINT 3 TIRE=SOFT LAPS=17
END

### 5. CRITICAL_TURNS Block (optional but recommended)
CRITICAL_TURNS
  TURN <NUMBER> NAME="<NAME>" RISK=<comma_separated_tags> NOTE="<SHORT_TEXT>"
  ...
END

Risk tags: braking, overtaking, tire_stress, kerb_damage, track_limits, high_speed, low_speed

Example:
CRITICAL_TURNS
  TURN 1 NAME="Prima Variante" RISK=braking,overtaking NOTE="Heavy braking zone, first lap incidents common"
  TURN 4 NAME="Curva Grande" RISK=high_speed,tire_stress NOTE="High-speed right-hander, tests front-left tire"
  TURN 8 NAME="Parabolica" RISK=tire_stress,track_limits NOTE="Long fast corner, rear tire degradation"
END

### 6. PREVIOUS_WINNER Block (optional but recommended)
PREVIOUS_WINNER
  YEAR=<NUMBER> LABEL="<DESCRIPTION>"
  STINTS:
    TIRE=<COMPOUND> LAPS=<NUMBER>
    TIRE=<COMPOUND> LAPS=<NUMBER>
    ...
END

Example:
PREVIOUS_WINNER
  YEAR=2023 LABEL="Two-stop medium-hard-medium"
  STINTS:
    TIRE=MEDIUM LAPS=20
    TIRE=HARD LAPS=18
    TIRE=MEDIUM LAPS=15
END

## Complete Example DSL

RACE MONZA LAPS=53 WEATHER=normal FIELD=20
CAR START=P12 PACE=midfield RISK=balanced TARGET=P8
TRACK AERO=drag_reliant
TRACK OVERTAKING=medium CHANCE=0.55

STRATEGY "Safe Points Two-Stop"
  STINT 1 TIRE=MEDIUM LAPS=20
  STINT 2 TIRE=HARD LAPS=18
  STINT 3 TIRE=MEDIUM LAPS=15
END

CRITICAL_TURNS
  TURN 1 NAME="Prima Variante" RISK=braking,overtaking NOTE="Heavy braking zone into tight chicane"
  TURN 4 NAME="Curva Grande" RISK=high_speed,tire_stress NOTE="Flat-out right-hander"
  TURN 8 NAME="Parabolica" RISK=tire_stress,track_limits NOTE="Key corner for exit speed onto main straight"
END

PREVIOUS_WINNER
  YEAR=2023 LABEL="Verstappen two-stop soft-medium-medium"
  STINTS:
    TIRE=SOFT LAPS=15
    TIRE=MEDIUM LAPS=20
    TIRE=MEDIUM LAPS=18
END

## Validation Rules
1. Total stint laps must equal race laps (LAPS in RACE line)
2. Starting position must be between 1 and FIELD size
3. CHANCE must be between 0.0 and 1.0
4. Each STINT must have NUMBER, TIRE, and LAPS
5. TIRE must be valid compound: SOFT, MEDIUM, HARD, INTERMEDIATE, WET
6. At least one STINT required in STRATEGY block
7. Wet weather should use INTERMEDIATE or WET tires (at least partially)
`;

export const DSL_EXAMPLE_MONZA = `RACE MONZA LAPS=53 WEATHER=normal FIELD=20
CAR START=P12 PACE=midfield RISK=balanced TARGET=P8
TRACK AERO=drag_reliant
TRACK OVERTAKING=medium CHANCE=0.55

STRATEGY "Safe Points Two-Stop"
  STINT 1 TIRE=MEDIUM LAPS=20
  STINT 2 TIRE=HARD LAPS=18
  STINT 3 TIRE=MEDIUM LAPS=15
END

CRITICAL_TURNS
  TURN 1 NAME="Prima Variante" RISK=braking,overtaking NOTE="Heavy braking zone into tight chicane"
  TURN 4 NAME="Curva Grande" RISK=high_speed,tire_stress NOTE="Flat-out right-hander"
  TURN 8 NAME="Parabolica" RISK=tire_stress,track_limits NOTE="Key corner for exit speed onto main straight"
END

PREVIOUS_WINNER
  YEAR=2023 LABEL="Verstappen two-stop soft-medium-medium"
  STINTS:
    TIRE=SOFT LAPS=15
    TIRE=MEDIUM LAPS=20
    TIRE=MEDIUM LAPS=18
END`;

export const DSL_EXAMPLE_MONACO = `RACE MONACO LAPS=78 WEATHER=cool FIELD=20
CAR START=P6 PACE=front_runner RISK=conservative TARGET=P3
TRACK AERO=downforce_reliant
TRACK OVERTAKING=hard CHANCE=0.15

STRATEGY "Track Position One-Stop"
  STINT 1 TIRE=MEDIUM LAPS=35
  STINT 2 TIRE=HARD LAPS=43
END

CRITICAL_TURNS
  TURN 1 NAME="Sainte Devote" RISK=braking,overtaking NOTE="Only real overtaking spot, first corner crashes common"
  TURN 5 NAME="Casino Square" RISK=kerb_damage NOTE="Bumpy surface, suspension stress"
  TURN 10 NAME="Swimming Pool" RISK=high_speed,track_limits NOTE="Fast chicane sequence, wall proximity"
  TURN 16 NAME="Rascasse" RISK=low_speed,tire_stress NOTE="Tight hairpin, front tire wear"
END

PREVIOUS_WINNER
  YEAR=2023 LABEL="Verstappen one-stop medium-hard"
  STINTS:
    TIRE=MEDIUM LAPS=32
    TIRE=HARD LAPS=46
END`;

