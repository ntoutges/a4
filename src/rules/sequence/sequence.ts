/**
 * @file sequence.ts
 * @description Sequence rule, used to run one of multiple rules in a specific order in a single step
 * @author Nicholas T.
 * @copyright 2026 PiCO
 */

import * as rules from "../../rules.js";

import * as _rules from "../../rule_types.js";
import * as _grids from "../../grid_types.js";

export type sequence_rule = {
    type: "sequence";
    rules: _rules.rule_t[];
};

export type sequence_compiled = {
    /** The compiled rules to run in sequence */
    rules: _rules.frule_t[];
} & _rules.base_rule;

function compile(rule: sequence_rule): sequence_compiled {
    // Trivial case: No child rules, return empty compiled rule
    if (rule.rules.length === 0) {
        return {
            rules: [],
            metadata: {
                minX: 0,
                minY: 0,
                maxX: 0,
                maxY: 0,
            },
        };
    }

    // Compile all child rules
    const compiledRules = rule.rules.map((r) => rules.compile(r));

    // Compute the bounding box that encompasses all child rules
    // Note that this bounding box is setup s.t. if any child rule's bounding box is within bounds,
    // the entire sequence rule is executed.
    let minX = -Infinity;
    let minY = -Infinity;
    let maxX = Infinity;
    let maxY = Infinity;

    for (const r of compiledRules) {
        const metadata = r.data.metadata;

        minX = Math.max(minX, metadata.minX);
        minY = Math.max(minY, metadata.minY);
        maxX = Math.min(maxX, metadata.maxX);
        maxY = Math.min(maxY, metadata.maxY);
    }

    return {
        rules: compiledRules,
        metadata: {
            minX: minX,
            minY: minY,
            maxX: maxX,
            maxY: maxY,
        },
    };
}

function exec(
    rule: sequence_compiled,
    x: number,
    y: number,
    grid: Readonly<_grids.grid_slice_t>,
    reserved: ReadonlySet<number>,
): _rules.cdiff[] | null {
    // Attempt to run each child rule in sequence
    main: for (const r of rule.rules) {
        // Check bounding box of child rule to see if it is valid to run
        const metadata = r.data.metadata;
        if (
            (!grid.wrap.x &&
                (x + metadata.minX < 0 || x + metadata.maxX > grid.width)) ||
            (!grid.wrap.y &&
                (y + metadata.minY < 0 || y + metadata.maxY > grid.height))
        ) {
            continue;
        }

        // Attempt to run child rule
        const diffs = rules.execute(r, x, y, grid, reserved);

        if (!diffs) continue; // Child rule failed to execute, try next child rule

        // Check if any diffs step on `reserved` cells
        // If so: the entire rule is invalid at this location, try next child rule
        for (const diff of diffs) {
            const cellIndex = grid.index(x + diff.x, y + diff.y);
            if (reserved.has(cellIndex)) continue main;
        }

        return diffs; // Child rule executed successfully, return resulting diffs
    }

    // No rule succeeded, return null to indicate failure
    return null;
}

// +---------------+
// | Register rule |
// +---------------+
declare module "../../rule_types.js" {
    interface rule_registry {
        sequence: {
            user: sequence_rule;
            comp: sequence_compiled;
        };
    }
}

rules.register({
    type: "sequence",
    compile,
    exec,
});
