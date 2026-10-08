// --- USER CONFIGURATION ---
const userName = "Pairode";

// --- BOND CONSTANTS ---
const BOND_START_DATE = new Date('2021-07-16T00:00:00+07:00');
const BOND_FULL_TERM_LAST_DAY = new Date('2028-05-18T00:00:00+07:00');

// Dynamically compute BOND_END_DATE as midnight immediately following BOND_FULL_TERM_LAST_DAY
const BOND_END_DATE = new Date(
    BOND_FULL_TERM_LAST_DAY.getFullYear(),
    BOND_FULL_TERM_LAST_DAY.getMonth(),
    BOND_FULL_TERM_LAST_DAY.getDate() + 1
);

const ORIGINAL_USD = 411726.83;
const ORIGINAL_THB = 151712.00;

// --- FINANCIAL & TIME CONSTANTS ---
const DEFAULT_USD_THB_RATE = 34.5;
const FX_FEE_MULTIPLIER = 1.02;

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const SECONDS_PER_DAY = SECONDS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY;
const MS_PER_DAY = SECONDS_PER_DAY * MS_PER_SECOND;

const REFRESH_RATE_MS = 100;

// Derived constants
const TOTAL_BOND_DAYS = Math.round((BOND_END_DATE - BOND_START_DATE) / MS_PER_DAY);
let usdExchangeRate = DEFAULT_USD_THB_RATE;

// --- TEST / PREVIEW FLAGS ---
// Set to true in browser console via `window.IS_COMPLETED_TEST = true` to preview 100% completion mode
window.IS_COMPLETED_TEST = false;
let confettiFired = false;
let lastCompletedState = false;

// DOM Elements
const slider = document.getElementById('departure-slider');
const datepicker = document.getElementById('departure-datepicker');
const fxInput = document.getElementById('fx-rate-input');

// Formatters
const formatUSD = (val, decimals = 4) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', currencyDisplay: 'code', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(val);
const formatTHB = (val, decimals = 2) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', currencyDisplay: 'code', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(val);

const DATE_FORMAT_FULL = { month: 'long', day: 'numeric', year: 'numeric' };
const DATE_FORMAT_SHORT = { month: 'short', day: 'numeric', year: 'numeric' };

function formatDateToYYYYMMDD(dateObj) {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

async function fetchExchangeRate() {
    const icon = document.getElementById('fx-refresh-icon');
    if (icon) icon.classList.add('fa-spin');
    
    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        if (res.ok) {
            const data = await res.json();
            if (data && data.rates && data.rates.THB) {
                usdExchangeRate = parseFloat(data.rates.THB);
                fxInput.value = (usdExchangeRate * FX_FEE_MULTIPLIER).toFixed(2);
            }
        }
    } catch (err) {
        console.log(`Using fallback rate (${DEFAULT_USD_THB_RATE} THB/USD)`);
    } finally {
        if (icon) setTimeout(() => icon.classList.remove('fa-spin'), 500);
    }
    updateDashboard();
}

function getMilestoneDate(targetFraction) {
    const totalMs = BOND_END_DATE - BOND_START_DATE;
    const milestoneMs = BOND_START_DATE.getTime() + (totalMs * targetFraction);
    return new Date(milestoneMs);
}

