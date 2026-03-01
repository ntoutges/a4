/**
 * @file grid.ts
 * @description Grid compilation and utility functions for the automata system
 * @author Nicholas T.
 * @copyright 2026 PiCO
 */

import * as cells from "./cells.js";

import * as _grids from "./grid_types.js";
import * as _cells from "./cell_types.js";

/**
 * Create a grid from a 2D array of cell values, compiling the cell values into the internal format used by the automata system.
 * @param value The 2D array of cell values to create the grid from
 * @param fillValue The cell value to use for any cells that are out of bounds
 */
export function compile(
    value: _cells.cell_t[][],
    fillValue: _cells.cell_t,
): _grids.grid_t {
    const height = value.length;
    let width = 0;

    // Find width of grid from the longest row
    for (const row of value) {
        width = Math.max(width, row.length);
    }

    // Fill in any missing cells with the fill value, to ensure all rows have the same length and the grid is rectangular
    for (const row of value) {
        while (row.length < width) {
            row.push(fillValue);
        }
    }

    const compiled = value.map((row) => row.map((cell) => cells.compile(cell))); // Compile all cell values in the grid

    return {
        width,
        height,
        cells: compiled,
        slice: slice.bind(null, compiled, cells.compile(fillValue)),
    };
}

/**
 * Create a new grid filled with some initial cell value
 * @param width     The width of the grid to create
 * @param height    The height of the grid to create
 * @param fillValue The cell value to fill the grid with
 * @returns         The newly created grid filled with the initial cell value
 */
export function fill(
    width: number,
    height: number,
    fillValue: _cells.cell_t,
): _grids.grid_t {
    const compiledFillValue = cells.compile(fillValue);

    const cellsArray = Array.from({ length: height }, () =>
        Array.from({ length: width }, () => compiledFillValue),
    );

    return {
        width,
        height,
        cells: cellsArray,
        slice: slice.bind(null, cellsArray, compiledFillValue),
    };
}

/**
 * Get a slice of the grid at a specific location and size, returning a fill value for any cells that are out of bounds of the grid
 * @param grid
 * @param fillValue
 * @param x
 * @param y
 * @param width
 * @param height
 * @returns
 */
function slice(
    grid: _cells.fcell_t[][],
    fillValue: _cells.fcell_t,
    x: number,
    y: number,
    width: number,
    height: number,
): _grids.grid_slice_t {
    return {
        width,
        height,
        cell: cell.bind(null, grid, x, y, fillValue),
        index: (x1: number, y1: number) => (y + y1) * grid[0].length + (x + x1),
    };
}

/**
 * Get the cell value at a specific location in the grid, returning a fill value if the location is out of bounds
 * @param grid
 * @param xOffset
 * @param yOffset
 * @param fillValue
 * @param x
 * @param y
 * @returns
 */
function cell(
    grid: _cells.fcell_t[][],
    xOffset: number,
    yOffset: number,
    fillValue: _cells.fcell_t,
    x: number,
    y: number,
): _cells.fcell_t {
    return y < 0 || y >= grid.length || x < 0 || x >= grid[0].length
        ? fillValue
        : grid[y + yOffset][x + xOffset];
}
