/**
 * @file automata.ts
 * @description Main logic for the automata system, including core functionality
 * @author Nicholas T.
 * @copyright 2026 PiCO
 */

import * as rules from "./rules.js";
import * as cells from "./cells.js";

import { grid_slice_t, grid_t } from "./types.js";

/**
 * Executes a single step of the automata system, applying the given rule to the given grid and
 * updating the grid based on the resulting cell differences. Note that the grid is modified in-place by this function.
 * @param grid  The cell grid to apply the rule to
 * @param rule  The rule to apply to the grid
 */
export function step(grid: grid_t, rule: rules.frule_t): void {
    const diffs = execute(grid.slice(0, 0, grid.width, grid.height), rule);
    apply(grid, diffs);
}

/**
 * Executes a rule on a cell grid, returning the resulting cell differences to be applied to the grid.
 * Note that the overall grid is not modified by this function
 * @param grid  The cells to apply the rule to
 * @param rule  The rule to apply to the grid
 * @returns     The cell differences resulting from applying the rule to the grid
 */
function execute(
    grid: Readonly<grid_slice_t>,
    rule: rules.frule_t,
): rules.cdiff[] {
    // Metadata describing how the rule is executed
    const metadata = rule.data.metadata;

    // Precompute the bounds of the area to run the rule on based on the rule metadata and grid size, to
    // Ensure the rule is only run on areas where it is guaranteed to be valid and not go out of bounds of the grid
    const minY = metadata.minY;
    const maxY = grid.height - metadata.maxY;
    const minX = metadata.minX;
    const maxX = grid.width - metadata.maxX;

    // Keep track of all cell differences resulting from running the rule on the grid
    // Prevents 1 cell from being modified multiple times in the same step
    const reserved: Set<number> = new Set();

    // Store all cell differences resulting from running the rule on the grid
    const allDiffs: rules.cdiff[] = [];

    yloop: for (let y = minY; y <= maxY; y++) {
        xloop: for (let x = minX; x <= maxX; x++) {
            const diffs = rules.execute(rule, x, y, grid, reserved);
            if (!diffs) continue; // Rule failed to execute at this location, skip

            // Make copies of diff objects to avoid modifying the original diffs returned by the rule execution
            for (const i in diffs) {
                diffs[i] = { ...diffs[i] };
            }

            // Check if any diffs step on `reserved` cells
            // If so: the entire rule is invalid at this location, skip
            check: for (const diff of diffs) {
                // Update diff coordinates to be absolute rather than relative to the rule origin
                diff.x += x;
                diff.y += y;

                const key = getReservationKey(grid, x + diff.x, y + diff.y);

                // This diff steps on a reserved cell, skip
                if (reserved.has(key)) continue xloop;
            }

            // Add all diffs to the result and mark their positions as reserved
            // Note: At this point, all diff coordinates are absolute due to the previous `check` loop
            for (const diff of diffs) {
                const key = getReservationKey(grid, diff.x, diff.y);
                reserved.add(key);
                allDiffs.push(diff);
            }
        }
    }

    return allDiffs;
}

/**
 * Apply a set of differences to a cell grid, modifying the grid in-place.
 * @param grid  The grid to modify
 * @param diffs The cell differences to apply to the grid
 */
function apply(grid: grid_t, diffs: rules.cdiff[]) {
    for (const diff of diffs) {
        // Skip diffs that are out of bounds of the grid, just in case
        if (
            diff.x < 0 ||
            diff.x >= grid.width ||
            diff.y < 0 ||
            diff.y >= grid.height
        ) {
            console.warn(
                `Skipping diff at (${diff.x}, ${diff.y}) as it is out of bounds of the grid`,
            );
            continue;
        }

        grid.cells[diff.y][diff.x] = diff.to;
    }
}

/**
 * Get a unique key for a cell position in the grid, used for tracking reserved cells during rule execution
 * @param grid  The grid to get the reservation key for
 * @param x     The x coordinate of the cell position to get the reservation key for
 * @param y     The y coordinate of the cell position to get the reservation key for
 * @returns     A unique key for the cell position in the grid, used for tracking reserved cells during rule execution
 */
export function getReservationKey(
    grid: grid_slice_t,
    x: number,
    y: number,
): number {
    return y * grid.width + x;
}

// -----------------------------
// TESTING
// -----------------------------

import "./cells/color/color.js";
import "./rules/spatial/spatial.js";
import "./rules/sequence/sequence.js";
import "./rules/quantum/quantum.js";

const sand = {
    type: "color",
    r: 194,
    g: 178,
    b: 128,
} satisfies cells.cell_t;

const air = {
    type: "color",
    r: 0,
    g: 0,
    b: 0,
} satisfies cells.cell_t;

const ruled = {
    type: "spatial",
    before: `@
             A`,
    after: `A
            @`,
    scope: {
        "@": sand,
        A: air,
    },
} satisfies rules.rule_t;

const ruler = {
    type: "spatial",
    before: `@ A
             B A`,
    after: `A A
            B @`,
    scope: {
        "@": sand,
        B: sand,
        A: air,
    },
} satisfies rules.rule_t;

const rulel = {
    type: "spatial",
    before: `A @
             A B`,
    after: `A A
            @ B`,
    scope: {
        "@": sand,
        B: sand,
        A: air,
    },
} satisfies rules.rule_t;

const rule = rules.compile({
    type: "sequence",
    rules: [
        ruled,
        {
            type: "quantum",
            weighted: true,
            rules: [
                {
                    rule: rulel,
                    weight: 1,
                },
                {
                    rule: ruler,
                    weight: 1,
                },
            ],
        },
    ],
});

const cair = cells.compile(air);
const csand = cells.compile(sand);

const dat: grid_t["cells"] = Array.from({ length: 10 }, () =>
    Array.from({ length: 10 }, () => cair),
);

// const dat = [
//     [cair, csand, cair],
//     [cair, csand, cair],
// ];

const grid = {
    width: dat[0].length,
    height: dat.length,
    cells: dat,
    slice: (x, y, width, height) => ({
        width: width,
        height: height,
        cell: (x1: number, y1: number) =>
            x1 < 0 || x1 >= width || y1 < 0 || y1 >= height
                ? cair
                : dat[y + y1][x + x1],
        index: (x1: number, y1: number) => (y + y1) * dat[0].length + (x + x1),
    }),
} satisfies grid_t;

let last = "";
function print() {
    const str = dat
        .map((d) => d.map((c) => (c.data.value === 0 ? "  " : "##")).join(""))
        .join("\n");
    if (str === last) return true;

    console.log(str);
    console.log("----------------");

    last = str;
    return false;
}

print();
const interval = setInterval(() => {
    console.time();
    step(grid, rule);
    console.timeEnd();

    dat[0][Math.floor((dat[0].length - 1) / 2)] = csand;

    if (print()) clearInterval(interval);
}, 500);
