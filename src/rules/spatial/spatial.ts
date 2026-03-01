/**
 * @file spatial.ts
 * @description Spatial rule, using string-based pictures to define rules in a more user-friendly way
 * @author Nicholas T.
 * @copyright 2026 PiCO
 */

import * as rules from "../../rules.js";
import * as cells from "../../cells.js";

import * as _rules from "../../rule_types.js";
import * as _cells from "../../cell_types.js";
import * as _grids from "../../grid_types.js";

export type spatial_rule = {
    type: "spatial";
    before: string;
    after: string;
    scope: Record<string, _cells.cell_t>;
};

type spatial_compiled = {
    /** Requirements that the original spatial rule must satisfy */
    reqs: {
        /** The x-coordinate of this compiled spatial rule component */
        x: number;

        /** The y-coordinate of this compiled spatial rule component */
        y: number;

        /** The unique identifier of the token at this position */
        id: number;

        /** The required cell at this position */
        cell: _cells.fcell_t;
    }[];

    /** Non-required tokens whose cell types must be gathered */
    frees: {
        /** The x-coordinate of this compiled spatial rule component */
        x: number;

        /** The y-coordinate of this compiled spatial rule component */
        y: number;

        /** The unique identifier of the token at this position */
        id: number;
    }[];

    /** The cell differences that must be applied to the grid */
    diffs: {
        /** Constant cell differences that must be applied to the grid */
        cdiffs: _rules.cdiff[];

        /** Dynamic cell differences that must be applied to the grid */
        ddiffs: {
            /** The x offset of the dynamic cell difference */
            x: number;

            /** The y offset of the dynamic cell difference */
            y: number;

            /** The id of the dynamic cell difference */
            id: number;
        }[];

        /**
         * Quantum cells that must be applied to the grid
         * Stored in the format of (tokenId) => (cell)
         */
        qcells: Record<number, _cells.fcell_t>;
    };
} & _rules.base_rule;

function compile(rule: spatial_rule): spatial_compiled {
    const before = ptokenize(rule.before);
    const after = ptokenize(rule.after);

    // Check if before and after pictures are the same size
    if (
        before.length !== after.length ||
        before[0].length !== after[0].length
    ) {
        throw new Error("Before and after pictures must be the same size");
    }

    // Ensure `before` token has <= 1 "@" token
    if (before.flat().filter((t) => t === "@").length > 1) {
        throw new Error("Before picture cannot have more than one @ token");
    }

    // Extract all tokens from before and after pictures
    const beforeTokens = new Set(before.flat());
    const afterTokens = new Set(after.flat());

    // Map tokens to unique ids, ensuring that tokens in the scope have the same id in both before and after pictures
    const tokenIds = new Map<string, number>();
    let nextId = 0;
    for (const token of beforeTokens) {
        if (!tokenIds.has(token)) tokenIds.set(token, nextId++);
    }
    for (const token of afterTokens) {
        if (!tokenIds.has(token)) tokenIds.set(token, nextId++);
    }

    // Find differences in tokens between before and after pictures
    const diffs = new Map<string, { to: string; x: number; y: number }[]>(); // Map (from) => [{to, x, y}]
    for (let y in before) {
        for (let x in before[y]) {
            const from = before[y][x];
            const to = after[y][x];

            if (from === to) continue; // No change, skip

            if (!diffs.has(from)) diffs.set(from, []);
            diffs.get(from)!.push({
                to,
                x: +x,
                y: +y,
            });
        }
    }

    // @TODO: Update `diffs` to remove identical cells with different tokens

    // Lazy compile required cells
    const scopeCells = new Map<string, _cells.fcell_t>();

    // Parse tokens
    const reqs: spatial_compiled["reqs"] = [];
    const frees: spatial_compiled["frees"] = [];
    const freeSet = new Set<string>();
    let originX = 0;
    let originY = 0;
    for (let y in before) {
        for (let x in before[y]) {
            const token = before[y][x];

            // Extract origin coordinates from "@" token
            if (token === "@") {
                originX = +x;
                originY = +y;
            }

            // Extract required tokens
            if (Object.hasOwn(rule.scope, token)) {
                // Lazy-compile required cell if not already compiled
                if (!scopeCells.has(token))
                    scopeCells.set(token, cells.compile(rule.scope[token]));

                const c = scopeCells.get(token)!;

                reqs.push({
                    id: tokenIds.get(token)!,
                    x: +x,
                    y: +y,
                    cell: c,
                });

                // Only stop if cell is determinstic
                if (!c.cell.quantum) continue;
            }

            // If not required: extract free tokens
            if (afterTokens.has(token) && !freeSet.has(token)) {
                frees.push({
                    id: tokenIds.get(token)!,
                    x: +x,
                    y: +y,
                });
                freeSet.add(token);
                continue;
            }
        }
    }

    // Differentiate between cdiffs and ddiffs
    const cdiffs: spatial_compiled["diffs"]["cdiffs"] = [];
    const ddiffs: spatial_compiled["diffs"]["ddiffs"] = [];
    const qcells: spatial_compiled["diffs"]["qcells"] = {};

    for (const [from, changes] of diffs) {
        for (const { to, x, y } of changes) {
            if (!beforeTokens.has(to) && !Object.hasOwn(rule.scope, to))
                continue; // Unused token; Skip!

            const resolved = !freeSet.has(to);
            const quantum = cells.isQuantum(rule.scope[to]);

            // Can only be cdiff if token is both resolved and deterministic
            if (resolved && !quantum) {
                // Compile cell if required
                if (!scopeCells.has(to))
                    scopeCells.set(to, cells.compile(rule.scope[to]));

                cdiffs.push({
                    x,
                    y,
                    to: scopeCells.get(to)!,
                });
                continue;
            }

            const tokenId = tokenIds.get(to)!;

            // Only need to track cell if not already pulling from a free token
            if (resolved) {
                // Compile cell if required
                if (!scopeCells.has(to))
                    scopeCells.set(to, cells.compile(rule.scope[to]));

                // Attempt to add cell to qcells
                if (!Object.hasOwn(qcells, tokenId)) {
                    const qcell = scopeCells.get(to)!;
                    qcells[tokenId] = qcell;

                    // Check if cell is generating
                    // If not: throw error, as non-generating quantum cells cannot be used to generate states
                    if (!qcell.data.metadata.generating) {
                        throw new Error(
                            `Non-generating quantum cell ${qcell.cell.type} [${to}] cannot be used to generate states`,
                        );
                    }
                }
            }

            // Dynamic cell difference
            ddiffs.push({
                id: tokenId,
                x,
                y,
            });
        }
    }

    // Update all coordinates to be relative to the origin
    for (const req of reqs) {
        req.x -= originX;
        req.y -= originY;
    }
    for (const free of frees) {
        free.x -= originX;
        free.y -= originY;
    }
    for (const cdiff of cdiffs) {
        cdiff.x -= originX;
        cdiff.y -= originY;
    }
    for (const ddiff of ddiffs) {
        ddiff.x -= originX;
        ddiff.y -= originY;
    }

    return {
        reqs,
        frees,
        diffs: {
            cdiffs,
            ddiffs,
            qcells,
        },
        metadata: {
            minX: -originX,
            minY: -originY,
            maxX: before[0].length - originX,
            maxY: before.length - originY,
        },
    };
}

