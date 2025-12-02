'use client';

import { DSLParseError } from '@/lib/types';

interface ErrorDisplayProps {
  message: string;
  errorType?: string;
  parseErrors?: DSLParseError[];
  onDismiss?: () => void;
}

export default function ErrorDisplay({ message, errorType, parseErrors, onDismiss }: ErrorDisplayProps) {
  const getErrorIcon = () => {
    switch (errorType) {
      case 'llm_error':
        return '🤖';
      case 'parse_error':
        return '📝';
      case 'simulation_error':
        return '⚙️';
      case 'file_error':
        return '📁';
      case 'validation_error':
        return '⚠️';
      default:
        return '❌';
    }
  };

  const getErrorTitle = () => {
    switch (errorType) {
      case 'llm_error':
        return 'AI Generation Error';
      case 'parse_error':
        return 'Strategy Parse Error';
      case 'simulation_error':
        return 'Simulation Error';
      case 'file_error':
        return 'File Operation Error';
      case 'validation_error':
        return 'Validation Error';
      default:
        return 'Error';
    }
  };

  return (
    <div className="f1-card border-l-4 border-l-f1-red p-6 animate-slide-up">
      <div className="flex items-start gap-4">
        <span className="text-3xl">{getErrorIcon()}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-f1-red">{getErrorTitle()}</h3>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-f1-lightGray hover:text-white transition-colors"
                aria-label="Dismiss"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <p className="text-f1-lightGray">{message}</p>

          {parseErrors && parseErrors.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Parse Errors:</h4>
              <ul className="space-y-2">
                {parseErrors.map((error, idx) => (
                  <li
                    key={idx}
                    className="text-sm bg-f1-mediumGray/30 rounded px-3 py-2 font-mono"
                  >
                    <span className="text-f1-red">Line {error.line}:</span>{' '}
                    {error.message}
                    {error.section && (
                      <span className="text-f1-lightGray"> (in {error.section})</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-f1-lightGray hover:text-white transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

