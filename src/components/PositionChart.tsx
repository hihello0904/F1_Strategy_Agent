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
} from 'recharts';
import { LapData } from '@/lib/types';

interface PositionChartProps {
  lapData: LapData[];
  startingPosition: number;
  fieldSize: number;
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
          <span className="text-f1-lightGray">Position:</span>{' '}
          <span className="font-bold">P{data.position}</span>
        </p>
        {data.event && (
          <p className="capitalize text-f1-accent">
            {data.event === 'overtake' && '🏎️ Overtake!'}
            {data.event === 'overtaken' && '😓 Lost position'}
            {data.event === 'pit_stop' && '🔧 Pit stop'}
            {data.event === 'start' && '🏁 Race start'}
          </p>
        )}
        {data.eventDetail && (
          <p className="text-f1-lightGray text-xs">{data.eventDetail}</p>
        )}
      </div>
    </div>
  );
}

export default function PositionChart({ lapData, startingPosition, fieldSize }: PositionChartProps) {
  // Find pit stop laps
  const pitStopLaps = lapData
    .filter((lap) => lap.event === 'pit_stop')
    .map((lap) => lap.lapNumber);

  // Find overtake laps
  const overtakeLaps = lapData
    .filter((lap) => lap.event === 'overtake')
    .map((lap) => lap.lapNumber);

  const finalPosition = lapData[lapData.length - 1]?.position || startingPosition;
  const positionGained = startingPosition - finalPosition;

  return (
    <div className="f1-card p-6">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <span className="w-3 h-3 bg-f1-success rounded-full" />
        Race Position
        <span className="ml-auto text-sm font-normal text-f1-lightGray">
          {positionGained > 0 ? (
            <span className="text-f1-success">+{positionGained} places gained</span>
          ) : positionGained < 0 ? (
            <span className="text-f1-danger">{positionGained} places lost</span>
          ) : (
            'No change'
          )}
        </span>
      </h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={lapData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
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
              domain={[1, Math.min(fieldSize, 20)]}
              reversed
              tickFormatter={(value) => `P${value}`}
              label={{ value: 'Position', angle: -90, position: 'insideLeft', fill: '#949498' }}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Points zone reference line */}
            <ReferenceLine
              y={10}
              stroke="#00D2BE"
              strokeDasharray="5 5"
              label={{
                value: 'Points',
                position: 'right',
                fill: '#00D2BE',
                fontSize: 10,
              }}
            />

            {/* Starting position reference */}
            <ReferenceLine
              y={startingPosition}
              stroke="#949498"
              strokeDasharray="3 3"
              label={{
                value: 'Start',
                position: 'left',
                fill: '#949498',
                fontSize: 10,
              }}
            />

            {/* Pit stop reference lines */}
            {pitStopLaps.map((lap) => (
              <ReferenceLine
                key={`pit-${lap}`}
                x={lap}
                stroke="#E10600"
                strokeDasharray="5 5"
              />
            ))}

            <Line
              type="stepAfter"
              dataKey="position"
              stroke="#00D2BE"
              strokeWidth={3}
              dot={(props) => {
                const { cx, cy, payload, key } = props;
                if (payload.event === 'overtake') {
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
                if (payload.event === 'overtaken') {
                  return (
                    <circle
                      key={key}
                      cx={cx}
                      cy={cy}
                      r={6}
                      fill="#E10600"
                      stroke="#15151E"
                      strokeWidth={2}
                    />
                  );
                }
                if (payload.event === 'pit_stop') {
                  return (
                    <rect
                      key={key}
                      x={cx - 4}
                      y={cy - 4}
                      width={8}
                      height={8}
                      fill="#FF8700"
                      stroke="#15151E"
                      strokeWidth={1}
                    />
                  );
                }
                // Return invisible dot for non-event laps
                return <circle key={key} cx={cx} cy={cy} r={0} fill="transparent" />;
              }}
              activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-f1-success rounded-full" />
          <span className="text-f1-lightGray">Overtake</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-f1-red rounded-full" />
          <span className="text-f1-lightGray">Lost Position</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-f1-danger rounded" />
          <span className="text-f1-lightGray">Pit Stop</span>
        </div>
      </div>
    </div>
  );
}

