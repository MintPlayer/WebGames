class GameManager {
    size: number;
    inputManager: KeyboardInputManager;
    storageManager: LocalStorageManager;
    actuator: HTMLActuator;
    startTiles: number;
    grid!: Grid;
    score!: number;
    over!: boolean;
    won!: boolean;
    keepPlaying!: boolean;

    constructor(size: number, InputManager: typeof KeyboardInputManager, Actuator: typeof HTMLActuator, StorageManager: typeof LocalStorageManager) {
        this.size = size;
        this.inputManager = new InputManager();
        this.storageManager = new StorageManager();
        this.actuator = new Actuator();

        this.startTiles = 2;

        this.inputManager.on("move", this.move.bind(this));
        this.inputManager.on("restart", this.restart.bind(this));
        this.inputManager.on("keepPlaying", this.keepPlayingGame.bind(this));

        this.setup();
    }

    restart() {
        this.storageManager.clearGameState();
        this.actuator.continueGame();
        this.setup();
    }

    keepPlayingGame() {
        this.keepPlaying = true;
        this.actuator.continueGame();
    }

    isGameTerminated(): boolean {
        return this.over || (this.won && !this.keepPlaying);
    }

    setup() {
        var previousState = this.storageManager.getGameState();

        if (previousState) {
            this.grid = new Grid(previousState.grid.size, previousState.grid.cells);
            this.score = previousState.score;
            this.over = previousState.over;
            this.won = previousState.won;
            this.keepPlaying = previousState.keepPlaying;
        } else {
            this.grid = new Grid(this.size);
            this.score = 0;
            this.over = false;
            this.won = false;
            this.keepPlaying = false;

            this.addStartTiles();
        }

        this.actuate();
    }

    addStartTiles() {
        for (var i = 0; i < this.startTiles; i++) {
            this.addRandomTile();
        }
    }

    addRandomTile() {
        if (this.grid.cellsAvailable()) {
            var value = Math.random() < 0.9 ? 2 : 4;
            var cell = this.grid.randomAvailableCell();
            if (cell) {
                var tile = new Tile(cell, value);
                this.grid.insertTile(tile);
            }
        }
    }

    actuate() {
        if (this.storageManager.getBestScore() < this.score) {
            this.storageManager.setBestScore(this.score);
        }

        if (this.over) {
            this.storageManager.clearGameState();
        } else {
            this.storageManager.setGameState(this.serialize());
        }

        this.actuator.actuate(this.grid, {
            score: this.score,
            over: this.over,
            won: this.won,
            bestScore: this.storageManager.getBestScore(),
            terminated: this.isGameTerminated()
        });
    }

    serialize() {
        return {
            grid: this.grid.serialize(),
            score: this.score,
            over: this.over,
            won: this.won,
            keepPlaying: this.keepPlaying
        };
    }

    prepareTiles() {
        this.grid.eachCell(function (x: number, y: number, tile: Tile | null) {
            if (tile) {
                tile.mergedFrom = null;
                tile.savePosition();
            }
        });
    }

    moveTile(tile: Tile, cell: { x: number; y: number }) {
        this.grid.cells[tile.x][tile.y] = null;
        this.grid.cells[cell.x][cell.y] = tile;
        tile.updatePosition(cell);
    }

    move(direction: number) {
        var self = this;

        if (this.isGameTerminated()) return;

        var cell: { x: number; y: number };
        var tile: Tile | null;

        var vector = this.getVector(direction);
        var traversals = this.buildTraversals(vector);
        var moved = false;

        this.prepareTiles();

        traversals.x.forEach(function (x: number) {
            traversals.y.forEach(function (y: number) {
                cell = { x: x, y: y };
                tile = self.grid.cellContent(cell);

                if (tile) {
                    var positions = self.findFarthestPosition(cell, vector);
                    var next = self.grid.cellContent(positions.next);

                    if (next && next.value === tile.value && !next.mergedFrom) {
                        var merged = new Tile(positions.next, tile.value * 2);
                        merged.mergedFrom = [tile, next];

                        self.grid.insertTile(merged);
                        self.grid.removeTile(tile);

                        tile.updatePosition(positions.next);

                        self.score += merged.value;

                        if (merged.value === 2048) self.won = true;
                    } else {
                        self.moveTile(tile, positions.farthest);
                    }

                    if (!self.positionsEqual(cell, tile)) {
                        moved = true;
                    }
                }
            });
        });

        if (moved) {
            this.addRandomTile();

            if (!this.movesAvailable()) {
                this.over = true;
            }

            this.actuate();
        }
    }

    getVector(direction: number): { x: number; y: number } {
        var map: { [key: number]: { x: number; y: number } } = {
            0: { x: 0, y: -1 },
            1: { x: 1, y: 0 },
            2: { x: 0, y: 1 },
            3: { x: -1, y: 0 }
        };

        return map[direction];
    }

    buildTraversals(vector: { x: number; y: number }): { x: number[]; y: number[] } {
        var traversals: { x: number[]; y: number[] } = { x: [], y: [] };

        for (var pos = 0; pos < this.size; pos++) {
            traversals.x.push(pos);
            traversals.y.push(pos);
        }

        if (vector.x === 1) traversals.x = traversals.x.reverse();
        if (vector.y === 1) traversals.y = traversals.y.reverse();

        return traversals;
    }

    findFarthestPosition(cell: { x: number; y: number }, vector: { x: number; y: number }): { farthest: { x: number; y: number }; next: { x: number; y: number } } {
        var previous: { x: number; y: number };

        do {
            previous = cell;
            cell = { x: previous.x + vector.x, y: previous.y + vector.y };
        } while (this.grid.withinBounds(cell) && this.grid.cellAvailable(cell));

        return {
            farthest: previous,
            next: cell
        };
    }

    movesAvailable(): boolean {
        return this.grid.cellsAvailable() || this.tileMatchesAvailable();
    }

    tileMatchesAvailable(): boolean {
        var self = this;
        var tile: Tile | null;

        for (var x = 0; x < this.size; x++) {
            for (var y = 0; y < this.size; y++) {
                tile = this.grid.cellContent({ x: x, y: y });

                if (tile) {
                    for (var direction = 0; direction < 4; direction++) {
                        var vector = self.getVector(direction);
                        var cell = { x: x + vector.x, y: y + vector.y };

                        var other = self.grid.cellContent(cell);

                        if (other && other.value === tile.value) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    positionsEqual(first: { x: number; y: number }, second: { x: number; y: number }): boolean {
        return first.x === second.x && first.y === second.y;
    }
}
