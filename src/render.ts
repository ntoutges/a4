/**
 * @file render.ts
 * @description Home for all rendering-related compilation and instantation
 * @author Nicholas T.
 * @copyright 2026 PiCO
 */

import * as _renders from "./render_types.js";
import * as _grids from "./grid_types.js";

/** Registry containing all registered renderers */
const registry = new Map<string, any>();

/**
 * Register a renderer to be used in the automata system
 * @param renderer  The renderer to register
 */
export function register(renderer: _renders.Renderer<any, any>): void {
    const type = renderer.type.toLowerCase(); // Normalize rule name

    if (registry.has(type)) {
        console.warn(
            `Rule with type ${renderer.type} is already registered, skipping`,
        );
        return;
    }

    registry.set(type, renderer);
}

/**
 * Compile a renderer to be used for rendering cells
 * @param renderer  The renderer to compile
 * @returns         The compiled renderer to be used for rendering cells
 *
 * @template T The type of renderer to compile, used for type inference
 */
export function compile<T extends _renders.render_t["type"]>(
    renderer: _renders.frender_type_t<T>["renderer"],
    grid: _grids.grid_t,
): _renders.frender_type_t<T>["inter"] {
    const type = renderer.type.toLowerCase();

    if (!registry.has(type)) {
        throw new Error(`Renderer with type ${type} is not registered`);
    }

    const renderer_data = registry.get(type);
    return renderer_data.compile(renderer, grid);
}

/**
 * Render a grid using a renderer
 * @param renderer  The renderer to use for rendering the grid
 * @param grid      The grid to render
 */
export function render(renderer: _renders.base_renderer<any>): void {
    const grid = renderer.grid;

    const preData = renderer.pre();
    let rlen: number;

    if (preData.full) {
        // Render every cell in the grid
        for (let y = 0; y < grid.height; y++) {
            for (let x = 0; x < grid.width; x++) {
                renderer.render(x, y, grid.cell(x, y));
            }
        }

        rlen = grid.width * grid.height;
    } else {
        const diffs = grid.diffs().cdiffs;

        // Only render cells that have changed since the last frame
        for (const diff of diffs) {
            renderer.render(diff.x, diff.y, diff.to);
        }

        rlen = diffs.length;
    }

    renderer.post(rlen);
}
