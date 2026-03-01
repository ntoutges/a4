/**
 * @file range.ts
 * @description Range cell implementation
 * @author Nicholas T.
 * @copyright 2026 PiCO
 */

import * as cells from "../../cells.js";
import * as _cells from "../../cell_types.js";
import { color_compiled } from "../color/color.js";

// Precomputed mode for how to handle bounds
enum range_mode {
    COLOR,
    FALLBACK,
}

export type range_cell = {
    type: "range";

    min: _cells.cell_t;
    max: _cells.cell_t;
};

export type range_compiled = {
    mode: range_mode;
    min: _cells.fcell_t;
    max: _cells.fcell_t;
} & _cells.base_cell;

// Register rule
function compile(cell: range_cell): range_compiled {
    // Expand `min` if range to find actual lower bound
    let min = cell.min;
    while (min.type === "range") {
        min = (min as any).min;
    }

    // Expand `max` if range to find actual upper bound
    let max = cell.max;
    while (max.type === "range") {
        max = (max as any).max;
    }

    let mode: range_mode = range_mode.FALLBACK;

    // Check for special cases with special handling
    if (min.type === "color" && max.type === "color") {
        mode = range_mode.COLOR;
    }

    return {
        min: cells.compile(cell.min),
        max: cells.compile(cell.max),
        mode: mode,
        metadata: {
            generating: mode !== range_mode.FALLBACK, // Range cells only generate if not in fallback mode
        },
    };
}

function eq(a: range_compiled, b: range_compiled): boolean {
    return (
        a.min.cell.eq(a.min.data as any, b.min.data as any) &&
        a.max.cell.eq(a.max.data as any, b.max.data as any)
    );
}

function gt(a: range_compiled, b: range_compiled): boolean {
    return (
        a.min.cell.gt(a.min.data as any, b.min.data as any) ||
        (a.min.cell.eq(a.min.data as any, b.min.data as any) &&
            a.max.cell.gt(a.max.data as any, b.max.data as any))
    );
}

function lt(a: range_compiled, b: range_compiled): boolean {
    return (
        a.min.cell.lt(a.min.data as any, b.min.data as any) ||
        (a.min.cell.eq(a.min.data as any, b.min.data as any) &&
            a.max.cell.lt(a.max.data as any, b.max.data as any))
    );
}

function matches(a: range_compiled, b: _cells.fcell_t): boolean {
    switch (a.mode) {
        case range_mode.COLOR:
            return matches_color(a, b);
        case range_mode.FALLBACK:
            return matches_fallback(a, b);
    }

    return false; // How did you get here!?
}

function matches_color(a: range_compiled, b: _cells.fcell_t): boolean {
    if (b.cell.type !== "color") return matches_fallback(a, b); // If not a color cell, fallback to default matching behavior

    const min = a.min.data as color_compiled;
    const max = a.max.data as color_compiled;
    const val = b.data as color_compiled;

    // Perform range check on each color channel
    return (
        val.r >= min.r &&
        val.r <= max.r &&
        val.g >= min.g &&
        val.g <= max.g &&
        val.b >= min.b &&
        val.b <= max.b
    );
}

/**
 * Perform default range matching behavior by checking if the value is greater than or equal to the minimum and less than or equal to the maximum
 * @param a
 * @param b
 */
function matches_fallback(a: range_compiled, b: _cells.fcell_t): boolean {
    return (
        (a.min.cell.lt(a.min.data as any, b as any) ||
            a.min.cell.eq(a.min.data as any, b as any)) &&
        (a.max.cell.gt(a.max.data as any, b as any) ||
            a.max.cell.eq(a.max.data as any, b as any))
    );
}

function execute(cell: range_compiled): _cells.fcell_t {
    switch (cell.mode) {
        case range_mode.COLOR:
            return execute_color(cell);

        case range_mode.FALLBACK:
            throw new Error("Range cells in fallback mode cannot be executed");
    }
}

function execute_color(cell: range_compiled): _cells.fcell_t {
    const min = cell.min.data as color_compiled;
    const max = cell.max.data as color_compiled;

    // Generate a random color within the specified range
    const r = Math.floor(Math.random() * (max.r - min.r + 1)) + min.r;
    const g = Math.floor(Math.random() * (max.g - min.g + 1)) + min.g;
    const b = Math.floor(Math.random() * (max.b - min.b + 1)) + min.b;

    return cells.compile({
        type: "color",
        r,
        g,
        b,
    });
}

// Register type
cells.register({
    type: "range",
    quantum: true,
    compile,
    eq,
    gt,
    lt,
    matches,
    exec: execute,
});

declare module "../../cell_types.js" {
    interface cell_registry {
        range: {
            user: range_cell;
            comp: range_compiled;
        };
    }
}
