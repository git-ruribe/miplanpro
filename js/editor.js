document.addEventListener('DOMContentLoaded', () => {
    // State
    const state = {
        currentGroup: '',
        currentExerciseId: '',
        groupsData: {}, // groupName -> { hash -> data }
        filteredList: []
    };

    // DOM Elements
    const els = {
        groupSelect: document.getElementById('group-select'),
        exerciseSearch: document.getElementById('exercise-search'),
        exerciseList: document.getElementById('exercise-list'),
        editorForm: document.getElementById('editor-form'),
        noSelection: document.getElementById('no-selection'),
        exportBtn: document.getElementById('export-btn'),
        saveStatus: document.getElementById('save-status'),
        discardBtn: document.getElementById('discard-btn'),
        // Fields
        fieldPhase: document.getElementById('field-phase'),
        fieldDetails: document.getElementById('field-details'),
        fieldInstructions: document.getElementById('field-instructions'),
        fieldEasier: document.getElementById('field-easier'),
        fieldHarder: document.getElementById('field-harder'),
        fieldImage: document.getElementById('field-image')
    };

    // Event Listeners
    els.groupSelect.addEventListener('change', async (e) => {
        const group = e.target.value;
        if (!state.groupsData[group]) {
            await loadGroup(group);
        }
        state.currentGroup = group;
        state.currentExerciseId = '';
        updateExerciseList();
        showEditor(false);
    });

    els.exerciseSearch.addEventListener('input', () => {
        updateExerciseList();
    });

    els.exportBtn.addEventListener('click', () => {
        if (!state.currentGroup) return;
        const data = state.groupsData[state.currentGroup];
        const jsonStr = JSON.stringify(data, null, 2);
        
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${state.currentGroup}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    els.discardBtn.addEventListener('click', () => {
        if (state.currentExerciseId) {
            populateForm(state.groupsData[state.currentGroup][state.currentExerciseId]);
        }
    });

    // Auto-save typing listeners
    const fields = ['fieldPhase', 'fieldDetails', 'fieldInstructions', 'fieldEasier', 'fieldHarder', 'fieldImage'];
    fields.forEach(fieldKey => {
        els[fieldKey].addEventListener('input', () => {
            saveToState();
        });
    });

    // Functions
    async function loadGroup(groupName) {
        try {
            const res = await fetch(`programa/${groupName}.json`);
            if (res.ok) {
                state.groupsData[groupName] = await res.json();
            } else {
                state.groupsData[groupName] = {};
                console.error(`Failed to load ${groupName}.json`);
            }
        } catch (error) {
            console.error(error);
            state.groupsData[groupName] = {};
        }
    }

    function updateExerciseList() {
        const query = els.exerciseSearch.value.toLowerCase();
        const data = state.groupsData[state.currentGroup] || {};
        
        const hashes = Object.keys(data).filter(h => {
            const ex = data[h];
            return ex.phase.toLowerCase().includes(query) || ex.details.toLowerCase().includes(query);
        });

        els.exerciseList.innerHTML = hashes.map(h => {
            const ex = data[h];
            const isActive = h === state.currentExerciseId;
            return `<li class="exercise-item ${isActive ? 'active' : ''}" data-id="${h}">
                ${ex.phase}
            </li>`;
        }).join('');

        // Selection listeners
        els.exerciseList.querySelectorAll('.exercise-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.getAttribute('data-id');
                selectExercise(id);
            });
        });
    }

    function selectExercise(id) {
        state.currentExerciseId = id;
        const ex = state.groupsData[state.currentGroup][id];
        populateForm(ex);
        showEditor(true);
        
        // Update list active state
        els.exerciseList.querySelectorAll('.exercise-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-id') === id);
        });
    }

    function populateForm(ex) {
        els.fieldPhase.value = ex.phase || '';
        els.fieldDetails.value = ex.details || '';
        els.fieldInstructions.value = ex.instructions || '';
        els.fieldEasier.value = ex.easier || '';
        els.fieldHarder.value = ex.harder || '';
        els.fieldImage.value = ex.image || '';
        els.saveStatus.style.display = 'none';
    }

    function saveToState() {
        if (!state.currentExerciseId || !state.currentGroup) return;

        const ex = state.groupsData[state.currentGroup][state.currentExerciseId];
        ex.phase = els.fieldPhase.value;
        ex.details = els.fieldDetails.value;
        ex.instructions = els.fieldInstructions.value;
        ex.easier = els.fieldEasier.value;
        ex.harder = els.fieldHarder.value;
        ex.image = els.fieldImage.value;

        els.saveStatus.style.display = 'inline-block';
        
        // Update the list label in case title changed
        const activeItem = els.exerciseList.querySelector('.exercise-item.active');
        if (activeItem) {
            activeItem.innerText = ex.phase || '(Sin título)';
        }
    }

    function showEditor(visible) {
        els.editorForm.style.display = visible ? 'block' : 'none';
        els.noSelection.style.display = visible ? 'none' : 'block';
    }
});
