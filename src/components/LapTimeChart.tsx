'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { LapData, TireCompound } from '@/lib/types';

interface LapTimeChartProps {
  lapData: LapData[];
  totalLaps: number;
}

function getTireColor(compound: TireCompound): string {
  switch (compound) {
    case 'SOFT':
      return '#ff0000';
    case 'MEDIUM':
      return '#ffcc00';
    case 'HARD':
      return '#ffffff';
    case 'INTERMEDIATE':
      return '#00cc00';
    case 'WET':
      return '#0066ff';
    default:
      return '#949498';
  }
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: LapData;
  }>;
  label?: number;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;
  
  return (
    <div className="bg-f1-darkGray border border-f1-mediumGray rounded-lg p-3 shadow-lg">
      <p className="font-bold mb-2">Lap {label}</p>
      <div className="space-y-1 text-sm">
        <p>
          <span className="text-f1-lightGray">Time:</span>{' '}
          <span className="font-mono">{data.lapTime.toFixed(3)}s</span>
        </p>
        <p>
          <span className="text-f1-lightGray">Tire:</span>{' '}
          <span style={{ color: getTireColor(data.tireCompound) }}>{data.tireCompound}</span>
        </p>
        <p>
          <span className="text-f1-lightGray">Wear:</span>{' '}
          <span className="font-mono">{(data.tireWear * 100).toFixed(0)}%</span>
        </p>
        <p>
          <span className="text-f1-lightGray">Position:</span> P{data.position}
        </p>
        {data.event && (
          <p className="text-f1-accent capitalize">📌 {data.event.replace('_', ' ')}</p>
        )}
      </div>
    </div>
  );
}

export default function LapTimeChart({ lapData, totalLaps }: LapTimeChartProps) {
  // Find pit stop laps
  const pitStopLaps = lapData
    .filter((lap) => lap.event === 'pit_stop')
    .map((lap) => lap.lapNumber);

  // Calculate y-axis domain
  const lapTimes = lapData.map((l) => l.lapTime);
  const minTime = Math.floor(Math.min(...lapTimes) - 1);
  const maxTime = Math.ceil(Math.max(...lapTimes) + 1);

  // Add tire compound color to each data point
  const chartData = lapData.map((lap) => ({
    ...lap,
    color: getTireColor(lap.tireCompound),
  }));

  return (
    <div className="f1-card p-6">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <span className="w-3 h-3 bg-f1-red rounded-full" />
        Lap Time Progression
      </h3>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#38383F" />
            <XAxis
              dataKey="lapNumber"
              stroke="#949498"
              tick={{ fill: '#949498', fontSize: 12 }}
              label={{ value: 'Lap', position: 'insideBottomRight', offset: -5, fill: '#949498' }}
              domain={[1, totalLaps]}
            />
            <YAxis
              stroke="#949498"
              tick={{ fill: '#949498', fontSize: 12 }}
              domain={[minTime, maxTime]}
              tickFormatter={(value) => `${value}s`}
              label={{ value: 'Lap Time', angle: -90, position: 'insideLeft', fill: '#949498' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => <span className="text-f1-lightGray">{value}</span>}
            />

            {/* Pit stop reference lines */}
            {pitStopLaps.map((lap) => (
              <ReferenceLine
                key={lap}
                x={lap}
                stroke="#E10600"
                strokeDasharray="5 5"
                label={{
                  value: 'PIT',
                  position: 'top',
                  fill: '#E10600',
                  fontSize: 10,
                }}
              />
            ))}

            {/* Lap time line - colored by stint */}
            <Line
              type="monotone"
              dataKey="lapTime"
              stroke="#00D2BE"
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={getTireColor(payload.tireCompound)}
                    stroke="#15151E"
                    strokeWidth={1}
                  />
                );
              }}
              activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
              name="Lap Time"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tire Legend */}
      <div className="flex justify-center gap-6 mt-4 text-sm">
        {(['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET'] as TireCompound[]).map((compound) => (
          <div key={compound} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getTireColor(compound) }}
            />
            <span className="text-f1-lightGray">{compound}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

