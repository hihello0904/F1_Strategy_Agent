// ============================================================================
// F1 Strategy DSL Parser
// ============================================================================

import {
  DSLParseResult,
  DSLParseError,
  RaceConfig,
  CarProfile,
  TrackProfile,
  Strategy,
  Stint,
  CriticalTurn,
  PreviousWinnerStrategy,
  PreviousWinnerStint,
  Weather,
  PaceClass,
  RiskProfile,
  OvertakingDifficulty,
  AeroClassification,
  TireCompound,
  ParsedDSL,
} from '../types';

// --- Validation Helpers ---

const VALID_WEATHER: Weather[] = ['cool', 'normal', 'hot', 'wet'];
const VALID_PACE_CLASS: PaceClass[] = ['front_runner', 'midfield', 'backmarker'];
const VALID_RISK_PROFILE: RiskProfile[] = ['conservative', 'balanced', 'aggressive'];
const VALID_OVERTAKING: OvertakingDifficulty[] = ['easy', 'medium', 'hard'];
const VALID_AERO: AeroClassification[] = ['downforce_reliant', 'drag_reliant', 'balanced'];
const VALID_TIRES: TireCompound[] = ['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET'];

function isValidWeather(s: string): s is Weather {
  return VALID_WEATHER.includes(s as Weather);
}

function isValidPaceClass(s: string): s is PaceClass {
  return VALID_PACE_CLASS.includes(s as PaceClass);
}

function isValidRiskProfile(s: string): s is RiskProfile {
  return VALID_RISK_PROFILE.includes(s as RiskProfile);
}

function isValidOvertaking(s: string): s is OvertakingDifficulty {
  return VALID_OVERTAKING.includes(s as OvertakingDifficulty);
}

function isValidAero(s: string): s is AeroClassification {
  return VALID_AERO.includes(s as AeroClassification);
}

function isValidTire(s: string): s is TireCompound {
  return VALID_TIRES.includes(s as TireCompound);
}

// --- Regex Patterns ---

const RACE_PATTERN = /^RACE\s+(\S+)\s+LAPS=(\d+)\s+WEATHER=(\w+)\s+FIELD=(\d+)$/i;
const CAR_PATTERN = /^CAR\s+START=P(\d+)\s+PACE=(\w+)\s+RISK=(\w+)(?:\s+TARGET=(?:P(\d+)|NONE))?$/i;
const TRACK_AERO_PATTERN = /^TRACK\s+AERO=(\w+)$/i;
const TRACK_OVERTAKING_PATTERN = /^TRACK\s+OVERTAKING=(\w+)\s+CHANCE=([\d.]+)$/i;
const STRATEGY_START_PATTERN = /^STRATEGY\s+"([^"]+)"$/i;
const STINT_PATTERN = /^\s*STINT\s+(\d+)\s+TIRE=(\w+)\s+LAPS=(\d+)$/i;
const TURN_PATTERN = /^\s*TURN\s+(\d+)\s+NAME="([^"]+)"\s+RISK=([^\s]+)\s+NOTE="([^"]+)"$/i;
const PREVIOUS_WINNER_YEAR_PATTERN = /^\s*YEAR=(\d+)\s+LABEL="([^"]+)"$/i;
const PREVIOUS_WINNER_STINT_PATTERN = /^\s*TIRE=(\w+)\s+LAPS=(\d+)$/i;

// --- Parser Implementation ---

