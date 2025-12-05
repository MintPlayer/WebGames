var fakeStorage = {
    _data: {} as { [key: string]: string },

    setItem: function (id: string, val: string) {
        return this._data[id] = String(val);
    },

    getItem: function (id: string): string | null {
        return this._data.hasOwnProperty(id) ? this._data[id] : null;
    },

    removeItem: function (id: string) {
        return delete this._data[id];
    },

    clear: function () {
        return this._data = {};
    }
};

class LocalStorageManager {
    bestScoreKey: string;
    gameStateKey: string;
    storage: Storage | typeof fakeStorage;

    constructor() {
        this.bestScoreKey = "bestScore";
        this.gameStateKey = "gameState";

        this.storage = this.localStorageSupported() ? window.localStorage : fakeStorage;
    }

    localStorageSupported(): boolean {
        var testKey = "test";

        try {
            var storage = window.localStorage;
            storage.setItem(testKey, "1");
            storage.removeItem(testKey);
            return true;
        } catch (error) {
            return false;
        }
    }

    getBestScore(): number {
        return parseInt(this.storage.getItem(this.bestScoreKey) || "0", 10) || 0;
    }

    setBestScore(score: number) {
        this.storage.setItem(this.bestScoreKey, score.toString());
    }

    getGameState(): any | null {
        var stateJSON = this.storage.getItem(this.gameStateKey);
        return stateJSON ? JSON.parse(stateJSON) : null;
    }

    setGameState(gameState: any) {
        this.storage.setItem(this.gameStateKey, JSON.stringify(gameState));
    }

    clearGameState() {
        this.storage.removeItem(this.gameStateKey);
    }
}
