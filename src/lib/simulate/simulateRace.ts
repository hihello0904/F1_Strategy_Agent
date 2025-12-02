// ============================================================================
// F1 Race Simulation Engine (Executor)
// ============================================================================

import {
  RaceConfig,
  CarProfile,
  Strategy,
  TrackProfile,
  SimulationResult,
  LapData,
  StintMetrics,
  SimulationWarning,
  RaceProfileSummary,
  TireCompound,
} from '../types';

// ============================================================================
// TRACK DATA & CONSTANTS
// ============================================================================

interface TrackData {
  baseLapTime: number; // seconds
  pitLaneTimeLoss: number; // seconds
  fuelEffectPerKg: number; // seconds per kg of fuel
  startingFuelKg: number;
  fuelConsumptionPerLap: number; // kg per lap
}

// Default track data (can be expanded with real track-specific data)
const DEFAULT_TRACK_DATA: TrackData = {
  baseLapTime: 85, // ~1:25
  pitLaneTimeLoss: 22, // typical pit stop loss
  fuelEffectPerKg: 0.035, // ~35ms per kg
  startingFuelKg: 110,
  fuelConsumptionPerLap: 1.8,
};

// Track-specific data (approximate values based on real F1 data)
const TRACK_DATABASE: Record<string, Partial<TrackData>> = {
  MONZA: { baseLapTime: 82, pitLaneTimeLoss: 24 },
  MONACO: { baseLapTime: 73, pitLaneTimeLoss: 18 },
  SPA: { baseLapTime: 105, pitLaneTimeLoss: 21 },
  SILVERSTONE: { baseLapTime: 88, pitLaneTimeLoss: 20 },
  SUZUKA: { baseLapTime: 91, pitLaneTimeLoss: 22 },
  BAHRAIN: { baseLapTime: 90, pitLaneTimeLoss: 21 },
  JEDDAH: { baseLapTime: 88, pitLaneTimeLoss: 23 },
  MELBOURNE: { baseLapTime: 79, pitLaneTimeLoss: 24 },
  IMOLA: { baseLapTime: 76, pitLaneTimeLoss: 25 },
  MIAMI: { baseLapTime: 89, pitLaneTimeLoss: 22 },
  BARCELONA: { baseLapTime: 78, pitLaneTimeLoss: 21 },
  MONTREAL: { baseLapTime: 73, pitLaneTimeLoss: 23 },
  AUSTRIA: { baseLapTime: 65, pitLaneTimeLoss: 20 },
  BUDAPEST: { baseLapTime: 77, pitLaneTimeLoss: 21 },
  ZANDVOORT: { baseLapTime: 72, pitLaneTimeLoss: 18 },
  SINGAPORE: { baseLapTime: 94, pitLaneTimeLoss: 26 },
  AUSTIN: { baseLapTime: 96, pitLaneTimeLoss: 22 },
  MEXICO: { baseLapTime: 78, pitLaneTimeLoss: 20 },
  INTERLAGOS: { baseLapTime: 72, pitLaneTimeLoss: 22 },
  VEGAS: { baseLapTime: 93, pitLaneTimeLoss: 23 },
  QATAR: { baseLapTime: 84, pitLaneTimeLoss: 21 },
  ABU_DHABI: { baseLapTime: 85, pitLaneTimeLoss: 20 },
};

// ============================================================================
// TIRE DEGRADATION MODEL
// ============================================================================

interface TireDegradationProfile {
  initialGrip: number; // 0-1, initial grip level
  degradationRate: number; // seconds lost per lap (average)
  cliffLap: number; // lap where degradation accelerates
  cliffMultiplier: number; // degradation multiplier after cliff
}

const TIRE_PROFILES: Record<TireCompound, TireDegradationProfile> = {
  SOFT: {
    initialGrip: 1.0,
    degradationRate: 0.08,
    cliffLap: 15,
    cliffMultiplier: 2.5,
  },
  MEDIUM: {
    initialGrip: 0.97,
    degradationRate: 0.05,
    cliffLap: 25,
    cliffMultiplier: 2.0,
  },
  HARD: {
    initialGrip: 0.94,
    degradationRate: 0.03,
    cliffLap: 40,
    cliffMultiplier: 1.8,
  },
  INTERMEDIATE: {
    initialGrip: 0.95,
    degradationRate: 0.04,
    cliffLap: 30,
    cliffMultiplier: 2.0,
  },
  WET: {
    initialGrip: 0.92,
    degradationRate: 0.035,
    cliffLap: 35,
    cliffMultiplier: 1.5,
  },
};

