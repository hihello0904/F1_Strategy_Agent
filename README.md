# F1 Strategy Agent 🏎️

An AI-powered Formula 1 race strategy assistant that generates optimal pit stop strategies using natural language processing. Built with Next.js, TypeScript, and OpenAI's GPT models.
(Runs locally) Vercel Link: https://f1strategyagentaq.vercel.app/

## Features

### 🤖 LLM Integration
- Integrates with OpenAI API (GPT-4o-mini) for intelligent strategy generation
- Custom system prompts optimized for F1 strategy output
- Error handling with retry/backoff for rate limits and network issues

### 📝 Custom DSL (Domain-Specific Language)
- Human-readable strategy format
- Structured parsing with comprehensive validation
- Supports race config, car profile, track characteristics, and strategy definitions

### ⚙️ Race Simulation Engine
- Lap-by-lap simulation with tire degradation modeling
- Traffic and overtaking simulation
- Position tracking and pit stop effects
- Weather impact on tire wear

### 📊 Detailed Results
- Predicted finish position with confidence ranges
- Stint-by-stint metrics (avg/best lap times, degradation)
- Interactive charts (lap times, tire wear, position)
- Warning system for risky strategies

### 💾 File-Based Reporting
- JSON reports with full simulation data
- Human-readable text reports
- CSV lap data for analysis
- Audit logging for all strategy runs

### 🎨 Modern UI
- Dark theme inspired by F1 aesthetics
- Responsive design for desktop and mobile
- Real-time loading states with progress indicators
- Downloadable reports in multiple formats

---

## Quick Start

