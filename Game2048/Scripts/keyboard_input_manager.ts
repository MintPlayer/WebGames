class KeyboardInputManager {
    events: { [key: string]: Function[] };
    eventTouchstart: string;
    eventTouchmove: string;
    eventTouchend: string;

    constructor() {
        this.events = {};

        if ((window.navigator as any).msPointerEnabled) {
            this.eventTouchstart = "MSPointerDown";
            this.eventTouchmove = "MSPointerMove";
            this.eventTouchend = "MSPointerUp";
        } else {
            this.eventTouchstart = "touchstart";
            this.eventTouchmove = "touchmove";
            this.eventTouchend = "touchend";
        }

        this.listen();
    }

    on(event: string, callback: Function) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    emit(event: string, data?: any) {
        var callbacks = this.events[event];
        if (callbacks) {
            callbacks.forEach(function (callback) {
                callback(data);
            });
        }
    }

    listen() {
        var self = this;

        var map: { [key: number]: number } = {
            38: 0, // Up
            39: 1, // Right
            40: 2, // Down
            37: 3, // Left
            75: 0, // Vim up (k)
            76: 1, // Vim right (l)
            74: 2, // Vim down (j)
            72: 3, // Vim left (h)
            87: 0, // W
            68: 1, // D
            83: 2, // S
            65: 3  // A
        };

        document.addEventListener("keydown", function (event) {
            var modifiers = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
            var mapped = map[event.which];

            if (!modifiers) {
                if (mapped !== undefined) {
                    event.preventDefault();
                    self.emit("move", mapped);
                }
            }

            if (!modifiers && event.which === 82) {
                self.restart(event);
            }
        });

        this.bindButtonPress(".retry-button", this.restart);
        this.bindButtonPress(".restart-button", this.restart);
        this.bindButtonPress(".keep-playing-button", this.keepPlaying);

        var touchStartClientX: number, touchStartClientY: number;
        var gameContainer = document.getElementsByClassName("game-container")[0];

        gameContainer.addEventListener(this.eventTouchstart, function (event: Event) {
            var touchEvent = event as TouchEvent;
            if ((!(window.navigator as any).msPointerEnabled && touchEvent.touches.length > 1) ||
                (touchEvent as any).targetTouches && (touchEvent as any).targetTouches.length > 1) {
                return;
            }

            if ((window.navigator as any).msPointerEnabled) {
                touchStartClientX = (touchEvent as any).pageX;
                touchStartClientY = (touchEvent as any).pageY;
            } else {
                touchStartClientX = touchEvent.touches[0].clientX;
                touchStartClientY = touchEvent.touches[0].clientY;
            }

            event.preventDefault();
        });

        gameContainer.addEventListener(this.eventTouchmove, function (event) {
            event.preventDefault();
        });

        gameContainer.addEventListener(this.eventTouchend, function (event: Event) {
            var touchEvent = event as TouchEvent;
            if ((!(window.navigator as any).msPointerEnabled && touchEvent.touches && touchEvent.touches.length > 0) ||
                (touchEvent as any).targetTouches && (touchEvent as any).targetTouches.length > 0) {
                return;
            }

            var touchEndClientX: number, touchEndClientY: number;

            if ((window.navigator as any).msPointerEnabled) {
                touchEndClientX = (touchEvent as any).pageX;
                touchEndClientY = (touchEvent as any).pageY;
            } else {
                touchEndClientX = (touchEvent as any).changedTouches[0].clientX;
                touchEndClientY = (touchEvent as any).changedTouches[0].clientY;
            }

            var dx = touchEndClientX - touchStartClientX;
            var absDx = Math.abs(dx);

            var dy = touchEndClientY - touchStartClientY;
            var absDy = Math.abs(dy);

            if (Math.max(absDx, absDy) > 10) {
                self.emit("move", absDx > absDy ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
            }
        });
    }

    restart(event: Event) {
        event.preventDefault();
        this.emit("restart");
    }

    keepPlaying(event: Event) {
        event.preventDefault();
        this.emit("keepPlaying");
    }

    bindButtonPress(selector: string, fn: (event: Event) => void) {
        var button = document.querySelector(selector);
        if (button) {
            button.addEventListener("click", fn.bind(this));
            button.addEventListener(this.eventTouchend, fn.bind(this));
        }
    }
}