export function parseStrategyDSL(dslText: string): DSLParseResult {
  const errors: DSLParseError[] = [];
  const warnings: string[] = [];

  const lines = dslText.split('\n').map((l) => l.trimEnd());
  let lineIndex = 0;

  let raceConfig: RaceConfig | null = null;
  let carProfile: CarProfile | null = null;
  let trackAero: AeroClassification | null = null;
  let trackOvertaking: OvertakingDifficulty | null = null;
  let trackChance: number | null = null;
  let strategy: Strategy | null = null;
  const criticalTurns: CriticalTurn[] = [];
  let previousWinner: PreviousWinnerStrategy | null = null;

  // Helper to add error
  const addError = (message: string, section?: string) => {
    errors.push({ line: lineIndex + 1, message, section });
  };

  // Helper to skip empty lines
  const skipEmpty = () => {
    while (lineIndex < lines.length && lines[lineIndex].trim() === '') {
      lineIndex++;
    }
  };

  // Parse RACE line
  const parseRace = () => {
    skipEmpty();
    if (lineIndex >= lines.length) {
      addError('Missing RACE line', 'RACE');
      return;
    }

    const line = lines[lineIndex].trim();
    const match = line.match(RACE_PATTERN);

    if (!match) {
      addError(`Invalid RACE line format: "${line}"`, 'RACE');
      lineIndex++;
      return;
    }

    const [, trackName, lapsStr, weather, fieldStr] = match;
    const laps = parseInt(lapsStr, 10);
    const field = parseInt(fieldStr, 10);

    if (!isValidWeather(weather.toLowerCase())) {
      addError(`Invalid weather: "${weather}". Must be one of: ${VALID_WEATHER.join(', ')}`, 'RACE');
    }

    if (laps < 1 || laps > 100) {
      addError(`Invalid lap count: ${laps}. Must be between 1 and 100`, 'RACE');
    }

    if (field < 2 || field > 30) {
      addError(`Invalid field size: ${field}. Must be between 2 and 30`, 'RACE');
    }

    raceConfig = {
      trackName: trackName.toUpperCase(),
      totalLaps: laps,
      weather: weather.toLowerCase() as Weather,
      fieldSize: field,
    };

    lineIndex++;
  };

  // Parse CAR line
  const parseCar = () => {
    skipEmpty();
    if (lineIndex >= lines.length) {
      addError('Missing CAR line', 'CAR');
      return;
    }

    const line = lines[lineIndex].trim();
    const match = line.match(CAR_PATTERN);

    if (!match) {
      addError(`Invalid CAR line format: "${line}"`, 'CAR');
      lineIndex++;
      return;
    }

    const [, startStr, pace, risk, targetStr] = match;
    const start = parseInt(startStr, 10);
    const target = targetStr ? parseInt(targetStr, 10) : undefined;

    if (!isValidPaceClass(pace.toLowerCase())) {
      addError(`Invalid pace class: "${pace}". Must be one of: ${VALID_PACE_CLASS.join(', ')}`, 'CAR');
    }

    if (!isValidRiskProfile(risk.toLowerCase())) {
      addError(`Invalid risk profile: "${risk}". Must be one of: ${VALID_RISK_PROFILE.join(', ')}`, 'CAR');
    }

    carProfile = {
      startingGridPosition: start,
      paceClass: pace.toLowerCase() as PaceClass,
      riskProfile: risk.toLowerCase() as RiskProfile,
      targetMinPosition: target,
    };

    lineIndex++;
  };

  // Parse TRACK lines (AERO and OVERTAKING)
  const parseTrack = () => {
    // Parse TRACK AERO
    skipEmpty();
    if (lineIndex >= lines.length) {
      addError('Missing TRACK AERO line', 'TRACK');
      return;
    }

    let line = lines[lineIndex].trim();
    let match = line.match(TRACK_AERO_PATTERN);

    if (!match) {
      addError(`Invalid TRACK AERO line format: "${line}"`, 'TRACK');
    } else {
      const aero = match[1].toLowerCase();
      if (!isValidAero(aero)) {
        addError(`Invalid aero classification: "${aero}". Must be one of: ${VALID_AERO.join(', ')}`, 'TRACK');
      } else {
        trackAero = aero as AeroClassification;
      }
    }

    lineIndex++;

    // Parse TRACK OVERTAKING
    skipEmpty();
    if (lineIndex >= lines.length) {
      addError('Missing TRACK OVERTAKING line', 'TRACK');
      return;
    }

    line = lines[lineIndex].trim();
    match = line.match(TRACK_OVERTAKING_PATTERN);

    if (!match) {
      addError(`Invalid TRACK OVERTAKING line format: "${line}"`, 'TRACK');
    } else {
      const overtaking = match[1].toLowerCase();
      const chance = parseFloat(match[2]);

      if (!isValidOvertaking(overtaking)) {
        addError(
          `Invalid overtaking difficulty: "${overtaking}". Must be one of: ${VALID_OVERTAKING.join(', ')}`,
          'TRACK'
        );
      } else {
        trackOvertaking = overtaking as OvertakingDifficulty;
      }

      if (chance < 0 || chance > 1) {
        addError(`Invalid overtaking chance: ${chance}. Must be between 0.0 and 1.0`, 'TRACK');
      } else {
        trackChance = chance;
      }
    }

    lineIndex++;
  };

  // Parse STRATEGY block
  const parseStrategy = () => {
    skipEmpty();
    if (lineIndex >= lines.length) {
      addError('Missing STRATEGY block', 'STRATEGY');
      return;
    }

    let line = lines[lineIndex].trim();
    const startMatch = line.match(STRATEGY_START_PATTERN);

    if (!startMatch) {
      addError(`Invalid STRATEGY start line: "${line}"`, 'STRATEGY');
      lineIndex++;
      return;
    }

    const label = startMatch[1];
    const stints: Stint[] = [];
    lineIndex++;

    // Parse stints until END
    while (lineIndex < lines.length) {
      line = lines[lineIndex].trim();

      if (line.toUpperCase() === 'END') {
        lineIndex++;
        break;
      }

      if (line === '') {
        lineIndex++;
        continue;
      }

      const stintMatch = line.match(STINT_PATTERN);
      if (!stintMatch) {
        addError(`Invalid STINT line: "${line}"`, 'STRATEGY');
        lineIndex++;
        continue;
      }

      const [, numStr, tire, lapsStr] = stintMatch;
      const stintNum = parseInt(numStr, 10);
      const laps = parseInt(lapsStr, 10);
      const tireUpper = tire.toUpperCase();

      if (!isValidTire(tireUpper)) {
        addError(`Invalid tire compound: "${tire}". Must be one of: ${VALID_TIRES.join(', ')}`, 'STRATEGY');
      }

      if (laps < 1) {
        addError(`Invalid stint laps: ${laps}. Must be at least 1`, 'STRATEGY');
      }

      stints.push({
        stintNumber: stintNum,
        tireCompound: tireUpper as TireCompound,
        lapsInStint: laps,
      });

      lineIndex++;
    }

    if (stints.length === 0) {
      addError('STRATEGY block must contain at least one STINT', 'STRATEGY');
    }

    strategy = { label, stints };
  };

  // Parse CRITICAL_TURNS block (optional)
  const parseCriticalTurns = () => {
    skipEmpty();
    if (lineIndex >= lines.length) return;

    let line = lines[lineIndex].trim();
    if (line.toUpperCase() !== 'CRITICAL_TURNS') return;

    lineIndex++;

    while (lineIndex < lines.length) {
      line = lines[lineIndex].trim();

      if (line.toUpperCase() === 'END') {
        lineIndex++;
        break;
      }

      if (line === '') {
        lineIndex++;
        continue;
      }

      const turnMatch = line.match(TURN_PATTERN);
      if (!turnMatch) {
        addError(`Invalid TURN line: "${line}"`, 'CRITICAL_TURNS');
        lineIndex++;
        continue;
      }

      const [, numStr, name, riskStr, note] = turnMatch;
      const turnNum = parseInt(numStr, 10);
      const riskTags = riskStr.split(',').map((t) => t.trim().toLowerCase());

      criticalTurns.push({
        turnNumber: turnNum,
        name,
        riskTags,
        note,
      });

      lineIndex++;
    }
  };

  // Parse PREVIOUS_WINNER block (optional)
  const parsePreviousWinner = () => {
    skipEmpty();
    if (lineIndex >= lines.length) return;

    let line = lines[lineIndex].trim();
    if (line.toUpperCase() !== 'PREVIOUS_WINNER') return;

    lineIndex++;
    skipEmpty();

    if (lineIndex >= lines.length) {
      addError('PREVIOUS_WINNER block is empty', 'PREVIOUS_WINNER');
      return;
    }

    // Parse YEAR and LABEL
    line = lines[lineIndex].trim();
    const yearMatch = line.match(PREVIOUS_WINNER_YEAR_PATTERN);

    if (!yearMatch) {
      addError(`Invalid PREVIOUS_WINNER year line: "${line}"`, 'PREVIOUS_WINNER');
      // Try to skip to END
      while (lineIndex < lines.length && lines[lineIndex].trim().toUpperCase() !== 'END') {
        lineIndex++;
      }
      if (lineIndex < lines.length) lineIndex++;
      return;
    }

    const year = parseInt(yearMatch[1], 10);
    const label = yearMatch[2];
    lineIndex++;

    // Look for STINTS:
    skipEmpty();
    if (lineIndex >= lines.length) {
      previousWinner = { year, label, stints: [] };
      return;
    }

    line = lines[lineIndex].trim();
    if (line.toUpperCase() !== 'STINTS:') {
      // No stints section
      previousWinner = { year, label, stints: [] };
      return;
    }

    lineIndex++;
    const pwStints: PreviousWinnerStint[] = [];

    while (lineIndex < lines.length) {
      line = lines[lineIndex].trim();

      if (line.toUpperCase() === 'END') {
        lineIndex++;
        break;
      }

      if (line === '') {
        lineIndex++;
        continue;
      }

      const stintMatch = line.match(PREVIOUS_WINNER_STINT_PATTERN);
      if (!stintMatch) {
        addError(`Invalid PREVIOUS_WINNER stint line: "${line}"`, 'PREVIOUS_WINNER');
        lineIndex++;
        continue;
      }

      const [, tire, lapsStr] = stintMatch;
      const tireUpper = tire.toUpperCase();
      const laps = parseInt(lapsStr, 10);

      if (!isValidTire(tireUpper)) {
        addError(`Invalid tire compound in PREVIOUS_WINNER: "${tire}"`, 'PREVIOUS_WINNER');
      }

      pwStints.push({
        tireCompound: tireUpper as TireCompound,
        laps,
      });

      lineIndex++;
    }

    previousWinner = { year, label, stints: pwStints };
  };

  // --- Main Parsing ---
  try {
    parseRace();
    parseCar();
    parseTrack();
    parseStrategy();
    parseCriticalTurns();
    parsePreviousWinner();

    // Post-parse validation - use type assertions due to closure assignments
    const strategyValue = strategy as Strategy | null;
    const raceConfigValue = raceConfig as RaceConfig | null;
    const carProfileValue = carProfile as CarProfile | null;

    if (raceConfigValue && strategyValue) {
      const stints = strategyValue.stints;
      const totalStintLaps = stints.reduce((sum, s) => sum + s.lapsInStint, 0);
      if (totalStintLaps !== raceConfigValue.totalLaps) {
        warnings.push(
          `Total stint laps (${totalStintLaps}) does not match race laps (${raceConfigValue.totalLaps}). ` +
            `This may affect simulation accuracy.`
        );
      }

      if (raceConfigValue.weather === 'wet') {
        const hasWetTires = stints.some((s) => s.tireCompound === 'INTERMEDIATE' || s.tireCompound === 'WET');
        if (!hasWetTires) {
          warnings.push('Wet weather conditions but no wet or intermediate tires selected. Consider tire choice.');
        }
      }
    }

    if (raceConfigValue && carProfileValue) {
      if (carProfileValue.startingGridPosition > raceConfigValue.fieldSize) {
        addError(
          `Starting position P${carProfileValue.startingGridPosition} exceeds field size of ${raceConfigValue.fieldSize}`,
          'CAR'
        );
      }
    }

    // Build result
    if (errors.length > 0) {
      return {
        success: false,
        errors,
        warnings,
        rawDSL: dslText,
      };
    }

    if (!raceConfig || !carProfile || !trackAero || !trackOvertaking || trackChance === null || !strategy) {
      addError('Missing required sections in DSL');
      return {
        success: false,
        errors,
        warnings,
        rawDSL: dslText,
      };
    }

    const trackProfile: TrackProfile = {
      aeroClassification: trackAero,
      overtakingDifficulty: trackOvertaking,
      overtakingChance: trackChance,
      criticalTurns,
      previousWinnerStrategy: previousWinner || undefined,
    };

    const parsedData: ParsedDSL = {
      raceConfig,
      carProfile,
      trackProfile,
      strategy,
    };

    return {
      success: true,
      data: parsedData,
      errors: [],
      warnings,
      rawDSL: dslText,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown parsing error';
    return {
      success: false,
      errors: [{ line: lineIndex + 1, message: `Parser exception: ${errorMessage}` }],
      warnings,
      rawDSL: dslText,
    };
  }
}

// --- Utility: Validate parsed DSL data ranges ---
export function validateParsedDSL(data: ParsedDSL): string[] {
  const issues: string[] = [];

  // Validate race config
  if (data.raceConfig.totalLaps < 1 || data.raceConfig.totalLaps > 100) {
    issues.push(`Total laps ${data.raceConfig.totalLaps} is outside reasonable range (1-100)`);
  }

  if (data.raceConfig.fieldSize < 2 || data.raceConfig.fieldSize > 30) {
    issues.push(`Field size ${data.raceConfig.fieldSize} is outside reasonable range (2-30)`);
  }

  // Validate car profile
  if (data.carProfile.startingGridPosition < 1) {
    issues.push('Starting position must be at least P1');
  }

  if (data.carProfile.targetMinPosition !== undefined) {
    if (data.carProfile.targetMinPosition < 1) {
      issues.push('Target position must be at least P1');
    }
    if (data.carProfile.targetMinPosition > data.raceConfig.fieldSize) {
      issues.push('Target position cannot exceed field size');
    }
  }

  // Validate strategy
  for (const stint of data.strategy.stints) {
    if (stint.lapsInStint < 1) {
      issues.push(`Stint ${stint.stintNumber} has invalid lap count: ${stint.lapsInStint}`);
    }
    if (stint.lapsInStint > data.raceConfig.totalLaps) {
      issues.push(`Stint ${stint.stintNumber} laps (${stint.lapsInStint}) exceed race length`);
    }
  }

  // Validate track profile
  if (data.trackProfile.overtakingChance < 0 || data.trackProfile.overtakingChance > 1) {
    issues.push('Overtaking chance must be between 0.0 and 1.0');
  }

  return issues;
}

