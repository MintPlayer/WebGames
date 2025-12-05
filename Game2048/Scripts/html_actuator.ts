class HTMLActuator {
    tileContainer: Element;
    scoreContainer: Element;
    bestContainer: Element;
    messageContainer: Element;
    score: number;

    constructor() {
        this.tileContainer = document.querySelector(".tile-container")!;
        this.scoreContainer = document.querySelector(".score-container")!;
        this.bestContainer = document.querySelector(".best-container")!;
        this.messageContainer = document.querySelector(".game-message")!;

        this.score = 0;
    }

    actuate(grid: Grid, metadata: { score: number; bestScore: number; terminated: boolean; over: boolean; won: boolean }) {
        var self = this;

        window.requestAnimationFrame(function () {
            self.clearContainer(self.tileContainer);

            grid.cells.forEach(function (column) {
                column.forEach(function (cell) {
                    if (cell) {
                        self.addTile(cell);
                    }
                });
            });

            self.updateScore(metadata.score);
            self.updateBestScore(metadata.bestScore);

            if (metadata.terminated) {
                if (metadata.over) {
                    self.message(false);
                } else if (metadata.won) {
                    self.message(true);
                }
            }
        });
    }

    continueGame() {
        this.clearMessage();
    }

    clearContainer(container: Element) {
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
    }

    addTile(tile: Tile) {
        var self = this;

        var wrapper = document.createElement("div");
        var inner = document.createElement("div");
        var position = tile.previousPosition || { x: tile.x, y: tile.y };
        var positionClass = this.positionClass(position);

        var classes = ["tile", "tile-" + tile.value, positionClass];

        if (tile.value > 2048) classes.push("tile-super");

        this.applyClasses(wrapper, classes);

        inner.classList.add("tile-inner");
        inner.textContent = tile.value.toString();

        if (tile.previousPosition) {
            window.requestAnimationFrame(function () {
                classes[2] = self.positionClass({ x: tile.x, y: tile.y });
                self.applyClasses(wrapper, classes);
            });
        } else if (tile.mergedFrom) {
            classes.push("tile-merged");
            this.applyClasses(wrapper, classes);

            tile.mergedFrom.forEach(function (merged) {
                self.addTile(merged);
            });
        } else {
            classes.push("tile-new");
            this.applyClasses(wrapper, classes);
        }

        wrapper.appendChild(inner);
        this.tileContainer.appendChild(wrapper);
    }

    applyClasses(element: Element, classes: string[]) {
        element.setAttribute("class", classes.join(" "));
    }

    normalizePosition(position: { x: number; y: number }): { x: number; y: number } {
        return { x: position.x + 1, y: position.y + 1 };
    }

    positionClass(position: { x: number; y: number }): string {
        position = this.normalizePosition(position);
        return "tile-position-" + position.x + "-" + position.y;
    }

    updateScore(score: number) {
        this.clearContainer(this.scoreContainer);

        var difference = score - this.score;
        this.score = score;

        this.scoreContainer.textContent = this.score.toString();

        if (difference > 0) {
            var addition = document.createElement("div");
            addition.classList.add("score-addition");
            addition.textContent = "+" + difference;

            this.scoreContainer.appendChild(addition);
        }
    }

    updateBestScore(bestScore: number) {
        this.bestContainer.textContent = bestScore.toString();
    }

    message(won: boolean) {
        var type = won ? "game-won" : "game-over";
        var message = won ? "You win!" : "Game over!";

        this.messageContainer.classList.add(type);
        this.messageContainer.getElementsByTagName("p")[0].textContent = message;
    }

    clearMessage() {
        this.messageContainer.classList.remove("game-won");
        this.messageContainer.classList.remove("game-over");
    }
}