function initControls() {
    // Render name dynamically in header
    const nameElemHeader = document.getElementById('user-name-header');
    if (nameElemHeader) {
        nameElemHeader.textContent = `${userName}'s DPST Bond Tracker`;
    }

    const nameElem = document.getElementById('user-name-display');
    if (nameElem) {
        nameElem.textContent = userName;
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const minTime = Math.max(todayStart.getTime(), BOND_START_DATE.getTime());
    const maxTime = BOND_FULL_TERM_LAST_DAY.getTime();

    fxInput.value = DEFAULT_USD_THB_RATE;

    document.getElementById('bond-duration-subtitle').textContent = 
        `${BOND_START_DATE.toLocaleDateString('en-US', DATE_FORMAT_FULL)} \u2014 ${BOND_FULL_TERM_LAST_DAY.toLocaleDateString('en-US', DATE_FORMAT_FULL)} (${TOTAL_BOND_DAYS.toLocaleString()} Total Service Days)`;
    
    document.getElementById('progress-start-label').textContent = `Start: ${BOND_START_DATE.toLocaleDateString('en-US', DATE_FORMAT_SHORT)}`;
    document.getElementById('progress-end-label').textContent = `Full Term: ${BOND_FULL_TERM_LAST_DAY.toLocaleDateString('en-US', DATE_FORMAT_SHORT)}`;

    document.getElementById('slider-min-label').textContent = `Today (${now.toLocaleDateString('en-US', DATE_FORMAT_SHORT)})`;
    document.getElementById('slider-max-label').textContent = `${BOND_FULL_TERM_LAST_DAY.toLocaleDateString('en-US', DATE_FORMAT_SHORT)} (Full Term)`;
    
    document.getElementById('footer-formula-text').textContent = 
        `Continuous Real-Time Pro-Rata Formula: Principal (${formatUSD(ORIGINAL_USD, 2)} + ${formatTHB(ORIGINAL_THB, 2)}) \u00D7 (Remaining Time / ${TOTAL_BOND_DAYS.toLocaleString()} Days)`;

    slider.min = minTime;
    slider.max = maxTime;
    slider.step = MS_PER_DAY;
    slider.value = minTime;

    const minDateObj = new Date(minTime);
    datepicker.min = formatDateToYYYYMMDD(minDateObj);
    datepicker.max = formatDateToYYYYMMDD(BOND_FULL_TERM_LAST_DAY);
    datepicker.value = formatDateToYYYYMMDD(minDateObj);

    slider.addEventListener('input', () => {
        const simDate = new Date(parseInt(slider.value));
        datepicker.value = formatDateToYYYYMMDD(simDate);
        calculateSimulation();
    });

    datepicker.addEventListener('change', () => {
        if (!datepicker.value) return;
        const parts = datepicker.value.split('-');
        const pickedDate = new Date(parts[0], parts[1] - 1, parts[2]);
        slider.value = pickedDate.getTime();
        calculateSimulation();
    });

    fxInput.addEventListener('input', () => {
        usdExchangeRate = parseFloat(fxInput.value) || DEFAULT_USD_THB_RATE;
        updateDashboard();
    });
}

function adjustSimulatedDate(days) {
    const currentMs = parseInt(slider.value);
    const newMs = currentMs + (days * MS_PER_DAY);
    const minMs = parseInt(slider.min);
    const maxMs = parseInt(slider.max);

    const clampedMs = Math.max(minMs, Math.min(maxMs, newMs));
    
    slider.value = clampedMs;
    const simDate = new Date(clampedMs);
    datepicker.value = formatDateToYYYYMMDD(simDate);
    calculateSimulation();
}

function getUnservedDaysFromLastServiceDate(lastServiceDateObj) {
    const nextDayMidnight = new Date(lastServiceDateObj.getFullYear(), lastServiceDateObj.getMonth(), lastServiceDateObj.getDate() + 1);
    const diffMs = Math.max(0, BOND_END_DATE - nextDayMidnight);
    return Math.round(diffMs / MS_PER_DAY);
}

// Modal Control Functions
function showVictoryModal() {
    const modal = document.getElementById('victory-modal');
    const daysServedElem = document.getElementById('modal-days-served');
    
    if (!modal) return;
    
    if (daysServedElem && TOTAL_BOND_DAYS) {
        daysServedElem.textContent = TOTAL_BOND_DAYS.toLocaleString();
    }
    
    modal.classList.remove('opacity-0', 'pointer-events-none', 'scale-95');
    modal.classList.add('opacity-100', 'pointer-events-auto', 'scale-100');
}

function closeVictoryModal() {
    const modal = document.getElementById('victory-modal');
    if (!modal) return;
    
    modal.classList.remove('opacity-100', 'pointer-events-auto', 'scale-100');
    modal.classList.add('opacity-0', 'pointer-events-none', 'scale-95');
}

function updateDashboard() {
    const now = new Date();
    
    // Check if test flag is active OR if the real date has passed BOND_END_DATE
    const isCompleted = window.IS_COMPLETED_TEST || (now >= BOND_END_DATE);

    // Dynamic Slider Bounds & Reset Logic
    if (slider) {
        if (isCompleted) {
            const minMs = BOND_START_DATE.getTime();
            const maxMs = BOND_FULL_TERM_LAST_DAY.getTime();

            slider.min = minMs;
            slider.max = maxMs;

            if (datepicker) {
                datepicker.min = formatDateToYYYYMMDD(BOND_START_DATE);
                datepicker.max = formatDateToYYYYMMDD(BOND_FULL_TERM_LAST_DAY);
            }

            const minLabel = document.getElementById('slider-min-label');
            if (minLabel) {
                minLabel.textContent = `Start (${BOND_START_DATE.toLocaleDateString('en-US', DATE_FORMAT_SHORT)})`;
            }

            // Reset slider value to End Date upon entering victory mode
            if (!lastCompletedState) {
                slider.value = maxMs;
                if (datepicker) datepicker.value = formatDateToYYYYMMDD(BOND_FULL_TERM_LAST_DAY);
            }
        } else {
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const minMs = Math.max(todayStart.getTime(), BOND_START_DATE.getTime());
            const maxMs = BOND_FULL_TERM_LAST_DAY.getTime();

            slider.min = minMs;
            slider.max = maxMs;

            if (datepicker) {
                datepicker.min = formatDateToYYYYMMDD(new Date(minMs));
                datepicker.max = formatDateToYYYYMMDD(BOND_FULL_TERM_LAST_DAY);
            }

            const minLabel = document.getElementById('slider-min-label');
            if (minLabel) {
                minLabel.textContent = `Today (${now.toLocaleDateString('en-US', DATE_FORMAT_SHORT)})`;
            }

            // Reset slider value if exiting test mode
            if (lastCompletedState) {
                slider.value = minMs;
                if (datepicker) datepicker.value = formatDateToYYYYMMDD(new Date(minMs));
            }
        }
    }

    // Trigger confetti & victory modal on transition edge
    if (isCompleted && !lastCompletedState) {
        triggerVictoryConfetti();
        showVictoryModal();
    } else if (!isCompleted && lastCompletedState) {
        closeVictoryModal();
        confettiFired = false;
    }

    lastCompletedState = isCompleted;

    const totalMs = BOND_END_DATE - BOND_START_DATE;
    
    // Force remaining time to 0 if completed
    const remainingMs = isCompleted ? 0 : Math.max(0, BOND_END_DATE - now);

    let remainingFraction = remainingMs / totalMs;
    if (remainingFraction < 0) remainingFraction = 0;
    if (remainingFraction > 1) remainingFraction = 1;

    let servedFraction = 1 - remainingFraction;

    const totalRemainingSeconds = Math.floor(remainingMs / MS_PER_SECOND);
    const daysLeft = Math.floor(totalRemainingSeconds / SECONDS_PER_DAY);
    const hoursLeft = Math.floor((totalRemainingSeconds % SECONDS_PER_DAY) / (SECONDS_PER_MINUTE * MINUTES_PER_HOUR));
    const minutesLeft = Math.floor((totalRemainingSeconds % (SECONDS_PER_MINUTE * MINUTES_PER_HOUR)) / SECONDS_PER_MINUTE);
    const secondsLeft = totalRemainingSeconds % SECONDS_PER_MINUTE;

    const unservedWorkdaysToday = isCompleted ? 0 : Math.round(remainingMs / MS_PER_DAY);

    const remainingUSD = ORIGINAL_USD * remainingFraction;
    const remainingTHB = ORIGINAL_THB * remainingFraction;
    const totalTHBEquiv = (remainingUSD * usdExchangeRate) + remainingTHB;

    const servedUSD = ORIGINAL_USD * servedFraction;
    const servedTHB = ORIGINAL_THB * servedFraction;
    const servedTotalTHBEquiv = (servedUSD * usdExchangeRate) + servedTHB;

    const dailyUSD = ORIGINAL_USD / TOTAL_BOND_DAYS;
    const dailyTHB = ORIGINAL_THB / TOTAL_BOND_DAYS;
    const dailyTotalTHBEquiv = (dailyUSD * usdExchangeRate) + dailyTHB;

    // --- DOM RENDERING ---
    document.getElementById('header-balance-usd').textContent = formatUSD(remainingUSD, 5);
    document.getElementById('header-balance-thb').textContent = `${formatTHB(remainingTHB, 5)}`;
    document.getElementById('header-total-thb-equiv').textContent = `${formatTHB(totalTHBEquiv, 2)}`;
    document.getElementById('header-days-left').textContent = unservedWorkdaysToday.toLocaleString();

    document.getElementById('timer-days').textContent = daysLeft.toLocaleString();
    document.getElementById('timer-hours').textContent = String(hoursLeft).padStart(2, '0');
    document.getElementById('timer-minutes').textContent = String(minutesLeft).padStart(2, '0');
    document.getElementById('timer-seconds').textContent = String(secondsLeft).padStart(2, '0');

    document.getElementById('progress-percent').textContent = `${(servedFraction * 100).toFixed(6)}%`;
    document.getElementById('progress-bar-fill').style.width = `${servedFraction * 100}%`;

    // --- MILESTONE RENDERING ---
    const pastElem = document.getElementById('milestone-past-text');
    const next1Elem = document.getElementById('milestone-next1-text');
    const next2Elem = document.getElementById('milestone-next2-text');

    if (isCompleted) {
        if (pastElem) pastElem.textContent = `90% on Sep 12, 2027`;
        if (next1Elem) next1Elem.textContent = `100% on May 18, 2028 🎉`;
        if (next2Elem) next2Elem.textContent = `Bond Fully Discharged!`;
    } else {
        const currentPercent = servedFraction * 100;
        const pastPercent = Math.floor(currentPercent / 10) * 10;
        const next1Percent = pastPercent + 10;
        const next2Percent = pastPercent + 20;

        if (pastElem) {
            if (pastPercent <= 0) {
                pastElem.textContent = "Service Just Started";
            } else {
                const pastDate = getMilestoneDate(pastPercent / 100);
                pastElem.textContent = `${pastPercent}% on ${pastDate.toLocaleDateString('en-US', DATE_FORMAT_SHORT)}`;
            }
        }

        if (next1Elem) {
            if (next1Percent > 100) {
                next1Elem.textContent = "100% Completed 🎉";
            } else {
                const next1Date = getMilestoneDate(next1Percent / 100);
                next1Elem.textContent = `${next1Percent}% on ${next1Date.toLocaleDateString('en-US', DATE_FORMAT_SHORT)}`;
            }
        }

        if (next2Elem) {
            if (next2Percent > 100) {
                next2Elem.textContent = next1Percent >= 100 ? "Fully Discharged" : "100% (Full Term)";
            } else {
                const next2Date = getMilestoneDate(next2Percent / 100);
                next2Elem.textContent = `${next2Percent}% on ${next2Date.toLocaleDateString('en-US', DATE_FORMAT_SHORT)}`;
            }
        }
    }

    document.getElementById('principal-value-usd').textContent = `${formatUSD(ORIGINAL_USD, 2)}`;
    document.getElementById('principal-value-thb').textContent = `+ ${formatTHB(ORIGINAL_THB, 2)}`;
    document.getElementById('principal-value-total').textContent = `Equivalent to ~${formatTHB((ORIGINAL_USD * usdExchangeRate) + ORIGINAL_THB, 2)} principal.`;

    document.getElementById('daily-rate-components').textContent = `${formatUSD(dailyUSD, 2)} + ${formatTHB(dailyTHB, 2)}`;
    document.getElementById('daily-rate-total').textContent = `~${formatTHB(dailyTotalTHBEquiv, 2)} total daily penalty reduction`;

    document.getElementById('served-value-usd').textContent = formatUSD(servedUSD, 2);
    document.getElementById('served-value-thb').textContent = `+ ${formatTHB(servedTHB, 2)}`;
    document.getElementById('served-value-total').textContent = `Equivalent to ~${formatTHB(servedTotalTHBEquiv, 2)} served`;

    calculateSimulation();
}

function calculateSimulation() {
    const simTime = parseInt(slider.value);
    const simDate = new Date(simTime);

    if (simDate.getTime() === BOND_FULL_TERM_LAST_DAY.getTime()) {
        document.getElementById('simulated-date-display').textContent = BOND_FULL_TERM_LAST_DAY.toLocaleDateString('en-US', DATE_FORMAT_FULL);
    } else {
        document.getElementById('simulated-date-display').textContent = simDate.toLocaleDateString('en-US', DATE_FORMAT_SHORT);
    }

    const unservedDays = getUnservedDaysFromLastServiceDate(simDate);

    const simFraction = unservedDays / TOTAL_BOND_DAYS;
    const simUSD = ORIGINAL_USD * simFraction;
    const simTHB = ORIGINAL_THB * simFraction;
    const simTotalTHB = (simUSD * usdExchangeRate) + simTHB;

    document.getElementById('sim-cost-usd').textContent = formatUSD(simUSD, 2);
    document.getElementById('sim-cost-thb').textContent = formatTHB(simTHB, 2);
    document.getElementById('sim-cost-total-thb').textContent = formatTHB(simTotalTHB, 2);
    document.getElementById('sim-unserved-days').textContent = `${unservedDays} ${unservedDays === 1 ? 'Day' : 'Days'}`;
}

function getRelativeMonthEndDepartureDate(baseEndDateObj, offsetMonths) {
    const year = baseEndDateObj.getFullYear();
    const month = baseEndDateObj.getMonth();
    const targetMonth = month - offsetMonths;

    return new Date(year, targetMonth + 1, 0);
}

function setDeparturePreset(type) {
    const now = new Date();
    let targetDate;

    if (type === 'today') {
        targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (targetDate < BOND_START_DATE) targetDate = new Date(BOND_START_DATE);
    } else if (type === 'end') {
        targetDate = new Date(BOND_FULL_TERM_LAST_DAY);
    } else if (type.startsWith('early_m')) {
        const offsetMonths = parseInt(type.replace('early_m', ''), 10);
        targetDate = getRelativeMonthEndDepartureDate(BOND_FULL_TERM_LAST_DAY, offsetMonths);
    }

    const minMs = parseInt(slider.min);
    const maxMs = parseInt(slider.max);
    const clampedMs = Math.max(minMs, Math.min(maxMs, targetDate.getTime()));

    slider.value = clampedMs;
    datepicker.value = formatDateToYYYYMMDD(new Date(clampedMs));
    calculateSimulation();
}

// Victory Confetti Explosion
function triggerVictoryConfetti() {
    if (typeof confetti === 'function') {
        // Center burst
        confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 }
        });

        // Left & Right cannon blasts
        setTimeout(() => {
            confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 } });
            confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 } });
        }, 250);
    }
}

window.onload = function() {
    initControls();
    fetchExchangeRate();
    updateDashboard();
    setInterval(updateDashboard, REFRESH_RATE_MS);
    setDeparturePreset('today');
};
