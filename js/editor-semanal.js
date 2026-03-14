document.addEventListener('DOMContentLoaded', async () => {
    // State
    const state = {
        currentWeek: '01',
        weekData: [], // Array of day objects
        weekDataBackup: null, // For Reiniciar
        exerciseLibrary: {}, // hash -> { data, group }
        exerciseListFlat: [], // For searching
        pickerTargetDay: null // Index of day we are adding exercise to
    };

    // DOM Elements
    const els = {
        weekSelect: document.getElementById('week-select'),
        daysContainer: document.getElementById('days-container'),
        exportBtn: document.getElementById('export-btn'),
        pickerModal: document.getElementById('picker-modal'),
        closePicker: document.getElementById('close-picker'),
        pickerSearch: document.getElementById('picker-search-input'),
        pickerList: document.getElementById('picker-list'),
        saveFab: document.getElementById('save-fab'),
        discardBtn: document.getElementById('discard-btn')
    };

    // Initialize
    async function init() {
        await loadLibraries();
        await loadWeek(state.currentWeek);
        
        setupEventListeners();
    }

    async function loadLibraries() {
        const groups = ['fuerza', 'equilibrio', 'movilidad', 'evaluacion', 'life', 'otros'];
        for (const group of groups) {
            try {
                const res = await fetch(`programa/${group}.json`);
                if (res.ok) {
                    const data = await res.json();
                    Object.keys(data).forEach(id => {
                        state.exerciseLibrary[id] = { ...data[id], group };
                        state.exerciseListFlat.push({ id, ...data[id], group });
                    });
                }
            } catch (e) { console.error(`Err loading ${group}`, e); }
        }
    }

    async function loadWeek(weekNum) {
        try {
            const res = await fetch(`programa/week${weekNum}.json`);
            if (res.ok) {
                state.weekData = await res.json();
                state.weekDataBackup = JSON.parse(JSON.stringify(state.weekData));
                renderDays();
            }
        } catch (e) { console.error(e); }
    }

    function renderDays() {
        els.daysContainer.innerHTML = state.weekData.map((day, idx) => `
            <div class="day-card" data-day-idx="${idx}">
                <div class="day-header">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <span class="day-title-tag">${day.day}</span>
                        <h2 style="font-size: 1.25rem;">Configuración del Día</h2>
                    </div>
                </div>

                <div class="form-group">
                    <label>Título del Día</label>
                    <input type="text" value="${day.title || ''}" class="form-control field-meta" data-id="title">
                </div>

                <div class="form-group">
                    <label>Cita (Quote)</label>
                    <textarea class="form-control field-meta" data-id="quote">${day.quote || ''}</textarea>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                    <div class="form-group">
                        <label>Ciencia (Título)</label>
                        <input type="text" value="${day.scienceTitle || ''}" class="form-control field-meta" data-id="scienceTitle">
                    </div>
                    <div class="form-group">
                        <label>Ciencia (Contenido)</label>
                        <textarea class="form-control field-meta" data-id="science">${day.science || ''}</textarea>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                    <div class="form-group">
                        <label>Rol Adulto Mayor</label>
                        <textarea class="form-control field-meta" data-id="adultRole">${day.adultRole || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Rol Familiar / Coach</label>
                        <textarea class="form-control field-meta" data-id="familyRole">${day.familyRole || ''}</textarea>
                    </div>
                </div>

                <div class="routine-section">
                    <label style="font-weight: 700; color: var(--secondary);">Rutina de Ejercicios</label>
                    <div class="routine-list">
                        ${(day.routine || []).map((id, rIdx) => {
                            const ex = state.exerciseLibrary[id] || { phase: 'Desconocido', group: '?' };
                            return `
                                <div class="routine-item" data-routine-idx="${rIdx}">
                                    <div class="routine-drag-handle"><i class="ph ph-dots-six-vertical"></i></div>
                                    <div class="routine-info">
                                        <div style="font-weight: 600;">${ex.phase}</div>
                                        <div class="routine-id">${id} <span class="picker-group-badge">${ex.group}</span></div>
                                    </div>
                                    <div class="routine-actions">
                                        <button class="btn-icon btn-move-up" ${rIdx === 0 ? 'disabled' : ''}><i class="ph ph-arrow-up"></i></button>
                                        <button class="btn-icon btn-move-down" ${rIdx === (day.routine.length - 1) ? 'disabled' : ''}><i class="ph ph-arrow-down"></i></button>
                                        <button class="btn-icon btn-remove"><i class="ph ph-trash"></i></button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <button class="add-exercise-btn" data-day-idx="${idx}">
                        <i class="ph ph-plus-circle"></i> Agregar Ejercicio a la Rutina
                    </button>
                </div>
            </div>
        `).join('');

        attachLiveEventListeners();
    }

    function setupEventListeners() {
        els.weekSelect.addEventListener('change', (e) => {
            state.currentWeek = e.target.value;
            loadWeek(state.currentWeek);
        });

        els.exportBtn.addEventListener('click', () => {
            const dataStr = JSON.stringify(state.weekData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `week${state.currentWeek}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });

        els.closePicker.addEventListener('click', () => {
            els.pickerModal.style.display = 'none';
        });

        els.pickerSearch.addEventListener('input', () => {
            renderPickerList();
        });

        els.discardBtn.addEventListener('click', () => {
            if (state.weekDataBackup) {
                state.weekData = JSON.parse(JSON.stringify(state.weekDataBackup));
                renderDays();
                els.saveFab.style.display = 'none';
            }
        });

        window.onclick = (e) => {
            if (e.target == els.pickerModal) els.pickerModal.style.display = 'none';
        };
    }

    function attachLiveEventListeners() {
        // Meta field changes
        els.daysContainer.querySelectorAll('.field-meta').forEach(input => {
            input.addEventListener('input', (e) => {
                const dayIdx = e.target.closest('.day-card').dataset.dayIdx;
                const fieldId = e.target.dataset.id;
                state.weekData[dayIdx][fieldId] = e.target.value;
                showSaveStatus();
            });
        });

        // Routine actions
        els.daysContainer.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const dayIdx = e.target.closest('.day-card').dataset.dayIdx;
                const rIdx = e.target.closest('.routine-item').dataset.routineIdx;
                state.weekData[dayIdx].routine.splice(rIdx, 1);
                renderDays();
                showSaveStatus();
            });
        });

        els.daysContainer.querySelectorAll('.btn-move-up').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const dayIdx = e.target.closest('.day-card').dataset.dayIdx;
                const rIdx = parseInt(e.target.closest('.routine-item').dataset.routineIdx);
                const routine = state.weekData[dayIdx].routine;
                [routine[rIdx], routine[rIdx-1]] = [routine[rIdx-1], routine[rIdx]];
                renderDays();
                showSaveStatus();
            });
        });

        els.daysContainer.querySelectorAll('.btn-move-down').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const dayIdx = e.target.closest('.day-card').dataset.dayIdx;
                const rIdx = parseInt(e.target.closest('.routine-item').dataset.routineIdx);
                const routine = state.weekData[dayIdx].routine;
                [routine[rIdx], routine[rIdx+1]] = [routine[rIdx+1], routine[rIdx]];
                renderDays();
                showSaveStatus();
            });
        });

        // Add exercise button
        els.daysContainer.querySelectorAll('.add-exercise-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                state.pickerTargetDay = e.currentTarget.dataset.dayIdx;
                els.pickerModal.style.display = 'flex';
                els.pickerSearch.value = '';
                renderPickerList();
            });
        });
    }

    function renderPickerList() {
        const query = els.pickerSearch.value.toLowerCase();
        const filtered = state.exerciseListFlat.filter(ex => 
            ex.phase.toLowerCase().includes(query) || 
            (ex.details && ex.details.toLowerCase().includes(query))
        );

        els.pickerList.innerHTML = filtered.slice(0, 50).map(ex => `
            <li class="picker-item" data-id="${ex.id}">
                <div>
                    <strong>${ex.phase}</strong><br>
                    <small style="color:var(--text-muted)">${ex.id.substring(0,8)}...</small>
                </div>
                <span class="picker-group-badge">${ex.group}</span>
            </li>
        `).join('');

        els.pickerList.querySelectorAll('.picker-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                state.weekData[state.pickerTargetDay].routine.push(id);
                els.pickerModal.style.display = 'none';
                renderDays();
                showSaveStatus();
            });
        });
    }

    function showSaveStatus() {
        els.saveFab.style.display = 'flex';
        setTimeout(() => {
            els.saveFab.style.display = 'none';
        }, 2000);
    }

    init();
});
