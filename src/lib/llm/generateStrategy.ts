// ============================================================================
// LLM Integration Module - Gemini (with OpenAI backup)
// ============================================================================

// PROVIDER TOGGLE - Change this to switch between Gemini and OpenAI
const LLM_PROVIDER: 'gemini' | 'openai' = 'openai';

import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { UserInput } from '../types';
import { DSL_SPECIFICATION, DSL_EXAMPLE_MONZA, DSL_EXAMPLE_MONACO } from '../dsl/specification';

// --- Types ---

export interface LLMResult {
  success: boolean;
  dsl?: string;
  error?: string;
  errorType?: 'api_error' | 'rate_limit' | 'network_error' | 'timeout' | 'invalid_response';
}

// --- Configuration ---

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const TIMEOUT_MS = 60000;

// --- Prompt Construction ---

function buildSystemPrompt(): string {
  return `You are an expert F1 race strategy engineer. Your ONLY job is to output race strategy in a specific DSL (Domain-Specific Language) format.

CRITICAL RULES:
1. Output ONLY valid DSL. No explanations, no markdown, no commentary.
2. Follow the DSL specification EXACTLY.
3. Total stint laps MUST equal race laps.
4. Consider the car's pace class when setting strategy aggressiveness.
5. Account for track characteristics (aero, overtaking difficulty).
6. Match tire selection to weather conditions.
7. For wet weather, use INTERMEDIATE or WET tires.

${DSL_SPECIFICATION}

EXAMPLE OUTPUT FOR MONZA:
${DSL_EXAMPLE_MONZA}

EXAMPLE OUTPUT FOR MONACO:
${DSL_EXAMPLE_MONACO}

Remember: Output ONLY the DSL, nothing else. No explanations before or after.`;
}

function buildUserPrompt(input: UserInput): string {
  const parts: string[] = [];

  parts.push(`Generate an F1 race strategy DSL for the following scenario:`);
  parts.push('');
  parts.push(`Track: ${input.trackName}`);
  parts.push(`Total Laps: ${input.totalLaps}`);
  parts.push(`Weather: ${input.weather}`);
  parts.push(`Field Size: ${input.fieldSize}`);
  parts.push(`Starting Position: P${input.startingGridPosition}`);
  parts.push(`Car Pace Class: ${input.paceClass}`);
  parts.push(`Overtaking Difficulty: ${input.overtakingDifficulty}`);
  parts.push(`Risk Profile: ${input.riskProfile}`);
  
  if (input.targetMinPosition) {
    parts.push(`Target Minimum Position: P${input.targetMinPosition}`);
  }

  parts.push('');
  parts.push(`User Request: ${input.naturalLanguageQuery}`);
  parts.push('');
  parts.push('Generate the complete DSL output now. Remember:');
  parts.push('- Total stint laps MUST equal race laps exactly');
  parts.push('- Include CRITICAL_TURNS and PREVIOUS_WINNER sections');
  parts.push('- Output ONLY valid DSL, no other text');

  return parts.join('\n');
}

// --- Utility ---

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function validateAndExtractDSL(content: string): LLMResult {
  if (!content || content.trim() === '') {
    return {
      success: false,
      error: 'Empty response from LLM',
      errorType: 'invalid_response',
    };
  }

  // Basic validation that it looks like DSL
  const trimmed = content.trim();
  if (!trimmed.toUpperCase().startsWith('RACE')) {
    // Try to extract DSL if it's wrapped in markdown code blocks
    const codeBlockMatch = trimmed.match(/```(?:\w*\n)?([\s\S]*?)```/);
    if (codeBlockMatch && codeBlockMatch[1].trim().toUpperCase().startsWith('RACE')) {
      return {
        success: true,
        dsl: codeBlockMatch[1].trim(),
      };
    }

    return {
      success: false,
      error: 'LLM response does not appear to be valid DSL (should start with RACE)',
      errorType: 'invalid_response',
    };
  }

  return {
    success: true,
    dsl: trimmed,
  };
}

// ============================================================================
// GEMINI IMPLEMENTATION
// ============================================================================

function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  return new GoogleGenerativeAI(apiKey);
}

