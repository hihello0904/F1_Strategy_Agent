'use client';

import { useState } from 'react';
import { UserInput, Weather, PaceClass, OvertakingDifficulty, RiskProfile } from '@/lib/types';

interface StrategyFormProps {
  onSubmit: (input: UserInput) => void;
  isLoading: boolean;
}

// Track presets with default values
const TRACK_PRESETS: Record<string, { laps: number; overtaking: OvertakingDifficulty }> = {
  MONZA: { laps: 53, overtaking: 'medium' },
  MONACO: { laps: 78, overtaking: 'hard' },
  SPA: { laps: 44, overtaking: 'easy' },
  SILVERSTONE: { laps: 52, overtaking: 'medium' },
  SUZUKA: { laps: 53, overtaking: 'medium' },
  BAHRAIN: { laps: 57, overtaking: 'easy' },
  JEDDAH: { laps: 50, overtaking: 'medium' },
  MELBOURNE: { laps: 58, overtaking: 'hard' },
  IMOLA: { laps: 63, overtaking: 'hard' },
  MIAMI: { laps: 57, overtaking: 'medium' },
  BARCELONA: { laps: 66, overtaking: 'hard' },
  MONTREAL: { laps: 70, overtaking: 'medium' },
  AUSTRIA: { laps: 71, overtaking: 'easy' },
  BUDAPEST: { laps: 70, overtaking: 'hard' },
  ZANDVOORT: { laps: 72, overtaking: 'hard' },
  SINGAPORE: { laps: 62, overtaking: 'hard' },
  AUSTIN: { laps: 56, overtaking: 'medium' },
  MEXICO: { laps: 71, overtaking: 'medium' },
  INTERLAGOS: { laps: 71, overtaking: 'easy' },
  VEGAS: { laps: 50, overtaking: 'medium' },
  QATAR: { laps: 57, overtaking: 'medium' },
  ABU_DHABI: { laps: 58, overtaking: 'medium' },
};

