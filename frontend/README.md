# SpeedLink PWA Frontend

**Version:** 0.1.0  
**Status:** MVP Scaffold Complete  
**Story:** 2.3 - Scaffold PWA Frontend

---

## Overview

SpeedLink is a Progressive Web App (PWA) for real-time group navigation and speed camera alerts, designed for motorcycle riders and spirited drivers. This repository contains the frontend application built with React, Vite, and Mapbox GL JS.

### Key Features (MVP)

- ✅ **PWA Capabilities**: Offline support, installable, push notifications
- ✅ **Real-Time Updates**: WebSocket integration for <800ms latency party updates
- ✅ **Interactive Mapping**: Mapbox GL JS for live location tracking
- ✅ **Mobile-First Design**: Stealth Mode color theme optimized for outdoor use
- ✅ **Modern Stack**: React 18 + Vite + TypeScript for fast development

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3.1 | UI framework with concurrent features |
| **Vite** | 5.4.10 | Build tool with HMR and optimized bundling |
| **TypeScript** | 5.6.3 | Type safety and better DX |
| **Mapbox GL JS** | 3.7.0 | Interactive maps and real-time location |
| **Socket.IO Client** | 4.8.1 | WebSocket for real-time party updates |
| **React Router** | 6.26.2 | Client-side routing with lazy loading |
| **Axios** | 1.7.7 | HTTP client for REST API calls |
| **Vite PWA Plugin** | 0.20.5 | Service worker and PWA manifest generation |

---

## Project Structure

```
frontend/
├── public/
│   ├── manifest.json          # PWA manifest configuration
│   ├── robots.txt             # Search engine directives
│   └── icons/                 # PWA icons (192x192, 512x512)
├── src/
│   ├── components/
│   │   ├── common/            # Reusable UI components
│   │   │   └── LoadingSpinner.tsx
│   │   ├── layout/            # Layout components
│   │   │   ├── BottomNav.tsx  # Bottom navigation bar
│   │   │   └── Layout.tsx     # Main layout wrapper
│   │   ├── map/               # Map-related components
│   │   │   └── MapView.tsx    # Mapbox GL JS integration
│   │   └── party/             # Party management components (TODO)
│   ├── pages/
│   │   ├── Auth/              # Authentication pages
│   │   │   ├── Login.tsx
│   │   │   └── Register.tsx
│   │   ├── Map/               # Main map view
│   │   │   └── index.tsx
│   │   ├── Party/             # Party management
│   │   │   └── index.tsx
│   │   ├── Profile/           # User profile
│   │   │   └── index.tsx
│   │   ├── Home.tsx           # Landing page
│   │   └── NotFound.tsx       # 404 page
│   ├── services/
│   │   ├── api.ts             # REST API client (axios)
│   │   ├── websocket.ts       # Socket.IO client wrapper
│   │   └── geolocation.ts     # Browser Geolocation API wrapper
│   ├── hooks/                 # Custom React hooks (TODO)
│   ├── utils/
│   │   ├── constants.ts       # App-wide constants
│   │   ├── validators.ts      # Form validation utilities
│   │   └── storage.ts         # localStorage wrapper
│   ├── styles/
│   │   └── index.css          # Global styles with Stealth Mode theme
│   ├── App.tsx                # Main app component with routing
│   ├── main.tsx               # Entry point with service worker
│   └── vite-env.d.ts          # TypeScript environment declarations
├── .env.template              # Environment variable template
├── .env.development           # Development environment config
├── .eslintrc.json             # ESLint configuration
├── .prettierrc                # Prettier configuration
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite and PWA configuration
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

---

## Getting Started

### Prerequisites

- **Node.js**: 20.x LTS or higher
- **npm**: 10.x or higher
- **Mapbox Account**: Free tier account for API token ([Sign up here](https://account.mapbox.com/auth/signup/))

### Installation

1. **Clone the repository:**
   ```bash
   cd SpeedLink/frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   # Copy template to development config
   cp .env.template .env.development

   # Edit .env.development and add your Mapbox token
   VITE_MAPBOX_TOKEN=pk.your_actual_mapbox_token_here
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Open browser:**
   Navigate to `http://localhost:5173`

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR at `http://localhost:5173` |
| `npm run build` | Build optimized production bundle to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint on TypeScript files |
| `npm run format` | Format code with Prettier |

---

## Environment Variables

Create a `.env.development` file with the following variables:

```env
# Backend API URL (REST endpoints)
VITE_API_URL=http://localhost:3000/api/v1

# WebSocket URL (real-time updates)
VITE_WS_URL=ws://localhost:3001

# Mapbox API Token (get from https://account.mapbox.com/)
VITE_MAPBOX_TOKEN=pk.your_token_here
```

**Production:** Create `.env.production` with production URLs.

---

## Architecture Overview

### Component Hierarchy

```
App (BrowserRouter)
└── Layout
    ├── BottomNav (fixed navigation)
    └── Routes (lazy-loaded)
        ├── Home
        ├── Map (with MapView component)
        ├── Party
        ├── Profile
        └── Auth (Login, Register)
```

### Data Flow

1. **API Calls**: REST API via `services/api.ts` with JWT authentication
2. **Real-Time Updates**: WebSocket via `services/websocket.ts` for party state
3. **Location Tracking**: Geolocation API via `services/geolocation.ts`
4. **State Management**: React Context (to be implemented in Epic 3)

### PWA Features

