/**
 * @file sequence.ts
 * @description Sequence rule, used to run one of multiple rules in a specific order in a single step
 * @author Nicholas T.
 * @copyright 2026 PiCO
 */

import * as rules from "../../rules.js";

import * as _rules from "../../rule_types.js";
import * as _grids from "../../grid_types.js";
import * as _diffs from "../../diff_types.js";

export type sequence_rule = {
    type: "sequence";
    rules: _rules.rule_t[];
};

export type sequence_compiled = {
    /** The compiled rules to run in sequence */
    rules: {
        /** The compiled rule to randomly apply */
        rule: _rules.frule_t;

        /**
         * The cached bbox of this child rule
         * Valid only after `preexec` is called
         */
        cbbox: _rules.cbbox_t;
    }[];
} & _rules.base_rule;

function compile(
    rule_data: _rules.Rule<sequence_rule, sequence_compiled>,
    rule: sequence_rule,
): _rules.frule_t {
    // Trivial case: No child rules, return empty compiled rule
    if (rule.rules.length === 0) {
        return {
            rule: rule_data,
            data: {
                rules: [],
                metadata: {
                    minX: 0,
                    minY: 0,
                    maxX: 0,
                    maxY: 0,
                },
            },
        };
    }

    // Compile all child rules
    const compiledRules = rule.rules.map((r) => ({
        rule: rules.compile(r),
        cbbox: null!,
    }));

    // Trivial case: Exactly one child rule; Return just that rule
    if (compiledRules.length === 1) {
        return compiledRules[0].rule;
    }

    // Compute the bounding box that encompasses all child rules
    // Note that this bounding box is setup s.t. if any child rule's bounding box is within bounds,
    // the entire sequence rule is executed.
    let minX = -Infinity;
    let minY = -Infinity;
    let maxX = Infinity;
    let maxY = Infinity;

    for (const r of compiledRules) {
        const metadata = r.rule.data.metadata;

        minX = Math.max(minX, metadata.minX);
        minY = Math.max(minY, metadata.minY);
        maxX = Math.min(maxX, metadata.maxX);
        maxY = Math.min(maxY, metadata.maxY);
    }

    return {
        rule: rule_data,
        data: {
            rules: compiledRules,
            metadata: {
                minX: minX,
                minY: minY,
                maxX: maxX,
                maxY: maxY,
            },
        },
    };
}

function preexec(
    rule: sequence_compiled,
    grid: Readonly<_grids.grid_slice_t>,
    diffs: Required<_diffs.diffs>,
): _rules.preexec_t {
    const bboxes: _rules.bbox_t[] = [];

    // Run preexec on all children
    for (const child of rule.rules) {
        const res = rules.preexec(child.rule, grid, diffs);

        // Stash bbox cache in child entry
        child.cbbox = rules.cache_bbox(res.bbox, grid);

        // Stash all bboxes
        bboxes.push(res.bbox);
    }

    return {
        // Merge all child bounding boxes
        bbox: rules.merge_bbox(bboxes),
    };
}

function exec(
    rule: sequence_compiled,
    x: number,
    y: number,
    grid: Readonly<_grids.grid_slice_t>,
    reserved: ReadonlySet<number>,
): _diffs.diffs | null {
    const index = grid.index(x, y);

    // Attempt to run each child rule in sequence
    main: for (const r of rule.rules) {
        // Check position against cached bbox
        // If invalid: try again
        if (
            !(
                r.cbbox.all ||
                r.cbbox.points.has(index) ||
                (x >= r.cbbox.rect.minX &&
                    x <= r.cbbox.rect.maxX &&
                    y >= r.cbbox.rect.minY &&
                    y <= r.cbbox.rect.maxY)
            )
        ) {
            // Outside declared bbox area; Ignore!
            continue;
        }

        // Check bounding box of child rule to see if it is valid to run
        const metadata = r.rule.data.metadata;
        if (
            (!grid.wrap.x &&
                (x + metadata.minX < 0 || x + metadata.maxX > grid.width)) ||
            (!grid.wrap.y &&
                (y + metadata.minY < 0 || y + metadata.maxY > grid.height))
        ) {
            continue;
        }

        // Attempt to run child rule
        const diffs = rules.execute(r.rule, x, y, grid, reserved);

        if (!diffs) continue; // Child rule failed to execute, try next child rule

        // Check if any diffs step on `reserved` cells
        // If so: the entire rule is invalid at this location, try next child rule
        for (const diff of diffs.cdiffs) {
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
    preexec,
    exec,
});