export default function StrategyForm({ onSubmit, isLoading }: StrategyFormProps) {
  const [formData, setFormData] = useState({
    trackName: 'MONZA',
    totalLaps: 53,
    weather: 'normal' as Weather,
    startingGridPosition: 12,
    fieldSize: 20,
    paceClass: 'midfield' as PaceClass,
    overtakingDifficulty: 'medium' as OvertakingDifficulty,
    riskProfile: 'balanced' as RiskProfile,
    targetMinPosition: '',
    naturalLanguageQuery: 'Give me a safe two-stop strategy to maximize my chance of finishing in the points.',
  });

  const handleTrackChange = (trackName: string) => {
    const preset = TRACK_PRESETS[trackName];
    setFormData((prev) => ({
      ...prev,
      trackName,
      totalLaps: preset?.laps || prev.totalLaps,
      overtakingDifficulty: preset?.overtaking || prev.overtakingDifficulty,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const input: UserInput = {
      trackName: formData.trackName,
      totalLaps: formData.totalLaps,
      weather: formData.weather,
      startingGridPosition: formData.startingGridPosition,
      fieldSize: formData.fieldSize,
      paceClass: formData.paceClass,
      overtakingDifficulty: formData.overtakingDifficulty,
      riskProfile: formData.riskProfile,
      targetMinPosition: formData.targetMinPosition ? parseInt(formData.targetMinPosition) : undefined,
      naturalLanguageQuery: formData.naturalLanguageQuery,
    };

    onSubmit(input);
  };

  return (
    <form onSubmit={handleSubmit} className="f1-card p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-gradient-to-b from-f1-red to-f1-accent rounded-full" />
        <h2 className="text-2xl font-bold tracking-tight">Race Configuration</h2>
      </div>

      {/* Track & Laps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-f1-lightGray mb-2">Track</label>
          <select
            value={formData.trackName}
            onChange={(e) => handleTrackChange(e.target.value)}
            className="f1-input f1-select w-full"
            disabled={isLoading}
          >
            {Object.keys(TRACK_PRESETS).map((track) => (
              <option key={track} value={track}>
                {track.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-f1-lightGray mb-2">Total Laps</label>
          <input
            type="number"
            value={formData.totalLaps}
            onChange={(e) => setFormData((prev) => ({ ...prev, totalLaps: parseInt(e.target.value) || 0 }))}
            className="f1-input w-full"
            min={1}
            max={100}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Track Characteristics - Auto-determined */}
      <div className="bg-f1-mediumGray/20 rounded-lg p-4 border border-f1-mediumGray/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-f1-lightGray text-sm">Overtaking:</span>
            <span className={`text-xl font-bold uppercase tracking-wide ${
              formData.overtakingDifficulty === 'easy' 
                ? 'text-f1-success' 
                : formData.overtakingDifficulty === 'hard' 
                  ? 'text-f1-red' 
                  : 'text-f1-warning'
            }`}>
              {formData.overtakingDifficulty === 'easy' ? 'Easy' : formData.overtakingDifficulty === 'hard' ? 'Hard' : 'Moderate'}
            </span>
          </div>
          <span className="text-xs text-f1-lightGray italic">
            {formData.overtakingDifficulty === 'easy' 
              ? '2-4 passes possible per race' 
              : formData.overtakingDifficulty === 'hard' 
                ? '0-1 passes likely per race'
                : '1-2 passes possible per race'}
          </span>
        </div>
      </div>

      {/* Weather & Field Size */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-f1-lightGray mb-2">Weather</label>
          <select
            value={formData.weather}
            onChange={(e) => setFormData((prev) => ({ ...prev, weather: e.target.value as Weather }))}
            className="f1-input f1-select w-full"
            disabled={isLoading}
          >
            <option value="cool">Cool</option>
            <option value="normal">Normal</option>
            <option value="hot">Hot</option>
            <option value="wet">Wet</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-f1-lightGray mb-2">Field Size</label>
          <input
            type="number"
            value={formData.fieldSize}
            onChange={(e) => setFormData((prev) => ({ ...prev, fieldSize: parseInt(e.target.value) || 20 }))}
            className="f1-input w-full"
            min={2}
            max={30}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Starting Position & Target */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-f1-lightGray mb-2">Starting Grid Position</label>
          <input
            type="number"
            value={formData.startingGridPosition}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, startingGridPosition: parseInt(e.target.value) || 1 }))
            }
            className="f1-input w-full"
            min={1}
            max={formData.fieldSize}
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-f1-lightGray mb-2">
            Target Position <span className="text-f1-lightGray">(optional)</span>
          </label>
          <input
            type="number"
            value={formData.targetMinPosition}
            onChange={(e) => setFormData((prev) => ({ ...prev, targetMinPosition: e.target.value }))}
            className="f1-input w-full"
            placeholder="e.g., 8 for points"
            min={1}
            max={formData.fieldSize}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Car Pace & Risk */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-f1-lightGray mb-2">Car Pace Class</label>
          <select
            value={formData.paceClass}
            onChange={(e) => setFormData((prev) => ({ ...prev, paceClass: e.target.value as PaceClass }))}
            className="f1-input f1-select w-full"
            disabled={isLoading}
          >
            <option value="front_runner">Front Runner</option>
            <option value="midfield">Midfield</option>
            <option value="backmarker">Backmarker</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-f1-lightGray mb-2">Risk Profile</label>
          <select
            value={formData.riskProfile}
            onChange={(e) => setFormData((prev) => ({ ...prev, riskProfile: e.target.value as RiskProfile }))}
            className="f1-input f1-select w-full"
            disabled={isLoading}
          >
            <option value="conservative">Conservative</option>
            <option value="balanced">Balanced</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </div>
      </div>

      {/* Natural Language Query */}
      <div>
        <label className="block text-sm font-medium text-f1-lightGray mb-2">Strategy Request</label>
        <textarea
          value={formData.naturalLanguageQuery}
          onChange={(e) => setFormData((prev) => ({ ...prev, naturalLanguageQuery: e.target.value }))}
          className="f1-input w-full h-28 resize-none"
          placeholder="Describe the strategy you want... e.g., 'I want to finish in the points with minimal risk'"
          disabled={isLoading}
        />
      </div>

      {/* Submit Button */}
      <button type="submit" disabled={isLoading} className="f1-button w-full flex items-center justify-center gap-3">
        {isLoading ? (
          <>
            <div className="loading-spinner w-5 h-5" />
            <span>Generating Strategy...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span>Generate Strategy</span>
          </>
        )}
      </button>
    </form>
  );
}

