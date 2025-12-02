'use client';

import { SimulationResult, TireCompound } from '@/lib/types';

interface ResultsDisplayProps {
  result: SimulationResult;
  reportId?: string;
}

function getTireColorClass(compound: TireCompound): string {
  switch (compound) {
    case 'SOFT':
      return 'tire-soft';
    case 'MEDIUM':
      return 'tire-medium';
    case 'HARD':
      return 'tire-hard';
    case 'INTERMEDIATE':
      return 'tire-intermediate';
    case 'WET':
      return 'tire-wet';
    default:
      return '';
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(3);
  return mins > 0 ? `${mins}:${secs.padStart(6, '0')}` : `${secs}s`;
}

function formatRaceTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${mins}m ${secs}s`;
  }
  return `${mins}m ${secs}s`;
}

export default function ResultsDisplay({ result, reportId }: ResultsDisplayProps) {
  const positionChange = result.positionsGained;
  const positionChangeText =
    positionChange > 0
      ? `+${positionChange} positions`
      : positionChange < 0
        ? `${positionChange} positions`
        : 'No change';
  const positionChangeColor =
    positionChange > 0 ? 'text-f1-success' : positionChange < 0 ? 'text-f1-danger' : 'text-f1-lightGray';

  return (
    <div className="space-y-6 stagger-children">
      {/* Summary Card */}
      <div className="f1-card p-6 racing-stripe">
        <div className="pl-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">{result.strategyLabel}</h3>
            {reportId && (
              <div className="flex gap-2">
                <a
                  href={`/api/reports/${reportId}?format=txt`}
                  download
                  className="text-sm text-f1-lightGray hover:text-f1-white transition-colors"
                >
                  📄 TXT
                </a>
                <a
                  href={`/api/reports/${reportId}?format=csv`}
                  download
                  className="text-sm text-f1-lightGray hover:text-f1-white transition-colors"
                >
                  📊 CSV
                </a>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Predicted Finish */}
            <div className="text-center">
              <div className="position-indicator mx-auto mb-2">P{result.predictedFinishPosition}</div>
              <p className="text-sm text-f1-lightGray">Predicted Finish</p>
              <p className="text-xs text-f1-lightGray mt-1">
                Range: P{result.predictedPositionRange.min}-P{result.predictedPositionRange.max}
              </p>
            </div>

            {/* Position Change */}
            <div className="text-center">
              <div className={`text-3xl font-bold ${positionChangeColor}`}>
                {positionChange > 0 ? '↑' : positionChange < 0 ? '↓' : '→'}
              </div>
              <p className={`text-sm font-medium ${positionChangeColor}`}>{positionChangeText}</p>
              <p className="text-xs text-f1-lightGray mt-1">from P{result.carProfile.startingGridPosition}</p>
            </div>

            {/* Points Probability */}
            <div className="text-center">
              <div className="text-3xl font-bold text-f1-success">
                {Math.round(result.probabilityOfPoints * 100)}%
              </div>
              <p className="text-sm text-f1-lightGray">Points Chance</p>
              <p className="text-xs text-f1-lightGray mt-1">Top 10 finish</p>
            </div>

            {/* Race Time */}
            <div className="text-center">
              <div className="text-2xl font-bold font-mono">{formatRaceTime(result.totalRaceTime)}</div>
              <p className="text-sm text-f1-lightGray">Total Time</p>
              <p className="text-xs text-f1-lightGray mt-1">
                {result.totalPitStops} pit stop{result.totalPitStops !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stint Breakdown */}
      <div className="f1-card p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="w-3 h-3 bg-f1-red rounded-full" />
          Stint Breakdown
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-f1-lightGray border-b border-f1-mediumGray">
                <th className="text-left py-3 px-2">Stint</th>
                <th className="text-left py-3 px-2">Tire</th>
                <th className="text-center py-3 px-2">Laps</th>
                <th className="text-center py-3 px-2">Avg Lap</th>
                <th className="text-center py-3 px-2">Best Lap</th>
                <th className="text-center py-3 px-2">Deg Loss</th>
                <th className="text-center py-3 px-2">Positions</th>
              </tr>
            </thead>
            <tbody>
              {result.stintMetrics.map((stint) => (
                <tr key={stint.stintNumber} className="border-b border-f1-mediumGray/30 hover:bg-f1-mediumGray/20">
                  <td className="py-3 px-2 font-medium">Stint {stint.stintNumber}</td>
                  <td className={`py-3 px-2 font-bold ${getTireColorClass(stint.tireCompound)}`}>
                    {stint.tireCompound}
                  </td>
                  <td className="py-3 px-2 text-center">{stint.totalLaps}</td>
                  <td className="py-3 px-2 text-center font-mono">{formatTime(stint.avgLapTime)}</td>
                  <td className="py-3 px-2 text-center font-mono text-f1-success">{formatTime(stint.bestLapTime)}</td>
                  <td className="py-3 px-2 text-center font-mono text-f1-danger">+{stint.totalDegradationLoss.toFixed(1)}s</td>
                  <td className="py-3 px-2 text-center">
                    P{stint.startPosition} → P{stint.endPosition}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td className="py-3 px-2">Total</td>
                <td className="py-3 px-2">-</td>
                <td className="py-3 px-2 text-center">{result.raceConfig.totalLaps}</td>
                <td className="py-3 px-2 text-center">-</td>
                <td className="py-3 px-2 text-center">-</td>
                <td className="py-3 px-2 text-center">-</td>
                <td className="py-3 px-2 text-center">
                  P{result.carProfile.startingGridPosition} → P{result.predictedFinishPosition}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Race Profile */}
      <div className="f1-card p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="w-3 h-3 bg-f1-accent rounded-full" />
          Race Profile
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Aero Classification with Visual Slider */}
          <div className="bg-f1-mediumGray/30 rounded-lg p-4">
            <h4 className="text-sm font-medium text-f1-lightGray mb-3">Aero Classification</h4>
            
            {/* Visual Slider Indicator */}
            <div className="mb-3">
              <div className="relative h-2 bg-gradient-to-r from-blue-500 via-gray-500 to-red-500 rounded-full">
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-f1-darkGray shadow-lg transition-all"
                  style={{
                    left: result.raceProfile.aeroClassification === 'drag_reliant' 
                      ? '0%' 
                      : result.raceProfile.aeroClassification === 'balanced' 
                        ? '50%' 
                        : '100%',
                    transform: `translateX(-50%) translateY(-50%)`
                  }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs">
                <span className={`${result.raceProfile.aeroClassification === 'drag_reliant' ? 'text-white font-bold' : 'text-f1-lightGray'}`}>
                  Drag
                </span>
                <span className={`${result.raceProfile.aeroClassification === 'balanced' ? 'text-white font-bold' : 'text-f1-lightGray'}`}>
                  Balanced
                </span>
                <span className={`${result.raceProfile.aeroClassification === 'downforce_reliant' ? 'text-white font-bold' : 'text-f1-lightGray'}`}>
                  Downforce
                </span>
              </div>
            </div>
            
            <p className="text-sm text-f1-lightGray">{result.raceProfile.aeroDescription}</p>
          </div>

          {/* Overtaking with Large Red Classification */}
          <div className="bg-f1-mediumGray/30 rounded-lg p-4">
            <h4 className="text-sm font-medium text-f1-lightGray mb-2">Overtaking</h4>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl font-bold text-f1-red uppercase tracking-wide">
                {result.raceProfile.overtakingChanceSummary.includes('Easy') || result.raceProfile.overtakingChanceSummary.toLowerCase().includes('easy')
                  ? 'Easy'
                  : result.raceProfile.overtakingChanceSummary.includes('Hard') || result.raceProfile.overtakingChanceSummary.toLowerCase().includes('hard') || result.raceProfile.overtakingChanceSummary.toLowerCase().includes('difficult')
                    ? 'Hard'
                    : 'Moderate'}
              </span>
            </div>
            <p className="text-sm text-f1-lightGray">{result.raceProfile.overtakingChanceSummary}</p>
          </div>

          {result.raceProfile.previousWinnerSummary && (
            <div className="md:col-span-2 bg-f1-mediumGray/30 rounded-lg p-4">
              <h4 className="text-sm font-medium text-f1-lightGray mb-2">Previous Winner Strategy</h4>
              <p className="font-medium">{result.raceProfile.previousWinnerSummary}</p>
            </div>
          )}
        </div>

        {result.raceProfile.criticalTurnsSummary.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-f1-lightGray mb-2">Critical Turns</h4>
            <ul className="space-y-2">
              {result.raceProfile.criticalTurnsSummary.map((turn, idx) => (
                <li key={idx} className="text-sm bg-f1-mediumGray/20 rounded px-3 py-2">
                  {turn}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

