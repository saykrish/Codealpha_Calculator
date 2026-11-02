/**
 * NeoCalc - Modern Calculator Engine
 * Feature-rich, highly accurate, and responsive mobile-first calculator.
 */

(function () {
  'use strict';

  // ==========================================
  // Audio Feedback Synthesizer (Zero asset dependency)
  // ==========================================
  class AudioHaptics {
    constructor() {
      this.audioCtx = null;
      this.enabled = true;
    }

    init() {
      if (!this.audioCtx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContextClass();
      }
    }

    playClick(type = 'normal') {
      if (!this.enabled) return;
      try {
        this.init();
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }
        if (!this.audioCtx) return;

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        const now = this.audioCtx.currentTime;
        let freq = 600;
        let duration = 0.035;

        if (type === 'operator') {
          freq = 820;
          duration = 0.045;
        } else if (type === 'equals') {
          freq = 980;
          duration = 0.06;
        } else if (type === 'action') {
          freq = 450;
          duration = 0.04;
        }

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + duration);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + duration);
      } catch (e) {
        // AudioContext restricted or unavailable
      }
    }
  }

  // ==========================================
  // History Manager
  // ==========================================
  class HistoryManager {
    constructor(onItemSelect) {
      this.storageKey = 'neocalc_history';
      this.history = this.loadHistory();
      this.onItemSelect = onItemSelect;

      this.drawerEl = document.getElementById('history-drawer');
      this.backdropEl = document.getElementById('drawer-backdrop');
      this.listEl = document.getElementById('history-list');
      this.emptyEl = document.getElementById('history-empty');
      this.badgeEl = document.getElementById('history-badge');
      this.clearBtn = document.getElementById('clear-history-btn');
      this.closeBtn = document.getElementById('close-history-btn');
      this.toggleBtn = document.getElementById('history-toggle');

      this.bindEvents();
      this.render();
    }

    loadHistory() {
      try {
        const stored = localStorage.getItem(this.storageKey);
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        return [];
      }
    }

    saveHistory() {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.history));
      } catch (e) {}
    }

    addEntry(expression, result) {
      if (!expression || result === 'Error' || result === 'Cannot divide by zero') return;

      const entry = {
        id: Date.now(),
        expression,
        result,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      // Put newest on top, keep max 50 entries
      this.history.unshift(entry);
      if (this.history.length > 50) {
        this.history.pop();
      }

      this.saveHistory();
      this.render();
    }

    clearHistory() {
      this.history = [];
      this.saveHistory();
      this.render();
    }

    open() {
      const memPanel = document.getElementById('memory-panel');
      const sciPanel = document.getElementById('scientific-panel');
      if (memPanel) memPanel.classList.remove('open');
      if (sciPanel) sciPanel.classList.remove('open');
      const memToggle = document.getElementById('memory-toggle');
      const sciToggle = document.getElementById('scientific-toggle');
      if (memToggle) memToggle.classList.remove('active');
      if (sciToggle) sciToggle.classList.remove('active');

      this.drawerEl.classList.add('open');
      this.drawerEl.setAttribute('aria-hidden', 'false');
      this.backdropEl.classList.add('active');
    }

    close() {
      this.drawerEl.classList.remove('open');
      this.drawerEl.setAttribute('aria-hidden', 'true');
      this.backdropEl.classList.remove('active');
    }

    toggle() {
      if (this.drawerEl.classList.contains('open')) {
        this.close();
      } else {
        this.open();
      }
    }

    render() {
      // Update badge
      if (this.history.length > 0) {
        this.badgeEl.textContent = this.history.length > 99 ? '99+' : this.history.length;
        this.badgeEl.classList.remove('hidden');
      } else {
        this.badgeEl.classList.add('hidden');
      }

      // Clear existing items except empty template
      const items = this.listEl.querySelectorAll('.history-item');
      items.forEach(el => el.remove());

      if (this.history.length === 0) {
        if (this.emptyEl) this.emptyEl.style.display = 'flex';
        return;
      }

      if (this.emptyEl) this.emptyEl.style.display = 'none';

      // Render each history item
      const fragment = document.createDocumentFragment();
      this.history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.setAttribute('role', 'button');
        div.setAttribute('tabindex', '0');
        div.innerHTML = `
          <div class="history-item-time">${item.timestamp}</div>
          <div class="history-item-exp">${this.sanitize(item.expression)}</div>
          <div class="history-item-res">= ${this.sanitize(item.result)}</div>
        `;
        div.addEventListener('click', () => {
          if (this.onItemSelect) {
            this.onItemSelect(item);
          }
          this.close();
        });
        fragment.appendChild(div);
      });

      this.listEl.appendChild(fragment);
    }

    sanitize(str) {
      const temp = document.createElement('div');
      temp.textContent = str;
      return temp.innerHTML;
    }

    bindEvents() {
      if (this.toggleBtn) {
        this.toggleBtn.addEventListener('click', () => this.toggle());
      }
      if (this.closeBtn) {
        this.closeBtn.addEventListener('click', () => this.close());
      }
      if (this.backdropEl) {
        this.backdropEl.addEventListener('click', () => this.close());
      }
      if (this.clearBtn) {
        this.clearBtn.addEventListener('click', () => this.clearHistory());
      }
    }
  }

  // ==========================================
  // Core Calculator Engine
  // ==========================================
  class Calculator {
    constructor() {
      // DOM Elements
      this.resultDisplay = document.getElementById('result-display');
      this.expressionDisplay = document.getElementById('expression-display');
      this.container = document.getElementById('calculator-container');
      this.copyToast = document.getElementById('copy-toast');
      this.displaySection = document.getElementById('display-section');
      this.themeToggle = document.getElementById('theme-toggle');
      this.backdrop = document.getElementById('drawer-backdrop');

      // Panels & Trays
      this.memoryToggle = document.getElementById('memory-toggle');
      this.memoryPanel = document.getElementById('memory-panel');
      this.closeMemoryBtn = document.getElementById('close-memory-btn');
      this.memoryDisplayVal = document.getElementById('memory-display-val');
      this.memoryDot = document.getElementById('memory-dot');

      this.sciToggle = document.getElementById('scientific-toggle');
      this.sciPanel = document.getElementById('scientific-panel');
      this.closeSciBtn = document.getElementById('close-scientific-btn');
      this.doneSciBtn = document.getElementById('done-scientific-btn');
      this.degRadBtn = document.getElementById('btn-deg-rad');

      // Memory button elements
      this.btnMc = document.getElementById('btn-mc');
      this.btnMr = document.getElementById('btn-mr');

      // Operator key elements
      this.operatorButtons = document.querySelectorAll('.key-operator');

      // Calculator Internal State
      this.currentVal = '0';
      this.previousVal = null;
      this.operator = null;
      this.expressionStr = '';
      this.isCalculated = false;
      this.lastOp = null;
      this.lastOperand = null;
      this.angleMode = 'DEG'; // 'DEG' or 'RAD'
      this.memoryValue = 0;
      this.parenStack = [];

      // Audio & History sub-services
      this.haptics = new AudioHaptics();
      this.historyMgr = new HistoryManager((item) => this.loadFromHistory(item));

      this.initTheme();
      this.bindEvents();
      this.updateDisplay();
      this.updateMemoryUI();
    }

    // ==========================================
    // Theme Management
    // ==========================================
    initTheme() {
      const savedTheme = localStorage.getItem('neocalc_theme') || 'dark';
      this.setTheme(savedTheme);

      if (this.themeToggle) {
        this.themeToggle.addEventListener('click', () => {
          const current = document.documentElement.getAttribute('data-theme') || 'dark';
          const next = current === 'dark' ? 'light' : 'dark';
          this.setTheme(next);
        });
      }
    }

    setTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      try {
        localStorage.setItem('neocalc_theme', theme);
      } catch (e) {}
    }

    // ==========================================
    // Overlay Panels Management
    // ==========================================
    openMemoryPanel() {
      this.closeScientificPanel();
      if (this.historyMgr) this.historyMgr.close();
      if (this.memoryPanel) this.memoryPanel.classList.add('open');
      if (this.memoryToggle) this.memoryToggle.classList.add('active');
      if (this.backdrop) this.backdrop.classList.add('active');
    }

    closeMemoryPanel() {
      if (this.memoryPanel) this.memoryPanel.classList.remove('open');
      if (this.memoryToggle) this.memoryToggle.classList.remove('active');
      this.checkBackdrop();
    }

    openScientificPanel() {
      this.closeMemoryPanel();
      if (this.historyMgr) this.historyMgr.close();
      if (this.sciPanel) this.sciPanel.classList.add('open');
      if (this.sciToggle) this.sciToggle.classList.add('active');
      if (this.backdrop) this.backdrop.classList.add('active');
    }

    closeScientificPanel() {
      if (this.sciPanel) this.sciPanel.classList.remove('open');
      if (this.sciToggle) this.sciToggle.classList.remove('active');
      this.checkBackdrop();
    }

    checkBackdrop() {
      const memOpen = this.memoryPanel && this.memoryPanel.classList.contains('open');
      const sciOpen = this.sciPanel && this.sciPanel.classList.contains('open');
      const histOpen = this.historyMgr && this.historyMgr.drawerEl && this.historyMgr.drawerEl.classList.contains('open');
      if (!memOpen && !sciOpen && !histOpen && this.backdrop) {
        this.backdrop.classList.remove('active');
      }
    }

    // ==========================================
    // Input Handling
    // ==========================================
    inputDigit(digit) {
      this.haptics.playClick('normal');
      this.clearActiveOperatorHighlight();

      if (this.isCalculated) {
        this.currentVal = digit;
        this.isCalculated = false;
        this.expressionStr = '';
      } else {
        if (this.currentVal === '0') {
          this.currentVal = digit;
        } else if (this.currentVal === '-0') {
          this.currentVal = '-' + digit;
        } else {
          if (this.currentVal.replace(/[^0-9]/g, '').length >= 15) return; // Prevent excessive input
          this.currentVal += digit;
        }
      }

      this.updateDisplay();
    }

    inputDecimal() {
      this.haptics.playClick('normal');
      this.clearActiveOperatorHighlight();

      if (this.isCalculated) {
        this.currentVal = '0.';
        this.isCalculated = false;
        this.expressionStr = '';
      } else {
        if (!this.currentVal.includes('.')) {
          this.currentVal += '.';
        }
      }

      this.updateDisplay();
    }

    inputBackspace() {
      this.haptics.playClick('action');
      if (this.isCalculated) {
        // If result was just calculated, backspace clears expression
        this.expressionStr = '';
        this.isCalculated = false;
        this.updateDisplay();
        return;
      }

      if (this.currentVal.length > 1) {
        if (this.currentVal.length === 2 && this.currentVal.startsWith('-')) {
          this.currentVal = '0';
        } else {
          this.currentVal = this.currentVal.slice(0, -1);
        }
      } else {
        this.currentVal = '0';
      }

      this.updateDisplay();
    }

    clearAll() {
      this.haptics.playClick('action');
      this.currentVal = '0';
      this.previousVal = null;
      this.operator = null;
      this.expressionStr = '';
      this.isCalculated = false;
      this.lastOp = null;
      this.lastOperand = null;
      this.parenStack = [];
      this.clearActiveOperatorHighlight();
      this.updateDisplay();
    }

    toggleSign() {
      this.haptics.playClick('action');
      if (this.currentVal === '0' || this.currentVal === 'Error') return;

      if (this.currentVal.startsWith('-')) {
        this.currentVal = this.currentVal.substring(1);
      } else {
        this.currentVal = '-' + this.currentVal;
      }

      this.updateDisplay();
    }

    applyPercent() {
      this.haptics.playClick('action');
      const val = parseFloat(this.currentVal);
      if (isNaN(val)) return;

      let result;
      if (this.operator && this.previousVal !== null) {
        // Contextual percentage: e.g. 200 + 10% = 200 + 20
        const prev = parseFloat(this.previousVal);
        if (this.operator === '+' || this.operator === '-') {
          result = (prev * val) / 100;
        } else {
          result = val / 100;
        }
      } else {
        // Standalone percentage: 50% = 0.5
        result = val / 100;
      }

      this.currentVal = this.formatNumber(result);
      this.updateDisplay();
    }

    // ==========================================
    // Operators & Calculations
    // ==========================================
    setOperator(op) {
      this.haptics.playClick('operator');
      const current = parseFloat(this.currentVal);

      if (isNaN(current)) return;

      if (this.operator && !this.isCalculated && this.previousVal !== null) {
        // Continuous chaining without hitting equals first: e.g., 5 + 3 + 2
        this.calculateInternal(false);
      } else {
        this.previousVal = this.currentVal;
      }

      this.operator = op;
      this.isCalculated = false;
      this.lastOp = null;
      this.lastOperand = null;

      const opSymbol = this.getOperatorSymbol(op);
      this.expressionStr = `${this.formatDisplayValue(this.previousVal)} ${opSymbol}`;
      this.currentVal = '0';

      this.highlightActiveOperator(op);
      this.updateDisplay();
    }

    calculate() {
      this.haptics.playClick('equals');
      this.clearActiveOperatorHighlight();

      // Case 1: Repeated equals pressing (repeats last operation)
      if (this.isCalculated && this.lastOp && this.lastOperand !== null) {
        const prev = parseFloat(this.currentVal);
        const opVal = parseFloat(this.lastOperand);
        const result = this.executeMath(prev, opVal, this.lastOp);

        const exp = `${this.formatDisplayValue(this.currentVal)} ${this.getOperatorSymbol(this.lastOp)} ${this.formatDisplayValue(this.lastOperand)}`;
        const formattedRes = this.formatNumber(result);

        this.expressionStr = exp + ' =';
        this.currentVal = formattedRes;
        this.historyMgr.addEntry(exp, formattedRes);
        this.updateDisplay();
        return;
      }

      // Case 2: Standard calculation
      if (!this.operator || this.previousVal === null) return;

      this.calculateInternal(true);
    }

    calculateInternal(recordHistory = true) {
      const prev = parseFloat(this.previousVal);
      const curr = parseFloat(this.currentVal);

      if (isNaN(prev) || isNaN(curr)) return;

      // Division by zero check
      if (this.operator === '/' && curr === 0) {
        this.currentVal = 'Cannot divide by zero';
        this.expressionStr = `${this.formatDisplayValue(this.previousVal)} ÷ 0 =`;
        this.operator = null;
        this.previousVal = null;
        this.isCalculated = true;
        this.updateDisplay();
        return;
      }

      const result = this.executeMath(prev, curr, this.operator);
      const formattedResult = this.formatNumber(result);
      const opSymbol = this.getOperatorSymbol(this.operator);
      const fullExpression = `${this.formatDisplayValue(this.previousVal)} ${opSymbol} ${this.formatDisplayValue(this.currentVal)}`;

      // Store for repeated equals
      this.lastOp = this.operator;
      this.lastOperand = this.currentVal;

      if (recordHistory) {
        this.historyMgr.addEntry(fullExpression, formattedResult);
        this.expressionStr = fullExpression + ' =';
      } else {
        this.expressionStr = `${formattedResult} ${this.getOperatorSymbol(this.operator)}`;
      }

      this.currentVal = formattedResult;
      this.previousVal = formattedResult;
      this.isCalculated = true;
      this.operator = null;

      this.updateDisplay();
    }

    executeMath(a, b, op) {
      switch (op) {
        case '+':
          return a + b;
        case '-':
          return a - b;
        case '*':
          return a * b;
        case '/':
          return a / b;
        case '^':
          return Math.pow(a, b);
        default:
          return b;
      }
    }

    // ==========================================
    // Advanced & Scientific Functions
    // ==========================================
    applyScientific(action) {
      this.haptics.playClick('action');
      const val = parseFloat(this.currentVal);

      if (action === 'deg-rad') {
        this.toggleAngleMode();
        return;
      }

      if (action === 'pi') {
        this.currentVal = this.formatNumber(Math.PI);
        this.isCalculated = true;
        this.updateDisplay();
        return;
      }

      if (action === 'e') {
        this.currentVal = this.formatNumber(Math.E);
        this.isCalculated = true;
        this.updateDisplay();
        return;
      }

      if (action === 'power') {
        this.setOperator('^');
        return;
      }

      if (action === 'open-paren') {
        this.openParenthesis();
        return;
      }

      if (action === 'close-paren') {
        this.closeParenthesis();
        return;
      }

      if (isNaN(val)) return;

      let result;
      let expLabel = '';

      switch (action) {
        case 'sin': {
          const rad = this.angleMode === 'DEG' ? (val * Math.PI) / 180 : val;
          // Clean roundings for 180, 360 deg
          if (this.angleMode === 'DEG' && val % 180 === 0) result = 0;
          else result = Math.sin(rad);
          expLabel = `sin(${val})`;
          break;
        }
        case 'cos': {
          const rad = this.angleMode === 'DEG' ? (val * Math.PI) / 180 : val;
          if (this.angleMode === 'DEG' && (val - 90) % 180 === 0) result = 0;
          else result = Math.cos(rad);
          expLabel = `cos(${val})`;
          break;
        }
        case 'tan': {
          const rad = this.angleMode === 'DEG' ? (val * Math.PI) / 180 : val;
          if (this.angleMode === 'DEG' && (val - 90) % 180 === 0) {
            result = NaN;
          } else if (this.angleMode === 'DEG' && val % 180 === 0) {
            result = 0;
          } else {
            result = Math.tan(rad);
          }
          expLabel = `tan(${val})`;
          break;
        }
        case 'asin': {
          if (val < -1 || val > 1) {
            result = NaN;
          } else {
            result = Math.asin(val);
            if (this.angleMode === 'DEG') result = (result * 180) / Math.PI;
          }
          expLabel = `sin⁻¹(${val})`;
          break;
        }
        case 'acos': {
          if (val < -1 || val > 1) {
            result = NaN;
          } else {
            result = Math.acos(val);
            if (this.angleMode === 'DEG') result = (result * 180) / Math.PI;
          }
          expLabel = `cos⁻¹(${val})`;
          break;
        }
        case 'atan': {
          result = Math.atan(val);
          if (this.angleMode === 'DEG') result = (result * 180) / Math.PI;
          expLabel = `tan⁻¹(${val})`;
          break;
        }
        case 'square':
          result = val * val;
          expLabel = `sqr(${val})`;
          break;
        case 'cube':
          result = val * val * val;
          expLabel = `cube(${val})`;
          break;
        case 'sqrt':
          if (val < 0) {
            result = NaN;
          } else {
            result = Math.sqrt(val);
          }
          expLabel = `√(${val})`;
          break;
        case 'cbrt':
          result = Math.cbrt(val);
          expLabel = `∛(${val})`;
          break;
        case 'log':
          if (val <= 0) {
            result = NaN;
          } else {
            result = Math.log10(val);
          }
          expLabel = `log₁₀(${val})`;
          break;
        case 'ln':
          if (val <= 0) {
            result = NaN;
          } else {
            result = Math.log(val);
          }
          expLabel = `ln(${val})`;
          break;
        case 'reciprocal':
          if (val === 0) {
            this.currentVal = 'Cannot divide by zero';
            this.expressionStr = `1 / 0 =`;
            this.isCalculated = true;
            this.updateDisplay();
            return;
          }
          result = 1 / val;
          expLabel = `1/(${val})`;
          break;
        case 'factorial':
          if (val < 0 || !Number.isInteger(val) || val > 170) {
            result = NaN;
          } else {
            result = this.computeFactorial(val);
          }
          expLabel = `${val}!`;
          break;
        default:
          return;
      }

      if (isNaN(result) || !isFinite(result)) {
        this.currentVal = 'Invalid Input';
        this.expressionStr = expLabel + ' =';
      } else {
        const formatted = this.formatNumber(result);
        this.expressionStr = expLabel + ' =';
        this.historyMgr.addEntry(expLabel, formatted);
        this.currentVal = formatted;
      }

      this.isCalculated = true;
      this.updateDisplay();
    }

    computeFactorial(n) {
      if (n === 0 || n === 1) return 1;
      let res = 1;
      for (let i = 2; i <= n; i++) {
        res *= i;
      }
      return res;
    }

    openParenthesis() {
      this.haptics.playClick('action');
      this.parenStack.push({
        prev: this.previousVal,
        op: this.operator,
        expr: this.expressionStr
      });

      if (this.expressionStr) {
        this.expressionStr += ' (';
      } else {
        this.expressionStr = '(';
      }

      this.previousVal = null;
      this.operator = null;
      this.currentVal = '0';
      this.isCalculated = false;
      this.clearActiveOperatorHighlight();
      this.updateDisplay();
    }

    closeParenthesis() {
      this.haptics.playClick('action');
      if (this.parenStack.length === 0) return;

      // Calculate whatever was inside this parenthesis level if operator exists
      if (this.operator && this.previousVal !== null) {
        const prev = parseFloat(this.previousVal);
        const curr = parseFloat(this.currentVal);
        const res = this.executeMath(prev, curr, this.operator);
        this.currentVal = this.formatNumber(res);
      }

      const outer = this.parenStack.pop();
      const parenVal = this.currentVal;
      this.previousVal = outer.prev;
      this.operator = outer.op;

      const prefix = outer.expr ? outer.expr + ' ' : '';
      this.expressionStr = `${prefix}(${this.formatDisplayValue(parenVal)})`;
      this.isCalculated = true;
      this.updateDisplay();
    }

    toggleAngleMode() {
      this.angleMode = this.angleMode === 'DEG' ? 'RAD' : 'DEG';
      if (this.angleBadge) {
        this.angleBadge.textContent = this.angleMode;
      }
      if (this.degRadBtn) {
        this.degRadBtn.textContent = this.angleMode === 'DEG' ? 'RAD' : 'DEG';
      }
    }

    // ==========================================
    // Memory Functions
    // ==========================================
    handleMemory(action) {
      this.haptics.playClick('action');
      const val = parseFloat(this.currentVal);

      switch (action) {
        case 'mc':
          this.memoryValue = 0;
          break;
        case 'mr':
          this.currentVal = this.formatNumber(this.memoryValue);
          this.isCalculated = true;
          this.updateDisplay();
          break;
        case 'm-plus':
          if (!isNaN(val)) {
            this.memoryValue += val;
            this.isCalculated = true;
          }
          break;
        case 'm-minus':
          if (!isNaN(val)) {
            this.memoryValue -= val;
            this.isCalculated = true;
          }
          break;
        case 'ms':
          if (!isNaN(val)) {
            this.memoryValue = val;
            this.isCalculated = true;
          }
          break;
      }

      this.updateMemoryUI();
    }

    updateMemoryUI() {
      const hasMemory = Math.abs(this.memoryValue) > 0;
      if (this.memoryDot) {
        if (hasMemory) {
          this.memoryDot.classList.remove('hidden');
        } else {
          this.memoryDot.classList.add('hidden');
        }
      }

      if (this.memoryDisplayVal) {
        this.memoryDisplayVal.textContent = this.formatNumber(this.memoryValue);
      }

      if (this.btnMc) this.btnMc.disabled = !hasMemory;
      if (this.btnMr) this.btnMr.disabled = !hasMemory;
    }

    // ==========================================
    // Display & Formatting
    // ==========================================
    formatNumber(num) {
      if (isNaN(num)) return 'Error';
      if (!isFinite(num)) return 'Cannot divide by zero';

      // Extreme numbers -> Scientific notation
      if (Math.abs(num) >= 1e14 || (Math.abs(num) > 0 && Math.abs(num) < 1e-7)) {
        return num.toExponential(7).replace(/e\+?/, 'e');
      }

      // Eliminate floating point binary inaccuracies (e.g. 0.1 + 0.2 = 0.3)
      const precise = parseFloat(Number(num.toPrecision(12)).toFixed(10));
      return precise.toString();
    }

    formatDisplayValue(valStr) {
      if (!valStr) return '0';
      if (valStr === 'Error' || valStr === 'Cannot divide by zero' || valStr === 'Invalid Input') {
        return valStr;
      }

      // If exponential notation
      if (valStr.includes('e')) {
        return valStr;
      }

      const parts = valStr.split('.');
      // Format integer part with thousands separators
      const intFormatted = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

      if (parts.length > 1) {
        return `${intFormatted}.${parts[1]}`;
      }
      return intFormatted;
    }

    updateDisplay() {
      // Secondary formula display
      if (this.expressionDisplay) {
        this.expressionDisplay.textContent = this.expressionStr;
      }

      // Main result display
      if (this.resultDisplay) {
        const formatted = this.formatDisplayValue(this.currentVal);
        this.resultDisplay.textContent = formatted;
        this.adjustFontSize(formatted);
      }
    }

    adjustFontSize(text) {
      const len = text.length;
      let size = 'clamp(2.8rem, 12vw, 4.4rem)';

      if (len > 14) {
        size = 'clamp(1.6rem, 6.8vw, 2.2rem)';
      } else if (len > 11) {
        size = 'clamp(2.0rem, 8.2vw, 2.8rem)';
      } else if (len > 8) {
        size = 'clamp(2.4rem, 10vw, 3.4rem)';
      }

      this.resultDisplay.style.fontSize = size;
    }

    getOperatorSymbol(op) {
      switch (op) {
        case '+': return '+';
        case '-': return '−';
        case '*': return '×';
        case '/': return '÷';
        case '^': return '^';
        default: return '';
      }
    }

    highlightActiveOperator(op) {
      this.clearActiveOperatorHighlight();
      const btn = Array.from(this.operatorButtons).find(b => b.getAttribute('data-val') === op);
      if (btn) {
        btn.classList.add('is-active-op');
      }
    }

    clearActiveOperatorHighlight() {
      this.operatorButtons.forEach(b => b.classList.remove('is-active-op'));
    }

    loadFromHistory(item) {
      this.currentVal = item.result;
      this.expressionStr = item.expression + ' =';
      this.isCalculated = true;
      this.operator = null;
      this.previousVal = null;
      this.updateDisplay();
    }

    // ==========================================
    // Clipboard Copy
    // ==========================================
    copyResult() {
      if (!this.currentVal) return;
      const text = this.currentVal;
      navigator.clipboard.writeText(text).then(() => {
        if (this.copyToast) {
          this.copyToast.classList.add('show');
          setTimeout(() => {
            this.copyToast.classList.remove('show');
          }, 1800);
        }
      }).catch(() => {});
    }

    // ==========================================
    // Event Listeners
    // ==========================================
    bindEvents() {
      // Keypad Click Event Delegation
      const keypad = document.getElementById('primary-keypad');
      if (keypad) {
        keypad.addEventListener('click', (e) => {
          const btn = e.target.closest('button');
          if (!btn) return;

          const action = btn.getAttribute('data-action');
          const val = btn.getAttribute('data-val');

          switch (action) {
            case 'number':
              this.inputDigit(val);
              break;
            case 'decimal':
              this.inputDecimal();
              break;
            case 'operator':
              this.setOperator(val);
              break;
            case 'equals':
              this.calculate();
              break;
            case 'backspace':
              this.inputBackspace();
              break;
            case 'clear':
              this.clearAll();
              break;
            case 'percent':
              this.applyPercent();
              break;
            case 'negate':
              this.toggleSign();
              break;
          }
        });
      }

      // Memory Panel Toggles & Actions
      if (this.memoryToggle) {
        this.memoryToggle.addEventListener('click', () => {
          if (this.memoryPanel && this.memoryPanel.classList.contains('open')) {
            this.closeMemoryPanel();
          } else {
            this.openMemoryPanel();
          }
        });
      }

      if (this.closeMemoryBtn) {
        this.closeMemoryBtn.addEventListener('click', () => this.closeMemoryPanel());
      }

      if (this.memoryPanel) {
        this.memoryPanel.addEventListener('click', (e) => {
          const btn = e.target.closest('button');
          if (!btn || btn.disabled || btn.id === 'close-memory-btn') return;
          const action = btn.getAttribute('data-action');
          if (action) {
            this.handleMemory(action);
          }
        });
      }

      // Scientific Panel Toggles & Actions
      if (this.sciToggle) {
        this.sciToggle.addEventListener('click', () => {
          if (this.sciPanel && this.sciPanel.classList.contains('open')) {
            this.closeScientificPanel();
          } else {
            this.openScientificPanel();
          }
        });
      }

      if (this.closeSciBtn) {
        this.closeSciBtn.addEventListener('click', () => this.closeScientificPanel());
      }

      if (this.doneSciBtn) {
        this.doneSciBtn.addEventListener('click', () => this.closeScientificPanel());
      }

      if (this.sciPanel) {
        this.sciPanel.addEventListener('click', (e) => {
          const btn = e.target.closest('button');
          if (!btn || btn.id === 'close-scientific-btn' || btn.id === 'done-scientific-btn') return;
          const action = btn.getAttribute('data-action');
          if (action) {
            this.applyScientific(action);
          }
        });
      }

      // Backdrop dismissal
      if (this.backdrop) {
        this.backdrop.addEventListener('click', () => {
          this.closeMemoryPanel();
          this.closeScientificPanel();
          if (this.historyMgr) this.historyMgr.close();
          this.backdrop.classList.remove('active');
        });
      }

      // Copy result on clicking display
      if (this.displaySection) {
        this.displaySection.addEventListener('click', () => this.copyResult());
      }

      // Keyboard support
      window.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    handleKeyboard(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const key = e.key;

      if (/^[0-9]$/.test(key)) {
        e.preventDefault();
        this.inputDigit(key);
      } else if (key === '.') {
        e.preventDefault();
        this.inputDecimal();
      } else if (key === '+' || key === '-' || key === '*' || key === '/') {
        e.preventDefault();
        this.setOperator(key);
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        this.calculate();
      } else if (key === 'Backspace') {
        e.preventDefault();
        this.inputBackspace();
      } else if (key === 'Escape' || key.toLowerCase() === 'c') {
        e.preventDefault();
        this.clearAll();
      } else if (key === '%') {
        e.preventDefault();
        this.applyPercent();
      } else if (key === '(') {
        e.preventDefault();
        this.openParenthesis();
      } else if (key === ')') {
        e.preventDefault();
        this.closeParenthesis();
      } else if (key === '^') {
        e.preventDefault();
        this.setOperator('^');
      }
    }
  }

  // Initialize application once DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    window.calcApp = new Calculator();
  });
})();
