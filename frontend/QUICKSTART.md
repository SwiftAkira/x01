# SpeedLink PWA - Quick Start Guide

## ⚡ Fast Setup (3 minutes)

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment
```bash
# Copy template
cp .env.template .env.development

# Get free Mapbox token from: https://account.mapbox.com/auth/signup/
# Edit .env.development and paste your token
```

### 3. Run Development Server
```bash
npm run dev
```

Open: **http://localhost:5173**

---

## 🎯 Available Routes

- **/** - Landing page
- **/map** - Main map view (Mapbox integration)
- **/party** - Party management (placeholder)
- **/profile** - User profile (placeholder)
- **/login** - Login page (placeholder)
- **/register** - Register page (placeholder)

---

## 📦 Key Commands

```bash
npm run dev       # Development server (http://localhost:5173)
npm run build     # Production build
npm run preview   # Preview production build (http://localhost:4173)
npm run lint      # Check code quality
npm run format    # Format code with Prettier
```

---

## 🎨 Design System

### Colors (Stealth Mode)
```css
--color-primary: #84CC16    /* Lime green */
--color-bg: #0C0C0C         /* Near black */
--color-text-primary: #FAFAFA  /* Off-white */
```

### Spacing (8px base)
```css
--spacing-sm: 16px
--spacing-md: 24px
--spacing-lg: 32px
```

---

## 🔧 Troubleshooting

**Map not loading?**  
→ Add Mapbox token to `.env.development`

**Port 5173 in use?**  
→ Vite will auto-increment to 5174, 5175, etc.

**TypeScript errors?**  
→ Restart VS Code: `Ctrl+Shift+P` → "Restart TS Server"

---

## 📚 Full Documentation

See **README.md** for complete documentation including:
- Architecture overview
- Project structure
- API integration guide
- Deployment instructions

---

## 🚀 Next Steps

1. **Story 3.1**: Implement authentication in `/pages/Auth/`
2. **Story 3.2**: Build party creation in `/pages/Party/`
3. **Story 3.3**: Add real-time markers to `/components/map/MapView.tsx`

---

**Questions?** Check `README.md` or `SCAFFOLD_SUMMARY.md`
