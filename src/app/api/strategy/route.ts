// ============================================================================
// POST /api/strategy - Main Strategy Generation Endpoint
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { UserInput, StrategyAPIResponse } from '@/lib/types';
import { generateStrategyDSL } from '@/lib/llm/generateStrategy';
import { parseStrategyDSL, validateParsedDSL } from '@/lib/dsl/parseStrategy';
import { simulateRace } from '@/lib/simulate/simulateRace';
import { saveReport } from '@/lib/reports/fileOperations';

// --- Input Validation ---

function validateUserInput(input: unknown): { valid: boolean; errors: string[]; data?: UserInput } {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Invalid input: expected object'] };
  }

  const data = input as Record<string, unknown>;

  // Required fields
  if (!data.trackName || typeof data.trackName !== 'string') {
    errors.push('trackName is required and must be a string');
  }

  if (!data.totalLaps || typeof data.totalLaps !== 'number' || data.totalLaps < 1 || data.totalLaps > 100) {
    errors.push('totalLaps is required and must be a number between 1 and 100');
  }

  const validWeather = ['cool', 'normal', 'hot', 'wet'];
  if (!data.weather || !validWeather.includes(data.weather as string)) {
    errors.push(`weather must be one of: ${validWeather.join(', ')}`);
  }

  if (
    !data.startingGridPosition ||
    typeof data.startingGridPosition !== 'number' ||
    data.startingGridPosition < 1
  ) {
    errors.push('startingGridPosition is required and must be a positive number');
  }

  if (!data.fieldSize || typeof data.fieldSize !== 'number' || data.fieldSize < 2 || data.fieldSize > 30) {
    errors.push('fieldSize is required and must be between 2 and 30');
  }

  const validPaceClass = ['front_runner', 'midfield', 'backmarker'];
  if (!data.paceClass || !validPaceClass.includes(data.paceClass as string)) {
    errors.push(`paceClass must be one of: ${validPaceClass.join(', ')}`);
  }

  const validOvertaking = ['easy', 'medium', 'hard'];
  if (!data.overtakingDifficulty || !validOvertaking.includes(data.overtakingDifficulty as string)) {
    errors.push(`overtakingDifficulty must be one of: ${validOvertaking.join(', ')}`);
  }

  const validRisk = ['conservative', 'balanced', 'aggressive'];
  if (!data.riskProfile || !validRisk.includes(data.riskProfile as string)) {
    errors.push(`riskProfile must be one of: ${validRisk.join(', ')}`);
  }

  if (!data.naturalLanguageQuery || typeof data.naturalLanguageQuery !== 'string') {
    errors.push('naturalLanguageQuery is required');
  }

  // Validate startingGridPosition vs fieldSize
  if (
    typeof data.startingGridPosition === 'number' &&
    typeof data.fieldSize === 'number' &&
    data.startingGridPosition > data.fieldSize
  ) {
    errors.push('startingGridPosition cannot exceed fieldSize');
  }

  // Optional targetMinPosition validation
  if (data.targetMinPosition !== undefined) {
    if (typeof data.targetMinPosition !== 'number' || data.targetMinPosition < 1) {
      errors.push('targetMinPosition must be a positive number if provided');
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      trackName: data.trackName as string,
      totalLaps: data.totalLaps as number,
      weather: data.weather as UserInput['weather'],
      startingGridPosition: data.startingGridPosition as number,
      fieldSize: data.fieldSize as number,
      paceClass: data.paceClass as UserInput['paceClass'],
      overtakingDifficulty: data.overtakingDifficulty as UserInput['overtakingDifficulty'],
      riskProfile: data.riskProfile as UserInput['riskProfile'],
      targetMinPosition: data.targetMinPosition as number | undefined,
      naturalLanguageQuery: data.naturalLanguageQuery as string,
    },
  };
}

// --- Main Handler ---

export async function POST(request: NextRequest): Promise<NextResponse<StrategyAPIResponse>> {
  const timestamp = new Date().toISOString();

  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
          errorType: 'validation_error',
          timestamp,
        },
        { status: 400 }
      );
    }

    // Extract userInput from body
    const inputData = (body as { userInput?: unknown })?.userInput || body;

    // Validate input
    const validation = validateUserInput(inputData);
    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        {
          success: false,
          error: `Validation errors: ${validation.errors.join('; ')}`,
          errorType: 'validation_error',
          timestamp,
        },
        { status: 400 }
      );
    }

    const userInput = validation.data;

    console.log('Processing strategy request for:', userInput.trackName);

    // Step 1: Call LLM to generate DSL
    console.log('Step 1: Generating strategy DSL via LLM...');
    const llmResult = await generateStrategyDSL(userInput);

    if (!llmResult.success || !llmResult.dsl) {
      // Save error report
      await saveReport(userInput, llmResult.dsl || 'LLM_ERROR: No DSL generated', {
        success: false,
        errors: [{ line: 0, message: llmResult.error || 'LLM failed to generate DSL' }],
        warnings: [],
        rawDSL: '',
      });

      return NextResponse.json(
        {
          success: false,
          error: llmResult.error || 'Failed to generate strategy from LLM',
          errorType: 'llm_error',
          timestamp,
        },
        { status: 502 }
      );
    }

    console.log('Step 2: Parsing DSL...');
    
    // Step 2: Parse DSL
    const parseResult = parseStrategyDSL(llmResult.dsl);

    if (!parseResult.success || !parseResult.data) {
      // Save parse error report
      const reportResult = await saveReport(userInput, llmResult.dsl, parseResult);

      return NextResponse.json(
        {
          success: false,
          parseResult,
          error: `DSL parsing failed: ${parseResult.errors.map((e) => e.message).join('; ')}`,
          errorType: 'parse_error',
          reportId: reportResult.reportId,
          timestamp,
        },
        { status: 422 }
      );
    }

    // Validate parsed data ranges
    const validationIssues = validateParsedDSL(parseResult.data);
    if (validationIssues.length > 0) {
      parseResult.warnings.push(...validationIssues);
    }

    console.log('Step 3: Running simulation...');

    // Step 3: Run simulation
    let simulationResult;
    try {
      simulationResult = simulateRace(
        parseResult.data.raceConfig,
        parseResult.data.carProfile,
        parseResult.data.strategy,
        parseResult.data.trackProfile
      );
    } catch (simError) {
      const errorMessage = simError instanceof Error ? simError.message : 'Unknown simulation error';

      // Save simulation error report
      const reportResult = await saveReport(userInput, llmResult.dsl, parseResult);

      return NextResponse.json(
        {
          success: false,
          parseResult,
          error: `Simulation failed: ${errorMessage}`,
          errorType: 'simulation_error',
          reportId: reportResult.reportId,
          timestamp,
        },
        { status: 500 }
      );
    }

    console.log('Step 4: Saving report...');

    // Step 4: Save report
    const reportResult = await saveReport(userInput, llmResult.dsl, parseResult, simulationResult);

    if (!reportResult.success) {
      // Log the error but don't fail the request
      console.error('Warning: Failed to save report:', reportResult.error);
    }

    console.log('Strategy generation completed successfully');

    // Return success response
    return NextResponse.json({
      success: true,
      simulationResult,
      parseResult,
      reportId: reportResult.reportId,
      reportUrl: reportResult.reportId ? `/api/reports/${reportResult.reportId}` : undefined,
      timestamp,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown server error';
    console.error('Unexpected error in strategy endpoint:', errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: `Server error: ${errorMessage}`,
        errorType: 'simulation_error',
        timestamp,
      },
      { status: 500 }
    );
  }
}