// Weather effects on tire degradation
const WEATHER_DEGRADATION_MULTIPLIER: Record<string, number> = {
  cool: 0.85,
  normal: 1.0,
  hot: 1.25,
  wet: 1.1, // wet tires have different behavior
};

// ============================================================================
// PACE CLASS EFFECTS
// ============================================================================

interface PaceClassEffect {
  lapTimeDelta: number; // seconds relative to reference
  overtakingAbility: number; // multiplier for overtaking chance
  defenseAbility: number; // multiplier for being overtaken
  realisticCeiling: number; // best realistic finishing position
  realisticFloor: number; // worst realistic finishing position  
  typicalFinish: number; // typical "par" finishing position
}

const PACE_CLASS_EFFECTS: Record<string, PaceClassEffect> = {
  front_runner: {
    lapTimeDelta: -1.5, // 1.5s faster than midfield
    overtakingAbility: 1.4,
    defenseAbility: 1.5,
    realisticCeiling: 1, // Can win
    realisticFloor: 6, // Bad day still top 6
    typicalFinish: 3,
  },
  midfield: {
    lapTimeDelta: 0,
    overtakingAbility: 1.0,
    defenseAbility: 1.0,
    realisticCeiling: 5, // Best case with chaos/strategy
    realisticFloor: 14, // Bad day
    typicalFinish: 9,
  },
  backmarker: {
    lapTimeDelta: 1.2, // 1.2s slower than midfield
    overtakingAbility: 0.6,
    defenseAbility: 0.7,
    realisticCeiling: 10, // Points only with DNFs ahead
    realisticFloor: 20,
    typicalFinish: 16,
  },
};

// ============================================================================
// RISK PROFILE EFFECTS
// ============================================================================

interface RiskProfileEffect {
  overtakingAggressiveness: number; // multiplier
  tireManagement: number; // degradation multiplier (lower = better)
  pitStopEfficiency: number; // variance in pit stop time
}

