/* ==========================================================================
   Registro Beta — miplan.pro
   Lógica de pasos, validación y derivación
   ========================================================================== */

// ---- State ----
const state = {
    step: 'intro',   // intro | step1 | step2 | step3 | step4 | roja
    ruta: null,      // null | 'verde' | 'amarilla' | 'roja'
    data: {}
};

// ---- Panels ----
const panels = {
    intro:     document.getElementById('panel-intro'),
    step1:     document.getElementById('panel-step1'),
    step2:     document.getElementById('panel-step2'),
    step3:     document.getElementById('panel-step3'),
    step4:     document.getElementById('panel-step4'),
    rutaRoja:  document.getElementById('panel-ruta-roja'),
};

const progressWrap = document.getElementById('progress-bar-wrap');

// ---- Show Panel ----
function showPanel(name) {
    Object.values(panels).forEach(p => p.classList.remove('active'));
    panels[name].classList.add('active');
    state.step = name;
    updateProgress(name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- Update Progress Steps ----
function updateProgress(panelName) {
    const stepMap = { intro: 0, step1: 1, step2: 2, step3: 3, step4: 4, rutaRoja: 0 };
    const current = stepMap[panelName] || 0;

    // Hide progress bar on intro or roja
    progressWrap.style.display = (current === 0) ? 'none' : 'block';

    document.querySelectorAll('.progress-step').forEach(el => {
        const n = parseInt(el.dataset.step, 10);
        el.classList.remove('active', 'completed');
        if (n < current) el.classList.add('completed');
        if (n === current) el.classList.add('active');
    });
}

// ---- Helpers ----
function getRadioValue(name) {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : null;
}

function showError(id, show) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('visible', show);
}

function markFieldError(id, hasError) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('error', hasError);
    showError('err-' + id, hasError);
}

// ---- Persist to localStorage ----
function saveState() {
    try { localStorage.setItem('mpp_beta_state', JSON.stringify(state.data)); } catch(e) {}
}

function loadState() {
    try {
        const saved = localStorage.getItem('mpp_beta_state');
        if (saved) state.data = JSON.parse(saved);
    } catch(e) {}
}

// ---- Step 1 Validation ----
function validateStep1() {
    let valid = true;

    const fields = [
        { id: 'coach-nombre',      check: v => v.trim().length >= 2 },
        { id: 'coach-email',       check: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) },
        { id: 'coach-whatsapp',    check: v => v.trim().length >= 7 },
        { id: 'coach-ciudad',      check: v => v.trim().length >= 2 },
        { id: 'campeon-nombre',    check: v => v.trim().length >= 2 },
        { id: 'campeon-relacion',  check: v => v !== '' },
        { id: 'campeon-edad',      check: v => v !== '' },
    ];

    fields.forEach(({ id, check }) => {
        const el = document.getElementById(id);
        const bad = !el || !check(el.value);
        markFieldError(id, bad);
        if (bad) valid = false;
    });

    return valid;
}

// ---- Step 2 Derivation Logic ----
function deriveRoute() {
    // Section A — immediate alerts (any Sí = ruta roja)
    const aQuestions = ['a1','a2','a3','a4','a5'];
    const anyAlerta = aQuestions.some(n => getRadioValue(n) === 'si');
    if (anyAlerta) return 'roja';

    // Section C — availability (any No = block)
    const cAllYes = ['c1','c2','c3'].every(n => getRadioValue(n) === 'si');
    if (!cAllYes) return 'c-no';

    // Section B — controlled conditions (any checked except 'ninguna' = amarilla)
    const bChecked = Array.from(
        document.querySelectorAll('input[name="b_condiciones"]:checked')
    ).map(i => i.value).filter(v => v !== 'ninguna');

    if (bChecked.length > 0) return 'amarilla';

    return 'verde';
}

