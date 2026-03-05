import * as cells from "./cell_types.js";

/**
 * Cell difference at some location in the cell grid
 */
export type cdiff = {
    /** The x offset of the cell difference from the rule origin */
    x: number;

    /** The y offset of the cell difference from the rule origin */
    y: number;

    /** The new state of the cell at the offset */
    to: cells.fcell_t;
};

/**
 * Data Differences in the grid data registry
 * @TODO FILL OUT
 */
export type ddiff = {};

export type diffs = {
    /** The Cell DIFFerenecS that this rule declares */
    cdiffs: cdiff[];

    /** The Data DIFFerences that this rule declares */
    ddiffs?: ddiff[];
};
