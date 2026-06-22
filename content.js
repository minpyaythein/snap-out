var OVERLAY_ID = 'time-nudge-overlay';

// chrome.runtime calls throw "Extension context invalidated" when this content
// script is orphaned by an extension reload/update while the page stays open.
// Swallow it — there's nothing to do until the page reloads with a fresh script.
function safeSendMessage(message) {
    try {
        chrome.runtime.sendMessage(message);
    } catch (e) {
        // orphaned content script; ignore
    }
}

const DIFFICULTY_CONFIG = {
    'easy':       { type: 'arithmetic',     ops: ['+', '-', '×', '÷'], range: { min: 1,   max: 10  }, operands: 2 },
    'medium':     { type: 'arithmetic',     ops: ['+', '-', '×', '÷'], range: { min: 10,  max: 99  }, operands: 2 },
    'hard':       { type: 'arithmetic',     ops: ['+', '-', '×', '÷'], range: { min: 100, max: 999 }, operands: 2 },
    'very-hard':  { type: 'arithmetic',     ops: ['+', '-', '×', '÷'], range: { min: 100, max: 999 }, operands: 3 },
    'super-hard': { type: 'complex' },
    'impossible': { type: 'double-complex' }
};

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function toSup(n) {
    return String(n).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join('');
}

function toSub(n) {
    return String(n).split('').map(d => '₀₁₂₃₄₅₆₇₈₉'[d]).join('');
}

function generateComplexExpr() {
    const types = ['log', 'derivative', 'integral', 'factorial'];
    const type = types[Math.floor(Math.random() * types.length)];

    if (type === 'log') {
        const bases = [2, 3, 5, 10];
        const base = bases[Math.floor(Math.random() * bases.length)];
        const exp = randInt(2, 5);
        return { expr: `log${toSub(base)}(${Math.pow(base, exp)})`, answer: exp };
    }

    if (type === 'derivative') {
        // d/dx(xⁿ) at x=k → answer = n·k^(n-1)
        const n = randInt(2, 4);
        const k = randInt(2, 9);
        return { expr: `d/dx(x${toSup(n)}) at x=${k}`, answer: n * Math.pow(k, n - 1) };
    }

    if (type === 'integral') {
        // ∫₀ᵏ n·x^(n-1) dx = kⁿ
        const n = randInt(2, 3);
        const k = randInt(2, 8);
        const integrand = n === 2 ? '2x' : `3x${toSup(2)}`;
        return { expr: `∫${toSub(0)}${toSup(k)} ${integrand} dx`, answer: Math.pow(k, n) };
    }

    // factorial
    const n = randInt(5, 7);
    let answer = 1;
    for (let i = 2; i <= n; i++) answer *= i;
    return { expr: `${n}!`, answer };
}

function generateThreeOperand(range) {
    const r = range;
    const patternIdx = Math.floor(Math.random() * 6);

    if (patternIdx === 0) {
        const a = randInt(r.min, r.max), b = randInt(r.min, r.max), c = randInt(r.min, r.max);
        return { question: `${a} + ${b} + ${c} = ?`, answer: a + b + c };
    }
    if (patternIdx === 1) {
        const a = randInt(r.min, r.max), b = randInt(r.min, r.max);
        const c = randInt(r.min, Math.min(a + b - 1, r.max));
        return { question: `${a} + ${b} − ${c} = ?`, answer: a + b - c };
    }
    if (patternIdx === 2) {
        // Use smaller multipliers so the problem stays solvable (barely)
        const a = randInt(10, 50), b = randInt(10, 50), c = randInt(r.min, r.max);
        return { question: `${a} × ${b} + ${c} = ?`, answer: a * b + c };
    }
    if (patternIdx === 3) {
        const a = randInt(10, 50), b = randInt(10, 50);
        const product = a * b;
        const c = randInt(1, Math.min(product - 1, r.max));
        return { question: `${a} × ${b} − ${c} = ?`, answer: product - c };
    }
    if (patternIdx === 4) {
        const divisor = randInt(2, 20);
        const quotient = randInt(r.min, r.max);
        const c = randInt(r.min, r.max);
        return { question: `(${divisor * quotient} ÷ ${divisor}) + ${c} = ?`, answer: quotient + c };
    }
    // (a ÷ b) − c
    const divisor = randInt(2, 20);
    const quotient = randInt(r.min, r.max);
    const c = randInt(r.min, Math.max(quotient - 1, r.min));
    return { question: `(${divisor * quotient} ÷ ${divisor}) − ${c} = ?`, answer: Math.max(quotient - c, 0) };
}

function generateArithmetic(config) {
    const { ops, range, operands } = config;

    if (operands === 3) {
        return generateThreeOperand(range);
    }

    const op = ops[Math.floor(Math.random() * ops.length)];
    let a, b, answer;

    if (op === '+') {
        a = randInt(range.min, range.max);
        b = randInt(range.min, range.max);
        answer = a + b;
    } else if (op === '-') {
        a = randInt(range.min, range.max);
        b = randInt(range.min, range.max);
        if (b > a) { const tmp = a; a = b; b = tmp; }
        answer = a - b;
    } else if (op === '×') {
        a = randInt(range.min, range.max);
        b = randInt(range.min, range.max);
        answer = a * b;
    } else { // ÷
        b = randInt(2, Math.min(range.max, 20));
        answer = randInt(range.min, range.max);
        a = b * answer;
    }

    return { question: `${a} ${op} ${b} = ?`, answer };
}

