/**
 * @file surround.ts
 * @description Surround rule, using string-based pictures to define the surrounding mask in a more user-friendly way
 * @author Nicholas T.
 * @copyright 2026 PiCO
 */

import * as rules from "../../rules.js";
import * as cells from "../../cells.js";

import * as _rules from "../../rule_types.js";
import * as _cells from "../../cell_types.js";
import * as _grids from "../../grid_types.js";
import * as _diffs from "../../diff_types.js";

export type surround_rule = {
    type: "surround";
    mask: string; // Mask indicating the cells to watch
    after: string; // The cell to change to if the rule matches; Defined in the scope

    min?: number;
    max?: number;
} & (
    | {
          weighted?: false;
          scope: Record<string, _cells.cell_t>;
      }
    | {
          weighted: true;
          scope: Record<string, { cell: _cells.cell_t; weight: number }>;
      }
);

enum after_mode {
    CONSTANT, // Precomputed value
    RDYNAMIC, // Value computed at runtime based on some required surrounding cell
    FDYNAMIC, // Value computed at runtime based on some free surrounding cell
    QUANTUM, // Value computed at runtime based on some standalone quantum cell
}

export type surround_compiled = {
    /** The set of all counted cells */
    mask: {
        /** The x-coordinate of this compiled surround rule component */
        x: number;

        /** The y-coordinate of this compiled surround rule component */
        y: number;

        // Used to uniquely identify this component for exact matches
        id: number;

        /** The required cell at this position */
        cell: _cells.fcell_t;

        /** The weight of this compiled surround rule component */
        weight: number;
    }[];

    /**
     * The required cell at the center of the surround rule
     * If provided, this is always at (0, 0) in the local relative coordinate system
     */
    req: _cells.fcell_t | null;

    /** Minimum number of counted cells required (inclusive) */
    min: number;

    /** Maximum number of counted cells allowed (inclusive) */
    max: number;

    /** The cell to change to if the rule matches */
    after:
        | {
              mode: after_mode.CONSTANT;

              /** The cell to change to */
              diff: _diffs.cdiff;
          }
        | {
              mode: after_mode.RDYNAMIC;

              /** The unique identifier of the cell to change to */
              id: number;
          }
        | {
              mode: after_mode.FDYNAMIC;

              /** The relative x-offset of the cell to change to */
              x: number;

              /** The relative y-offset of the cell to change to */
              y: number;
          }
        | {
              mode: after_mode.QUANTUM;

              /** The cell to execute to obtain the cell to change to */
              cell: _cells.fcell_t;
          };
} & _rules.base_rule;

function compile(
    rule_data: _rules.Rule<surround_rule, surround_compiled>,
    rule: surround_rule,
): _rules.frule_t {
    // Determine thresholding
    const min = rule.min ?? -Infinity;
    const max = rule.max ?? Infinity;
    if (max < min) {
        throw new Error(
            `Invalid surround rule: max (${max}) cannot be less than min (${min})`,
        );
    }

    // Tokenize mask
    const pmask = ptokenize(rule.mask);
    const maskTokens = new Set(pmask.flat());

    // Generate unique ids for each token in the mask
    const tokenIds = new Map<string, number>(); // Map from token to unique identifier for that token
    let nextId = 0;
    for (const token of maskTokens) {
        tokenIds.set(token, nextId++);
    }

    // Normalize all scope cells to have weights, and compile scope cells
    // Note: Only keeping track of scope cells that are actually used in the mask, to avoid unnecessary compilation
    const maskCells = new Map<
        string,
        { cell: _cells.fcell_t; weight: number }
    >();

    if (!rule.weighted) {
        for (const key in rule.scope) {
            if (!maskTokens.has(key)) continue; // Skip scope cells that aren't used in the mask

            maskCells.set(key, {
                cell: cells.compile(rule.scope[key]),
                weight: 1,
            });
        }
    } else {
        for (const key in rule.scope) {
            if (!maskTokens.has(key)) continue; // Skip scope cells that aren't used in the mask

            const c = rule.scope[key];
            maskCells.set(key, {
                cell: cells.compile(c.cell),
                weight: c.weight,
            });
        }
    }

    const mask: surround_compiled["mask"] = [];
    let req: _cells.fcell_t | null = null;

    let originX = 0;
    let originY = 0;

    for (const y in pmask) {
        for (const x in pmask[y]) {
            const token = pmask[y][x];
            const c = maskCells.get(token);

            // Token isn't in the scope; Simply a placeholder. Skip!
            if (!c) continue;

            // Don't include central cell in the mask
            // Instead: use as the required cell
            if (token === "@") {
                req = c.cell;
                originX = +x;
                originY = +y;
                continue;
            }

            // Use compiled cells to fill out mask
            mask.push({
                x: +x,
                y: +y,
                id: tokenIds.get(token)!,
                cell: c.cell,
                weight: c.weight,
            });
        }
    }

    // Fill out after field
    let after: surround_compiled["after"];

    // R(equired) Dynamic: Need to read actual cell state during runtime
    if (
        maskCells.has(rule.after) &&
        maskCells.get(rule.after)!.cell.cell.quantum
    ) {
        after = {
            mode: after_mode.RDYNAMIC,
            id: tokenIds.get(rule.after)!,
        };
    }

    // Non-Dynamic; Type known at compile time (Determinstic/Quantum)
    else if (Object.hasOwn(rule.scope, rule.after)) {
        // Get cell type, lazy-compiling cell if required
        const c = maskCells.has(rule.after)
            ? maskCells.get(rule.after)!.cell
            : cells.compile(
                  rule.weighted
                      ? rule.scope[rule.after].cell
                      : rule.scope[rule.after],
              );

        // Use compiled cell to assign type
        if (c.cell.quantum) {
            after = {
                mode: after_mode.QUANTUM,
                cell: c,
            };
        } else {
            after = {
                mode: after_mode.CONSTANT,

                // Diff is always centered at the origin
                diff: {
                    x: 0,
                    y: 0,
                    to: c,
                },
            };
        }
    }

    // F(ree) Dynamic: Type completely unknown
    else {
        if (!maskTokens.has(rule.after)) {
            throw new Error(
                `Invalid surround rule: Unable to find FDYNAMIC after token type "${rule.after}" in mask`,
            );
        }

        // Search for first instance of `rule.after` token for x/y positioning
        let ax = 0;
        let ay = 0;
        outer: for (const y in pmask) {
            for (const x in pmask[y]) {
                if (pmask[y][x] === rule.after) {
                    ax = +x;
                    ay = +y;
                    break outer;
                }
            }
        }

        after = {
            mode: after_mode.FDYNAMIC,
            x: ax - originX,
            y: ay - originY,
        };
    }

    // Adjust all entries by originX/originY
    for (const msk of mask) {
        msk.x -= originX;
        msk.y -= originX;
    }

    return {
        rule: rule_data,
        data: {
            mask: mask,
            min: min,
            max: max,
            req: req,
            after: after,
            metadata: {
                minX: -originX,
                maxX: pmask[0].length - originX,
                minY: -originY,
                maxY: pmask.length - originY,
                optim: {
                    deterministic: true,
                },
            },
        },
    };
}