// ---- Step 2 Validation ----
function validateStep2() {
    const aQuestions = ['a1','a2','a3','a4','a5'];
    const cQuestions = ['c1','c2','c3'];
    const errEl = document.getElementById('err-step2');

    const aAnswered = aQuestions.every(n => getRadioValue(n) !== null);
    const cAnswered = cQuestions.every(n => getRadioValue(n) !== null);

    if (!aAnswered) {
        errEl.textContent = 'Por favor responde todas las preguntas de la Sección A.';
        errEl.classList.add('visible');
        return false;
    }

    if (!cAnswered) {
        errEl.textContent = 'Por favor responde todas las preguntas de la Sección C.';
        errEl.classList.add('visible');
        return false;
    }

    errEl.classList.remove('visible');
    return true;
}

// ---- Populate hidden fields for Formspree ----
function populateHiddenFields() {
    const bChecked = Array.from(
        document.querySelectorAll('input[name="b_condiciones"]:checked')
    ).map(i => i.value);

    document.getElementById('hidden-condiciones-b').value = bChecked.join(', ') || 'ninguna';
    document.getElementById('hidden-ruta').value = state.ruta || '';
    ['a1','a2','a3','a4','a5','c1','c2','c3'].forEach(n => {
        const hidden = document.getElementById('hidden-' + n);
        if (hidden) hidden.value = getRadioValue(n) || '';
    });
}

// ---- Populate carta médica ----
function populateCarta() {
    const bChecked = Array.from(
        document.querySelectorAll('input[name="b_condiciones"]:checked')
    ).map(i => i.value).filter(v => v !== 'ninguna');

    const labelMap = {
        diabetes: 'Diabetes (controlada)',
        hipertension: 'Hipertensión arterial',
        artritis_artrosis: 'Artritis / Artrosis',
        osteoporosis: 'Osteoporosis',
        cardiopatia: 'Cardiopatía crónica controlada',
        parkinson: 'Parkinson en etapa inicial o moderada',
    };

    const condNames = bChecked.map(v => labelMap[v] || v).join(', ');
    const el = document.getElementById('carta-condiciones-texto');
    if (el) el.textContent = condNames || 'Ninguna reportada.';
}

// ---- Step 3 Setup ----
function setupStep3() {
    const avisoAmarillo = document.getElementById('aviso-amarillo');
    const cartaPanel = document.getElementById('carta-panel');

    if (state.ruta === 'amarilla') {
        avisoAmarillo.style.display = 'block';
        cartaPanel.style.display = 'block';
        populateCarta();
    } else {
        avisoAmarillo.style.display = 'none';
        cartaPanel.style.display = 'none';
    }
}

// ---- Setup confirmation WhatsApp share ----
function setupConfirmation() {
    const coachName = document.getElementById('coach-nombre')?.value?.trim() || '';
    const msg = encodeURIComponent(
        `¡Hola! Acabo de registrarme en el programa beta de miplan.pro — un programa de movimiento para adultos mayores guiado por familiares. Es gratis para los primeros grupos. ¿Le gustaría probar? → https://miplan.pro/registro-beta.html`
    );
    const btnWa = document.getElementById('btn-whatsapp-share');
    if (btnWa) btnWa.href = `https://wa.me/?text=${msg}`;
}

