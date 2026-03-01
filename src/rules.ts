/**
 * @file rules.ts
 * @description Core rule functionality and useful utility functions
 * @author Nicholas T.
 * @copyright 2026 PiCO
 */

import {
    base_rule,
    cdiff,
    frule_t,
    grid_slice_t,
    Rule,
    rule_t,
} from "./types.js";
export {
    scope_t,
    cdiff,
    fcell_t,
    frule_t,
    rule_t,
    grid_slice_t,
    Rule,
    base_rule,
} from "./types.js";

/** Registry containing all registered rules */
const registry = new Map<string, Rule<any, any>>();

/**
 * Register a rule to be used in the automata system
 * @param rule  The rule to register
 */
export function register<R, C extends base_rule>(rule: Rule<R, C>): void {
    const type = rule.type.toLowerCase(); // Normalize rule name

    if (registry.has(type)) {
        console.warn(`Rule with type ${rule} is already registered, skipping`);
        return;
    }

    registry.set(type, rule);
}

/**
 * Compile a user-friendly rule for runtime use
 * @param rule  The user-friendly rule to compile
 * @returns     The computer-friendly compiled rule to be used at runtime
 */
export function compile(rule: Readonly<rule_t>): frule_t {
    const type = rule.type.toLowerCase(); // Normalize rule name

    const rule_data = registry.get(type);
    if (!rule_data) {
        throw new Error(`Rule with type ${type} is not registered`);
    }

    return {
        rule: rule_data,
        data: rule_data.compile(rule),
    };
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
    rule: frule_t,
    x: number,
    y: number,
    grid: Readonly<grid_slice_t>,
    reserved: ReadonlySet<number>,
): cdiff[] | null {
    return rule.rule.exec(rule.data as any, x, y, grid, reserved);
}