- **Service Worker**: Registered in `main.tsx` with Workbox strategies
- **Offline Support**: Cache-first for assets, network-first for API calls
- **Installability**: PWA manifest with app shortcuts
- **Background Sync**: Pending location updates when offline (TODO)

---

## Design System: Stealth Mode

### Color Palette

| Variable | Color | Purpose |
|----------|-------|---------|
| `--color-primary` | #84CC16 | Lime green for main actions |
| `--color-secondary` | #FBBF24 | Amber for supporting actions |
| `--color-accent` | #F97316 | Orange for alerts |
| `--color-success` | #22C55E | Green for confirmations |
| `--color-warning` | #EAB308 | Yellow for cautions |
| `--color-danger` | #DC2626 | Red for critical alerts |
| `--color-bg` | #0C0C0C | Near-black background |
| `--color-bg-card` | #171717 | Dark gray for cards |
| `--color-text-primary` | #FAFAFA | Off-white text |
| `--color-text-secondary` | #A3A3A3 | Gray supporting text |

### Spacing System (8px base)

- `--spacing-xs`: 8px
- `--spacing-sm`: 16px
- `--spacing-md`: 24px
- `--spacing-lg`: 32px
- `--spacing-xl`: 40px
- `--spacing-2xl`: 48px
- `--spacing-3xl`: 64px

### Typography

- **Font Family**: System fonts (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto)
- **Font Sizes**: 12px (tiny) → 16px (body) → 32px (h1)
- **Font Weights**: 400 (regular), 600 (semibold), 700 (bold), 800 (extrabold)

---

## Development Guidelines

### Code Style

- **ESLint**: React + TypeScript + accessibility rules enforced
- **Prettier**: 2-space indent, single quotes, trailing commas
- **Path Aliases**: Use `@/` prefix (e.g., `@/components/map/MapView`)

### Component Guidelines

1. **Functional Components**: Use hooks, avoid class components
2. **TypeScript**: Define interfaces for all props
3. **Lazy Loading**: Use `React.lazy()` for route components
4. **Accessibility**: Include ARIA labels and keyboard navigation

### Performance Considerations

- **Code Splitting**: Routes are lazy-loaded for optimal bundle size
- **Image Optimization**: Use WebP format, lazy load images
- **Memoization**: Use `React.memo()` for expensive components
- **Bundle Analysis**: Run `npm run build` and check `dist/` size

---

## Testing (TODO - Epic 6)

```bash
# Unit tests with Vitest (to be configured)
npm run test

# E2E tests with Playwright (to be configured)
npm run test:e2e
```

---

## Deployment

### Vercel (Recommended)

1. **Connect repository to Vercel**
2. **Set environment variables** in Vercel dashboard
3. **Deploy:** Automatic on push to `main` branch

### Manual Build

```bash
# Build production bundle
npm run build

# Output in dist/ directory
# Serve with any static hosting (Netlify, AWS S3, etc.)
```

---

## Roadmap

### ✅ Completed (Story 2.3)
- [x] React + Vite project scaffold
- [x] TypeScript configuration with strict mode
- [x] PWA plugin and service worker setup
- [x] Project structure (components, pages, services)
- [x] React Router with lazy loading
- [x] Mapbox GL JS integration (basic)
- [x] API, WebSocket, Geolocation services
- [x] Environment variable configuration
- [x] Stealth Mode global styles
- [x] Bottom navigation layout

### 🚧 In Progress (Epic 3)
- [ ] Authentication UI (Story 3.1)
- [ ] Party creation/joining UI (Story 3.2)
- [ ] Real-time party member markers (Story 3.3)
- [ ] Speed camera alert system (Story 4.1)
- [ ] WebSocket event handling
- [ ] State management (Context/Zustand)

### 📋 Upcoming (Epic 4-7)
- [ ] Community reporting UI
- [ ] Push notifications
- [ ] In-app messaging
- [ ] Route navigation
- [ ] Privacy controls
- [ ] Testing suite
- [ ] Performance optimizations

---

## Troubleshooting

### Common Issues

**Issue:** Mapbox map not loading  
**Solution:** Verify `VITE_MAPBOX_TOKEN` is set correctly in `.env.development`

**Issue:** Service worker not registering  
**Solution:** PWA requires HTTPS or localhost. Use `npm run preview` to test locally.

**Issue:** TypeScript errors after install  
**Solution:** Restart VS Code TypeScript server (`Cmd/Ctrl + Shift + P` → "Restart TS Server")

**Issue:** Hot reload not working  
**Solution:** Check Vite dev server is running on port 5173, clear browser cache.

---

## Contributing

This is a solo MVP project. For future collaboration:

1. Create feature branch: `git checkout -b feature/your-feature`
2. Follow code style (ESLint + Prettier)
3. Test locally: `npm run lint && npm run build`
4. Commit with clear messages
5. Push and create PR

---

## License

MIT License - See LICENSE file for details

---

## Resources

- **Vite Documentation**: https://vitejs.dev/
- **React Documentation**: https://react.dev/
- **Mapbox GL JS**: https://docs.mapbox.com/mapbox-gl-js/
- **Socket.IO Client**: https://socket.io/docs/v4/client-api/
- **Vite PWA Plugin**: https://vite-pwa-org.netlify.app/

---

## Support

For questions or issues:
- **Documentation**: See `docs/` folder in root directory
- **Architecture**: `docs/SpeedLink-architecture.md`
- **API Contracts**: `docs/SpeedLink-api-contracts.md`
- **UX Design**: `docs/ux-design-specification.md`

---

**Built with ❤️ for the SpeedLink MVP**
