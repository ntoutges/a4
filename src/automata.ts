/**
 * @file automata.ts
 * @description Main logic for the automata system, including core functionality
 * @author Nicholas T.
 * @copyright 2026 PiCO
 */

import * as rules from "./rules.js";
import * as _grids from "./grid_types.js";
import * as _rules from "./rule_types.js";
import * as _cells from "./cell_types.js";
import * as _diffs from "./diff_types.js";

/**
 * Executes a single step of the automata system, applying the given rule to the given grid and
 * updating the grid based on the resulting cell differences. Note that the grid is modified in-place by this function.
 * @param grid  The cell grid to apply the rule to
 * @param rule  The rule to apply to the grid
 */
export function step(grid: _grids.grid_t, rule: _rules.frule_t): void {
    // Deterministic rule + repeated state => no changes, able to skip entire step
    if (
        rule.data.metadata.optim.deterministic &&
        grid.diffs().cdiffs.length === 0
    ) {
        return;
    }

    grid.chdiff(); // Update cache

    const diffs = execute(grid, grid.diffs(), rule);

    grid.cldiff(); // Clear old diffs for this tick
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
    grid: Readonly<_grids.readonly_grid_t>,
    diffs: Required<_diffs.diffs>,
    rule: _rules.frule_t,
): Required<_diffs.diffs> {
    // Metadata describing how the rule is executed
    const metadata = rule.data.metadata;

    // Run preexec
    const preexec = rules.preexec(rule, grid, diffs);

    // Precompute the bounds of the area where rule can be run based on the rule metadata and grid size, to
    // Ensure the rule is only run on areas where it is guaranteed to be valid and not go out of bounds of the grid
    const minY = grid.wrap.y ? 0 : metadata.minY - grid.padding.n;
    const maxY = grid.wrap.y
        ? grid.height - 1
        : grid.height - metadata.maxY + grid.padding.s;
    const minX = grid.wrap.x ? 0 : metadata.minX - grid.padding.w;
    const maxX = grid.wrap.x
        ? grid.width - 1
        : grid.width - metadata.maxX + grid.padding.e;

    // Store all cell differences resulting from running the rule on the grid
    const allDiffs: Required<_diffs.diffs> = {
        cdiffs: [],
    };

    // Keep track of all cell differences resulting from running the rule on the grid
    // Prevents 1 cell from being modified multiple times in the same step
    const reserved: Set<number> = new Set();

    // Run on all bounds
    if (preexec.bbox.mode === _rules.bbox_modes.ALL) {
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                subexec(rule, x, y, grid, reserved, allDiffs);
            }
        }
    } else {
        // Run through rectangular points
        if (
            preexec.bbox.mode === _rules.bbox_modes.RECT ||
            preexec.bbox.mode === _rules.bbox_modes.HYBRID
        ) {
            const bminX = Math.max(preexec.bbox.minX, minX);
            const bminY = Math.max(preexec.bbox.minY, minY);
            const bmaxX = Math.min(preexec.bbox.maxX, maxX);
            const bmaxY = Math.min(preexec.bbox.maxY, maxY);

            for (let y = bminY; y <= bmaxY; y++) {
                for (let x = bminX; x <= bmaxX; x++) {
                    subexec(rule, x, y, grid, reserved, allDiffs);
                }
            }
        }

        // Run through direct points
        if (
            preexec.bbox.mode === _rules.bbox_modes.POINTS ||
            preexec.bbox.mode === _rules.bbox_modes.HYBRID
        ) {
            for (const { x, y } of preexec.bbox.points) {
                if (x < minX || x > maxX || y < minY || y > maxY) continue; // Skip points that are out-of-bounds
                subexec(rule, x, y, grid, reserved, allDiffs);
            }
        }
    }

    return allDiffs;
}

/**
 * Execute some rule at a specific point, updating the diffs as required
 * @param rule  The rule to run
 * @param x     The position to run the rule at
 * @param y     The position to run the rule at
 * @param grid  The grid the rule is run on
 * @param diffs     The diffs from previous cells, to modify
 * @param reserved  The set of reserved (already-modified) cells
 * @returns `true` this rule succeeded at running, `false` otherwise
 */
function subexec(
    rule: _rules.frule_t,
    x: number,
    y: number,
    grid: Readonly<_grids.grid_slice_t>,
    reserved: Set<number>,
    allDiffs: Required<_diffs.diffs>,
): boolean {
    const diffs = rules.execute(rule, x, y, grid, reserved);
    if (!diffs) return false; // Rule failed to execute at this location, skip

    const cdiffs = diffs.cdiffs;

    // Make copies of cdiff objects to avoid modifying the original diffs returned by the rule execution
    for (const i in cdiffs) {
        cdiffs[i] = { ...cdiffs[i] };
    }

    // Check if any diffs step on `reserved` cells
    // If so: the entire rule is invalid at this location, skip
    for (const cdiff of cdiffs) {
        // Update diff coordinates to be absolute rather than relative to the rule origin
        cdiff.x += x;
        cdiff.y += y;

        const key = getReservationKey(grid, x, y);

        // This diff steps on a reserved cell, skip
        if (reserved.has(key)) return false;
    }

    // Success! Apply all new diffs to allDiffs

    // Add all cdiffs to tracked diffs
    for (const cdiff of cdiffs) {
        const key = getReservationKey(grid, cdiff.x, cdiff.y);
        reserved.add(key);
        allDiffs.cdiffs.push(cdiff);
    }

    return true;
}

/**
 * Apply a set of differences to a cell grid, modifying the grid in-place.
 * @param grid  The grid to modify
 * @param diffs The cell differences to apply to the grid
 */
function apply(grid: _grids.grid_t, diffs: Required<_diffs.diffs>) {
    // Apply all cell diffs
    for (const cdiff of diffs.cdiffs) {
        grid.write(cdiff.x, cdiff.y, cdiff.to);
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
