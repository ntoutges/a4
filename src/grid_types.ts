import * as cells from "./cell_types";
import * as diffs from "./diff_types";

export type grid_options_t = {
    // Whether to wrap around the x and y axes when accessing cells out of bounds, defaulting to false (no wrapping)
    wrapX?: boolean;
    wrapY?: boolean;

    // Padding allowing rules to explicitly access out-of-bounds cells, defaulting to 0 (no padding)
    padN?: number;
    padS?: number;
    padE?: number;
    padW?: number;
};

/**
 * Contains the entire state of the cell grid at a given time
 */
export interface grid_t {
    /** The width of the cell grid */
    readonly width: number;

    /** The height of the cell grid */
    readonly height: number;

    /** Wrap options */
    readonly wrap: Readonly<{
        /** Whether to wrap around the x axis */
        x: boolean;

        /** Whether to wrap around the y axis */
        y: boolean;
    }>;

    readonly padding: Readonly<{
        /** Padding above the grid */
        n: number;

        /** Padding below the grid */
        s: number;

        /** Padding to the right of the grid */
        e: number;

        /** Padding to the left of the grid */
        w: number;
    }>;

    /**
     * Get a cell from the grid at the given coordinates
     * @param x The x coordinate of the cell to get
     * @param y The y coordinate of the cell to get
     * @return The cell at the given coordinates, or a default out-of-bounds value if the coordinates are out of bounds
     */
    cell(x: number, y: number): Readonly<cells.fcell_t>;

    /** Get a slice of the grid */
    slice(x: number, y: number, width: number, height: number): grid_slice_t;

    /**
     * Get the unique id of a cell in the grid at the given coordinates, relative to the top-left corner of the grid.
     * @param x
     * @param y
     * @returns A unique id for the cell at the given coordinates, used for tracking reserved cells during rule execution
     */
    index(x: number, y: number): number;

    /**
     * Write a cell value to the grid at the given coordinates
     * @param x The x coordinate to write the cell value to
     * @param y The y coordinate to write the cell value to
     * @param cell  The cell value to write to the grid
     */
    write(x: number, y: number, cell: cells.fcell_t): void;

    /**
     * Get the differences since the last `cldiff` command
     * @returns The internal diffs. Do _NOT_ attempt to modify these values
     */
    diffs(): Required<diffs.diffs>;

    /**
     * Clear diff list
     */
    cldiff(): void;
}

/**
 * Representse a slice of the cell grid, used for rules that need to access multiple cells at once
 */
export interface grid_slice_t extends Omit<
    grid_t,
    "slice" | "write" | "diffs" | "cldiff"
> {}
