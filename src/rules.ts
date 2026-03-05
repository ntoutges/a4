/**
 * @file rules.ts
 * @description Core rule functionality and useful utility functions
 * @author Nicholas T.
 * @copyright 2026 PiCO
 */

import * as _rules from "./rule_types.js";
import * as _grids from "./grid_types.js";
import * as _diffs from "./diff_types.js";

/** Registry containing all registered rules */
const registry = new Map<string, _rules.Rule<any, any>>();

/**
 * Register a rule to be used in the automata system
 * @param rule  The rule to register
 */
export function register<R, C extends _rules.base_rule>(
    rule: _rules.Rule<R, C>,
): void {
    const type = rule.type.toLowerCase(); // Normalize rule name

    if (registry.has(type)) {
        console.warn(`Rule with type ${rule} is already registered, skipping`);
        return;
    }

    registry.set(type, rule);
}

/**
 * Calculate a cache bounding box from a normal bounding box
 * @returns A cached bounding box. Points in the rectangle are _garunteed_ not to exist in the points set
 * @param bbox  The bounding box to start with
 */
export function cache_bbox(
    bbox: _rules.bbox_t,
    grid: _grids.grid_slice_t,
): _rules.cbbox_t {
    const safe_bbox = merge_bbox([bbox]); // Remove duplicate points/useless info

    if (safe_bbox.mode === _rules.bbox_modes.ALL) {
        return { all: true };
    }

    const points = new Set<number>();

    // Calculate all required points
    if (
        safe_bbox.mode === _rules.bbox_modes.POINTS ||
        safe_bbox.mode === _rules.bbox_modes.HYBRID
    ) {
        for (const point of safe_bbox.points) {
            points.add(grid.index(point.x, point.y));
        }
    }

    let minX = -1;
    let minY = -1;
    let maxX = 0;
    let maxY = 0;

    // Fill in bounding box
    if (
        safe_bbox.mode === _rules.bbox_modes.RECT ||
        safe_bbox.mode === _rules.bbox_modes.HYBRID
    ) {
        minX = safe_bbox.minX;
        minY = safe_bbox.minY;
        maxX = safe_bbox.maxX;
        maxY = safe_bbox.maxY;
    }

    return {
        all: false,
        points: points,
        rect: {
            minX,
            minY,
            maxX,
            maxY,
        },
    };
}

/**
 * Merge some set of bounding boxes into a single bounding box object
 * @param boxes The list of bounding boxes to merge
 */
export function merge_bbox(bboxes: _rules.bbox_t[]): _rules.bbox_t {
    if (bboxes.length === 0) return { mode: _rules.bbox_modes.ALL }; // Default to `all` if no bounding boxes given

    const points: { x: number; y: number }[] = [];

    // Store final full bounding box
    let minX: number = Infinity;
    let minY: number = Infinity;
    let maxX: number = -Infinity;
    let maxY: number = -Infinity;

    // Store bounding box of all points
    let pminX: number = Infinity;
    let pminY: number = Infinity;
    let pmaxX: number = -Infinity;
    let pmaxY: number = -Infinity;

    for (const bbox of bboxes) {
        if (bbox.mode === _rules.bbox_modes.ALL) {
            return { mode: _rules.bbox_modes.ALL };
        }

        // Expand bbox to include sub bbox
        if (
            bbox.mode === _rules.bbox_modes.RECT ||
            bbox.mode === _rules.bbox_modes.HYBRID
        ) {
            minX = Math.min(minX, bbox.minX);
            minY = Math.min(minY, bbox.minY);
            maxX = Math.max(maxX, bbox.maxX);
            maxY = Math.max(maxY, bbox.maxY);
        }

        // Expand bbox to include all points
        if (
            bbox.mode === _rules.bbox_modes.POINTS ||
            bbox.mode === _rules.bbox_modes.HYBRID
        ) {
            for (const point of bbox.points) {
                pminX = Math.min(pminX, point.x);
                pminY = Math.min(pminY, point.y);
                pmaxX = Math.max(pmaxX, point.x);
                pmaxY = Math.max(pmaxY, point.y);

                // Track points for later use
                points.push(point);
            }
        }
    }

    const width = maxX - minX + 1;
    const dedupedIndices = new Set<number>();

    // Remove any redundant points
    for (let i = points.length - 1; i >= 0; i--) {
        const point = points[i];

        // Remove any points within the final bounding box (redundant)
        if (
            point.x >= minX &&
            point.x <= maxX &&
            point.y >= minY &&
            point.y <= maxY
        ) {
            points.splice(i, 1);
            continue;
        }

        // Remove any duplicate points
        const index = point.x + point.y * width;
        if (dedupedIndices.has(index)) {
            points.splice(i, 1);
            continue;
        }

        dedupedIndices.add(index);
    }

    // Only bounding box
    if (points.length === 0) {
        return {
            mode: _rules.bbox_modes.RECT,
            minX,
            maxX,
            minY,
            maxY,
        };
    }

    // Only points
    if (minX === Infinity) {
        return {
            mode: _rules.bbox_modes.POINTS,
            points: points,
        };
    }

    // Multiple bounding boxes with points, return hybrid
    return {
        mode: _rules.bbox_modes.HYBRID,
        minX,
        maxX,
        minY,
        maxY,
        points: points,
    };
}

/**
 * Compile a user-friendly rule for runtime use
 * @param rule  The user-friendly rule to compile
 * @returns     The computer-friendly compiled rule to be used at runtime
 */
export function compile(rule: Readonly<_rules.rule_t>): _rules.frule_t {
    const type = rule.type.toLowerCase(); // Normalize rule name

    const rule_data = registry.get(type);
    if (!rule_data) {
        throw new Error(`Rule with type ${type} is not registered`);
    }

    return rule_data.compile(rule_data, rule);
}

/**
 * Run a rule on a cell grid at a specific location, returning the resulting cell differences to be applied to the grid.
 * @param rule  The compiled rule to run on the grid
 * @param x     The x-coordinate of the location to run the rule at
 * @param y     The y-coordinate of the location to run the rule at
 * @param grid  The grid to run the rule on
 * @param diffs  A set of cell positions that have already been modified by this rule in the current step, used to prevent multiple modifications to the same cell in the same step
 * @returns     The cell differences resulting from running the rule on the grid at the specified location
 */
export function execute(
    rule: _rules.frule_t,
    x: number,
    y: number,
    grid: Readonly<_grids.grid_slice_t>,
    reserved: ReadonlySet<number>,
): _diffs.diffs | null {
    return rule.rule.exec(rule.data as any, x, y, grid, reserved);
}

export function preexec(
    rule: _rules.frule_t,
    grid: Readonly<_grids.grid_slice_t>,
    diffs: Required<_diffs.diffs>,
): _rules.preexec_t {
    return rule.rule.preexec(rule.data as any, grid, diffs);
}