const RISK_PROFILE_EFFECTS: Record<string, RiskProfileEffect> = {
  conservative: {
    overtakingAggressiveness: 0.7,
    tireManagement: 0.85,
    pitStopEfficiency: 0.98, // reliable but slightly slower
  },
  balanced: {
    overtakingAggressiveness: 1.0,
    tireManagement: 1.0,
    pitStopEfficiency: 1.0,
  },
  aggressive: {
    overtakingAggressiveness: 1.4,
    tireManagement: 1.2, // harder on tires
    pitStopEfficiency: 1.05, // more variance, sometimes faster/slower
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getTrackData(trackName: string): TrackData {
  const normalized = trackName.toUpperCase().replace(/[^A-Z]/g, '');
  const specific = TRACK_DATABASE[normalized];
  
  return {
    ...DEFAULT_TRACK_DATA,
    ...specific,
  };
}

function calculateTireDegradation(
  compound: TireCompound,
  lapInStint: number,
  weather: string,
  riskProfile: string
): number {
  const profile = TIRE_PROFILES[compound];
  const weatherMultiplier = WEATHER_DEGRADATION_MULTIPLIER[weather] || 1.0;
  const riskEffect = RISK_PROFILE_EFFECTS[riskProfile].tireManagement;

  let degradation = profile.degradationRate * weatherMultiplier * riskEffect;

  // Apply cliff effect
  if (lapInStint > profile.cliffLap) {
    const lapsAfterCliff = lapInStint - profile.cliffLap;
    degradation += (profile.degradationRate * profile.cliffMultiplier - profile.degradationRate) * 
                   Math.min(lapsAfterCliff, 10) / 10;
  }

  return degradation * lapInStint;
}

function calculateTireWear(lapInStint: number, compound: TireCompound): number {
  const profile = TIRE_PROFILES[compound];
  const baseWear = lapInStint / (profile.cliffLap * 1.5);
  
  if (lapInStint > profile.cliffLap) {
    const extraWear = (lapInStint - profile.cliffLap) / profile.cliffLap * 0.5;
    return Math.min(baseWear + extraWear, 1.0);
  }
  
  return Math.min(baseWear, 1.0);
}

function simulateOvertaking(
  currentPosition: number,
  trackProfile: TrackProfile,
  paceClass: string,
  riskProfile: string,
  lapNumber: number,
  isFirstLap: boolean,
  fieldSize: number = 20
): { newPosition: number; overtook: boolean; wasOvertaken: boolean } {
  const paceEffect = PACE_CLASS_EFFECTS[paceClass];
  const riskEffect = RISK_PROFILE_EFFECTS[riskProfile];

  let newPosition = currentPosition;
  let overtook = false;
  let wasOvertaken = false;

  // REALISTIC CONSTRAINT: Can't finish better than pace class ceiling
  // If already at or better than ceiling, very hard to gain more
  const atOrBeyondCeiling = currentPosition <= paceEffect.realisticCeiling;
  
  // Track difficulty affects base overtaking rate
  // Real F1: easy track ~15-25 passes/race, hard track ~5-10 passes/race
  // Per car that translates to maybe 1-3 overtakes per race on easy tracks
  const trackDifficultyMultiplier = {
    easy: 0.04,    // ~2-3 overtakes possible per race
    medium: 0.025, // ~1-2 overtakes possible per race  
    hard: 0.012,   // ~0-1 overtakes possible per race
  }[trackProfile.overtakingDifficulty] || 0.025;

  // First lap chaos - more position changes but bidirectional
  if (isFirstLap) {
    const firstLapSeed = (currentPosition * 47 + 13) % 100 / 100;
    
    // First lap gains depend on starting position and pace
    // Back of grid can gain more on lap 1 (more chaos ahead)
    const potentialGain = currentPosition > 10 ? 3 : currentPosition > 5 ? 2 : 1;
    const potentialLoss = currentPosition < 5 ? 2 : 1;
    
    // Better pace class = more likely to gain, less likely to lose on lap 1
    const gainThreshold = 0.3 * paceEffect.overtakingAbility * riskEffect.overtakingAggressiveness;
    const lossThreshold = 0.15 / paceEffect.defenseAbility;
    
    if (firstLapSeed < gainThreshold && !atOrBeyondCeiling) {
      const gain = Math.min(potentialGain, Math.floor(firstLapSeed / gainThreshold * potentialGain) + 1);
      newPosition = Math.max(paceEffect.realisticCeiling, currentPosition - gain);
      overtook = newPosition < currentPosition;
    } else if (firstLapSeed > (1 - lossThreshold)) {
      const loss = Math.min(potentialLoss, 1);
      newPosition = Math.min(fieldSize, currentPosition + loss);
      wasOvertaken = newPosition > currentPosition;
    }
    
    return { newPosition, overtook, wasOvertaken };
  }

  // Regular lap overtaking - much more conservative
  const seed = (lapNumber * 17 + currentPosition * 31) % 100 / 100;
  
  // Base overtake probability is very low (realistic)
  let overtakeProb = trackDifficultyMultiplier * paceEffect.overtakingAbility * riskEffect.overtakingAggressiveness;
  
  // CRITICAL: Reduce probability as you approach your pace ceiling
  // A midfield car can't realistically pass front runners on pure pace
  if (currentPosition <= paceEffect.realisticCeiling + 2) {
    overtakeProb *= 0.1; // 90% reduction near ceiling
  } else if (currentPosition <= paceEffect.realisticCeiling + 4) {
    overtakeProb *= 0.4; // 60% reduction approaching ceiling
  }
  
  // Positions gained against similar pace cars (your typical range) are easier
  if (currentPosition > paceEffect.typicalFinish) {
    overtakeProb *= 1.3; // Slightly easier to pass cars you're faster than
  }
  
  // Being overtaken - happens if faster cars are behind or you're struggling
  let overtakenProb = trackDifficultyMultiplier * 0.5 / paceEffect.defenseAbility;
  
  // More likely to be overtaken if you're ahead of your typical position
  if (currentPosition < paceEffect.typicalFinish - 2) {
    overtakenProb *= 1.5; // Faster cars catching up
  }
  
  // If beyond your floor (very bad day), less likely to lose more
  if (currentPosition >= paceEffect.realisticFloor) {
    overtakenProb *= 0.3;
  }

  // Execute simulation
  if (seed < overtakeProb && currentPosition > 1 && !atOrBeyondCeiling) {
    // Successful overtake - but can't go past ceiling
    newPosition = Math.max(paceEffect.realisticCeiling, currentPosition - 1);
    overtook = newPosition < currentPosition;
  } else if (seed > (1 - overtakenProb) && currentPosition < fieldSize) {
    // Got overtaken - but floor provides some protection
    newPosition = Math.min(paceEffect.realisticFloor, currentPosition + 1);
    wasOvertaken = newPosition > currentPosition;
  }

  return { newPosition, overtook, wasOvertaken };
}

// ============================================================================
// MAIN SIMULATION FUNCTION
// ============================================================================

export function simulateRace(
  race: RaceConfig,
  car: CarProfile,
  strategy: Strategy,
  trackProfile: TrackProfile
): SimulationResult {
  const trackData = getTrackData(race.trackName);
  const paceEffect = PACE_CLASS_EFFECTS[car.paceClass];
  const riskEffect = RISK_PROFILE_EFFECTS[car.riskProfile];

  // Initialize tracking arrays
  const lapData: LapData[] = [];
  const stintMetrics: StintMetrics[] = [];
  const warnings: SimulationWarning[] = [];

  // Race state
  let currentPosition = car.startingGridPosition;
  let totalRaceTime = 0;
  let currentLap = 0;
  let fuelLoad = trackData.startingFuelKg;
  let totalPitTimeLoss = 0;

  // Process each stint
  for (let stintIdx = 0; stintIdx < strategy.stints.length; stintIdx++) {
    const stint = strategy.stints[stintIdx];
    const isLastStint = stintIdx === strategy.stints.length - 1;

    const stintLapTimes: number[] = [];
    const stintStartPosition = currentPosition;
    let stintDegradationLoss = 0;

    // Check for tire warnings
    if (stint.lapsInStint > TIRE_PROFILES[stint.tireCompound].cliffLap * 1.3) {
      warnings.push({
        type: 'tire',
        severity: 'high',
        message: `Stint ${stint.stintNumber} may push ${stint.tireCompound} tires past cliff`,
        detail: `Running ${stint.lapsInStint} laps on ${stint.tireCompound} compound which has cliff at lap ${TIRE_PROFILES[stint.tireCompound].cliffLap}`,
      });
    }

    // Check for weather/tire mismatch
    if (race.weather === 'wet' && !['INTERMEDIATE', 'WET'].includes(stint.tireCompound)) {
      warnings.push({
        type: 'weather',
        severity: 'critical',
        message: `Stint ${stint.stintNumber} uses dry tires in wet conditions`,
        detail: 'Consider using INTERMEDIATE or WET tires for wet weather',
      });
    }

    // Simulate each lap in the stint
    for (let lapInStint = 1; lapInStint <= stint.lapsInStint; lapInStint++) {
      currentLap++;
      const isFirstLap = currentLap === 1;
      const isPitLap = lapInStint === stint.lapsInStint && !isLastStint;

      // Calculate base lap time
      let lapTime = trackData.baseLapTime + paceEffect.lapTimeDelta;

      // Tire degradation effect
      const degradation = calculateTireDegradation(
        stint.tireCompound,
        lapInStint,
        race.weather,
        car.riskProfile
      );
      lapTime += degradation;
      stintDegradationLoss += degradation;

      // Fuel effect (lighter = faster)
      const fuelEffect = fuelLoad * trackData.fuelEffectPerKg;
      lapTime -= (trackData.startingFuelKg - fuelLoad) * trackData.fuelEffectPerKg * 0.5;
      fuelLoad = Math.max(0, fuelLoad - trackData.fuelConsumptionPerLap);

      // Initial grip advantage (fresh tires)
      if (lapInStint <= 3) {
        const gripBonus = (1 - TIRE_PROFILES[stint.tireCompound].initialGrip) * 2;
        lapTime += gripBonus;
      }

      // Traffic/overtaking simulation
      let trafficPenalty = 0;
      let event: LapData['event'] = undefined;
      let eventDetail: string | undefined = undefined;

      if (isFirstLap) {
        event = 'start';
        eventDetail = `Started P${car.startingGridPosition}`;
      }

      const overtakeResult = simulateOvertaking(
        currentPosition,
        trackProfile,
        car.paceClass,
        car.riskProfile,
        currentLap,
        isFirstLap,
        race.fieldSize
      );

      if (overtakeResult.overtook) {
        event = 'overtake';
        eventDetail = `Passed car to move to P${overtakeResult.newPosition}`;
      } else if (overtakeResult.wasOvertaken) {
        event = 'overtaken';
        eventDetail = `Lost position, now P${overtakeResult.newPosition}`;
        trafficPenalty = 0.3; // Lost time while being passed
      }

      currentPosition = overtakeResult.newPosition;

      // DRS effect approximation (if close to car ahead)
      if (currentPosition > 1 && trackProfile.aeroClassification === 'drag_reliant') {
        lapTime -= 0.2; // DRS effect
      }

      // Add traffic penalty if in congested midfield
      if (currentPosition >= 8 && currentPosition <= 15) {
        trafficPenalty += 0.1 * (1 - trackProfile.overtakingChance);
      }

      lapTime += trafficPenalty;

      // Pit stop handling
      let pitTimeLoss = 0;
      if (isPitLap) {
        pitTimeLoss = trackData.pitLaneTimeLoss * riskEffect.pitStopEfficiency;
        totalPitTimeLoss += pitTimeLoss;
        event = 'pit_stop';
        eventDetail = `Pit stop for ${strategy.stints[stintIdx + 1].tireCompound} tires`;
      }

      // Calculate tire wear percentage
      const tireWear = calculateTireWear(lapInStint, stint.tireCompound);

      // Record lap data
      lapData.push({
        lapNumber: currentLap,
        stintNumber: stint.stintNumber,
        tireCompound: stint.tireCompound,
        lapTime,
        tireWear,
        fuelLoad,
        trafficPenalty,
        position: currentPosition,
        event,
        eventDetail,
      });

      stintLapTimes.push(lapTime);
      totalRaceTime += lapTime + pitTimeLoss;
    }

    // Calculate stint metrics
    const avgLapTime = stintLapTimes.reduce((a, b) => a + b, 0) / stintLapTimes.length;
    const bestLapTime = Math.min(...stintLapTimes);
    const worstLapTime = Math.max(...stintLapTimes);
    const pitTimeLoss = isLastStint ? 0 : trackData.pitLaneTimeLoss * riskEffect.pitStopEfficiency;

    stintMetrics.push({
      stintNumber: stint.stintNumber,
      tireCompound: stint.tireCompound,
      totalLaps: stint.lapsInStint,
      avgLapTime,
      bestLapTime,
      worstLapTime,
      totalDegradationLoss: stintDegradationLoss,
      pitTimeLoss,
      startPosition: stintStartPosition,
      endPosition: currentPosition,
    });
  }

  // Calculate final metrics with realistic constraints
  const paceEffectFinal = PACE_CLASS_EFFECTS[car.paceClass];
  
  // Ensure final position respects pace class ceiling (with small variance for luck)
  let predictedFinishPosition = Math.max(paceEffectFinal.realisticCeiling, currentPosition);
  
  // If simulation ended worse than floor, cap it there
  predictedFinishPosition = Math.min(paceEffectFinal.realisticFloor, predictedFinishPosition);
  
  const positionsGained = car.startingGridPosition - predictedFinishPosition;

  // Calculate position range based on pace class realistic bounds
  const variance = car.riskProfile === 'aggressive' ? 2 : car.riskProfile === 'conservative' ? 1 : 1;
  const positionRange = {
    min: Math.max(paceEffectFinal.realisticCeiling, predictedFinishPosition - variance),
    max: Math.min(Math.min(race.fieldSize, paceEffectFinal.realisticFloor), predictedFinishPosition + variance + 1),
  };

  // Calculate probabilities - more realistic based on pace class
  let probabilityOfPoints: number;
  if (paceEffectFinal.realisticCeiling > 10) {
    // Backmarkers need DNFs ahead to score points
    probabilityOfPoints = Math.max(0.02, 0.15 - (predictedFinishPosition - 10) * 0.01);
  } else if (predictedFinishPosition <= 10) {
    // Predicted in points
    probabilityOfPoints = Math.min(0.85, 0.9 - (predictedFinishPosition - paceEffectFinal.realisticCeiling) * 0.05);
  } else {
    // Predicted outside points
    probabilityOfPoints = Math.max(0.05, 0.35 - (predictedFinishPosition - 10) * 0.03);
  }

  // Probability of beating start position - depends on where you started vs typical
  let probabilityOfBeatingStartPosition: number;
  if (car.startingGridPosition > paceEffectFinal.typicalFinish) {
    // Started worse than typical - good chance to improve
    probabilityOfBeatingStartPosition = Math.min(0.75, 0.5 + (car.startingGridPosition - paceEffectFinal.typicalFinish) * 0.08);
  } else if (car.startingGridPosition < paceEffectFinal.realisticCeiling) {
    // Started better than realistic ceiling - will likely lose positions
    probabilityOfBeatingStartPosition = Math.max(0.1, 0.3 - (paceEffectFinal.realisticCeiling - car.startingGridPosition) * 0.1);
  } else {
    // Started in realistic range
    probabilityOfBeatingStartPosition = positionsGained >= 0 
      ? Math.min(0.65, 0.45 + positionsGained * 0.05)
      : Math.max(0.2, 0.45 + positionsGained * 0.1);
  }

  // Generate race profile summary
  const raceProfile = generateRaceProfileSummary(trackProfile, race);

  // ============================================================================
  // COMPREHENSIVE WARNING GENERATION
  // ============================================================================

  // --- Risk Profile Warnings ---
  if (car.riskProfile === 'aggressive') {
    warnings.push({
      type: 'strategy',
      severity: 'medium',
      message: 'Aggressive risk profile increases tire wear by 20%',
      detail: 'Higher degradation rate may require earlier pit stops or compromise late-stint pace',
    });

    if (trackProfile.overtakingDifficulty === 'hard') {
      warnings.push({
        type: 'strategy',
        severity: 'high',
        message: 'Aggressive driving on low-overtaking track is risky',
        detail: 'If you lose position due to tire wear, recovery will be very difficult',
      });
    }

    if (strategy.stints.some(s => s.tireCompound === 'SOFT' && s.lapsInStint > 12)) {
      warnings.push({
        type: 'tire',
        severity: 'high',
        message: 'Aggressive driving will shorten soft tire life significantly',
        detail: 'Soft tires may cliff early with aggressive driving style - consider shorter stint',
      });
    }
  }

  if (car.riskProfile === 'conservative') {
    warnings.push({
      type: 'strategy',
      severity: 'low',
      message: 'Conservative approach protects tires but limits overtaking',
      detail: 'Better tire life but 30% fewer overtaking attempts - good for track position races',
    });
  }

  // --- Pace Class vs Starting Position Warnings ---
  if (car.startingGridPosition < paceEffectFinal.realisticCeiling) {
    warnings.push({
      type: 'strategy',
      severity: 'high',
      message: `Starting P${car.startingGridPosition} is ahead of ${car.paceClass} pace ceiling (P${paceEffectFinal.realisticCeiling})`,
      detail: 'Expect to lose positions to faster cars during the race - focus on defensive strategy',
    });
  }

  if (car.startingGridPosition > paceEffectFinal.typicalFinish + 3) {
    warnings.push({
      type: 'strategy',
      severity: 'medium',
      message: `Starting P${car.startingGridPosition} is below typical ${car.paceClass} finish (P${paceEffectFinal.typicalFinish})`,
      detail: 'Room to gain positions if strategy and first lap execution go well',
    });
  }

  // --- Target Position Warnings ---
  if (car.targetMinPosition && car.targetMinPosition < paceEffectFinal.realisticCeiling) {
    warnings.push({
      type: 'strategy',
      severity: 'critical',
      message: `Target P${car.targetMinPosition} is unrealistic for ${car.paceClass} car`,
      detail: `Best realistic finish for ${car.paceClass} is P${paceEffectFinal.realisticCeiling} - adjust expectations`,
    });
  }

  // --- Weather & Tire Compound Warnings ---
  if (race.weather === 'hot') {
    warnings.push({
      type: 'weather',
      severity: 'medium',
      message: 'Hot conditions increase tire degradation by 25%',
      detail: 'Consider harder compounds or shorter stints to manage thermal degradation',
    });

    if (strategy.stints.some(s => s.tireCompound === 'SOFT' && s.lapsInStint > 10)) {
      warnings.push({
        type: 'tire',
        severity: 'high',
        message: 'Soft tires in hot conditions will degrade rapidly',
        detail: 'Expect significant pace drop-off after ~10 laps on softs in the heat',
      });
    }
  }

  if (race.weather === 'cool') {
    if (strategy.stints[0]?.tireCompound === 'HARD') {
      warnings.push({
        type: 'tire',
        severity: 'medium',
        message: 'Hard tires may struggle to warm up in cool conditions',
        detail: 'First few laps could have reduced grip - vulnerable on lap 1',
      });
    }
  }

  if (race.weather === 'wet') {
    warnings.push({
      type: 'weather',
      severity: 'medium',
      message: 'Wet conditions - reduced grip and visibility',
      detail: 'INTERMEDIATE or WET tires required. Watch for drying track creating crossover window.',
    });
  }

  // --- Stint Length Warnings ---
  for (const stint of strategy.stints) {
    // Very short stints
    if (stint.lapsInStint < 8 && stint.stintNumber > 1) {
      warnings.push({
        type: 'strategy',
        severity: 'medium',
        message: `Stint ${stint.stintNumber} is very short (${stint.lapsInStint} laps)`,
        detail: 'Short stints waste pit stop time - ensure this is intentional (e.g., safety car)',
      });
    }

    // Approaching tire cliff
    const tireProfile = TIRE_PROFILES[stint.tireCompound];
    if (stint.lapsInStint > tireProfile.cliffLap && stint.lapsInStint <= tireProfile.cliffLap * 1.3) {
      warnings.push({
        type: 'tire',
        severity: 'medium',
        message: `Stint ${stint.stintNumber} pushes ${stint.tireCompound} tires near cliff (${stint.lapsInStint}/${tireProfile.cliffLap} laps)`,
        detail: 'Pace will drop significantly in final laps - be prepared for pressure from behind',
      });
    }
  }

  // --- First Stint Specific Warnings ---
  const firstStint = strategy.stints[0];
  if (firstStint?.tireCompound === 'SOFT' && car.startingGridPosition > 10) {
    warnings.push({
      type: 'strategy',
      severity: 'medium',
      message: 'Starting on soft tires from back of grid',
      detail: 'Soft tires optimal for qualifying but may limit strategic flexibility - offset pit window from rivals',
    });
  }

  if (firstStint?.tireCompound === 'HARD' && car.startingGridPosition <= 5) {
    warnings.push({
      type: 'strategy',
      severity: 'medium',
      message: 'Starting on hard tires from front positions',
      detail: 'May lose positions early to cars on grippier compounds - requires track position defense',
    });
  }

  // --- Last Stint Warnings ---
  const lastStint = strategy.stints[strategy.stints.length - 1];
  if (lastStint?.tireCompound === 'SOFT' && lastStint.lapsInStint > 18) {
    warnings.push({
      type: 'tire',
      severity: 'high',
      message: 'Long final stint on soft tires',
      detail: 'Risk of severe degradation in closing laps when positions are hardest to recover',
    });
  }

  // --- Track-Specific Warnings ---
  for (const turn of trackProfile.criticalTurns) {
    if (turn.riskTags.includes('tire_stress') && strategy.stints.some(s => s.lapsInStint > 25)) {
      warnings.push({
        type: 'track',
        severity: 'medium',
        message: `${turn.name} (Turn ${turn.turnNumber}) may stress tires on longer stints`,
        detail: turn.note,
      });
    }
    if (turn.riskTags.includes('overtaking_zone') && trackProfile.overtakingDifficulty === 'hard') {
      warnings.push({
        type: 'track',
        severity: 'low',
        message: `${turn.name} is one of few overtaking opportunities`,
        detail: `${turn.note} - Focus defensive efforts here`,
      });
    }
  }

  // --- General Strategy Warnings ---
  if (strategy.stints.length === 1 && race.totalLaps > 40) {
    warnings.push({
      type: 'strategy',
      severity: 'high',
      message: 'Zero-stop strategy on long race is extremely risky',
      detail: 'No compound can realistically last this distance competitively',
    });
  }

  if (strategy.stints.length >= 3 && trackProfile.overtakingDifficulty === 'hard') {
    warnings.push({
      type: 'strategy',
      severity: 'high',
      message: 'Multiple pit stops on low-overtaking track',
      detail: 'Each stop risks losing positions that are nearly impossible to recover',
    });
  }

  if (strategy.stints.length >= 3 && trackProfile.overtakingDifficulty === 'medium') {
    warnings.push({
      type: 'strategy',
      severity: 'medium',
      message: 'Three or more stops increases track position risk',
      detail: 'Consider if fresh tire advantage outweighs time lost in pits',
    });
  }

  // --- Backmarker Specific Warnings ---
  if (car.paceClass === 'backmarker' && car.riskProfile === 'aggressive') {
    warnings.push({
      type: 'strategy',
      severity: 'medium',
      message: 'Aggressive strategy unlikely to overcome pace deficit',
      detail: 'Backmarker cars benefit more from conservative tire management and capitalizing on others\' mistakes',
    });
  }

  // --- Undercut/Overcut Opportunity Note ---
  if (trackProfile.overtakingDifficulty !== 'easy' && strategy.stints.length >= 2) {
    warnings.push({
      type: 'strategy',
      severity: 'low',
      message: 'Pit timing critical for position gains',
      detail: 'Undercut can gain 1-2 positions if pitting 1-2 laps before rivals on this track',
    });
  }

  // --- Traffic Warning ---
  if (car.startingGridPosition >= 8 && car.startingGridPosition <= 15) {
    warnings.push({
      type: 'traffic',
      severity: 'low',
      message: 'Starting in congested midfield',
      detail: 'Expect close racing and potential for minor contact - lap 1 positioning is crucial',
    });
  }

  return {
    totalRaceTime,
    predictedFinishPosition,
    predictedPositionRange: positionRange,
    positionsGained,
    probabilityOfPoints,
    probabilityOfBeatingStartPosition,
    stintMetrics,
    lapData,
    warnings,
    raceProfile,
    strategyLabel: strategy.label,
    totalPitStops: strategy.stints.length - 1,
    totalPitTimeLoss,
    raceConfig: race,
    carProfile: car,
    strategy,
  };
}

// ============================================================================
// RACE PROFILE SUMMARY GENERATION
// ============================================================================

function generateRaceProfileSummary(trackProfile: TrackProfile, race: RaceConfig): RaceProfileSummary {
  // Overtaking summary - based on difficulty rating
  let overtakingSummary: string;
  if (trackProfile.overtakingDifficulty === 'easy') {
    overtakingSummary = 'Easy overtaking (expect 2-4 on-track passes possible) - undercuts and strategy can pay off';
  } else if (trackProfile.overtakingDifficulty === 'medium') {
    overtakingSummary = 'Moderate overtaking (expect 1-2 on-track passes possible) - track position matters but strategy helps';
  } else {
    overtakingSummary = 'Hard overtaking (0-1 on-track passes likely) - track position is critical, avoid losing places in pits';
  }

  // Aero description
  const aeroDescriptions: Record<string, string> = {
    downforce_reliant: 'High downforce track - focus on mechanical grip and corner speed',
    drag_reliant: 'Low downforce track - top speed and DRS zones are crucial',
    balanced: 'Balanced aerodynamic requirements - versatile setup options',
  };

  // Previous winner summary
  let previousWinnerSummary: string | undefined;
  if (trackProfile.previousWinnerStrategy) {
    const pw = trackProfile.previousWinnerStrategy;
    const stintSummary = pw.stints.map(s => `${s.tireCompound}(${s.laps})`).join(' → ');
    previousWinnerSummary = `${pw.year}: ${pw.label} - ${stintSummary}`;
  }

  // Critical turns summary
  const criticalTurnsSummary = trackProfile.criticalTurns.map(
    t => `Turn ${t.turnNumber} (${t.name}): ${t.note}`
  );

  return {
    overtakingChanceSummary: overtakingSummary,
    aeroClassification: trackProfile.aeroClassification,
    aeroDescription: aeroDescriptions[trackProfile.aeroClassification],
    previousWinnerSummary,
    criticalTurnsSummary,
  };
}

