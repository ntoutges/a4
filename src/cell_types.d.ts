/** Registry of all registered cell types for type validation */
export interface cell_registry {}

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
