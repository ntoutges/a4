/**
 * @file cells.ts
 * @description Core cell functionality and useful utility functions
 * @author Nicholas T.
 * @copyright 2026 PiCO
 */

import { Cell, fcell_t, cell_t } from "./cell_types.js";

/** Registry of all registered cell types for type validation */
export interface registry {}

/** Registry containing all registered cells */
const registry = new Map<string, Cell<any, any, any>>();

export function register(cell: Cell<any, any, any>): void {
    const type = cell.type.toLowerCase(); // Normalize cell name

    if (registry.has(type)) {
        console.warn(`Rule with type ${type} is already registered, skipping`);
        return;
    }

    registry.set(type, cell);
}

/**
 * Evaluates `a == b` for two cells, used for rule matching
 * @param a
 * @param b
 */
export function equals(a: Readonly<fcell_t>, b: Readonly<fcell_t>): boolean {
    return a.cell.type === b.cell.type
        ? a.cell.eq(a.data as any, b.data as any)
        : false;
}

/**
 * Evaluates `a > b` for two cells, used for rule matching
 * @param a
 * @param b
 */
export function gt(a: Readonly<fcell_t>, b: Readonly<fcell_t>): boolean {
    return a.cell.type === b.cell.type
        ? a.cell.gt(a.data as any, b.data as any)
        : false;
}

/**
 * Evaluates `a < b` for two cells, used for rule matching
 * @param a
 * @param b
 */
export function lt(a: Readonly<fcell_t>, b: Readonly<fcell_t>): boolean {
    return a.cell.type === b.cell.type
        ? a.cell.lt(a.data as any, b.data as any)
        : false;
}

/**
 * Checks if cell `b` matches the requirements of cell `a`, used for rule matching
 * @param a
 * @param b
 */
export function matches(a: Readonly<fcell_t>, b: Readonly<fcell_t>): boolean {
    return a.cell.matches(a.data as any, b);
}

/**
 * Compile a user-friendly cell for runtime use
 * @param cell  The user-friendly cell to compile
 * @returns     The computer-friendly compiled cell to be used at runtime
 */
export function compile(cell: Readonly<cell_t>): fcell_t {
    const type = cell.type.toLowerCase(); // Normalize cell name

    const cell_data = registry.get(type);
    if (!cell_data) {
        throw new Error(`Cell with type ${type} is not registered`);
    }

    return {
        cell: cell_data,
        data: cell_data.compile(cell),
    };
}

/**
 * Check if an uncompiled cell is quantum or not
 * @param cell  The uncompiled cell data to check
 * @returns     True if the cell is quantum, false otherwise
 */
export function isQuantum(cell: Readonly<cell_t>): boolean {
    const cell_data = registry.get(cell.type);
    if (!cell_data) {
        throw new Error(`Cell with type ${cell.type} is not registered`);
    }

    return cell_data.quantum ?? false;
}
