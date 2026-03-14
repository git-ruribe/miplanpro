/**
 * miplan.pro - Logic for programa.html
 * Vanilla JS rewriting of code.react React prototype
 */

document.addEventListener('DOMContentLoaded', () => {
    // State
    const state = {
        phases: [],
        weeksData: {}, // Map of week number to array of day data
        currentDayId: 0,
        evaluations: {}, // Map of dayId to answers object {q1, q2, q3}
        expandedPhases: { 1: true },
        expandedWeeks: { 1: true }
    };

    // DOM Elements
    const els = {
        sidebarNav: document.getElementById('sidebar-nav'),
        headerWeekInfo: document.getElementById('header-week-info'),
        phaseTitle: document.getElementById('phase-title'),
        phaseDesc: document.getElementById('phase-desc'),
        dayBadge: document.getElementById('day-badge'),
        dayTitle: document.getElementById('day-title'),
        dayQuote: document.getElementById('day-quote'),
        scienceTitle: document.getElementById('science-title'),
        scienceText: document.getElementById('science-text'),
        adultRole: document.getElementById('role-adult-text'),
        familyRole: document.getElementById('role-family-text'),
        routineList: document.getElementById('routine-list'),
        evalForm: document.getElementById('eval-form')
    };

    // Load Initial Data
    async function init() {
        try {
            // Fetch Phases
            const phasesRes = await fetch('programa/phases.json');
            state.phases = await phasesRes.json();
            
            // Try to load as many weeks as possible to build the sidebar
            // Since we know files are named week01.json, week02.json, etc.
            await fetchAvailableWeeks();

            // Load saved evaluations from localStorage if available
            const savedEvals = localStorage.getItem('miplan_evaluations');
            if (savedEvals) {
                state.evaluations = JSON.parse(savedEvals);
            }

            renderSidebar();
            renderMainContent();
            setupEvalListeners();

        } catch (error) {
            console.error("Error inicializando app:", error);
            els.sidebarNav.innerHTML = `<div style="padding:1rem; color:red; text-align:center;">Error cargando el programa. Verifica la consola.</div>`;
        }
    }

    // Helper to fetch weeks (brute-force approach up to 12 weeks since it's a static site)
    async function fetchAvailableWeeks() {
        const fetchPromises = [];
        for (let i = 1; i <= 12; i++) {
            const numStr = i.toString().padStart(2, '0');
            fetchPromises.push(
                fetch(`programa/week${numStr}.json`)
                    .then(res => res.ok ? res.json() : null)
                    .then(data => {
                        if (data) {
                            state.weeksData[i] = data;
                        }
                    })
                    .catch(err => null) // Ignore missing files
            );
        }
        await Promise.all(fetchPromises);
    }

    // Is a day fully evaluated?
    function isDayComplete(dayId) {
        const ev = state.evaluations[dayId];
        return ev && ev.q1 && ev.q2 && ev.q3;
    }

    // Get flat array of all loaded days to find specific currentDay
    function getDayData(dayId) {
        for (const weekNum in state.weeksData) {
            const days = state.weeksData[weekNum];
            const found = days.find(d => d.id === dayId);
            if (found) return found;
        }
        // Fallback to first day of first week
        if (state.weeksData[1] && state.weeksData[1][0]) return state.weeksData[1][0];
        return null;
    }

    function getPhaseForWeek(weekNum) {
        return state.phases.find(p => p.weeks.includes(parseInt(weekNum)));
    }

    // ----------------------------------------------------------------------
    // RENDERING
    // ----------------------------------------------------------------------

    function renderSidebar() {
        let html = '';

        state.phases.forEach(phase => {
            const phaseWeeks = phase.weeks;
            // Filter weeks that we actually fetched data for
            const loadedWeeksInPhase = phaseWeeks.filter(w => state.weeksData[w]);
            const isPhaseExpanded = state.expandedPhases[phase.id];
            
            html += `
                <div class="nav-phase">
                    <button class="nav-phase-btn ${isPhaseExpanded ? 'is-active' : ''}" data-phase="${phase.id}">
                        <span>${phase.title.split(':')[0]}</span>
                        <i class="ph ph-caret-down"></i>
                    </button>
                    <div class="nav-phase-content ${isPhaseExpanded ? 'is-open' : ''}">
            `;

            if (loadedWeeksInPhase.length === 0) {
                html += `<div style="padding: 1rem; font-size: 0.8rem; color: var(--slate-400); font-style: italic;">Próximamente...</div>`;
            } else {
                loadedWeeksInPhase.forEach(week => {
                    const isWeekExpanded = state.expandedWeeks[week];
                    const daysInWeek = state.weeksData[week];

                    html += `
                        <div class="nav-week">
                            <button class="nav-week-btn ${isWeekExpanded ? 'is-active' : ''}" data-week="${week}">
                                Semana ${week}
                                <i class="ph ph-caret-down"></i>
                            </button>
                            <div class="nav-week-content ${isWeekExpanded ? 'is-open' : ''}">
                    `;

                    daysInWeek.forEach(day => {
                        const isActive = state.currentDayId === day.id;
                        const isDone = isDayComplete(day.id);
                        const icon = isDone 
                            ? `<i class="ph ph-check-circle" style="font-size: 1.1rem"></i>` 
                            : `<span class="nav-day-icon-hollow"></span>`;

                        html += `
                                <button class="nav-day-btn ${isActive ? 'is-active' : ''}" data-day="${day.id}">
                                    <span class="nav-day-icon">${icon} ${day.day}</span>
                                    ${isActive ? '<i class="ph ph-caret-right" style="color:var(--blue-500)"></i>' : ''}
                                </button>
                        `;
                    });

                    html += `
                            </div>
                        </div>
                    `;
                });
            }

            html += `
                    </div>
                </div>
            `;
        });

        els.sidebarNav.innerHTML = html;

        // Attach listeners dynamically
        els.sidebarNav.querySelectorAll('.nav-phase-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const phaseId = e.currentTarget.getAttribute('data-phase');
                state.expandedPhases[phaseId] = !state.expandedPhases[phaseId];
                renderSidebar();
            });
        });

        els.sidebarNav.querySelectorAll('.nav-week-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const weekId = e.currentTarget.getAttribute('data-week');
                state.expandedWeeks[weekId] = !state.expandedWeeks[weekId];
                renderSidebar();
            });
        });

        els.sidebarNav.querySelectorAll('.nav-day-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const dayId = parseInt(e.currentTarget.getAttribute('data-day'));
                state.currentDayId = dayId;
                renderSidebar();
                renderMainContent();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    }

    function renderMainContent() {
        const dayData = getDayData(state.currentDayId);
        if (!dayData) {
            els.dayTitle.textContent = "Datos no disponibles";
            return;
        }

        const currentPhase = getPhaseForWeek(dayData.week);

        // Header Info
        els.headerWeekInfo.textContent = `Semana ${dayData.week} • ${currentPhase ? currentPhase.title.split(':')[0] : ''}`;

        // Phase Banner
        if (currentPhase) {
            els.phaseTitle.textContent = `Contexto Actual: ${currentPhase.title}`;
            els.phaseDesc.innerHTML = `<span style="font-weight:600; color:var(--indigo-800)">Objetivo:</span> ${currentPhase.objective} <br/> ${currentPhase.description}`;
        }

        // Day Headers
        els.dayBadge.textContent = `${dayData.day} - Semana ${dayData.week}`;
        els.dayTitle.textContent = dayData.title;
        els.dayQuote.textContent = `"${dayData.quote}"`;

        // Science
        els.scienceTitle.textContent = dayData.scienceTitle;
        els.scienceText.textContent = dayData.science;

        // Roles
        els.adultRole.textContent = dayData.adultRole;
        els.familyRole.textContent = dayData.familyRole;

        // Routine
        let routineHtml = '';
        dayData.routine.forEach((step, index) => {
            
            let extraInfoHtml = '';
            
            if (step.instructions) {
                extraInfoHtml += `
                    <div class="routine-extra-block">
                        <div class="routine-extra-title text-indigo"><i class="ph ph-list-numbers"></i> Instrucciones</div>
                        <p>${step.instructions}</p>
                    </div>
                `;
            }

            if (step.easier) {
                extraInfoHtml += `
                    <div class="routine-extra-block bg-emerald-50 border-emerald">
                        <div class="routine-extra-title text-emerald"><i class="ph ph-arrow-circle-down"></i> ¿Muy difícil?</div>
                        <p>${step.easier}</p>
                    </div>
                `;
            }

            if (step.harder) {
                extraInfoHtml += `
                    <div class="routine-extra-block bg-amber-50 border-amber">
                        <div class="routine-extra-title text-amber"><i class="ph ph-arrow-circle-up"></i> ¿Muy fácil?</div>
                        <p>${step.harder}</p>
                    </div>
                `;
            }

            routineHtml += `
                <div class="routine-item">
                    <div class="routine-item-content">
                        <div class="routine-item-header">
                            <div class="routine-step-num">${index + 1}</div>
                            <h4>${step.phase}</h4>
                        </div>
                        <p class="routine-item-text">${step.details}</p>
                        ${extraInfoHtml ? `<div class="routine-extras">${extraInfoHtml}</div>` : ''}
                    </div>
                    <div class="routine-item-image">
                        <i class="ph ph-image"></i>
                        <span>${step.image || 'Sin imagen'}</span>
                    </div>
                </div>
            `;
        });
        els.routineList.innerHTML = routineHtml;

        // Update Evaluation Form UI based on state
        updateEvalUI();
    }

    // ----------------------------------------------------------------------
    // EVALUACIONES
    // ----------------------------------------------------------------------

    function setupEvalListeners() {
        // Find all radio inputs
        document.querySelectorAll('.eval-option input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const name = e.target.name; // q1, q2, q3
                const value = e.target.value;
                
                if (!state.evaluations[state.currentDayId]) {
                    state.evaluations[state.currentDayId] = {};
                }
                
                state.evaluations[state.currentDayId][name] = value;
                
                // Save to local storage
                localStorage.setItem('miplan_evaluations', JSON.stringify(state.evaluations));
                
                // Update UI visually
                updateEvalUI();
                
                // If the day just became complete, re-render sidebar to show checkmark
                if (isDayComplete(state.currentDayId)) {
                    renderSidebar();
                }
            });
        });
    }

    function updateEvalUI() {
        const evals = state.evaluations[state.currentDayId] || { q1: '', q2: '', q3: '' };
        
        // Reset all
        document.querySelectorAll('.eval-option').forEach(opt => {
            opt.classList.remove('is-selected');
            const radio = opt.querySelector('input');
            radio.checked = false;
        });

        // Set active based on state
        if (evals.q1) setEvalOptionActive('q1', evals.q1);
        if (evals.q2) setEvalOptionActive('q2', evals.q2);
        if (evals.q3) setEvalOptionActive('q3', evals.q3);
    }

    function setEvalOptionActive(groupName, valueName) {
        const radio = document.querySelector(`input[name="${groupName}"][value="${valueName}"]`);
        if (radio) {
            radio.checked = true;
            // The active state styling is controlled by adding 'is-selected' to the parent label (.eval-option)
            radio.parentElement.classList.add('is-selected');
        }
    }

    // Launch
    init();
});
