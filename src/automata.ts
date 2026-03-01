/**
 * @file automata.ts
 * @description Main logic for the automata system, including core functionality
 * @author Nicholas T.
 * @copyright 2026 PiCO
 */

import * as rules from "./rules.js";
import * as cells from "./cells.js";
import * as grid from "./grid.js";
import * as _grids from "./grid_types.js";
import * as _rules from "./rule_types.js";
import * as _cells from "./cell_types.js";

/**
 * Executes a single step of the automata system, applying the given rule to the given grid and
 * updating the grid based on the resulting cell differences. Note that the grid is modified in-place by this function.
 * @param grid  The cell grid to apply the rule to
 * @param rule  The rule to apply to the grid
 */
export function step(grid: _grids.grid_t, rule: _rules.frule_t): void {
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
    grid: Readonly<_grids.grid_slice_t>,
    rule: _rules.frule_t,
): _rules.cdiff[] {
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
    const allDiffs: _rules.cdiff[] = [];

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
function apply(grid: _grids.grid_t, diffs: _rules.cdiff[]) {
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
    grid: _grids.grid_slice_t,
    x: number,
    y: number,
): number {
    return y * grid.width + x;
}