/**
 * Tokenize a surround rule mask picture into a 2D array of tokens, of the format token[y][x]
 * @param picture   The picture to tokenize
 */
function ptokenize(picture: string): string[][] {
    return picture.split("\n").map((line) => line.trim().split(/\s+/));
}

function preexec(
    rule: surround_compiled,
    grid: Readonly<_grids.grid_slice_t>,
    diffs: Required<_diffs.diffs>,
): _rules.preexec_t {
    // @TODO Be smarter about bbox
    // IE: Only execute on diffs which resulted in a value matching the focused cell
    return {
        bbox: {
            mode: _rules.bbox_modes.ALL,
        },
    };
}

function exec(
    rule: surround_compiled,
    x: number,
    y: number,
    grid: Readonly<_grids.grid_slice_t>,
    reserved: ReadonlySet<number>,
): _diffs.diffs | null {
    // Check required cell
    if (
        rule.req !== null &&
        !rule.req.cell.matches(rule.req.data as any, grid.cell(x, y))
    ) {
        return null; // Fail if required cell both exists _and_ doesn't math
    }

    const qcells = new Map<number, _cells.fcell_t>();

    // Count number of matching `mask` cells
    let acc = 0;
    for (const msk of rule.mask) {
        const targetCell = grid.cell(x + msk.x, y + msk.y);

        // No token yet found for this requirement; Attempt to find one
        if (!qcells.has(msk.id)) {
            // Failed to match required token
            if (!cells.matches(msk.cell, targetCell)) continue;

            // Successfully matched token! Use this to match all subsequent tokens
            qcells.set(msk.id, targetCell);
            acc += msk.weight;
        }
        // Exact token already found for this requirement; Check if it matches
        else if (cells.matches(msk.cell, targetCell)) acc += msk.weight;
    }

    // Rule failed to match within threshold; Skip!
    if (acc < rule.min || acc > rule.max) return null;

    let cdiff: _diffs.cdiff;

    // Apply changes based on `after` mode
    switch (rule.after.mode) {
        case after_mode.CONSTANT:
            cdiff = rule.after.diff;
            break;
        case after_mode.QUANTUM:
            cdiff = {
                x: 0,
                y: 0,
                to: (
                    rule.after.cell.cell as _cells.QuantumCell<any, any, any>
                ).exec(rule.after.cell.data),
            };
            break;
        case after_mode.RDYNAMIC:
            cdiff = {
                x: 0,
                y: 0,
                to: qcells.get(rule.after.id)!,
            };
            break;
        case after_mode.FDYNAMIC:
            cdiff = {
                x: 0,
                y: 0,
                to: grid.cell(x + rule.after.x, y + rule.after.y),
            };
            break;

        default:
            // How did you get here!?
            return null;
    }

    return {
        cdiffs: [cdiff],
    };
}

// +---------------+
// | Register rule |
// +---------------+
declare module "../../rule_types.js" {
    interface rule_registry {
        surround: {
            user: surround_rule;
            comp: surround_compiled;
        };
    }
}

rules.register({
    type: "surround",
    compile,
    preexec,
    exec,
});
