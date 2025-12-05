class Grid {
    size: number;
    cells: (Tile | null)[][];

    constructor(size: number, previousState?: any) {
        this.size = size;
        this.cells = previousState ? this.fromState(previousState) : this.empty();
    }

    empty(): (Tile | null)[][] {
        var cells: (Tile | null)[][] = [];

        for (var x = 0; x < this.size; x++) {
            var row: (Tile | null)[] = cells[x] = [];

            for (var y = 0; y < this.size; y++) {
                row.push(null);
            }
        }

        return cells;
    }

    fromState(state: any): (Tile | null)[][] {
        var cells: (Tile | null)[][] = [];

        for (var x = 0; x < this.size; x++) {
            var row: (Tile | null)[] = cells[x] = [];

            for (var y = 0; y < this.size; y++) {
                var tile = state[x][y];
                row.push(tile ? new Tile(tile.position, tile.value) : null);
            }
        }

        return cells;
    }

    randomAvailableCell(): { x: number; y: number } | undefined {
        var cells = this.availableCells();

        if (cells.length) {
            return cells[Math.floor(Math.random() * cells.length)];
        }
    }

    availableCells(): { x: number; y: number }[] {
        var cells: { x: number; y: number }[] = [];

        this.eachCell(function (x: number, y: number, tile: Tile | null) {
            if (!tile) {
                cells.push({ x: x, y: y });
            }
        });

        return cells;
    }

    eachCell(callback: (x: number, y: number, tile: Tile | null) => void) {
        for (var x = 0; x < this.size; x++) {
            for (var y = 0; y < this.size; y++) {
                callback(x, y, this.cells[x][y]);
            }
        }
    }

    cellsAvailable(): boolean {
        return !!this.availableCells().length;
    }

    cellAvailable(cell: { x: number; y: number }): boolean {
        return !this.cellOccupied(cell);
    }

    cellOccupied(cell: { x: number; y: number }): boolean {
        return !!this.cellContent(cell);
    }

    cellContent(cell: { x: number; y: number }): Tile | null {
        if (this.withinBounds(cell)) {
            return this.cells[cell.x][cell.y];
        } else {
            return null;
        }
    }

    insertTile(tile: Tile) {
        this.cells[tile.x][tile.y] = tile;
    }

    removeTile(tile: Tile) {
        this.cells[tile.x][tile.y] = null;
    }

    withinBounds(position: { x: number; y: number }): boolean {
        return position.x >= 0 && position.x < this.size &&
            position.y >= 0 && position.y < this.size;
    }

    serialize() {
        var cellState: any[][] = [];

        for (var x = 0; x < this.size; x++) {
            var row: any[] = cellState[x] = [];

            for (var y = 0; y < this.size; y++) {
                row.push(this.cells[x][y] ? this.cells[x][y]!.serialize() : null);
            }
        }

        return {
            size: this.size,
            cells: cellState
        };
    }
}
