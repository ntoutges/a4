/**
 * @file lerp.ts
 * @description LERP cell implementation
 * @author Nicholas T.
 * @copyright 2026 PiCO
 */

import * as cells from "../../cells.js";
import * as _cells from "../../cell_types.js";
import { color_compiled } from "../color/color.js";

// Precomputed mode for how to handle bounds
enum lerp_mode {
    COLOR,
}

export type lerp_cell = {
    type: "lerp";

    min: _cells.cell_t;
    max: _cells.cell_t;
};

export type lerp_compiled = {
    mode: lerp_mode;
    min: _cells.fcell_t;
    max: _cells.fcell_t;
} & _cells.base_cell;

// Register rule
function compile(cell: lerp_cell): lerp_compiled {
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

    // Ensure min/max have the same type
    if (min.type !== max.type) {
        throw new Error(
            `Range cell min and max must have the same type, got ${min.type} and ${max.type}`,
        );
    }

    let mode: lerp_mode | null = null;

    // Check for special cases with special handling
    if (min.type === "color" && max.type === "color") {
        mode = lerp_mode.COLOR;
    }

    if (mode === null) {
        throw new Error(
            `Unsupported types for lerp cell min and max: ${min.type} and ${max.type}`,
        );
    }

    const cmin = cells.compile(cell.min);
    const cmax = cells.compile(cell.max);

    return {
        min: cmin,
        max: cmax,
        mode: mode,
        metadata: {
            generating: true,
            descriptor: `range(${cmin.data.metadata.descriptor},${cmax.data.metadata.descriptor})`,
            optim: {
                descmatch: false,
            },
        },
    };
}

function eq(a: lerp_compiled, b: lerp_compiled): boolean {
    return a.metadata.descriptor === b.metadata.descriptor;
}

function gt(a: lerp_compiled, b: lerp_compiled): boolean {
    return (
        a.min.cell.gt(a.min.data as any, b.min.data as any) ||
        (a.min.cell.eq(a.min.data as any, b.min.data as any) &&
            a.max.cell.gt(a.max.data as any, b.max.data as any))
    );
}

function lt(a: lerp_compiled, b: lerp_compiled): boolean {
    return (
        a.min.cell.lt(a.min.data as any, b.min.data as any) ||
        (a.min.cell.eq(a.min.data as any, b.min.data as any) &&
            a.max.cell.lt(a.max.data as any, b.max.data as any))
    );
}

function matches(a: lerp_compiled, b: _cells.fcell_t): boolean {
    switch (a.mode) {
        case lerp_mode.COLOR:
            return matches_color(a, b);
    }

    return false; // How did you get here!?
}

function matches_color(a: lerp_compiled, b: _cells.fcell_t): boolean {
    if (b.cell.type !== "color") return false; // If not a color cell, return false

    const min = a.min.data as color_compiled;
    const max = a.max.data as color_compiled;
    const val = b.data as color_compiled;

    const minR = Math.min(min.r, max.r);
    const maxR = Math.max(min.r, max.r);
    const minG = Math.min(min.g, max.g);
    const maxG = Math.max(min.g, max.g);
    const minB = Math.min(min.b, max.b);
    const maxB = Math.max(min.b, max.b);

    // Perform bounding box check on channels
    // Cheap check to avoid more expensive interpolation factor check if out of bounds
    if (
        val.r < minR ||
        val.r > maxR ||
        val.g < minG ||
        val.g > maxG ||
        val.b < minB ||
        val.b > maxB
    ) {
        return false; // If any channel is out of range, return false
    }

    const deltaR = max.r - min.r;
    const deltaG = max.g - min.g;
    const deltaB = max.b - min.b;

    // Get error margin for interpolation factor based on channel with largest delta (to account for integer rounding)
    const minDelta = Math.min(deltaR, deltaG, deltaB);
    const maxError = 1 / minDelta; // Max error is 1 unit in the channel with largest delta

    // Calculate interpolation factor from each channel
    const kr = (val.r - min.r) / (deltaR + 1);
    const kg = (val.g - min.g) / (deltaG + 1);
    const kb = (val.b - min.b) / (deltaB + 1);

    // Compare all channels' interpolation factors to the average against the max error margin to account for integer rounding
    const k = (kr + kg + kb) / 3; // Average interpolation factor

    if (
        !(
            Math.abs(kr - k) <= maxError &&
            Math.abs(kg - k) <= maxError &&
            Math.abs(kb - k) <= maxError
        )
    ) {
        debugger;
    }

    return (
        Math.abs(kr - k) <= maxError &&
        Math.abs(kg - k) <= maxError &&
        Math.abs(kb - k) <= maxError
    );
}

function execute(cell: lerp_compiled): _cells.fcell_t {
    switch (cell.mode) {
        case lerp_mode.COLOR:
            return execute_color(cell);
    }

    // How did you get here!?
    throw new Error(`Cannot execute range cell with mode ${cell.mode}`);
}

function execute_color(cell: lerp_compiled): _cells.fcell_t {
    const min = cell.min.data as color_compiled;
    const max = cell.max.data as color_compiled;

    const k = Math.random(); // Interpolation factor

    // Generate a random color within the specified range
    const r = Math.floor(k * (max.r - min.r + 1)) + min.r;
    const g = Math.floor(k * (max.g - min.g + 1)) + min.g;
    const b = Math.floor(k * (max.b - min.b + 1)) + min.b;

    return cells.compile({
        type: "color",
        r,
        g,
        b,
    });
}

// Register type
cells.register({
    type: "lerp",
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
        lerp: {
            user: lerp_cell;
            comp: lerp_compiled;
        };
    }
}
