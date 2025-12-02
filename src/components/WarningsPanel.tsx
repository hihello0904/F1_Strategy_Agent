'use client';

import { SimulationWarning } from '@/lib/types';

interface WarningsPanelProps {
  warnings: SimulationWarning[];
}

function getWarningIcon(type: SimulationWarning['type']): string {
  switch (type) {
    case 'tire':
      return '🛞';
    case 'strategy':
      return '📋';
    case 'traffic':
      return '🚗';
    case 'track':
      return '🏁';
    case 'weather':
      return '🌧️';
    default:
      return '⚠️';
  }
}

function getSeverityStyles(severity: SimulationWarning['severity']): string {
  switch (severity) {
    case 'low':
      return 'border-l-f1-success bg-f1-success/5';
    case 'medium':
      return 'border-l-f1-warning bg-f1-warning/5';
    case 'high':
      return 'border-l-f1-danger bg-f1-danger/5';
    case 'critical':
      return 'border-l-f1-red bg-f1-red/5';
    default:
      return 'border-l-f1-lightGray';
  }
}

export default function WarningsPanel({ warnings }: WarningsPanelProps) {
  if (warnings.length === 0) {
    return (
      <div className="f1-card p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="w-3 h-3 bg-f1-success rounded-full" />
          No Warnings
        </h3>
        <p className="text-f1-lightGray">
          The strategy looks good! No significant risks identified.
        </p>
      </div>
    );
  }

  // Sort by severity
  const sortedWarnings = [...warnings].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return (
    <div className="f1-card p-6">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <span className="w-3 h-3 bg-f1-warning rounded-full animate-pulse" />
        Warnings ({warnings.length})
      </h3>

      <div className="space-y-3">
        {sortedWarnings.map((warning, idx) => (
          <div
            key={idx}
            className={`border-l-4 rounded-r-lg p-4 ${getSeverityStyles(warning.severity)}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">{getWarningIcon(warning.type)}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`warning-badge ${warning.severity}`}>
                    {warning.severity}
                  </span>
                  <span className="text-sm text-f1-lightGray capitalize">
                    {warning.type}
                  </span>
                </div>
                <p className="font-medium">{warning.message}</p>
                {warning.detail && (
                  <p className="text-sm text-f1-lightGray mt-1">{warning.detail}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

