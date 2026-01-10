# Movecast Landing Page

A stunning retro-futuristic landing page for the Movecast Raycast extension.

## 🎨 Design Features

### Visual Aesthetic
- **Retro-futuristic command-line theme** with CRT scanline effects
- **Retropix** pixel font for headings (bold, retro gaming vibe)
- **Public Sans** for body text (clean, modern readability)
- **Color scheme**: Teal (#097A7B) primary, Light gray (#CCCCCC) text, Dark blue-black gradient background

### Effects & Animations
- ✨ **CRT scanline overlay** for retro terminal feel
- 🌊 **Animated gradient background** with radial glows
- 💎 **Glassmorphism cards** with blur and transparency
- ⚡ **Glowing teal accents** with pulsing animations
- ⌨️ **Typing animation** on command bar demo
- 📜 **Scroll reveal animations** with staggered delays
- 🎭 **Glitch effects** on hover
- 🎈 **Floating animations** on mockup elements
- 🎯 **Keyboard key styling** for shortcuts

### Sections

1. **Hero Section**
   - Giant Retropix heading with gradient text and glow
   - Platform badges (Mac & Windows)
   - Animated CTA button with glow effects
   - Keyboard shortcut display

2. **Command Bar Demo**
   - Floating mockup with glassmorphism
   - Typing animation showing "@movecast-ai what is my portfolio"
   - Live portfolio response preview
   - Shows action detection with confidence level

3. **Features Grid**
   - 4 feature cards with icon animations
   - AI Chat, Portfolio, DeFi Protocols, Lightning Fast
   - Keyboard shortcuts and protocol badges
   - Hover effects with glow transitions

4. **How It Works**
   - 3-step process with numbered badges
   - Natural language examples
   - Glass card design with step-by-step guide

5. **Final CTA**
   - Large glass card with gradient heading
   - Prominent install button
   - Platform info footer

6. **Footer**
   - Movecast branding
   - Documentation, GitHub, Discord links

## 🚀 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + Custom CSS
- **Fonts**: Retropix (CDN), Public Sans (Google Fonts)
- **Animations**: CSS keyframes + Intersection Observer
- **Icons**: Inline SVG

## 🎯 Performance Features

- Scroll-triggered reveal animations
- Optimized font loading with `font-display: swap`
- Efficient CSS animations (GPU-accelerated)
- Minimal JavaScript (only scroll observer)

## 🎨 Color Palette

```css
--color-teal: #097A7B        /* Primary brand color */
--color-gray: #CCCCCC        /* Text and UI elements */
--color-dark: #0a0a0f        /* Background base */
--color-darker: #050508      /* Deepest background */
--color-blue-dark: #0f1729   /* Gradient accent */
```

## 📱 Responsive Design

- Mobile-first approach
- Breakpoints: sm, md, lg
- Flexible grid layouts
- Optimized typography scaling
- Touch-friendly interactive elements

## 🔥 Unique Features

1. **CRT Effect**: Authentic retro terminal feel with scanlines
2. **Noise Texture**: Subtle grain overlay for depth
3. **Command-First Design**: Emphasizes keyboard shortcuts
4. **Pixel Art Aesthetic**: Retropix font creates unique brand identity
5. **Teal Glow System**: Cohesive glowing effects throughout

## 🎬 Animation System

- **fade-in-up**: Scroll reveal base animation
- **delay-100 to delay-600**: Staggered animation timing
- **glow-teal / glow-intense**: Pulsing glow effects
- **float**: Gentle floating motion
- **glitch**: Hover distortion effect
- **typing-effect**: Terminal-style text animation
- **pulse-glow**: Breathing glow animation

## 🚀 Getting Started

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the landing page.

## 📝 Customization

### Change Colors
Edit CSS variables in `app/globals.css`:

```css
:root {
  --color-teal: #097A7B;
  --color-gray: #CCCCCC;
  /* ... */
}
```

### Adjust Animations
Modify keyframes in `app/globals.css` or update animation classes in `page.tsx`

### Update Content
Edit text, headings, and CTAs directly in `app/page.tsx`

## 🎨 Design Philosophy

This landing page avoids generic "AI slop" aesthetics by:
- Using distinctive Retropix pixel font (not Inter/Roboto)
- Creating a unique retro-futuristic CRT theme
- Implementing custom glowing teal effects (not purple gradients)
- Building command-line focused UX (keyboard-first)
- Adding authentic retro gaming personality

## 📄 License

MIT
