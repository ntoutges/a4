/**
 * @file quantum.ts
 * @description Quantum rule, used to run multiple rules in parallel in a single step
 * @author Nicholas T.
 * @copyright 2026 PiCO
 */

import * as rules from "../../rules.js";

import * as _rules from "../../rule_types.js";
import * as _grids from "../../grid_types.js";

type quantum_rule = {
    type: "quantum";
    max?: number;
} & (
    | {
          weighted?: false;
          rules: _rules.rule_t[];
      }
    | {
          weighted: true;
          rules: { rule: _rules.rule_t; weight: number }[];
      }
);

export type quantum_compiled = {
    /** The list of compiled rules */
    rules: {
        /** The compiled rule to randomly apply */
        rule: _rules.frule_t;

        /** The weight of this rule; Garunteed to be > 0 */
        weight: number;
    }[];

    /** The total summed weight of all rules */
    weight: number;

    /** The maximum number of child rules to attempt to run; >= 0 */
    max: number;
} & _rules.base_rule;

function compile(rule: quantum_rule): quantum_compiled {
    // Degenerate case: No child rules, return empty compiled rule
    if (rule.rules.length === 0) {
        return {
            rules: [],
            max: 0,
            weight: 0,
            metadata: {
                minX: 0,
                minY: 0,
                maxX: 0,
                maxY: 0,
            },
        };
    }

    // Compile all child rules and weights
    const compiledRules: quantum_compiled["rules"] = [];
    let totalWeight = 0;
    if (!rule.weighted) {
        // Push all rules with the default weight
        for (const r of rule.rules) {
            compiledRules.push({
                rule: rules.compile(r),
                weight: 1,
            });
        }

        totalWeight = compiledRules.length;
    } else {
        // Push all rules with their specified weights
        for (const rw of rule.rules) {
            if (rw.weight === 0) continue; // Skip rules with 0 weight; Disabled!

            if (rw.weight < 0) {
                throw new Error(
                    `Invalid weight ${rw.weight} for rule ${rw.rule.type} in quantum rule; Weights must be > 0`,
                );
            }

            compiledRules.push({
                rule: rules.compile(rw.rule),
                weight: rw.weight,
            });

            totalWeight += rw.weight;
        }
    }

    // Compute the bounding box that encompasses all child rules
    // Note that this bounding box is setup s.t. if any child rule's bounding box is within bounds,
    // the entire quantum rule is executed.
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

    let max = rule.max ?? compiledRules.length;
    if (max < 0) max += compiledRules.length; // Support negative max values, which indicate last `|max|` rules

    return {
        rules: compiledRules,
        max: max,
        weight: totalWeight,
        metadata: {
            minX: minX,
            minY: minY,
            maxX: maxX,
            maxY: maxY,
        },
    };
}

function exec(
    rule: quantum_compiled,
    x: number,
    y: number,
    grid: Readonly<_grids.grid_slice_t>,
    reserved: ReadonlySet<number>,
): _rules.cdiff[] | null {
    // Variables used to prevent repeats
    const blacklist: Set<number> = new Set(); // Set of cell indices that have already been tried
    let blacklistWeight = 0; // The total weight of all rules in the blacklist

    // Loop up-to `rule.max` times
    for (let i = 0; i < rule.max; i++) {
        // Randomly select a child rule based on weights
        const rand = Math.random() * (rule.weight - blacklistWeight);

        // Find the selected rule based on the random number and weights
        let accWeight = 0;
        let ruleI = -1; // The index of the selected rule in `rule.rules`
        for (const i in rule.rules) {
            const r = rule.rules[i];
            if (blacklist.has(rule.rules.indexOf(r))) continue; // Skip rules in the blacklist
            accWeight += r.weight;

            // Found the selected rule
            if (accWeight >= rand) {
                ruleI = +i;
                break;
            }
        }

        // Out of rules to select from, break loop
        if (ruleI === -1) break;

        // Attempt to run child rule
        const r = rule.rules[ruleI];

        // Check bounding box of rule
        // If invalid: try again
        const metadata = r.rule.data.metadata;
        if (
            (!grid.wrap.x &&
                (x + metadata.minX < 0 || x + metadata.maxX > grid.width)) ||
            (!grid.wrap.y &&
                (y + metadata.minY < 0 || y + metadata.maxY > grid.height))
        ) {
            blacklist.add(ruleI);
            blacklistWeight += r.weight;
            continue;
        }

        const diffs = rules.execute(r.rule, x, y, grid, reserved);

        // Child rule failed to execute, add to blacklist and update blacklist weight
        let valid = true;

        // Rule failed to run
        if (!diffs) {
            valid = false;
        } else {
            // Rule ran successfully, check if any diffs step on `reserved` cells
            for (const diff of diffs) {
                const cellIndex = grid.index(x + diff.x, y + diff.y);

                // Rule steps on a reserved cell, invalid
                if (reserved.has(cellIndex)) {
                    valid = false;
                    break;
                }
            }
        }

        // Child rule executed successfully, return resulting diffs
        if (valid) {
            return diffs;
        }

        // Rule is invalid, add to blacklist and update blacklist weight
        blacklist.add(ruleI);
        blacklistWeight += r.weight;
    }

    // No rule succeeded, return null to indicate failure
    return null;
}

// +---------------+
// | Register rule |
// +---------------+
declare module "../../rule_types.js" {
    interface rule_registry {
        quantum: {
            user: quantum_rule;
            comp: quantum_compiled;
        };
    }
}

rules.register({
    type: "quantum",
    compile,
    exec,
});
