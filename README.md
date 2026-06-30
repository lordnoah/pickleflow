# 🏓 PickleFlow Pro

**The Gold Standard in Court Rotation & Tournament Management.**

PickleFlow Pro is a high-performance, local-first Progressive Web App (PWA) designed for the serious pickleball community. It eliminates the "clipboard chaos" of organized play by automating pairings, tracking scores, and providing professional-grade standings in real-time.

---

## ✨ Key Features

- ⚖️ **Fair-Play Algorithm**: Our smart scheduling engine ensures everyone plays an equal number of games, with a focus on pairing you with new teammates and opponents every round.
- 👑 **King & Queen of the Court Mode**: Dynamic court-movement system. Winners move up courts (towards Court 1), losers move down, and partners split. Court 1 winners earn double leaderboard points.
- 📝 **Live Schedule Overrides**: Hand-edit players directly in any generated match using an overlay editor with duplicate protection. Resting states update automatically.
- ⏱️ **Integrated Timer & Wake Lock**: Stay on schedule with a high-visibility match timer featuring "Time's Up" audio buzzers. Employs the **Screen Wake Lock API** to keep mobile screens active on the court.
- 📊 **Capped Standings & Real-Time Stats**: Limit leaderboard calculations to each player's first $N$ matches for fair comparisons across varying game volumes. Track Wins, Losses, differentials, and averages.
- 📅 **Intelligent History**: Automatic session snapshots mean you never lose your progress. Stop a session today and resume it next week with one tap.
- 📱 **Mobile & Laptop Scaled PWA**: Fully installable on iOS and Android with massive touch targets. Features responsive layout overrides to automatically scale text and cards for high readability on laptop displays.
- 🔒 **Privacy-First & Offline-Capable**: Your data is yours. 100% of the tournament data is stored locally in your browser's secure cache. Runs fully offline on remote courts with custom Service Worker caching.

---

## 🏗️ Architecture & Tech Stack

```
pickleflow/
├── components/
│   ├── Card.tsx          # Styled layout wrapper
│   ├── Timer.tsx         # Self-contained match timer & Wake Lock
│   ├── SetupView.tsx     # Setup roster and tournament configuration
│   ├── PlayView.tsx      # Play current round matches & reporting
│   ├── ScheduleView.tsx  # Display full tournament schedule grid with editing and responsive scaling
│   └── StatsView.tsx     # Leaderboard standings with limit to first N games and scoring rules
├── lib/
│   └── games/            # Pluggable scheduling & leaderboard engines
│       ├── types.ts      # GameEngine interface definitions
│       ├── utils.ts      # Shared logic helpers (shuffle, pairing history)
│       ├── standard.ts   # Standard mixing Round Robin
│       └── kingAndQueen.ts # Dynamic court-movement manager
├── public/               # Static PWA assets (bundled at root)
│   ├── icon.png          # App launcher icon
│   ├── manifest.json     # PWA descriptor configuration
│   └── sw.js             # Service Worker (Stale-While-Revalidate caching)
├── App.tsx               # Root component directing main layout and state
├── index.css             # Tailwind CSS v4 & custom scrollbar & font styles
├── index.tsx             # Application entrypoint & SW registration
├── types.ts              # Global type interfaces
└── tsconfig.json         # TypeScript compiler configurations
```

### Key Technical Aspects:
1. **Build Tool & Bundler**: Vite compile-time CSS/JS bundling.
2. **Styling**: Tailwind CSS v4 and a premium, system-default offline-ready font stack for high performance and zero external font CDN dependencies.
3. **Data Persistence**: React state bound directly to local storage hooks with try/catch serialization protection.
4. **PWA Standalone Setup**: Manifest metadata coupled with a Service Worker running a same-origin **Stale-While-Revalidate** network caching strategy.

---

## 🛠️ Developer Commands

Ensure Node.js is installed, then clone and initialize:
```bash
# Install dependencies
npm install

# Run Vite local development server
npm run dev

# Run Vitest test runner
npm run test

# Run TypeScript type safety validator
npm run type-check

# Compile production bundle in dist/
npm run build
```

---

## 📖 How to Use: The PickleFlow Path

Running a perfect session is as easy as 1-2-3-4:

### 1. Build Your Squad
Navigate to the **Setup** screen. Add your players by name.
- _Pro Tip:_ You can edit names at any time by typing directly on them in the list.
- Need a fresh start? Use the **Wipe** button in the header for a full factory reset.

### 2. Configure the Courts
Set your session parameters:
- **Game Type**: Choose **Standard Round Robin** or **King & Queen of the Court**.
- **Rounds**: How many games should each person play?
- **Game Len**: Set the match timer (usually 15-20 mins).
- **Courts**: How many courts are available for play?
  _PickleFlow will automatically calculate the "Resting Squad" if you have more players than court capacity._

### 3. Launch & Play
Tap **Start Tournament** to load the **Play** screen:
- Start the timer when the first ball is served. The screen will stay awake automatically.
- Enter scores as matches finish. If a player gets injured or leaves, tap their name to rename/substitute them in the Setup panel.
- Tap **Add Final Score** to lock a result.
- Once all courts are done (or time is up), tap **Next Round** (or let the dynamic engine calculate court transfers in King & Queen).

### 4. Review & Share
At any point, switch to the **Stats** or **Schedule** tabs:
- **Schedule**: View the full day's pairings. Click the **Pencil icon** next to any court header to edit a match's roster dynamically (e.g. to swap players or handle sudden illness). The system automatically manages resting/active states.
- **Stats**: View the live leaderboard based on PPG and Total Points. If players have completed different numbers of games, use the **Limit To** filter to cap calculations to the first $N$ matches for a level comparison. Tap **Export** in the header to save a snapshot file or share results with your group chat.

---

## 🌐 Deployment Settings

If you are hosting this on GitHub Pages, ensure your settings match the following:
1. **Source**: Set to **GitHub Actions** in Settings > Pages.
2. **Permissions**: Ensure **Read and write permissions** are enabled in Settings > Actions > General.
3. **Base Path**: The app is configured in `vite.config.ts` to use relative paths (`./`) for sub-folder compatibility.

---

_Built for the court. Powered by Vibe Coding._
