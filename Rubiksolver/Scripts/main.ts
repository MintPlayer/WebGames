import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RubiksCube, CubeState } from './rubiksCube.js';

interface SolveResponse {
    solution: string[];
    moveCount: number;
    solveTimeMs: number;
    error?: string;
}

type Move = 'U' | "U'" | 'U2' | 'D' | "D'" | 'D2' | 'R' | "R'" | 'R2' | 'L' | "L'" | 'L2' | 'F' | "F'" | 'F2' | 'B' | "B'" | 'B2';

const inverseMoves: Record<string, string> = {
    'U': "U'", "U'": 'U', 'U2': 'U2',
    'D': "D'", "D'": 'D', 'D2': 'D2',
    'R': "R'", "R'": 'R', 'R2': 'R2',
    'L': "L'", "L'": 'L', 'L2': 'L2',
    'F': "F'", "F'": 'F', 'F2': 'F2',
    'B': "B'", "B'": 'B', 'B2': 'B2'
};

class App {
    private scene: THREE.Scene | null = null;
    private camera: THREE.PerspectiveCamera | null = null;
    private renderer: THREE.WebGLRenderer | null = null;
    private controls: OrbitControls | null = null;
    private rubiksCube: RubiksCube | null = null;
    private isAnimating: boolean = false;
    private moveHistory: string[] = [];
    private animationSpeed: number = 300;

    // Solution playback state
    private solution: string[] = [];
    private solutionIndex: number = -1;
    private isPlaying: boolean = false;

    constructor() {
        this.init();
        this.setupEventListeners();
        this.updateMoveHistoryDisplay();
        this.animate();
    }

    private init(): void {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);

