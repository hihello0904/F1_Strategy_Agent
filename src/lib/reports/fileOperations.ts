// ============================================================================
// File Operations Module - Reports & Logs
// ============================================================================

import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  UserInput,
  SimulationResult,
  DSLParseResult,
  FullReport,
  ReportMetadata,
} from '../types';

// --- Constants ---

const REPORTS_DIR = 'reports';
const LOGS_DIR = 'logs';
const AUDIT_LOG_FILE = 'strategy_runs.log';

// --- Directory Setup ---

async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

async function getReportsPath(): Promise<string> {
  const reportsPath = path.join(process.cwd(), REPORTS_DIR);
  await ensureDirectory(reportsPath);
  return reportsPath;
}

async function getLogsPath(): Promise<string> {
  const logsPath = path.join(process.cwd(), LOGS_DIR);
  await ensureDirectory(logsPath);
  return logsPath;
}

// --- Report Generation ---

export interface SaveReportResult {
  success: boolean;
  reportId?: string;
  reportPath?: string;
  error?: string;
}

export async function saveReport(
  userInput: UserInput,
  rawDSL: string,
  parseResult: DSLParseResult,
  simulationResult?: SimulationResult
): Promise<SaveReportResult> {
  try {
    const reportsPath = await getReportsPath();
    const reportId = `${Date.now()}-${uuidv4().slice(0, 8)}`;
    const timestamp = new Date().toISOString();

    // Build report metadata
    const metadata: ReportMetadata = {
      id: reportId,
      timestamp,
      userInput,
      strategyLabel: simulationResult?.strategyLabel || parseResult.data?.strategy.label || 'Unknown',
      predictedFinish: simulationResult?.predictedFinishPosition || 0,
      success: parseResult.success && !!simulationResult,
    };

    // Build full report
    const fullReport: FullReport = {
      metadata,
      rawDSL,
      parsedPlanSummary: {
        raceConfig: parseResult.data?.raceConfig || {
          trackName: userInput.trackName,
          totalLaps: userInput.totalLaps,
          weather: userInput.weather,
          fieldSize: userInput.fieldSize,
        },
        carProfile: parseResult.data?.carProfile || {
          startingGridPosition: userInput.startingGridPosition,
          paceClass: userInput.paceClass,
          riskProfile: userInput.riskProfile,
          targetMinPosition: userInput.targetMinPosition,
        },
        strategyLabel: simulationResult?.strategyLabel || 'N/A',
        stints: parseResult.data?.strategy.stints.map(s => ({
          tire: s.tireCompound,
          laps: s.lapsInStint,
        })) || [],
      },
      simulationResult,
      errors: parseResult.errors,
      warnings: parseResult.warnings,
    };

    // Save JSON report
    const jsonPath = path.join(reportsPath, `${reportId}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(fullReport, null, 2), 'utf-8');

    // Save human-readable text report
    const textPath = path.join(reportsPath, `${reportId}.txt`);
    const textReport = generateTextReport(fullReport);
    await fs.writeFile(textPath, textReport, 'utf-8');

    // Save CSV lap data if simulation was successful
    if (simulationResult?.lapData) {
      const csvPath = path.join(reportsPath, `${reportId}-laps.csv`);
      const csvData = generateLapDataCSV(simulationResult);
      await fs.writeFile(csvPath, csvData, 'utf-8');
    }

    // Append to audit log
    await appendToAuditLog(metadata, userInput, simulationResult);

    return {
      success: true,
      reportId,
      reportPath: jsonPath,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error saving report:', errorMessage);
    return {
      success: false,
      error: `Failed to save report: ${errorMessage}`,
    };
  }
}

// --- Text Report Generation ---

function generateTextReport(report: FullReport): string {
  const lines: string[] = [];
  const divider = '═'.repeat(60);
  const subDivider = '─'.repeat(60);

  lines.push(divider);
  lines.push('F1 STRATEGY AGENT - SIMULATION REPORT');
  lines.push(divider);
  lines.push('');

  // Metadata
  lines.push(`Report ID: ${report.metadata.id}`);
  lines.push(`Generated: ${report.metadata.timestamp}`);
  lines.push(`Status: ${report.metadata.success ? 'SUCCESS' : 'FAILED'}`);
  lines.push('');

  // User Input
  lines.push(subDivider);
  lines.push('USER INPUT');
  lines.push(subDivider);
  lines.push(`Track: ${report.metadata.userInput.trackName}`);
  lines.push(`Total Laps: ${report.metadata.userInput.totalLaps}`);
  lines.push(`Weather: ${report.metadata.userInput.weather}`);
  lines.push(`Starting Position: P${report.metadata.userInput.startingGridPosition}`);
  lines.push(`Car Pace: ${report.metadata.userInput.paceClass}`);
  lines.push(`Risk Profile: ${report.metadata.userInput.riskProfile}`);
  lines.push(`Query: ${report.metadata.userInput.naturalLanguageQuery}`);
  lines.push('');

  // Strategy Summary
  lines.push(subDivider);
  lines.push('STRATEGY');
  lines.push(subDivider);
  lines.push(`Label: ${report.parsedPlanSummary.strategyLabel}`);
  lines.push('Stints:');
  for (const stint of report.parsedPlanSummary.stints) {
    lines.push(`  - ${stint.tire} for ${stint.laps} laps`);
  }
  lines.push('');

  // Simulation Results
  if (report.simulationResult) {
    const sim = report.simulationResult;
    lines.push(subDivider);
    lines.push('SIMULATION RESULTS');
    lines.push(subDivider);
    lines.push(`Predicted Finish: P${sim.predictedFinishPosition}`);
    lines.push(`Position Range: P${sim.predictedPositionRange.min} - P${sim.predictedPositionRange.max}`);
    lines.push(`Positions Gained/Lost: ${sim.positionsGained >= 0 ? '+' : ''}${sim.positionsGained}`);
    lines.push(`Total Race Time: ${formatTime(sim.totalRaceTime)}`);
    lines.push(`Pit Stops: ${sim.totalPitStops}`);
    lines.push(`Total Pit Time Loss: ${sim.totalPitTimeLoss.toFixed(1)}s`);
    lines.push(`Probability of Points: ${(sim.probabilityOfPoints * 100).toFixed(0)}%`);
    lines.push('');

    // Stint Metrics
    lines.push('STINT METRICS:');
    for (const stint of sim.stintMetrics) {
      lines.push(`  Stint ${stint.stintNumber} (${stint.tireCompound}):`);
      lines.push(`    Laps: ${stint.totalLaps}`);
      lines.push(`    Avg Lap: ${stint.avgLapTime.toFixed(3)}s`);
      lines.push(`    Best Lap: ${stint.bestLapTime.toFixed(3)}s`);
      lines.push(`    Degradation Loss: ${stint.totalDegradationLoss.toFixed(2)}s`);
      lines.push(`    Positions: P${stint.startPosition} → P${stint.endPosition}`);
    }
    lines.push('');

    // Warnings
    if (sim.warnings.length > 0) {
      lines.push(subDivider);
      lines.push('WARNINGS');
      lines.push(subDivider);
      for (const warning of sim.warnings) {
        lines.push(`[${warning.severity.toUpperCase()}] ${warning.type}: ${warning.message}`);
        if (warning.detail) {
          lines.push(`  → ${warning.detail}`);
        }
      }
      lines.push('');
    }
  }

  // Errors
  if (report.errors.length > 0) {
    lines.push(subDivider);
    lines.push('ERRORS');
    lines.push(subDivider);
    for (const error of report.errors) {
      lines.push(`Line ${error.line}: ${error.message}`);
    }
    lines.push('');
  }

  // Raw DSL
  lines.push(subDivider);
  lines.push('RAW DSL OUTPUT');
  lines.push(subDivider);
  lines.push(report.rawDSL);
  lines.push('');

  lines.push(divider);
  lines.push('END OF REPORT');
  lines.push(divider);

  return lines.join('\n');
}

// --- CSV Generation ---

function generateLapDataCSV(result: SimulationResult): string {
  const headers = [
    'Lap',
    'Stint',
    'Tire',
    'LapTime',
    'TireWear',
    'FuelLoad',
    'TrafficPenalty',
    'Position',
    'Event',
  ];

  const rows = result.lapData.map(lap => [
    lap.lapNumber,
    lap.stintNumber,
    lap.tireCompound,
    lap.lapTime.toFixed(3),
    (lap.tireWear * 100).toFixed(1) + '%',
    lap.fuelLoad.toFixed(1),
    lap.trafficPenalty.toFixed(3),
    lap.position,
    lap.event || '',
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

// --- Audit Log ---

async function appendToAuditLog(
  metadata: ReportMetadata,
  userInput: UserInput,
  simulationResult?: SimulationResult
): Promise<void> {
  try {
    const logsPath = await getLogsPath();
    const logPath = path.join(logsPath, AUDIT_LOG_FILE);

    const logEntry = {
      timestamp: metadata.timestamp,
      reportId: metadata.id,
      success: metadata.success,
      track: userInput.trackName,
      startPosition: userInput.startingGridPosition,
      predictedFinish: simulationResult?.predictedFinishPosition || null,
      strategy: metadata.strategyLabel,
      query: userInput.naturalLanguageQuery.slice(0, 100),
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    await fs.appendFile(logPath, logLine, 'utf-8');
  } catch (err) {
    console.error('Failed to append to audit log:', err);
    // Don't throw - audit log failure shouldn't break the main flow
  }
}

// --- Report Retrieval ---

export interface ReportFile {
  id: string;
  timestamp: string;
  filename: string;
  type: 'json' | 'txt' | 'csv';
}

export async function listReports(): Promise<ReportFile[]> {
  try {
    const reportsPath = await getReportsPath();
    const files = await fs.readdir(reportsPath);

    const reports: ReportFile[] = [];
    for (const file of files) {
      const match = file.match(/^(\d+-[\w-]+)\.(json|txt|csv)$/);
      if (match) {
        const [, id, type] = match;
        const stats = await fs.stat(path.join(reportsPath, file));
        reports.push({
          id,
          timestamp: stats.mtime.toISOString(),
          filename: file,
          type: type as 'json' | 'txt' | 'csv',
        });
      }
    }

    // Sort by timestamp descending
    reports.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return reports;
  } catch {
    return [];
  }
}

export async function getReportContent(
  reportId: string,
  type: 'json' | 'txt' | 'csv' = 'json'
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const reportsPath = await getReportsPath();
    const filename = type === 'csv' ? `${reportId}-laps.csv` : `${reportId}.${type}`;
    const filePath = path.join(reportsPath, filename);

    const content = await fs.readFile(filePath, 'utf-8');
    return { success: true, content };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: `Failed to read report: ${errorMessage}` };
  }
}

export async function deleteReport(reportId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const reportsPath = await getReportsPath();
    
    // Delete all files associated with this report
    const extensions = ['json', 'txt'];
    for (const ext of extensions) {
      try {
        await fs.unlink(path.join(reportsPath, `${reportId}.${ext}`));
      } catch {
        // File might not exist, that's okay
      }
    }

    // Also try to delete CSV file
    try {
      await fs.unlink(path.join(reportsPath, `${reportId}-laps.csv`));
    } catch {
      // CSV might not exist
    }

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: `Failed to delete report: ${errorMessage}` };
  }
}

// --- Utility ---

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = (seconds % 60).toFixed(3);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

