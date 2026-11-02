# NeoCalc - Modern Responsive Smart Calculator

A sleek, pixel-perfect web calculator inspired by the reference mobile design. It fits seamlessly on both laptop screens and all smartphone sizes with **zero vertical scrolling, zero clipping, and clean geometric proportions**.

---

## 🎨 Visual Design & Layout

- **Pure Reference Fidelity:**
  - **Background:** Deep pure OLED black (`#000000`).
  - **Function Buttons (`⌫`, `AC`, `%`):** Medium slate grey (`#505052`).
  - **Number Buttons (`0–9`, `⁺/₋`, `.`):** Dark charcoal grey (`#2c2c2e`).
  - **Operator Buttons (`÷`, `×`, `−`, `+`, `=`):** Vibrant luminous orange (`#ff9500`).
- **Zero-Scroll Fit (Laptop & Smartphone):**
  - **Desktop / Laptop:** Perfectly centered frame (`max-height: min(710px, 98dvh)`) where every button and display element fits within the browser window without any scrolling.
  - **Smartphone:** Borderless edge-to-edge layout filling `100dvh` with safe-area notch padding.
  - Buttons maintain a 1:1 circular aspect ratio at every resolution.

---

## ✨ Features & Architecture

### 1. Minimalist Floating Controls
- **Dark / Light Mode:** Minimalist SVG moon/sun toggle discreetly placed in the top-left corner without taking up any layout height.
- **Calculation History:** Minimalist SVG clock with a recent count badge. Opens a slide-over history drawer with timestamps, tap-to-reuse, and a "Clear History" button.
- **Memory (`MEM`):** Clean pill button in the top-right corner. Shows an active indicator dot when memory holds a value, and opens a slide-up tray for `MC`, `MR`, `M+`, `M−`, and `MS`.
- **Advanced Functions (`fx`):** Minimalist pill button in the top-right corner. Opens an overlay sheet with `RAD`/`DEG`, `sin`, `cos`, `tan`, `sin⁻¹`, `cos⁻¹`, `tan⁻¹`, `π`, `e`, `xʸ`, `x!`, `x²`, `x³`, `√x`, `∛x`, `1/x`, `log₁₀`, `ln`, and parentheses `(`, `)`.

### 2. Math Accuracy & Handling
- Accurate floating point arithmetic (eliminates binary float precision errors like `0.1 + 0.2`).
- Financial contextual percentage handling (`200 + 10% = 220`) and standalone percentage (`50% = 0.5`).
- Continuous operation chaining (`5 + 3 × 2 = 16`).
- Repeated equals support (repeats last operation).
- Safe division by zero handling (`Cannot divide by zero`).
- Tap the display to copy the result to your clipboard.

### 3. Physical Keyboard Shortcuts
- `0`–`9`: Input digits
- `.`: Decimal point
- `+`, `-`, `*`, `/`: Operators (`+`, `−`, `×`, `÷`)
- `Enter` or `=`: Calculate equals
- `Backspace`: Erase last digit
- `Esc` or `C`: All Clear (`AC`)
- `%`: Percentage
- `(`, `)`: Parentheses
- `^`: Exponentiation (`xʸ`)