        // Camera
        const canvas = document.getElementById('cubeCanvas') as HTMLCanvasElement;
        const aspect = canvas.clientWidth / canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        this.camera.position.set(5, 5, 7);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true
        });
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 20;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 10);
        this.scene.add(directionalLight);

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight2.position.set(-10, -10, -10);
        this.scene.add(directionalLight2);

        // Rubik's Cube
        this.rubiksCube = new RubiksCube();
        this.scene.add(this.rubiksCube.group);

        // Handle resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    private setupEventListeners(): void {
        // Move buttons
        document.querySelectorAll('[data-move]').forEach(button => {
            button.addEventListener('click', (e) => {
                if (this.isAnimating) return;
                const target = e.target as HTMLElement;
                const move = target.dataset['move'];
                if (move) {
                    this.executeMove(move);
                }
            });
        });

        // Scramble button
        const scrambleBtn = document.getElementById('scrambleBtn');
        if (scrambleBtn) {
            scrambleBtn.addEventListener('click', () => {
                if (this.isAnimating) return;
                this.scramble();
            });
        }

        // Solve button
        const solveBtn = document.getElementById('solveBtn');
        if (solveBtn) {
            solveBtn.addEventListener('click', () => {
                if (this.isAnimating) return;
                this.solve();
            });
        }

        // Reset button
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (this.isAnimating) return;
                this.reset();
            });
        }

        // Speed slider
        const speedSlider = document.getElementById('speedSlider') as HTMLInputElement | null;
        if (speedSlider) {
            speedSlider.addEventListener('input', (e) => {
                const target = e.target as HTMLInputElement;
                this.animationSpeed = parseInt(target.value);
                const speedValue = document.getElementById('speedValue');
                if (speedValue) {
                    speedValue.textContent = `${this.animationSpeed}ms`;
                }
            });
        }

        // Export button
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportState();
            });
        }

        // Copy moves button
        const copyMovesBtn = document.getElementById('copyMovesBtn');
        if (copyMovesBtn) {
            copyMovesBtn.addEventListener('click', () => {
                this.copyMoveHistory();
            });
        }

        // Playback controls
        const prevBtn = document.getElementById('prevBtn');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.isAnimating || this.isPlaying) return;
                this.stepPrev();
            });
        }

        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.isAnimating || this.isPlaying) return;
                this.stepNext();
            });
        }

        const playBtn = document.getElementById('playBtn');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                if (this.isAnimating) return;
                this.togglePlay();
            });
        }

        // Keyboard controls for moves
        // B, F, U, D, L, R = clockwise moves
        // Shift + key = counter-clockwise (prime) moves
        document.addEventListener('keydown', (e) => {
            if (this.isAnimating) return;

            // Ignore if user is typing in an input field
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            const key = e.key.toUpperCase();
            const validFaces = ['U', 'D', 'L', 'R', 'F', 'B'];

            if (validFaces.includes(key)) {
                e.preventDefault();
                const move = e.shiftKey ? key + "'" : key;
                this.executeMove(move);
            }
        });
    }

    private async executeMove(move: string, recordHistory: boolean = true): Promise<void> {
        if (this.isAnimating || !this.rubiksCube) return;

        this.isAnimating = true;
        this.setStatus('Rotating...');
        this.disableButtons(true);

        await this.rubiksCube.rotate(move, this.animationSpeed);

        if (recordHistory) {
            this.moveHistory.push(move);
            this.updateMoveCount();
            // Clear solution when user makes manual moves
            this.clearSolution();
        }

        this.isAnimating = false;
        this.setStatus('Ready');
        this.disableButtons(false);
    }

    private async scramble(): Promise<void> {
        if (!this.rubiksCube) return;

        const faces = ['U', 'D', 'L', 'R', 'F', 'B'];
        const modifiers = ['', "'", '2'];
        const scrambleLength = 20;
        const scrambleMoves: string[] = [];

        let lastFace: string | null = null;
        let secondLastFace: string | null = null;

        const oppositeFaces: Record<string, string> = { 'U': 'D', 'D': 'U', 'R': 'L', 'L': 'R', 'F': 'B', 'B': 'F' };

        for (let i = 0; i < scrambleLength; i++) {
            let availableFaces = faces.filter(f => f !== lastFace);
            if (lastFace && secondLastFace && oppositeFaces[lastFace] === secondLastFace) {
                availableFaces = availableFaces.filter(f => f !== oppositeFaces[lastFace!]);
            }

            const face = availableFaces[Math.floor(Math.random() * availableFaces.length)];
            const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
            const move = face + modifier;

            scrambleMoves.push(move);
            secondLastFace = lastFace;
            lastFace = face;
        }

        this.isAnimating = true;
        this.setStatus('Scrambling...');
        this.disableButtons(true);
        // Don't clear move history - append scramble moves to preserve history
        this.clearSolution();

        for (const move of scrambleMoves) {
            await this.rubiksCube.rotate(move, 80);
            this.moveHistory.push(move);
        }

        this.updateMoveCount();
        this.isAnimating = false;
        this.setStatus('Scrambled - Ready to solve!');
        this.disableButtons(false);
    }

    private async solve(): Promise<void> {
        if (!this.rubiksCube) return;

        this.isAnimating = true;
        this.setStatus('Sending to server...');
        this.disableButtons(true);

        try {
            // Send cube state to server
            const response = await fetch('/api/cube/solve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    state: this.rubiksCube.getState()
                })
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const result: SolveResponse = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            if (result.solution.length === 0) {
                this.setStatus('Already solved!');
                this.clearSolution();
                this.isAnimating = false;
                this.disableButtons(false);
                return;
            }

            // Store solution for playback
            this.solution = result.solution;
            this.solutionIndex = -1;

            // Display solution info
            this.showSolution(result.solution, result.solveTimeMs);
            this.setStatus(`Solution found: ${result.moveCount} moves (${result.solveTimeMs}ms)`);
            this.updatePlaybackButtons();

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.setStatus(`Error: ${errorMessage}`);
            console.error('Solve error:', error);
        }

        this.isAnimating = false;
        this.disableButtons(false);
    }

    private async stepNext(): Promise<void> {
        if (!this.rubiksCube || this.solution.length === 0 || this.solutionIndex >= this.solution.length - 1) return;

        this.solutionIndex++;
        const move = this.solution[this.solutionIndex];

        this.isAnimating = true;
        this.disableButtons(true);
        this.setStatus(`Step ${this.solutionIndex + 1}/${this.solution.length}: ${move}`);
        this.highlightCurrentMove();

        await this.rubiksCube.rotate(move, this.animationSpeed);

        this.isAnimating = false;
        this.disableButtons(false);
        this.updatePlaybackButtons();

        if (this.solutionIndex === this.solution.length - 1) {
            this.setStatus('Solved!');
            this.moveHistory = [];
            this.updateMoveCount();
        }
    }

    private async stepPrev(): Promise<void> {
        if (!this.rubiksCube || this.solution.length === 0 || this.solutionIndex < 0) return;

        const move = this.solution[this.solutionIndex];
        const inverseMove = this.getInverseMove(move);

        this.isAnimating = true;
        this.disableButtons(true);
        this.setStatus(`Undoing step ${this.solutionIndex + 1}: ${move}`);

        await this.rubiksCube.rotate(inverseMove, this.animationSpeed);

        this.solutionIndex--;
        this.highlightCurrentMove();

        this.isAnimating = false;
        this.disableButtons(false);
        this.updatePlaybackButtons();

        if (this.solutionIndex < 0) {
            this.setStatus('Back to start');
        } else {
            this.setStatus(`At step ${this.solutionIndex + 1}/${this.solution.length}`);
        }
    }

    private async togglePlay(): Promise<void> {
        if (this.isPlaying) {
            this.isPlaying = false;
            const playBtn = document.getElementById('playBtn');
            if (playBtn) playBtn.textContent = 'Play';
            return;
        }

        if (this.solution.length === 0 || this.solutionIndex >= this.solution.length - 1) return;

        this.isPlaying = true;
        const playBtn = document.getElementById('playBtn');
        if (playBtn) playBtn.textContent = 'Pause';

        while (this.isPlaying && this.solutionIndex < this.solution.length - 1) {
            await this.stepNext();
            if (this.solutionIndex < this.solution.length - 1) {
                await new Promise<void>(r => setTimeout(r, 50)); // Small delay between moves
            }
        }

        this.isPlaying = false;
        if (playBtn) playBtn.textContent = 'Play';
    }

    private getInverseMove(move: string): string {
        return inverseMoves[move] || move;
    }

    private showSolution(solution: string[], solveTimeMs: number): void {
        const display = document.getElementById('solutionDisplay');
        const movesSpan = document.getElementById('solutionMoves');
        const infoSpan = document.getElementById('solveInfo');

        if (display) display.style.display = 'block';
        if (movesSpan) {
            movesSpan.innerHTML = solution.map((m, i) => `<span id="move-${i}" class="move-item">${m}</span>`).join(' ');
        }

        if (infoSpan) {
            infoSpan.textContent = `${solution.length} moves in ${solveTimeMs}ms`;
        }

        // Show playback controls
        const playbackControls = document.getElementById('playbackControls');
        if (playbackControls) playbackControls.style.display = 'flex';
    }

    private clearSolution(): void {
        this.solution = [];
        this.solutionIndex = -1;
        this.isPlaying = false;

        const solutionDisplay = document.getElementById('solutionDisplay');
        if (solutionDisplay) solutionDisplay.style.display = 'none';

        const playbackControls = document.getElementById('playbackControls');
        if (playbackControls) playbackControls.style.display = 'none';

        const playBtn = document.getElementById('playBtn');
        if (playBtn) playBtn.textContent = 'Play';
    }

    private highlightCurrentMove(): void {
        this.solution.forEach((_, i) => {
            const el = document.getElementById(`move-${i}`);
            if (el) {
                if (i < this.solutionIndex) {
                    el.className = 'move-item move-done';
                } else if (i === this.solutionIndex) {
                    el.className = 'move-item move-current';
                } else {
                    el.className = 'move-item move-pending';
                }
            }
        });
    }

    private updatePlaybackButtons(): void {
        const prevBtn = document.getElementById('prevBtn') as HTMLButtonElement | null;
        const nextBtn = document.getElementById('nextBtn') as HTMLButtonElement | null;
        const playBtn = document.getElementById('playBtn') as HTMLButtonElement | null;

        if (prevBtn) prevBtn.disabled = this.solutionIndex < 0;
        if (nextBtn) nextBtn.disabled = this.solutionIndex >= this.solution.length - 1;
        if (playBtn) playBtn.disabled = this.solutionIndex >= this.solution.length - 1;
    }

    private reset(): void {
        if (!this.rubiksCube) return;

        this.rubiksCube.reset();
        this.moveHistory = [];
        this.updateMoveCount();
        this.clearSolution();
        this.setStatus('Reset - Ready');
    }

    private async exportState(): Promise<void> {
        if (!this.rubiksCube) return;

        const state = this.rubiksCube.getState();

        // Create Kociemba-style string representation
        const colorToFace: Record<string, string> = { 'W': 'U', 'R': 'R', 'G': 'F', 'Y': 'D', 'O': 'L', 'B': 'B' };
        const kociembaString = [
            ...state.U.map(c => colorToFace[c]),
            ...state.R.map(c => colorToFace[c]),
            ...state.F.map(c => colorToFace[c]),
            ...state.D.map(c => colorToFace[c]),
            ...state.L.map(c => colorToFace[c]),
            ...state.B.map(c => colorToFace[c])
        ].join('');

        // Create readable format as well
        const readable = `U: ${state.U.join('')}\nD: ${state.D.join('')}\nF: ${state.F.join('')}\nB: ${state.B.join('')}\nR: ${state.R.join('')}\nL: ${state.L.join('')}`;

        const exportText = `Kociemba: ${kociembaString}\n\n${readable}\n\nJSON: ${JSON.stringify(state)}`;

        try {
            await navigator.clipboard.writeText(exportText);
            this.setStatus('State copied to clipboard!');
        } catch (err) {
            // Fallback for browsers without clipboard API
            console.log('Export:', exportText);
            this.setStatus('State logged to console (clipboard unavailable)');
        }
    }

    private setStatus(text: string): void {
        const statusText = document.getElementById('statusText');
        if (statusText) statusText.textContent = text;
    }

    private updateMoveCount(): void {
        const moveCount = document.getElementById('moveCount');
        if (moveCount) moveCount.textContent = this.moveHistory.length.toString();
        this.updateMoveHistoryDisplay();
    }

    private updateMoveHistoryDisplay(): void {
        const display = document.getElementById('moveHistoryDisplay');
        const copyBtn = document.getElementById('copyMovesBtn') as HTMLElement | null;

        if (!display) return;

        if (this.moveHistory.length === 0) {
            display.innerHTML = '<span class="no-moves">No moves yet</span>';
            if (copyBtn) copyBtn.style.display = 'none';
        } else {
            display.innerHTML = this.moveHistory
                .map((m, i) => `<span class="history-move">${m}</span>`)
                .join(' ');
            if (copyBtn) copyBtn.style.display = 'block';
        }
    }

    private async copyMoveHistory(): Promise<void> {
        const movesText = this.moveHistory.join(' ');
        try {
            await navigator.clipboard.writeText(movesText);
            this.setStatus('Moves copied to clipboard!');
        } catch (err) {
            console.log('Move history:', movesText);
            this.setStatus('Moves logged to console');
        }
    }

    private disableButtons(disabled: boolean): void {
        document.querySelectorAll('button:not(#playBtn)').forEach(btn => {
            (btn as HTMLButtonElement).disabled = disabled;
        });
        // Handle playback buttons separately
        if (!disabled && this.solution.length > 0) {
            this.updatePlaybackButtons();
        }
    }

    private onWindowResize(): void {
        if (!this.camera || !this.renderer) return;

        const canvas = document.getElementById('cubeCanvas');
        if (!canvas) return;

        this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    }

    private animate(): void {
        requestAnimationFrame(() => this.animate());
        if (this.controls) this.controls.update();
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

// Start the app
new App();
