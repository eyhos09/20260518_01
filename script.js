document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const gridContainer = document.getElementById('number-grid-container');
    const btnDraw = document.getElementById('btn-draw');
    const btnReset = document.getElementById('btn-reset');
    const statusIndicator = document.querySelector('.status-indicator');
    const statusText = document.getElementById('status-message');
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');

    const TOTAL_NUMBERS = 30;
    const NUMBERS_TO_DRAW = 5;
    
    let isDrawing = false;
    let selectedWinners = [];
    
    // Web Audio API State
    let audioCtx = null;

    // Confetti Physics Engine State
    let confettiParticles = [];
    let confettiAnimationId = null;

    // HSL Colors corresponding to CSS variables
    const colors = [
        '#a855f7', // purple (primary)
        '#06b6d4', // cyan (secondary)
        '#ec4899', // pink (accent)
        '#3b82f6', // blue
        '#eab308'  // yellow
    ];

    // Initialize the Grid and App
    initGrid();
    initCanvas();
    updateStatus('ready', '준비 완료');

    // Handle Window Resizing for Canvas
    window.addEventListener('resize', initCanvas);

    // --- Core Functions ---

    // 1. Initialize the 1-30 number grid
    function initGrid() {
        gridContainer.innerHTML = '';
        for (let i = 1; i <= TOTAL_NUMBERS; i++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.id = `cell-${i}`;
            cell.textContent = i;
            gridContainer.appendChild(cell);
        }
    }

    // 2. Initialize Confetti Canvas Dimensions
    function initCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    // 3. Status Indicator Manager
    function updateStatus(state, message) {
        statusIndicator.className = 'status-indicator';
        statusIndicator.classList.add(state);
        statusText.textContent = message;
    }

    // --- Web Audio API Synth Sound Engine ---
    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    // Synthesize Shuffling Tick (Fast high frequency beep with quick decay)
    function playTick() {
        try {
            initAudio();
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = 'triangle';
            // Start at a higher frequency and sweep down slightly
            osc.frequency.setValueAtTime(880, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.05);

            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + 0.06);
        } catch (e) {
            console.error('Audio tick playback failed:', e);
        }
    }

    // Synthesize Revealing Chime (Rising Pentatonic Scale notes + chord for the final reveal)
    function playChime(slotIndex) {
        try {
            initAudio();
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            // Beautiful C-Major Pentatonic Scale Note frequencies
            // Slot 0: C4, Slot 1: E4, Slot 2: G4, Slot 3: C5, Slot 4: E5
            const frequencies = [261.63, 329.63, 392.00, 523.25, 659.25];
            const targetFreq = frequencies[slotIndex];

            // 1. Play individual primary tone
            playSynthTone(targetFreq, 0.4, 'sine');
            // Add a subtle metallic second oscillator for richer tone
            playSynthTone(targetFreq * 2, 0.1, 'triangle', 0.2);

            // 2. Celebration Chord on the 5th and final reveal!
            if (slotIndex === NUMBERS_TO_DRAW - 1) {
                setTimeout(() => {
                    // Play C Major triad (C5, G5, C6) to build a rich grand final chord
                    playSynthTone(523.25, 0.15, 'sine', 0.6); // C5
                    playSynthTone(783.99, 0.12, 'sine', 0.6); // G5
                    playSynthTone(1046.50, 0.08, 'triangle', 0.8); // C6
                }, 50);
            }
        } catch (e) {
            console.error('Audio chime playback failed:', e);
        }
    }

    // Helper helper to generate synthesizer tones
    function playSynthTone(freq, volume, waveType, duration = 0.5) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = waveType;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        // Fade in quickly to avoid popping
        gain.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 0.02);
        // Exponential decay
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + duration + 0.05);
    }


    // --- Canvas Confetti Custom Physics Engine ---

    class ConfettiParticle {
        constructor(x, y, angle, spread) {
            this.x = x;
            this.y = y;
            this.size = Math.random() * 8 + 6;
            this.color = colors[Math.floor(Math.random() * colors.length)];
            
            // Convert angle & spread to a 2D velocity vector
            const radAngle = (angle + (Math.random() - 0.5) * spread) * (Math.PI / 180);
            const velocity = Math.random() * 15 + 10;
            this.speedX = Math.cos(radAngle) * velocity;
            this.speedY = Math.sin(radAngle) * velocity;
            
            this.gravity = 0.2;
            this.friction = 0.98;
            
            // Rotation and fluttering physics
            this.rotation = Math.random() * Math.PI * 2;
            this.rotationSpeed = (Math.random() - 0.5) * 0.3;
            this.wobble = Math.random() * Math.PI;
            this.wobbleSpeed = Math.random() * 0.1 + 0.05;
        }

        update() {
            this.speedX *= this.friction;
            this.speedY *= this.friction;
            this.speedY += this.gravity;
            
            this.x += this.speedX;
            this.y += this.speedY;
            
            this.rotation += this.rotationSpeed;
            this.wobble += this.wobbleSpeed;
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            
            // Wobbling flutter calculation
            const width = this.size * Math.cos(this.wobble);
            const height = this.size;
            
            ctx.fillStyle = this.color;
            ctx.fillRect(-width / 2, -height / 2, width, height);
            ctx.restore();
        }
    }

    // Trigger explosive confetti burst from both lower corners
    function burstConfetti() {
        const leftSource = { x: 0, y: canvas.height * 0.85 };
        const rightSource = { x: canvas.width, y: canvas.height * 0.85 };
        
        // Spawn 100 particles from the left corner (shooting diagonally up-right)
        for (let i = 0; i < 90; i++) {
            confettiParticles.push(new ConfettiParticle(leftSource.x, leftSource.y, -45, 35));
        }
        
        // Spawn 100 particles from the right corner (shooting diagonally up-left)
        for (let i = 0; i < 90; i++) {
            confettiParticles.push(new ConfettiParticle(rightSource.x, rightSource.y, -135, 35));
        }

        // Start render loop if not running
        if (!confettiAnimationId) {
            animateConfetti();
        }
    }

    // Animation Loop for Confetti Physics
    function animateConfetti() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Update and render all particles
        for (let i = confettiParticles.length - 1; i >= 0; i--) {
            const p = confettiParticles[i];
            p.update();
            p.draw();

            // Clean up offscreen or stopped particles
            if (p.y > canvas.height + 20 || Math.abs(p.speedX) + Math.abs(p.speedY) < 0.05) {
                confettiParticles.splice(i, 1);
            }
        }

        if (confettiParticles.length > 0) {
            confettiAnimationId = requestAnimationFrame(animateConfetti);
        } else {
            confettiAnimationId = null;
        }
    }

    function stopConfetti() {
        confettiParticles = [];
        if (confettiAnimationId) {
            cancelAnimationFrame(confettiAnimationId);
            confettiAnimationId = null;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }


    // --- Raffle & Draw Logic Flow ---

    function startRaffle() {
        if (isDrawing) return;
        isDrawing = true;
        
        // Disable Draw, keep Reset active in case user wants to abort mid-animation
        btnDraw.disabled = true;
        updateStatus('shuffling', '추첨 번호 섞는 중...');

        // 1. Core Selection Logic: Pick 5 unique numbers from 1-30
        const candidates = Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1);
        // Fisher-Yates Shuffle candidates array
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }
        selectedWinners = candidates.slice(0, NUMBERS_TO_DRAW);

        // 2. High-speed Shuffle flickering animation (simulating number generation)
        let shuffleCounter = 0;
        const maxShuffle = 30; // Number of flickers before slow down
        let shuffleSpeed = 60; // Initial speed in ms

        function runShuffleTick() {
            // Remove previous highlight classes
            document.querySelectorAll('.grid-cell.highlight').forEach(cell => {
                cell.classList.remove('highlight');
            });

            // Pick a random grid cell to highlight briefly
            const randomNum = Math.floor(Math.random() * TOTAL_NUMBERS) + 1;
            const targetCell = document.getElementById(`cell-${randomNum}`);
            if (targetCell) {
                targetCell.classList.add('highlight');
                playTick();
            }

            shuffleCounter++;
            
            if (shuffleCounter < maxShuffle) {
                // Continue rapid shuffle
                setTimeout(runShuffleTick, shuffleSpeed);
            } else if (shuffleSpeed < 200) {
                // Decelerate shuffle (simulate deceleration before selection)
                shuffleSpeed += 40;
                setTimeout(runShuffleTick, shuffleSpeed);
            } else {
                // Shuffle finished, start revealing winners sequentially!
                document.querySelectorAll('.grid-cell.highlight').forEach(cell => {
                    cell.classList.remove('highlight');
                });
                revealWinnersSequentially(0);
            }
        }

        // Start shuffling tick
        runShuffleTick();
    }

    // 3. Sequential Reveal of the 5 chosen numbers
    function revealWinnersSequentially(slotIndex) {
        if (slotIndex >= NUMBERS_TO_DRAW) {
            // All 5 revealed!
            completeRaffle();
            return;
        }

        updateStatus('shuffling', `당번 확인 중... (${slotIndex + 1}/${NUMBERS_TO_DRAW})`);

        const winnerNumber = selectedWinners[slotIndex];
        
        // Find grid cell and results slot
        const gridCell = document.getElementById(`cell-${winnerNumber}`);
        const resultSlot = document.getElementById(`slot-${slotIndex}`);

        setTimeout(() => {
            // 1. Auditory chime
            playChime(slotIndex);

            // 2. Highlight grid cell
            if (gridCell) {
                gridCell.classList.add('selected');
            }

            // 3. Animate result slot opening
            if (resultSlot) {
                resultSlot.classList.remove('empty');
                resultSlot.classList.add('filled');
                resultSlot.querySelector('.slot-number').textContent = winnerNumber;
            }

            // 4. Trigger localized minor confetti burst for EACH selected number!
            if (slotIndex === NUMBERS_TO_DRAW - 1) {
                // Grand finale confetti burst
                burstConfetti();
            } else {
                // Minor burst
                triggerMinorBurst(winnerNumber);
            }

            // Move to next winner with nice cinematic pause
            revealWinnersSequentially(slotIndex + 1);

        }, 800); // 800ms gap between each revealing slot
    }

    // Trigger a localized confetti burst from a grid cell
    function triggerMinorBurst(num) {
        const cell = document.getElementById(`cell-${num}`);
        if (!cell) return;
        const rect = cell.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Spawn 20 small particles exploding outward
        for (let i = 0; i < 25; i++) {
            const angle = Math.random() * 360;
            confettiParticles.push(new ConfettiParticle(centerX, centerY, angle, 360));
        }
        
        if (!confettiAnimationId) {
            animateConfetti();
        }
    }

    // 4. Final Wrap-up State
    function completeRaffle() {
        isDrawing = false;
        updateStatus('done', '청소당번 선정 완료! 🎉');
        
        // Mark all non-selected grid cells as eliminated (fade them out)
        for (let i = 1; i <= TOTAL_NUMBERS; i++) {
            if (!selectedWinners.includes(i)) {
                const cell = document.getElementById(`cell-${i}`);
                if (cell) cell.classList.add('eliminated');
            }
        }
    }

    // 5. Reset Application State
    function resetApp() {
        // Stop any active draw interval and confetti
        isDrawing = false;
        stopConfetti();

        // 1. Re-enable draw button
        btnDraw.disabled = false;
        updateStatus('ready', '대기 중');

        // 2. Reset results slots
        for (let i = 0; i < NUMBERS_TO_DRAW; i++) {
            const slot = document.getElementById(`slot-${i}`);
            if (slot) {
                slot.className = 'result-slot empty';
                slot.querySelector('.slot-number').textContent = '?';
            }
        }

        // 3. Reset 1-30 Grid Styles
        for (let i = 1; i <= TOTAL_NUMBERS; i++) {
            const cell = document.getElementById(`cell-${i}`);
            if (cell) {
                cell.className = 'grid-cell';
            }
        }

        selectedWinners = [];
    }

    // --- Event Listeners ---
    btnDraw.addEventListener('click', startRaffle);
    btnReset.addEventListener('click', resetApp);
});
