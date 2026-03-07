/**
 * @file terminal.ts
 * @description Terminal renderer implementation
 * @author Nicholas T.
 * @copyright 2026 PiCO
 */

import * as _renders from "../../render_types.js";
import * as _cells from "../../cell_types.js";
import * as _grids from "../../grid_types.js";
import * as cells from "../../cells.js";
import * as renders from "../../render.js";

type terminal_render = {
    type: "terminal";

    write: (text: string) => void;
    clear: () => void;
};

type terminal_ctx = {
    type: "terminal";

    color: (color: string) => void;
    text: (text: string) => void;
};

class TerminalRender implements _renders.base_renderer<terminal_ctx> {
    readonly context: terminal_ctx;
    readonly grid: _grids.grid_t;

    private readonly write: (text: string) => void;
    private readonly clear: () => void;

    /**
     * Store buffer output for terminal
     * In format of string[y][x] for easy access when rendering cells
     */
    private buffer: string[][] = [];

    /** Store info about the current cell */
    // private curr_color: string = "";
    private curr_text: string = "";

    constructor(renderer: terminal_render, grid: _grids.grid_t) {
        this.write = renderer.write;
        this.clear = renderer.clear;
        this.grid = grid;

        this.context = {
            type: "terminal",

            color: this._color.bind(this),
            text: this._text.bind(this),
        };
    }

    pre(): _renders.pre_t {
        // Whether to rerender the entire grid
        let full = false;

        // Buffer height mismatch
        if (this.buffer.length !== this.grid.height) {
            // Initialize buffer with empty strings
            while (this.buffer.length < this.grid.height) {
                this.buffer.push([]);
                full = true;
            }

            // Clear buffer if grid size has changed
            if (this.buffer.length > this.grid.height) {
                this.buffer.splice(this.grid.height);
            }
        }

        // Buffer width mismatch
        if (
            this.buffer.length > 0 &&
            this.buffer[0].length !== this.grid.width
        ) {
            // Adjust buffer width
            for (const row of this.buffer) {
                while (row.length < this.grid.width) {
                    row.push("  "); // Fill with empty text
                    full = true;
                }

                if (row.length > this.grid.width) {
                    row.splice(this.grid.width);
                }
            }
        }

        return { full };
    }

    render(x: number, y: number, cell: _cells.fcell_t): boolean {
        // Setup context for rendering the cell
        this.curr_text = "  "; // Clear text for the current cell

        const result = cells.render(cell, this.context);

        // Apply modified context to the terminal
        this.buffer[y][x] = this.curr_text;

        return result;
    }

    post(rlen: number): void {
        // Render the buffer to a string
        const output = this.buffer.map((row) => row.join("")).join("\n");

        // Render output string to terminal
        this.clear();
        this.write(output);
    }

    private _color(color: string): void {
        /** @TODO Implement color handling */
    }

    private _text(text: string): void {
        // Ensure text is exactly 2 characters long for proper terminal rendering
        this.curr_text = text.substring(0, 2).padEnd(2, " ");
    }
}

function compile(
    renderer: terminal_render,
    grid: _grids.grid_t,
): _renders.base_renderer<terminal_ctx> {
    return new TerminalRender(renderer, grid);
}

// Register renderer
renders.register({
    type: "terminal",
    compile,
});

declare module "../../render_types.js" {
    interface render_registry {
        terminal: {
            user: terminal_render;
            ctx: terminal_ctx;
            inter: TerminalRender;
        };
    }
}