function generateProblem(difficulty = 'hard') {
    const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG['hard'];

    if (config.type === 'complex') {
        const { expr, answer } = generateComplexExpr();
        return { question: `${expr} = ?`, answer };
    }

    if (config.type === 'double-complex') {
        const p1 = generateComplexExpr();
        const p2 = generateComplexExpr();
        const ops = ['+', '-', '×'];
        const op = ops[Math.floor(Math.random() * ops.length)];
        let answer, question;

        if (op === '+') {
            answer = p1.answer + p2.answer;
            question = `[${p1.expr}] + [${p2.expr}] = ?`;
        } else if (op === '-') {
            if (p2.answer > p1.answer) {
                answer = p2.answer - p1.answer;
                question = `[${p2.expr}] − [${p1.expr}] = ?`;
            } else {
                answer = p1.answer - p2.answer;
                question = `[${p1.expr}] − [${p2.expr}] = ?`;
            }
        } else {
            answer = p1.answer * p2.answer;
            question = `[${p1.expr}] × [${p2.expr}] = ?`;
        }

        return { question, answer };
    }

    return generateArithmetic(config);
}

function showBanner(hostname) {
    document.getElementById(OVERLAY_ID)?.remove();

    const banner = document.createElement('div');
    banner.id = OVERLAY_ID;
    banner.className = 'time-nudge-banner';
    banner.innerHTML = `
        <span>⏰ You've been on <strong class="time-nudge-host"></strong> for a while. Time for a break?</span>
        <button class="time-nudge-banner-dismiss">Dismiss</button>
    `;
    // Set the hostname via textContent rather than interpolating into innerHTML.
    banner.querySelector('.time-nudge-host').textContent = hostname;

    banner.querySelector('.time-nudge-banner-dismiss').addEventListener('click', () => {
        banner.remove();
        safeSendMessage({ type: 'DISMISS_POPUP', hostname });
    });

    document.body.appendChild(banner);
}

function showPopup(hostname, difficulty = 'hard') {
    document.getElementById(OVERLAY_ID)?.remove();

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.className = 'time-nudge-popup';

    let problem = generateProblem(difficulty);

    overlay.innerHTML = `
        <div class="time-nudge-box">
            <p class="time-nudge-message">
                You've been on <strong class="time-nudge-host"></strong> for a while.<br>
                Solve this to take a break!
            </p>
            <p class="time-nudge-problem"></p>
            <input class="time-nudge-input" type="number" placeholder="Your answer" />
            <p class="time-nudge-error"></p>
            <button class="time-nudge-check" disabled>Check</button>
        </div>
    `;

    const input = overlay.querySelector('.time-nudge-input');
    const errorEl = overlay.querySelector('.time-nudge-error');
    const problemEl = overlay.querySelector('.time-nudge-problem');
    const checkBtn = overlay.querySelector('.time-nudge-check');

    // Set dynamic text via textContent rather than interpolating into innerHTML.
    overlay.querySelector('.time-nudge-host').textContent = hostname;
    problemEl.textContent = problem.question;

    // The Check button is only clickable once something is typed.
    function updateCheckState() {
        checkBtn.disabled = input.value.trim() === '';
    }

    function showSuccess() {
        const box = overlay.querySelector('.time-nudge-box');
        box.innerHTML = `
            <div class="time-nudge-success">
                <div class="time-nudge-checkmark">✓</div>
                <p class="time-nudge-success-title">Nice work!</p>
                <p class="time-nudge-success-sub">Back to it — make these minutes count. 🌿</p>
            </div>
        `;
    }

    function validate() {
        if (input.value.trim() === '') return; // nothing entered
        const userAnswer = parseInt(input.value.trim(), 10);
        if (userAnswer === problem.answer) {
            // Brief celebration, then reset the timer + clear overlays everywhere.
            showSuccess();
            setTimeout(() => {
                overlay.remove();
                safeSendMessage({ type: 'DISMISS_POPUP', hostname });
            }, 1500);
        } else {
            errorEl.textContent = 'Wrong! Try again.';
            input.value = '';
            updateCheckState(); // re-disable now that the field is empty again
            // Restart the shake animation each wrong answer (toggle + reflow).
            input.classList.remove('time-nudge-wrong');
            void input.offsetWidth;
            input.classList.add('time-nudge-wrong');
            setTimeout(() => {
                problem = generateProblem(difficulty);
                problemEl.textContent = problem.question;
                errorEl.textContent = '';
                input.classList.remove('time-nudge-wrong');
            }, 400);
        }
    }

    input.addEventListener('input', updateCheckState);
    checkBtn.addEventListener('click', validate);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') validate();
    });

    document.body.appendChild(overlay);
    updateCheckState();
    input.focus();
}

if (!window.__snapOutListener) {
    window.__snapOutListener = true;
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message.type === 'SHOW_POPUP') {
            // force=false is a catch-up broadcast: only show if there's no
            // overlay yet, so we never wipe a problem the user is mid-answer on.
            const existing = document.getElementById(OVERLAY_ID);
            if (existing && message.force === false) {
                sendResponse({ ok: true });
                return;
            }
            if (message.difficulty === 'none') {
                showBanner(message.hostname);
            } else {
                showPopup(message.hostname, message.difficulty);
            }
        } else if (message.type === 'HIDE_OVERLAY') {
            document.getElementById(OVERLAY_ID)?.remove();
        }
        sendResponse({ ok: true });
    });
}
