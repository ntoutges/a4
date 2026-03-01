import * as cells from "./cell_types";

/**
 * Contains the entire state of the cell grid at a given time
 */
export type grid_t = {
    /**
     * The cells to execute rules on
     * Stored in the format cells[y][x]
     */
    cells: cells.fcell_t[][];

    /** The width of the cell grid */
    width: number;

    /** The height of the cell grid */
    height: number;

    /** Get a slice of the grid */
    slice(x: number, y: number, width: number, height: number): grid_slice_t;
};

/**
 * Representse a slice of the cell grid, used for rules that need to access multiple cells at once
 */
export type grid_slice_t = {
    /**
     * Get a cell from the grid slice at the given coordinates, relative to the top-left corner of the grid slice
     * @param x
     * @param y
     */
    cell(x: number, y: number): Readonly<cells.fcell_t>;

    /**
     * Get the unique id of a cell in the grid slice at the given coordinates, relative to the top-left corner of the grid slice.
     * @param x
     * @param y
     * @returns A unique id for the cell at the given coordinates, used for tracking reserved cells during rule execution
     */
    index(x: number, y: number): number;

    /** The width of the grid slice */
    width: number;

    /** The height of the grid slice */
    height: number;
};