### Prerequisites
- **Node.js 18+** (Download from https://nodejs.org/)
- **npm** (comes with Node.js)
- **OpenAI API key** (Get one at https://platform.openai.com/api-keys)

---

## Installation - Windows

### Step 1: Open PowerShell or Command Prompt
Press `Win + R`, type `powershell`, and press Enter.

### Step 2: Navigate to the project folder
```powershell
cd C:\CODE\F1_Strategy_Agent
```

### Step 3: Delete old dependencies (if any issues)
```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue
```

### Step 4: Install dependencies
```powershell
npm install
```

### Step 5: Create environment file
```powershell
Copy-Item .env.example .env
```

### Step 6: Add your OpenAI API key
Open the `.env` file in a text editor (e.g., Notepad) and replace the placeholder:
```
OPENAI_API_KEY=sk-your-actual-api-key-here
```

### Step 7: Start the development server
```powershell
npm run dev
```

### Step 8: Open the application
Open your browser and go to: **http://localhost:3000**

---

## Installation - Mac/Linux

### Step 1: Open Terminal
On Mac: Press `Cmd + Space`, type `Terminal`, and press Enter.

### Step 2: Navigate to the project folder
```bash
cd /path/to/F1_Strategy_Agent
```

### Step 3: Delete old dependencies (if any issues)
```bash
rm -rf node_modules package-lock.json
```

### Step 4: Install dependencies
```bash
npm install
```

### Step 5: Create environment file
```bash
cp .env.example .env
```

### Step 6: Add your OpenAI API key
Open the `.env` file in a text editor and replace the placeholder:
```bash
nano .env
# Or use any text editor like VS Code:
# code .env
```
Set your key:
```
OPENAI_API_KEY=sk-your-actual-api-key-here
```

### Step 7: Start the development server
```bash
npm run dev
```

### Step 8: Open the application
Open your browser and go to: **http://localhost:3000**

---

## Troubleshooting

### "npm install" fails with dependency errors
Try installing with legacy peer deps:
```bash
npm install --legacy-peer-deps
```

### Port 3000 is already in use
Kill the process using the port:

**Windows:**
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

**Mac/Linux:**
```bash
lsof -ti:3000 | xargs kill -9
```

Or run on a different port:
```bash
npm run dev -- -p 3001
```

### OpenAI API errors
1. Make sure your API key is valid
2. Check you have credits in your OpenAI account
3. Verify the `.env` file has no extra spaces or quotes around the key

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── strategy/route.ts    # Main strategy generation endpoint
│   │   └── reports/
│   │       ├── route.ts         # List reports endpoint
│   │       └── [id]/route.ts    # Get/delete specific report
│   ├── globals.css              # Global styles with F1 theme
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Main application page
├── components/
│   ├── StrategyForm.tsx         # Race configuration form
│   ├── ResultsDisplay.tsx       # Strategy results display
│   ├── WarningsPanel.tsx        # Strategy warnings
│   ├── LapTimeChart.tsx         # Lap time progression chart
│   ├── TireWearChart.tsx        # Tire wear visualization
│   ├── PositionChart.tsx        # Race position chart
│   ├── ErrorDisplay.tsx         # Error handling UI
│   └── LoadingState.tsx         # Loading states
└── lib/
    ├── types.ts                 # TypeScript type definitions
    ├── dsl/
    │   ├── specification.ts     # DSL grammar documentation
    │   └── parseStrategy.ts     # DSL parser implementation
    ├── llm/
    │   └── generateStrategy.ts  # OpenAI integration
    ├── simulate/
    │   └── simulateRace.ts      # Race simulation engine
    └── reports/
        └── fileOperations.ts    # File I/O for reports
```

---

## DSL Specification

The strategy DSL is a structured text format for describing F1 race strategies:

```
RACE MONZA LAPS=53 WEATHER=normal FIELD=20
CAR START=P12 PACE=midfield RISK=balanced TARGET=P8
TRACK AERO=drag_reliant
TRACK OVERTAKING=medium CHANCE=0.55

STRATEGY "Safe Points Two-Stop"
  STINT 1 TIRE=MEDIUM LAPS=20
  STINT 2 TIRE=HARD LAPS=18
  STINT 3 TIRE=MEDIUM LAPS=15
END

CRITICAL_TURNS
  TURN 1 NAME="Prima Variante" RISK=braking,overtaking NOTE="Heavy braking zone"
  TURN 8 NAME="Parabolica" RISK=tire_stress,track_limits NOTE="Key corner for exit speed"
END

PREVIOUS_WINNER
  YEAR=2023 LABEL="Verstappen two-stop"
  STINTS:
    TIRE=SOFT LAPS=15
    TIRE=MEDIUM LAPS=20
    TIRE=MEDIUM LAPS=18
END
```

---

## API Endpoints

### POST /api/strategy
Generate a race strategy.

**Request:**
```json
{
  "userInput": {
    "trackName": "MONZA",
    "totalLaps": 53,
    "weather": "normal",
    "startingGridPosition": 12,
    "fieldSize": 20,
    "paceClass": "midfield",
    "overtakingDifficulty": "medium",
    "riskProfile": "balanced",
    "naturalLanguageQuery": "Give me a safe two-stop strategy for points"
  }
}
```

### GET /api/reports
List all saved reports.

### GET /api/reports/[id]
Get a specific report. Supports `?format=json|txt|csv`.

### DELETE /api/reports/[id]
Delete a report. Requires `X-Confirm-Delete: true` header.

---

## Configuration Options

| Field | Type | Description |
|-------|------|-------------|
| trackName | string | Circuit name (e.g., "MONZA") |
| totalLaps | number | Total race laps (1-100) |
| weather | enum | cool, normal, hot, wet |
| startingGridPosition | number | Grid position (1-fieldSize) |
| fieldSize | number | Number of cars (2-30) |
| paceClass | enum | front_runner, midfield, backmarker |
| overtakingDifficulty | enum | easy, medium, hard |
| riskProfile | enum | conservative, balanced, aggressive |
| targetMinPosition | number? | Optional target finish position |
| naturalLanguageQuery | string | Strategy description in plain English |

---

## Technologies

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **AI**: OpenAI GPT-4o-mini
- **File Storage**: Local filesystem (reports/, logs/)

---

## License

MIT License - feel free to use and modify for your projects.

---

Built with ❤️ for F1 fans and strategy enthusiasts