async function callGeminiWithRetry(
  systemPrompt: string,
  userPrompt: string,
  retries: number = MAX_RETRIES
): Promise<LLMResult> {
  let lastError: Error | null = null;
  let backoffMs = INITIAL_BACKOFF_MS;

  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2000,
    },
  });

  // Combine system and user prompts for Gemini
  const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const content = response.text();

      return validateAndExtractDSL(content);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const errorMessage = lastError.message.toLowerCase();

      // Check for rate limit
      if (errorMessage.includes('rate') || errorMessage.includes('quota') || errorMessage.includes('429')) {
        if (attempt < retries) {
          console.log(`Rate limited, retrying in ${backoffMs}ms (attempt ${attempt}/${retries})`);
          await sleep(backoffMs);
          backoffMs *= 2;
          continue;
        }
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again in a few moments.',
          errorType: 'rate_limit',
        };
      }

      // Check for network errors
      if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('connection')) {
        if (attempt < retries) {
          console.log(`Connection error, retrying in ${backoffMs}ms (attempt ${attempt}/${retries})`);
          await sleep(backoffMs);
          backoffMs *= 2;
          continue;
        }
        return {
          success: false,
          error: 'Network connection error. Please check your internet connection.',
          errorType: 'network_error',
        };
      }

      // Other errors - don't retry
      return {
        success: false,
        error: `API error: ${lastError.message}`,
        errorType: 'api_error',
      };
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Unknown error after retries',
    errorType: 'api_error',
  };
}

// ============================================================================
// OPENAI IMPLEMENTATION (BACKUP)
// ============================================================================

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  return new OpenAI({
    apiKey,
    timeout: TIMEOUT_MS,
  });
}

async function callOpenAIWithRetry(
  client: OpenAI,
  systemPrompt: string,
  userPrompt: string,
  retries: number = MAX_RETRIES
): Promise<LLMResult> {
  let lastError: Error | null = null;
  let backoffMs = INITIAL_BACKOFF_MS;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content || '';
      return validateAndExtractDSL(content);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (err instanceof OpenAI.RateLimitError) {
        if (attempt < retries) {
          console.log(`Rate limited, retrying in ${backoffMs}ms (attempt ${attempt}/${retries})`);
          await sleep(backoffMs);
          backoffMs *= 2;
          continue;
        }
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again in a few moments.',
          errorType: 'rate_limit',
        };
      }

      if (err instanceof OpenAI.APIConnectionError) {
        if (attempt < retries) {
          console.log(`Connection error, retrying in ${backoffMs}ms (attempt ${attempt}/${retries})`);
          await sleep(backoffMs);
          backoffMs *= 2;
          continue;
        }
        return {
          success: false,
          error: 'Network connection error. Please check your internet connection.',
          errorType: 'network_error',
        };
      }

      if (err instanceof OpenAI.APIError) {
        return {
          success: false,
          error: `API error: ${err.message}`,
          errorType: 'api_error',
        };
      }

      return {
        success: false,
        error: lastError.message,
        errorType: 'api_error',
      };
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Unknown error after retries',
    errorType: 'api_error',
  };
}

// ============================================================================
// MAIN EXPORT - Routes to selected provider
// ============================================================================

export async function generateStrategyDSL(input: UserInput): Promise<LLMResult> {
  try {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(input);

    if (LLM_PROVIDER === 'gemini') {
      console.log('Calling Gemini API to generate strategy DSL...');
      const result = await callGeminiWithRetry(systemPrompt, userPrompt);

      if (result.success) {
        console.log('Successfully received DSL from Gemini');
      } else {
        console.error('Gemini call failed:', result.error);
      }

      return result;
    } else {
      console.log('Calling OpenAI API to generate strategy DSL...');
      const client = getOpenAIClient();
      const result = await callOpenAIWithRetry(client, systemPrompt, userPrompt);

      if (result.success) {
        console.log('Successfully received DSL from OpenAI');
      } else {
        console.error('OpenAI call failed:', result.error);
      }

      return result;
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in generateStrategyDSL:', errorMessage);
    
    return {
      success: false,
      error: errorMessage,
      errorType: 'api_error',
    };
  }
}

// --- Export prompts for testing/debugging ---

export function getPrompts(input: UserInput): { system: string; user: string } {
  return {
    system: buildSystemPrompt(),
    user: buildUserPrompt(input),
  };
}

// --- Export current provider for UI display ---
export function getCurrentProvider(): string {
  return LLM_PROVIDER;
}
