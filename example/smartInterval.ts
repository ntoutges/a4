/**
 * @file smartInterval.ts
 * @description Call some callback function with some arbitrary (changeable) period
 * @author Nicholas T.
 * @copyright PiCO 2026
 */

export class SmartInterval<T extends any[]> {
    private readonly cb: (...args: T) => void;
    private readonly args: T;
    private _period: number; // Period of the current interval
    private last_tick: number = 0; // Keep track of last time interval triggered callback

    private interval: ReturnType<typeof setInterval> | null = null; // Reference to some interval id
    private timeout: ReturnType<typeof setTimeout> | null = null; // Reference to timeout used to start late interval

    /**
     * @param callback  The callback to run
     * @param period    Indicate sthe speed to run the callback function
     * @param args      Any arguments to pass into the callback function
     */
    constructor(callback: (...args: T) => void, period: number, ...args: T) {
        this.cb = callback;
        this._period = period;
        this.args = args;
    }

    /**
     * Get state of the smart inverval
     */
    playing(): boolean {
        return this.interval !== null || this.timeout !== null;
    }

    /**
     * Start the interval
     * @returns `true` iff the interval was originally paused
     */
    play(): boolean {
        if (this.playing()) return false; // Interval already running/scheduled!
        this._play();
        return true;
    }

    /**
     * Stop the interval
     * @returns `true` iff the interval was originally playing
     */
    pause(): boolean {
        if (!this.playing()) return false; // Interval already paused!

        // Halt interval/scheduled interval start
        if (this.interval !== null) clearInterval(this.interval);
        if (this.timeout !== null) clearTimeout(this.timeout);

        // Indicate that we have stopped
        this.interval = null;
        this.timeout = null;

        return true;
    }

    /**
     * Set the speed of calling the callback function
     * If the interval is already playing, will wait `min(period, time_until_next_tick`) to run next fn
     */
    period(period: number): void {
        if (period === this._period) return; // Period unchanged; Do nothing!

        const wasPlaying = this.pause(); // Stop the current interval

        // No need to restart interval that was already paused
        if (!wasPlaying) {
            this._period = period;
            return;
        }

        // Figure out when to next run interval
        const next_tick = this.last_tick + this._period;
        const next_delay = next_tick - performance.now();

        const delay = Math.min(period, next_delay);

        this._period = period;
        this.timeout = setTimeout(this._play.bind(this), delay);
    }

    /**
     * Get the progress into the current tick
     * @returns A value in the range [0, 1] indicating the progress into the current tick.
     * If not running, the value `0` is returned
     */
    progress(): number {
        if (!this.playing()) return 0;

        const duration = performance.now() - this.last_tick;
        return Math.min(Math.max(duration / this._period, 0), 1);
    }

    /**
     * Start interval + clear timeout with no safety checks
     */
    private _play() {
        this._tick();
        this.interval = setInterval(this._tick.bind(this), this._period);
        this.timeout = null;
    }

    /**
     * Run the callback, and perform bookkeeping
     */
    private _tick() {
        this.last_tick = performance.now();
        this.cb(...this.args);
    }
}
