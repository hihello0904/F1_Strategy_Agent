'use client';

import { useState, useCallback } from 'react';
import { UserInput, StrategyAPIResponse, SimulationResult } from '@/lib/types';
import StrategyForm from '@/components/StrategyForm';
import ResultsDisplay from '@/components/ResultsDisplay';
import WarningsPanel from '@/components/WarningsPanel';
import LapTimeChart from '@/components/LapTimeChart';
import TireWearChart from '@/components/TireWearChart';
import PositionChart from '@/components/PositionChart';
import ErrorDisplay from '@/components/ErrorDisplay';
import LoadingState from '@/components/LoadingState';

type LoadingStage = 'llm' | 'parsing' | 'simulation' | 'saving';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>('llm');
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [reportId, setReportId] = useState<string | undefined>();
  const [error, setError] = useState<StrategyAPIResponse | null>(null);
  const [actionLog, setActionLog] = useState<string[]>([]);

  const addToLog = useCallback((message: string) => {
    setActionLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  }, []);

  const handleSubmit = async (input: UserInput) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setReportId(undefined);
    setActionLog([]);

    try {
      // Stage 1: LLM
      setLoadingStage('llm');
      addToLog('Sending request to AI strategy engine...');

      const response = await fetch('/api/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput: input }),
      });

      // Stage 2: Parsing
      setLoadingStage('parsing');
      addToLog('Received response, parsing strategy DSL...');

      const data: StrategyAPIResponse = await response.json();

      if (!data.success) {
        addToLog(`Error: ${data.error}`);
        setError(data);
        setIsLoading(false);
        return;
      }

      // Stage 3: Simulation (already done server-side, but show for UX)
      setLoadingStage('simulation');
      addToLog('Strategy parsed successfully');
      
      // Small delay to show simulation stage
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Stage 4: Saving
      setLoadingStage('saving');
      addToLog('Simulation completed');

      if (data.simulationResult) {
        addToLog(`Predicted finish: P${data.simulationResult.predictedFinishPosition}`);
        addToLog(`Strategy: ${data.simulationResult.strategyLabel}`);
        
        if (data.simulationResult.warnings.length > 0) {
          addToLog(`${data.simulationResult.warnings.length} warnings generated`);
        }
      }

      if (data.reportId) {
        addToLog(`Report saved: ${data.reportId}`);
      }

      setResult(data.simulationResult || null);
      setReportId(data.reportId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      addToLog(`Fatal error: ${errorMessage}`);
      setError({
        success: false,
        error: errorMessage,
        errorType: 'simulation_error',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-f1-mediumGray/50 bg-f1-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <img 
              src="/formula-1-logo.png" 
              alt="F1 Logo" 
              className="h-20 w-auto"
            />
            <div className="h-8 w-px bg-f1-mediumGray/50" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Strategy Agent</h1>
              <p className="text-sm text-f1-lightGray">AI-Powered Race Strategy Assistant</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-5 xl:col-span-4">
            <StrategyForm onSubmit={handleSubmit} isLoading={isLoading} />

            {/* Action Log */}
            {actionLog.length > 0 && (
              <div className="f1-card mt-6 p-4">
                <h3 className="text-sm font-medium text-f1-lightGray mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-f1-success rounded-full animate-pulse" />
                  Action Log
                </h3>
                <div className="space-y-1 max-h-48 overflow-y-auto text-xs font-mono">
                  {actionLog.map((log, idx) => (
                    <p key={idx} className="text-f1-lightGray">
                      {log}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            {/* Loading State */}
            {isLoading && <LoadingState stage={loadingStage} />}

            {/* Error State */}
            {error && (
              <ErrorDisplay
                message={error.error || 'An unknown error occurred'}
                errorType={error.errorType}
                parseErrors={error.parseResult?.errors}
                onDismiss={() => setError(null)}
              />
            )}

            {/* Results */}
            {result && !isLoading && (
              <>
                <ResultsDisplay result={result} reportId={reportId} />

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <LapTimeChart lapData={result.lapData} totalLaps={result.raceConfig.totalLaps} />
                  <TireWearChart lapData={result.lapData} />
                </div>

                <PositionChart
                  lapData={result.lapData}
                  startingPosition={result.carProfile.startingGridPosition}
                  fieldSize={result.raceConfig.fieldSize}
                />

                <WarningsPanel warnings={result.warnings} />

                {/* Download Section */}
                {reportId && (
                  <div className="f1-card p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <span className="w-3 h-3 bg-f1-success rounded-full" />
                      Download Report
                    </h3>
                    <p className="text-f1-lightGray mb-4">
                      Your strategy report has been saved. Download it in your preferred format:
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <a
                        href={`/api/reports/${reportId}?format=json`}
                        download={`${reportId}.json`}
                        className="f1-button-secondary f1-button text-sm py-2 px-4"
                      >
                        📊 JSON Report
                      </a>
                      <a
                        href={`/api/reports/${reportId}?format=txt`}
                        download={`${reportId}.txt`}
                        className="f1-button-secondary f1-button text-sm py-2 px-4"
                      >
                        📄 Text Report
                      </a>
                      <a
                        href={`/api/reports/${reportId}?format=csv`}
                        download={`${reportId}-laps.csv`}
                        className="f1-button-secondary f1-button text-sm py-2 px-4"
                      >
                        📈 Lap Data CSV
                      </a>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Empty State */}
            {!result && !isLoading && !error && (
              <div className="f1-card p-12 text-center">
                <div className="text-6xl mb-6">🏁</div>
                <h2 className="text-2xl font-bold mb-4">Ready to Strategize</h2>
                <p className="text-f1-lightGray max-w-md mx-auto">
                  Configure your race parameters and describe your strategy needs. Our AI will
                  generate an optimized pit stop strategy with detailed simulation results.
                </p>
                <div className="mt-8 grid grid-cols-3 gap-4 max-w-lg mx-auto text-sm">
                  <div className="bg-f1-mediumGray/30 rounded-lg p-4">
                    <div className="text-2xl mb-2">🤖</div>
                    <p className="text-f1-lightGray">AI-Powered Analysis</p>
                  </div>
                  <div className="bg-f1-mediumGray/30 rounded-lg p-4">
                    <div className="text-2xl mb-2">📊</div>
                    <p className="text-f1-lightGray">Detailed Simulation</p>
                  </div>
                  <div className="bg-f1-mediumGray/30 rounded-lg p-4">
                    <div className="text-2xl mb-2">💾</div>
                    <p className="text-f1-lightGray">Downloadable Reports</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-f1-mediumGray/50 mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-f1-lightGray">
          <p>F1 Strategy Agent • AI-Powered Race Strategy Assistant</p>
          <p className="mt-2">
            Powered by OpenAI GPT • Built with Next.js & TypeScript
          </p>
        </div>
      </footer>
    </main>
  );
}

