'use client';

import { useState, useEffect } from 'react';

interface LoadingStateProps {
  stage?: 'llm' | 'parsing' | 'simulation' | 'saving';
}

const STAGE_MESSAGES = {
  llm: {
    title: 'Generating Strategy',
    description: 'AI is analyzing race conditions and creating an optimal strategy...',
    icon: '🤖',
  },
  parsing: {
    title: 'Parsing Strategy',
    description: 'Converting AI output into executable race plan...',
    icon: '📝',
  },
  simulation: {
    title: 'Running Simulation',
    description: 'Simulating race with tire degradation, pit stops, and traffic...',
    icon: '🏎️',
  },
  saving: {
    title: 'Saving Report',
    description: 'Creating detailed report for download...',
    icon: '💾',
  },
};

const F1_FACTS = [
  'A typical F1 pit stop takes around 2-3 seconds for tire changes alone.',
  'Soft tires can be up to 1.5 seconds faster per lap but degrade quickly.',
  'The "undercut" strategy involves pitting early to gain track position.',
  'Monaco GP is one of the hardest tracks to overtake on in F1.',
  'Tire temperature needs to be between 80-110°C for optimal grip.',
  'DRS can add 10-12 km/h to top speed on straights.',
  'F1 cars can generate up to 5G of lateral force in corners.',
  'A two-stop strategy often covers different tire compounds.',
];

export default function LoadingState({ stage = 'llm' }: LoadingStateProps) {
  const [factIndex, setFactIndex] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const factInterval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % F1_FACTS.length);
    }, 4000);

    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => {
      clearInterval(factInterval);
      clearInterval(dotsInterval);
    };
  }, []);

  const currentStage = STAGE_MESSAGES[stage];

  return (
    <div className="f1-card p-8 text-center animate-fade-in">
      {/* Racing animation */}
      <div className="relative h-12 mb-8 overflow-hidden">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-1 bg-f1-mediumGray rounded-full">
            <div
              className="h-full bg-gradient-to-r from-f1-red to-f1-accent rounded-full animate-pulse"
              style={{ width: '60%' }}
            />
          </div>
        </div>
        <div className="absolute inset-0 flex items-center animate-bounce">
          <div
            className="text-3xl"
            style={{
              animation: 'slideRight 2s ease-in-out infinite',
              marginLeft: `${Math.sin(Date.now() / 1000) * 20 + 40}%`,
            }}
          >
            🏎️
          </div>
        </div>
      </div>

      {/* Stage indicator */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <span className="text-4xl">{currentStage.icon}</span>
        <div className="loading-spinner" />
      </div>

      <h3 className="text-xl font-bold mb-2">
        {currentStage.title}{dots}
      </h3>
      <p className="text-f1-lightGray mb-6">{currentStage.description}</p>

      {/* Progress stages */}
      <div className="flex justify-center gap-2 mb-8">
        {Object.keys(STAGE_MESSAGES).map((s, idx) => (
          <div
            key={s}
            className={`w-3 h-3 rounded-full transition-colors ${
              Object.keys(STAGE_MESSAGES).indexOf(stage) >= idx
                ? 'bg-f1-red'
                : 'bg-f1-mediumGray'
            }`}
          />
        ))}
      </div>

      {/* Fun fact */}
      <div className="bg-f1-mediumGray/30 rounded-lg p-4 max-w-md mx-auto">
        <p className="text-sm text-f1-lightGray">
          <span className="text-f1-accent font-medium">Did you know?</span>{' '}
          {F1_FACTS[factIndex]}
        </p>
      </div>

      <style jsx>{`
        @keyframes slideRight {
          0%, 100% {
            transform: translateX(-10px);
          }
          50% {
            transform: translateX(10px);
          }
        }
      `}</style>
    </div>
  );
}

