/**
 * @file types.ts
 * @description Generic interfaces for the automata project
 * @author Nicholas T.
 * @copyright 2026 PiCO
 */

/** Registry of all registered cell types for type validation */
export interface cell_registry {}

/** Registry of all registered rule types for type validation */
export interface rule_registry {}

/**
 * Cell difference at some location in the cell grid
 */
export type cdiff = {
    /** The x offset of the cell difference from the rule origin */
    x: number;

    /** The y offset of the cell difference from the rule origin */
    y: number;

    /** The new state of the cell at the offset */
    to: fcell_t;
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
        grid: Readonly<grid_slice_t>,
        diffs: ReadonlySet<number>,
    ): cdiff[] | null;
};

/**
 * Defines a single cell type in the cell grid
 * @template R  Runtime pre-compiled cell data
 * @template C  Compiled cell data
 */
type DeterministicCell<R, C> = {
    readonly type: string;

    /** Mark cell as deterministic */
    quantum: false;

    /**
     * Compile a user-friendly cell for runtime use
     * @param rule  The user-friendly cell to compile
     * @return     The computer-friendly compiled cell to be used at runtime
     */
    compile(rule: R): C;

    // render(cell: C): void;

    /**
     * Checks if some `b` cell matches the requirements of this `a` cell, used for rule matching
     * @param a The cell data to check
     * @param b The cell data to match against
     * @returns Whether the cell matches the requirements of this cell
     */
    matches(a: Readonly<C>, b: fcell_t): boolean;

    /**
     * Evaluates `a == b` for two cells, used for rule matching
     * @param a
     * @param b
     */
    eq(a: Readonly<C>, b: Readonly<C>): boolean;

    /**
     * Evaluates `a > b` for two cells, used for rule execution
     * @param a
     * @param b
     */
    gt(a: Readonly<C>, b: Readonly<C>): boolean;

    /**
     * Evaluates `a < b` for two cells, used for rule execution
     * @param a
     * @param b
     */
    lt(a: Readonly<C>, b: Readonly<C>): boolean;
};

/**
 * Define the execution function of a quantom cell
 * @template R  Runtime pre-compiled cell data
 * @template C  Compiled cell data
 * @template T  The transformed value of the cell, used for quantum cells.
 */
type QuantumCell<R, C, T extends DeterministicCell<any, any>> = {
    /** Mark cell as quantum */
    quantum: true;

    /**
     * Extract a deterministic value from a quantum cell, used for rule execution
     * @param cell  The cell to extract the value from
     * @returns     The extracted value to be used for rule execution. Note that this _must_ be deterministic
     */
    exec(cell: C): T;
} & DeterministicCell<R, C>;

/**
 * Defines a single cell type in the cell grid
 * @template R  Runtime pre-compiled cell data
 * @template C  Compiled cell data
 * @template T  The transformed value of the cell, used for quantum cells.
 */
export type Cell<R, C, T extends DeterministicCell<R, C>> =
    | DeterministicCell<R, C>
    | QuantumCell<R, C, T>;

export type scope_t = Record<string, cell_t>;

export type cell_t = {
    [K in keyof cell_registry]: cell_registry[K]["user"];
}[keyof cell_registry];

/**
 * Represents a single cell in the cell grid
 */
export type fcell_t = {
    [K in keyof cell_registry]: {
        cell: Cell<cell_registry[K]["user"], cell_registry[K]["comp"], any>;
        data: cell_registry[K]["comp"];
    };
}[keyof cell_registry];

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
 * Contains the entire state of the cell grid at a given time
 */
export type grid_t = {
    /**
     * The cells to execute rules on
     * Stored in the format cells[y][x]
     */
    cells: fcell_t[][];

    /** The width of the cell grid */
    width: number;

    /** The height of the cell grid */
    height: number;

    /** Get a slice of the grid */
    slice(x: number, y: number, width: number, height: number): grid_slice_t;
};

/**
 * Representse a slice of the cell grid, used for rules that need to access multiple cells at once
 */
export type grid_slice_t = {
    /**
     * Get a cell from the grid slice at the given coordinates, relative to the top-left corner of the grid slice
     * @param x
     * @param y
     */
    cell(x: number, y: number): Readonly<fcell_t>;

    /**
     * Get the unique id of a cell in the grid slice at the given coordinates, relative to the top-left corner of the grid slice.
     * @param x
     * @param y
     * @returns A unique id for the cell at the given coordinates, used for tracking reserved cells during rule execution
     */
    index(x: number, y: number): number;

    /** The width of the grid slice */
    width: number;

    /** The height of the grid slice */
    height: number;
};
