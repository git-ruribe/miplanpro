/**
 * VIVIFRAIL Wizard Logic - miplan.pro Program
 */

const SPPB = (() => {
    // Current state
    let currentStep = 0;
    const totalSteps = 10;
    
    // Scores for VIVIFRAIL
    const scores = {
        eq1: null,
        eq2: null,
        eq3: null,
        gait4m: null,
        chair: null,
        fall1: null, // caidas recientes
        fall2: null, // tug > 20s
        fall3: null, // marcha 6m > 7.5s
        fall4: null  // cognitivo
    };

    // Timer state
    let timerInterval = null;
    let startTime = null;
    let timerId = null; 

    // DOM Elements
    const steps = document.querySelectorAll('.step');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');

    const updateView = () => {
        steps.forEach(step => step.classList.remove('active'));
        const activeStep = document.getElementById(`step-${currentStep}`);
        if(activeStep) activeStep.classList.add('active');

        if (currentStep > 0 && currentStep < totalSteps) {
            progressBar.style.display = 'block';
            const percentage = (currentStep / (totalSteps)) * 100;
            progressFill.style.width = `${percentage}%`;
        } else {
            progressBar.style.display = 'none';
        }

        if (currentStep === totalSteps) {
            calculateResults();
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const nextStep = () => {
        // Stop any running timer
        clearTimer();

        // Special condition for VIVIFRAIL Equilibrio:
        // Si puntúa 0 en eq1, pasa directo a prueba 2 (gait4m, Step 4)
        if (currentStep === 1 && scores.eq1 === 0) {
            currentStep = 4;
            updateView();
            return;
        }
        // Si puntúa 0 en eq2, pasa directo a prueba 2 (gait4m, Step 4)
        if (currentStep === 2 && scores.eq2 === 0) {
            currentStep = 4;
            updateView();
            return;
        }

        if (currentStep < totalSteps) {
            currentStep++;
            updateView();
        }
    };

    const prevStep = () => {
        clearTimer();

        // Handle logical jumping back
        if (currentStep === 4) {
            // Evaluamos si saltó desde eq1, eq2 o eq3
            if (scores.eq1 === 0) {
                currentStep = 1;
            } else if (scores.eq2 === 0) {
                currentStep = 2;
            } else {
                currentStep = 3;
            }
            updateView();
            return;
        }

        if (currentStep > 0) {
            currentStep--;
            updateView();
        }
    };

    const submitStep = (category) => {
        if (scores[category] === null) {
            alert('Por favor, selecciona una de las opciones o usa el cronómetro para avanzar.');
            return;
        }
        nextStep();
    };

    const selectOption = (btn) => {
        const cat = btn.getAttribute('data-cat');
        const score = parseInt(btn.getAttribute('data-score'));
        
        // UI Selection
        const container = document.getElementById(`options-${cat}`);
        container.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        
        scores[cat] = score;
    };

    // --- TIMERS ---
    const startTimer = (id) => {
        if(timerInterval) clearTimer();
        
        timerId = id;
        startTime = Date.now();
        const display = document.getElementById(`timer-display-${id}`);
        const btnStart = document.getElementById(`btn-start-${id}`);
        const btnStop = document.getElementById(`btn-stop-${id}`);
        
        btnStart.disabled = true;
        btnStop.disabled = false;

        timerInterval = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;
            display.innerText = `${elapsed.toFixed(2)} s`;
        }, 50); // fast refresh
    };

    const stopTimer = (id, optionsContainerId, thresholds = []) => {
        if(!timerInterval) return;
        
        clearInterval(timerInterval);
        timerInterval = null;
        
        const elapsed = (Date.now() - startTime) / 1000;
        document.getElementById(`btn-start-${id}`).disabled = false;
        document.getElementById(`btn-stop-${id}`).disabled = true;

        // Auto-select based on time thresholds
        if (optionsContainerId && document.getElementById(optionsContainerId)) {
            const container = document.getElementById(optionsContainerId);
            const buttons = Array.from(container.querySelectorAll('.option-btn'));
            let selectedBtn = null;

            if (id === 1 || id === 2 || id === 3) { // Equilibrio
                // For 1 & 2: 10s is threshold. 0pt = <10s, 1pt = >=10s
                if (id === 1 || id === 2) {
                    if (elapsed >= 10) selectedBtn = buttons[0]; // >= 10s -> Score 1
                    else selectedBtn = buttons[1]; // < 10s -> Score 0
                }
                // For 3: 2pt = >=10s, 1pt = 3-9s, 0pt = <3s
                if (id === 3) {
                    if (elapsed >= 10) selectedBtn = buttons[0];
                    else if (elapsed >= 3) selectedBtn = buttons[1];
                    else selectedBtn = buttons[2];
                }
            } else if (id === 4) { // Gait 4m
                if (elapsed < thresholds[0]) selectedBtn = buttons[0]; // < 4.82
                else if (elapsed <= thresholds[1]) selectedBtn = buttons[1]; // <= 6.20
                else if (elapsed <= thresholds[2]) selectedBtn = buttons[2]; // <= 8.70
                else selectedBtn = buttons[3]; // > 8.70 (option index 3)
            } else if (id === 5) { // Chair 5
                if (elapsed < thresholds[0]) selectedBtn = buttons[0]; 
                else if (elapsed <= thresholds[1]) selectedBtn = buttons[1]; 
                else if (elapsed <= thresholds[2]) selectedBtn = buttons[2]; 
                else if (elapsed <= thresholds[3]) selectedBtn = buttons[3]; 
                else selectedBtn = buttons[4]; 
            } else if (id === 7 || id === 8) { // TUG > 20s or Marcha 6m > 7.5s (threshold max)
                if (elapsed > thresholds[0]) selectedBtn = buttons[0]; // Sí
                else selectedBtn = buttons[1]; // No
            }

            if (selectedBtn) {
                selectOption(selectedBtn);
            }
        }
    };

    const resetTimer = (id) => {
        clearTimer();
        document.getElementById(`timer-display-${id}`).innerText = '0.00 s';
        document.getElementById(`btn-start-${id}`).disabled = false;
        document.getElementById(`btn-stop-${id}`).disabled = true;
        
        // Remove selection from the associated options
        const cat = Object.keys(scores).find(key => {
            const stepId = parseInt(key.replace(/[^\d]/g, '')) || 0;
            // Map step to key approx if possible, mapping isn't 1:1 direct here but we can find container
            if (id===1 && key==='eq1') return true;
            if (id===2 && key==='eq2') return true;
            if (id===3 && key==='eq3') return true;
            if (id===4 && key==='gait4m') return true;
            if (id===5 && key==='chair') return true;
            if (id===7 && key==='fall2') return true;
            if (id===8 && key==='fall3') return true;
        });

        if(cat) {
            scores[cat] = null;
            const container = document.getElementById(`options-${cat}`);
            if(container) {
                container.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
            }
        }
    };

    const clearTimer = () => {
        if(timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }


    // --- CALCULATE RESULTS ---
    const calculateResults = () => {
        // Calculate SPPB Eq Score
        let balanceScore = 0;
        if (scores.eq1 === 1) balanceScore += 1; // max 1
        if (scores.eq2 === 1) balanceScore += 1; // max 1
        if (scores.eq3 !== null) balanceScore += scores.eq3; // +0, +1, or +2

        // SPPB Total
        const sppb = balanceScore + (scores.gait4m || 0) + (scores.chair || 0);

        // Fall Risk
        const riskOfFalls = (scores.fall1 === 1) || (scores.fall2 === 1) || (scores.fall3 === 1) || (scores.fall4 === 1);

        // Determine Type
        let typeLetter = 'A';
        let badgeColor = '';
        let badgeText = '';

        if (sppb >= 0 && sppb <= 3) {
            typeLetter = 'A';
            badgeColor = '#c62828'; // red
            badgeText = 'Persona con discapacidad';
        } else if (sppb >= 4 && sppb <= 6) {
            typeLetter = 'B';
            badgeColor = '#f57f17'; // orange
            badgeText = 'Persona con fragilidad';
        } else if (sppb >= 7 && sppb <= 9) {
            typeLetter = 'C';
            badgeColor = '#2e7d32'; // green
            badgeText = 'Persona con pre-fragilidad';
        } else if (sppb >= 10 && sppb <= 12) {
            typeLetter = 'D';
            badgeColor = '#1565c0'; // blue
            badgeText = 'Persona robusta';
        }

        // Apply risk
        let isPlus = false;
        if ((typeLetter === 'B' || typeLetter === 'C') && riskOfFalls) {
            typeLetter += '+';
            isPlus = true;
        }

        // DOM Update
        document.getElementById('resultTipo').innerText = `Tipo ${typeLetter}`;
        document.getElementById('resultTipo').style.color = badgeColor;
        
        const badgeEl = document.getElementById('levelBadge');
        badgeEl.innerText = badgeText;
        badgeEl.style.backgroundColor = badgeColor;

        const warningEl = document.getElementById('riskWarning');
        warningEl.style.display = riskOfFalls ? 'block' : 'none';

        const descEl = document.getElementById('resultDesc');
        const planEl = document.getElementById('resultPlan');

        // Text generation based on Protocol Pages 21-25
        if (typeLetter === 'A') {
            descEl.innerText = 'Tipo A corresponde con una persona mayor que no se puede levantar de la silla o encamada. Hazle saber que realizando el programa quizá pueda volver a levantarse o, al menos, ganar en seguridad y autonomía.';
            planEl.innerHTML = 'El programa tiene una duración de <strong>12 semanas</strong> (30-45 min al día). El ejercicio de caminar sólo se iniciará cuando la persona haya mejorado su fuerza muscular.';
        } else if (typeLetter.startsWith('B')) {
            descEl.innerText = 'El tipo B (Frágil) se refiere a aquellas personas que marchan con dificultad o con ayuda. Quizá pueda volver a caminar sin ayuda o al menos ganar autonomía y equilibrio.';
            planEl.innerHTML = `Duración de <strong>12 semanas</strong> (45-60 min al día). <br><br><strong>Prueba de botella:</strong> Llena 2 botellas de agua de 500ml. Comprueba si es capaz de hacer 30 repeticiones. Ajusta el agua hasta que se note cierto esfuerzo, y revisa el peso tras 6 semanas.`;
            if(isPlus) planEl.innerHTML += `<br><br><em>Atención a recomendaciones médicas por Riesgo de Caídas.</em>`;
        } else if (typeLetter.startsWith('C')) {
            descEl.innerText = 'El tipo C (Pre-frágil) indica ligeras dificultades cuando caminan y tienen ciertas dificultades para levantarse o con el equilibrio. Es muy importante que realice ejercicio físico para seguir disfrutando de los paseos.';
            planEl.innerHTML = `Duración de <strong>12 semanas</strong> (45-60 min al día). <br><br><strong>Prueba de botella:</strong> Debes calibrar peso usando botellas de 500ml hasta lograr unas 30 repeticiones con esfuerzo moderado.`;
            if(isPlus) planEl.innerHTML += `<br><br><em>Atención a recomendaciones médicas por Riesgo de Caídas.</em>`;
        } else if (typeLetter === 'D') {
            descEl.innerText = 'El tipo D (Robusto) se refiere a aquellas personas que tienen limitaciones físicas mínimas o sin limitación. Es muy importante que realice ejercicio físico para que sea capaz de conservar su autonomía por muchos años.';
            planEl.innerHTML = 'Duración de <strong>12 semanas</strong> (45-60 min al día). Se recomienda calibrar su peso con botellas de 500ml (o más) para ejercicios de fuerza.';
        }
    };

    const restart = () => {
        clearTimer();
        for(let k in scores) scores[k] = null;
        currentStep = 0;
        
        document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
        // Reset timers UI
        document.querySelectorAll('.timer-display').forEach(d => d.innerText = '0.00 s');
        document.querySelectorAll('.timer-controls button:nth-child(1)').forEach(b => b.disabled = false); // start
        document.querySelectorAll('.timer-controls button:nth-child(2)').forEach(b => b.disabled = true); // stop
        
        updateView();
    };

    // Public API
    return {
        nextStep,
        prevStep,
        submitStep,
        selectOption,
        startTimer,
        stopTimer,
        resetTimer,
        restart
    };
})();
