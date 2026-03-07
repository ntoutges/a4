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
        inter: render_registry[K]["inter"];
        ctx: render_registry[K]["ctx"];
    };
}[keyof render_registry];

export type sfrender_t = {
    [K in keyof render_registry]: {
        renderer: render_registry[K]["user"];
        ctx: render_registry[K]["ctx"];
    };
};

export type frender_type_t<T extends render_t["type"]> = {
    [K in keyof render_registry]: render_registry[K]["user"]["type"] extends T
        ? {
              renderer: render_registry[K]["user"];
              inter: render_registry[K]["inter"];
              ctx: render_registry[K]["ctx"];
          }
        : never;
}[keyof render_registry];

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
     * The grid that this renderer renders
     */
    readonly grid: grids.grid_t;

    /**
     * Run before rendering any cells, on every frame
     * @returns         Information about how to render the grid
     */
    pre(): pre_t;

    /**
     * Render a cell to some target
     * @param x     The x coordinate of the cell to render, in grid coordinates
     * @param y     The y coordinate of the cell to render, in grid coordinates
     * @param cell  The cell to render
     */
    render(x: number, y: number, cell: cells.fcell_t): boolean;

    /**
     * Run after rendering all cells, on every frame
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
     * @param grid      The grid to compile the renderer for
     * @return The computer-friendly compiled renderer to be used at runtime
     */
    compile(renderer: R, grid: grids.grid_t): base_renderer<T>;
};