// ---- Submit via Formspree (fetch) ----
async function submitForm() {
    populateHiddenFields();

    // Build FormData from all relevant inputs
    const formData = new FormData();

    // Step 1 fields
    const step1Fields = [
        'coach-nombre', 'coach-email', 'coach-whatsapp', 'coach-ciudad',
        'campeon-nombre', 'campeon-relacion', 'campeon-edad'
    ];
    step1Fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) formData.append(el.name || id, el.value);
    });

    // Hidden fields
    [
        'hidden-condiciones-b', 'hidden-ruta',
        'hidden-a1', 'hidden-a2', 'hidden-a3', 'hidden-a4', 'hidden-a5',
        'hidden-c1', 'hidden-c2', 'hidden-c3'
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) formData.append(el.name, el.value);
    });

    formData.append('acepto_terminos', 'si');

    // --- IMPORTANT: Replace YOUR_FORM_ID with your Formspree form ID ---
    // Create a free account at https://formspree.io and replace below
    const FORMSPREE_URL = 'https://formspree.io/f/xjgaegdy';

    const btn = document.getElementById('btn-step3-submit');
    btn.disabled = true;
    btn.textContent = 'Enviando…';

    try {
        const res = await fetch(FORMSPREE_URL, {
            method: 'POST',
            body: formData,
            headers: { 'Accept': 'application/json' }
        });

        if (res.ok || FORMSPREE_URL.includes('YOUR_FORM_ID')) {
            // If still placeholder, proceed to confirmation anyway (dev mode)
            saveState();
            setupConfirmation();
            showPanel('step4');
        } else {
            btn.disabled = false;
            btn.textContent = 'Completar registro →';
            alert('Ocurrió un error al enviar tu registro. Por favor inténtalo de nuevo.');
        }
    } catch (err) {
        // Network error — still show confirmation in dev/offline mode
        console.warn('Formspree no disponible (modo dev):', err);
        saveState();
        setupConfirmation();
        showPanel('step4');
        btn.disabled = false;
        btn.textContent = 'Completar registro →';
    }
}

// ---- Handle "ninguna" checkbox exclusion ----
function setupNingunaExclusion() {
    const ninguna = document.getElementById('b-ninguna');
    const others = document.querySelectorAll('input[name="b_condiciones"]:not(#b-ninguna)');

    ninguna.addEventListener('change', () => {
        if (ninguna.checked) {
            others.forEach(cb => { cb.checked = false; });
        }
    });

    others.forEach(cb => {
        cb.addEventListener('change', () => {
            if (cb.checked) ninguna.checked = false;
        });
    });
}

// ---- Event Listeners ----
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    updateProgress('intro');
    setupNingunaExclusion();

    // Intro → Step 1
    document.getElementById('btn-intro-start').addEventListener('click', () => {
        showPanel('step1');
    });

    // Back: Step 1 → Intro
    document.getElementById('back-to-intro').addEventListener('click', () => {
        showPanel('intro');
    });

    // Step 1 → Step 2
    document.getElementById('btn-step1-next').addEventListener('click', () => {
        if (validateStep1()) {
            // Cache data
            state.data.coachNombre = document.getElementById('coach-nombre').value;
            state.data.campeonNombre = document.getElementById('campeon-nombre').value;
            showPanel('step2');
        }
    });

    // Back: Step 2 → Step 1
    document.getElementById('back-to-step1').addEventListener('click', () => {
        showPanel('step1');
    });

    // Step 2 → Route derivation
    document.getElementById('btn-step2-next').addEventListener('click', () => {
        if (!validateStep2()) return;

        const ruta = deriveRoute();

        if (ruta === 'roja') {
            state.ruta = 'roja';
            showPanel('rutaRoja');
            return;
        }

        if (ruta === 'c-no') {
            const errEl = document.getElementById('err-step2');
            errEl.textContent = 'El programa requiere que puedas acompañar físicamente a tu familiar al menos una vez por semana y dedicar 30–45 minutos los fines de semana. Si tu situación cambia, ¡aquí estaremos!';
            errEl.classList.add('visible');
            return;
        }

        state.ruta = ruta; // 'verde' o 'amarilla'
        setupStep3();
        showPanel('step3');
    });

    // Back: Step 3 → Step 2
    document.getElementById('back-to-step2').addEventListener('click', () => {
        showPanel('step2');
    });

    // Step 3 Submit
    document.getElementById('btn-step3-submit').addEventListener('click', () => {
        const acepto = document.getElementById('acepto-terminos').checked;
        if (!acepto) {
            showError('err-legal', true);
            return;
        }
        showError('err-legal', false);
        submitForm();
    });

    // Clear legal error on checkbox change
    document.getElementById('acepto-terminos').addEventListener('change', () => {
        showError('err-legal', false);
    });
});
