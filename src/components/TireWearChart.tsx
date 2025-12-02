'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { LapData, TireCompound } from '@/lib/types';

interface TireWearChartProps {
  lapData: LapData[];
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
  const wearPercent = (data.tireWear * 100).toFixed(0);
  
  return (
    <div className="bg-f1-darkGray border border-f1-mediumGray rounded-lg p-3 shadow-lg">
      <p className="font-bold mb-2">Lap {label}</p>
      <div className="space-y-1 text-sm">
        <p>
          <span className="text-f1-lightGray">Tire Wear:</span>{' '}
          <span className="font-mono">{wearPercent}%</span>
        </p>
        <p>
          <span className="text-f1-lightGray">Compound:</span>{' '}
          <span style={{ color: getTireColor(data.tireCompound) }}>{data.tireCompound}</span>
        </p>
        <p>
          <span className="text-f1-lightGray">Stint:</span> {data.stintNumber}
        </p>
        {data.event === 'pit_stop' && (
          <p className="text-f1-accent">🔧 Fresh tires installed</p>
        )}
      </div>
    </div>
  );
}

export default function TireWearChart({ lapData }: TireWearChartProps) {
  // Transform data for the chart - reset wear at each pit stop
  const chartData = lapData.map((lap, idx) => {
    // Check if this is start of a new stint (wear resets)
    const isNewStint = idx > 0 && lapData[idx - 1].stintNumber !== lap.stintNumber;
    
    return {
      ...lap,
      wearPercent: lap.tireWear * 100,
      isNewStint,
    };
  });

  // Find pit stop laps
  const pitStopLaps = lapData
    .filter((lap) => lap.event === 'pit_stop')
    .map((lap) => lap.lapNumber);

  return (
    <div className="f1-card p-6">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <span className="w-3 h-3 bg-f1-warning rounded-full" />
        Tire Wear Progression
      </h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="wearGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF8700" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#FF8700" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#38383F" />
            <XAxis
              dataKey="lapNumber"
              stroke="#949498"
              tick={{ fill: '#949498', fontSize: 12 }}
              label={{ value: 'Lap', position: 'insideBottomRight', offset: -5, fill: '#949498' }}
            />
            <YAxis
              stroke="#949498"
              tick={{ fill: '#949498', fontSize: 12 }}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              label={{ value: 'Wear %', angle: -90, position: 'insideLeft', fill: '#949498' }}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Cliff warning line */}
            <ReferenceLine
              y={80}
              stroke="#E10600"
              strokeDasharray="5 5"
              label={{
                value: 'Cliff Zone',
                position: 'right',
                fill: '#E10600',
                fontSize: 10,
              }}
            />

            {/* Pit stop reference lines */}
            {pitStopLaps.map((lap) => (
              <ReferenceLine
                key={lap}
                x={lap}
                stroke="#00D2BE"
                strokeDasharray="5 5"
              />
            ))}

            <Area
              type="monotone"
              dataKey="wearPercent"
              stroke="#FF8700"
              strokeWidth={2}
              fill="url(#wearGradient)"
              dot={(props) => {
                const { cx, cy, payload, key } = props;
                if (payload.isNewStint) {
                  return (
                    <circle
                      key={key}
                      cx={cx}
                      cy={cy}
                      r={6}
                      fill="#00D2BE"
                      stroke="#15151E"
                      strokeWidth={2}
                    />
                  );
                }
                // Return invisible dot for non-new-stint laps
                return <circle key={key} cx={cx} cy={cy} r={0} fill="transparent" />;
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-f1-danger rounded-full" />
          <span className="text-f1-lightGray">Cliff Zone (80%+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-f1-success rounded-full" />
          <span className="text-f1-lightGray">Pit Stop</span>
        </div>
      </div>
    </div>
  );
}

