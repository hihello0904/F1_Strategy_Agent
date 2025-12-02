// ============================================================================
// F1 Strategy Agent - Core Type Definitions
// ============================================================================

// --- Weather Conditions ---
export type Weather = 'cool' | 'normal' | 'hot' | 'wet';

// --- Car Pace Classification ---
export type PaceClass = 'front_runner' | 'midfield' | 'backmarker';

// --- Overtaking Difficulty ---
export type OvertakingDifficulty = 'easy' | 'medium' | 'hard';

// --- Risk Profile ---
export type RiskProfile = 'conservative' | 'balanced' | 'aggressive';

// --- Tire Compounds ---
export type TireCompound = 'SOFT' | 'MEDIUM' | 'HARD' | 'INTERMEDIATE' | 'WET';

// --- Aero Classification ---
export type AeroClassification = 'downforce_reliant' | 'drag_reliant' | 'balanced';

// ============================================================================
// USER INPUT TYPES
// ============================================================================

export interface UserInput {
  trackName: string;
  totalLaps: number;
  weather: Weather;
  startingGridPosition: number;
  fieldSize: number;
  paceClass: PaceClass;
  overtakingDifficulty: OvertakingDifficulty;
  riskProfile: RiskProfile;
  targetMinPosition?: number;
  naturalLanguageQuery: string;
}

// ============================================================================
// DSL PARSED TYPES
// ============================================================================

export interface RaceConfig {
  trackName: string;
  totalLaps: number;
  weather: Weather;
  fieldSize: number;
}

export interface CarProfile {
  startingGridPosition: number;
  paceClass: PaceClass;
  riskProfile: RiskProfile;
  targetMinPosition?: number;
}

export interface CriticalTurn {
  turnNumber: number;
  name: string;
  riskTags: string[];
  note: string;
}

export interface PreviousWinnerStint {
  tireCompound: TireCompound;
  laps: number;
}

export interface PreviousWinnerStrategy {
  year: number;
  label: string;
  stints: PreviousWinnerStint[];
}

export interface TrackProfile {
  aeroClassification: AeroClassification;
  overtakingDifficulty: OvertakingDifficulty;
  overtakingChance: number; // 0.0 - 1.0
  criticalTurns: CriticalTurn[];
  previousWinnerStrategy?: PreviousWinnerStrategy;
}

export interface Stint {
  stintNumber: number;
  tireCompound: TireCompound;
  lapsInStint: number;
}

export interface Strategy {
  label: string;
  stints: Stint[];
}

export interface ParsedDSL {
  raceConfig: RaceConfig;
  carProfile: CarProfile;
  trackProfile: TrackProfile;
  strategy: Strategy;
}

// ============================================================================
// DSL PARSER RESULT
// ============================================================================

export interface DSLParseError {
  line: number;
  message: string;
  section?: string;
}

export interface DSLParseResult {
  success: boolean;
  data?: ParsedDSL;
  errors: DSLParseError[];
  warnings: string[];
  rawDSL: string;
}

// ============================================================================
// SIMULATION TYPES
// ============================================================================

export interface LapData {
  lapNumber: number;
  stintNumber: number;
  tireCompound: TireCompound;
  lapTime: number; // seconds
  tireWear: number; // 0.0 - 1.0 (percentage worn)
  fuelLoad: number; // kg
  trafficPenalty: number; // seconds lost to traffic
  position: number;
  event?: 'pit_stop' | 'overtake' | 'overtaken' | 'start';
  eventDetail?: string;
}

export interface StintMetrics {
  stintNumber: number;
  tireCompound: TireCompound;
  totalLaps: number;
  avgLapTime: number;
  bestLapTime: number;
  worstLapTime: number;
  totalDegradationLoss: number; // total seconds lost to tire deg
  pitTimeLoss: number; // pit stop time (0 for last stint)
  startPosition: number;
  endPosition: number;
}

export interface SimulationWarning {
  type: 'tire' | 'strategy' | 'traffic' | 'track' | 'weather';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  detail?: string;
}

export interface RaceProfileSummary {
  overtakingChanceSummary: string;
  aeroClassification: AeroClassification;
  aeroDescription: string;
  previousWinnerSummary?: string;
  criticalTurnsSummary: string[];
}

export interface SimulationResult {
  // Core results
  totalRaceTime: number; // seconds
  predictedFinishPosition: number;
  predictedPositionRange: { min: number; max: number };
  positionsGained: number;
  probabilityOfPoints: number; // 0.0 - 1.0
  probabilityOfBeatingStartPosition: number; // 0.0 - 1.0

  // Detailed data
  stintMetrics: StintMetrics[];
  lapData: LapData[];

  // Analysis
  warnings: SimulationWarning[];
  raceProfile: RaceProfileSummary;

  // Metadata
  strategyLabel: string;
  totalPitStops: number;
  totalPitTimeLoss: number;

  // Input reference
  raceConfig: RaceConfig;
  carProfile: CarProfile;
  strategy: Strategy;
}

// ============================================================================
// API TYPES
// ============================================================================

export interface StrategyAPIRequest {
  userInput: UserInput;
}

export interface StrategyAPIResponse {
  success: boolean;
  simulationResult?: SimulationResult;
  parseResult?: DSLParseResult;
  reportId?: string;
  reportUrl?: string;
  error?: string;
  errorType?: 'llm_error' | 'parse_error' | 'simulation_error' | 'file_error' | 'validation_error';
  timestamp: string;
}

// ============================================================================
// REPORT TYPES
// ============================================================================

export interface ReportMetadata {
  id: string;
  timestamp: string;
  userInput: UserInput;
  strategyLabel: string;
  predictedFinish: number;
  success: boolean;
}

export interface FullReport {
  metadata: ReportMetadata;
  rawDSL: string;
  parsedPlanSummary: {
    raceConfig: RaceConfig;
    carProfile: CarProfile;
    strategyLabel: string;
    stints: Array<{ tire: TireCompound; laps: number }>;
  };
  simulationResult?: SimulationResult;
  errors: DSLParseError[];
  warnings: string[];
}

