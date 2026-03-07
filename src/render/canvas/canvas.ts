/**
 * @file canvas.ts
 * @description Canvas renderer implementation
 * @author Nicholas T.
 * @copyright 2026 PiCO
 */

import * as _renders from "../../render_types.js";
import * as _cells from "../../cell_types.js";
import * as _grids from "../../grid_types.js";
import * as renders from "../../render.js";
import * as crender from "./crender.js";

export type canvas_render = {
    type: "canvas";

    /** The canvas element to draw to */
    canvas: HTMLCanvasElement;

    /** Various debug flags */
    debug?: {
        /** Render empty chunks as psuedo-random colors */
        chunk?: boolean;

        /**
         * Show chunks' progress when initially filling with data
         * Used to reduce impact of slow frames when crossing chunk boundaries
         */
        fill?: boolean;
    };

    /**
     * MS to wait before deleting an unused chunk
     * Defaults to 1000ms
     */
    debounce?: number;

    /**
     * Maximum amount of time to allocate to initially allocate to filling chunks
     * Defaults to 5ms
     */
    fperiod?: number;
};

export type canvas_ctx = {
    type: "canvas";

    /** The 2D rendering context for the canvas */
    ctx: CanvasRenderingContext2D;
};

function compile(
    renderer: canvas_render,
    grid: _grids.grid_t,
): _renders.base_renderer<canvas_ctx> {
    return new crender.CanvasRender(renderer, grid);
}

// Register renderer
renders.register({
    type: "canvas",
    compile,
});

declare module "../../render_types.js" {
    interface render_registry {
        canvas: {
            user: canvas_render;
            ctx: canvas_ctx;
            inter: crender.CanvasRender;
        };
    }
}
