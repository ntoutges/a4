import * as cells from "./cell_types";
import * as grid from "./grid_types";

/** Registry of all registered rule types for type validation */
export interface rule_registry {}

export type rule_t = {
    [K in keyof rule_registry]: rule_registry[K]["user"];
}[keyof rule_registry];

export type frule_t = {
    [K in keyof rule_registry]: {
        rule: Rule<rule_registry[K]["user"], rule_registry[K]["comp"]>;
        data: rule_registry[K]["comp"];
    };
}[keyof rule_registry];

/**
 * Cell difference at some location in the cell grid
 */
export type cdiff = {
    /** The x offset of the cell difference from the rule origin */
    x: number;

    /** The y offset of the cell difference from the rule origin */
    y: number;

    /** The new state of the cell at the offset */
    to: cells.fcell_t;
};

export type base_rule = {
    metadata: {
        /** The minimum x coordinate of the rule's bounding box */
        minX: number;

        /** The minimum y coordinate of the rule's bounding box */
        minY: number;

        /** The maximum x coordinate of the rule's bounding box */
        maxX: number;

        /** The maximum y coordinate of the rule's bounding box */
        maxY: number;
    };
};

/**
 * Used to define rules to run on the cell grid
 * @template R  Runtime pre-compiled rule data
 * @template C  Compiled rule data
 */
export type Rule<R, C extends base_rule> = {
    // Rule name
    readonly type: string;

    /**
     * Compile a user-friendly rule for runtime use
     * @param rule  The user-friendly rule to compile
     * @returns     The computer-friendly compiled rule to be used at runtime
     */
    compile(rule: R): C;

    /**
     * Execute a compiled rule on a cell
     * @param rule    The compiled rule to execute
     * @param cell    The cell to execute the rule on
     * @param x       The x coordinate of the cell to execute the rule on
     * @param y       The y coordinate of the cell to execute the rule on
     * @param grid    The entire cell grid, used for rules that need to access other cells during execution
     * @param diffs   A set of cell positions that have already been modified by this rule in the current step, used to prevent multiple modifications to the same cell in the same step
     * @returns       The cell differences resulting from executing the rule on the cell. If null: rule failed to execute due to unmet requirements, if cdiff: rule executed successfully with the resulting cell difference, if empty array: rule executed successfully with no cell difference
     */
    exec(
        rule: C,
        x: number,
        y: number,
        grid: Readonly<grid.grid_slice_t>,
        diffs: ReadonlySet<number>,
    ): cdiff[] | null;
};
