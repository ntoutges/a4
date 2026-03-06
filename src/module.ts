/**
 * @file module.ts
 * @description Main file for the automata project, exposing the main API for users to interact with
 * @author Nicholas T.
 * @copyright 2026 PiCO
 */

import * as mgrid from "./grid.js";
import * as cell from "./cells.js";
import * as rule from "./rules.js";
import * as auto from "./automata.js";
import * as mrender from "./render.js";

// Copmilers
export const compileCell = cell.compile;
export const compileRule = rule.compile;
export const compileGrid = mgrid.compile;

// Grid utilities
export const grid = {
    compile: mgrid.compile,
    fill: mgrid.fill,
};

// Render utilities
export const render = {
    compile: mrender.compile,
    render: mrender.render,
};

// Core automata functionality
export const step = auto.step;

// Re-export types
export type * from "./cell_types.js";
export type * from "./rule_types.js";
export type * from "./grid_types.js";
export type * from "./render_types.js";
