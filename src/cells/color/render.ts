/**
 * @file color/render.ts
 * @description Rendering logic for color cells
 * @author Nicholas T.
 * @copyright 2026 PiCO
 */

import * as color from "./color.js";
import * as _renders from "../../render_types.js";

/**
 * Renders a color cell to a render context
 * @param cell      The color cell to render
 * @param context   The render context to render to
 * @returns         `true` if the cell was rendered successfully, `false` otherwise.
 */
export function render(
    cell: color.color_compiled,
    context: _renders.frender_t["ctx"],
): boolean {
    switch (context.type) {
        case "terminal":
            return terminal(cell, context);
    }

    // Failed to find valid renderer
    return false;
}

/**
 * Render to the terminal
 * @param cell
 * @param context
 * @returns     `true`: This cell _always_ renders successfully
 */
function terminal(
    cell: color.color_compiled,
    context: _renders.sfrender_t["terminal"]["ctx"],
): true {
    // Convert to greyscale using luminosity method
    const grey = Math.round(0.21 * cell.r + 0.72 * cell.g + 0.07 * cell.b);

    // Set terminal text color to hex greyscale value
    // Special case: Render black as a space for better visibility
    context.text(grey === 0 ? "  " : grey.toString(16).toUpperCase());

    /** @TODO Set color */

    return true;
}