/**
 * Tokenize a spatial rule picture into a 2D array of tokens, of the format token[y][x]
 * @param picture   The picture to tokenize
 */
function ptokenize(picture: string): string[][] {
    return picture.split("\n").map((line) => line.trim().split(/\s+/));
}

function exec(
    rule: spatial_compiled,
    x: number,
    y: number,
    grid: Readonly<_grids.grid_slice_t>,
    reserved: ReadonlySet<number>,
): _rules.cdiff[] | null {
    const qcells = new Map<number, _cells.fcell_t>();

    // Check if all required tokens match
    for (const req of rule.reqs) {
        const targetCell = grid.cell(x + req.x, y + req.y);

        // No token yet found for this requirement; Attempt to find one
        if (!qcells.has(req.id)) {
            qcells.set(req.id, targetCell);

            // Failed to match required token, rule fails
            if (!cells.matches(req.cell, targetCell)) return null;
        }
        // Exact token already found for this requirement; Check if it matches
        else if (!cells.matches(req.cell, targetCell)) return null;
    }

    // Prefill qcells with precomputed qcells
    for (const id in rule.diffs.qcells) {
        const c = rule.diffs.qcells[id];
        qcells.set(
            +id,
            (c.cell as _cells.QuantumCell<any, any, any>).exec(c.data),
        );
    }

    // Gather free token cells
    for (const free of rule.frees) {
        const targetCell = grid.cell(x + free.x, y + free.y);
        qcells.set(free.id, targetCell);
    }

    // Generate cell differences
    const diffs: _rules.cdiff[] = [...rule.diffs.cdiffs];
    for (const ddiff of rule.diffs.ddiffs) {
        const targetCell = qcells.get(ddiff.id);
        if (!targetCell) continue; // Free token not found, skip!

        diffs.push({
            x: ddiff.x,
            y: ddiff.y,
            to: targetCell,
        });
    }

    return diffs;
}

// +---------------+
// | Register rule |
// +---------------+
declare module "../../rule_types.js" {
    interface rule_registry {
        spatial: {
            user: spatial_rule;
            comp: spatial_compiled;
        };
    }
}

rules.register({
    type: "spatial",
    compile,
    exec,
});
