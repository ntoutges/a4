import * as cells from "./cell_types.js";
import * as grids from "./grid_types.js";

/** Registry of all registered render types for type validation */
export interface render_registry {}

export type render_t = {
    [K in keyof render_registry]: render_registry[K]["user"];
}[keyof render_registry];

export type frender_t = {
    [K in keyof render_registry]: {
        renderer: render_registry[K]["user"];
        ctx: render_registry[K]["ctx"];
    };
}[keyof render_registry];

export type sfrender_t = {
    [K in keyof render_registry]: {
        renderer: render_registry[K]["user"];
        ctx: render_registry[K]["ctx"];
    };
};

export type pre_t = {
    /**
     * If `true`: Every cell in the grid is rendered
     * Otehrwise: Only cells that have changed since the last frame are rendered
     */
    full: boolean;
};

/**
 * Represents a renderer for rendering cells to some target
 * @template T The context type passed into cells when rendering
 */
export interface base_renderer<T extends { type: string }> {
    /**
     * Passed into cells when rendering to allow cells to render themselves using the renderer's context
     */
    readonly context: T;

    /**
     * Run before rendering any cells, on every frame
     * @param renderer  The renderer to run pre-rendering logic for
     * @returns         Information about how to render the grid
     */
    pre(grid: grids.grid_slice_t): pre_t;

    /**
     * Render a cell to some target
     * @param x     The x coordinate of the cell to render, in grid coordinates
     * @param y     The y coordinate of the cell to render, in grid coordinates
     * @param cell  The cell to render
     */
    render(x: number, y: number, cell: cells.fcell_t): boolean;

    /**
     * Run after rendering all cells, on every frame
     * @param renderer  The renderer to run post-rendering logic for
     * @param rlen  The number of cells rendered in the current frame
     */
    post(rlen: number): void;
}

/**
 * The type of data to be registered when registering a renderer
 * @template R The type of the user-friendly renderer used to compile the renderer
 * @template C The type of the renderer's compiled data
 * @template T The context type passed into cells when rendering
 */
export type Renderer<R, T extends { type: string }> = {
    readonly type: string;

    /**
     * Compile a user-friendly renderer for runtime use
     * @param renderer  The user-friendly renderer to compile
     * @return The computer-friendly compiled renderer to be used at runtime
     */
    compile(renderer: R): base_renderer<T>;
};
