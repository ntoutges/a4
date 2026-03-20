import { cell_t, rule_t } from "../../src/module.js";

// Import required cell/rule types
import "../../src/cells/color/color.js";
import "../../src/cells/lerp/lerp.js";
import "../../src/rules/spatial/spatial.js";

// Values stolen wholecloth from Automota V2.1
const sand = {
    type: "lerp",
    min: {
        type: "color",
        r: 203,
        g: 195,
        b: 162,
    },
    max: {
        type: "color",
        r: 255,
        g: 237,
        b: 167,
    },
} satisfies cell_t;

const stone = {
    type: "color",
    r: 150,
    g: 150,
    b: 150,
} satisfies cell_t;

const air = {
    type: "color",
    r: 0,
    g: 0,
    b: 0,
} satisfies cell_t;

// Fall sand down
const sruled = {
    type: "spatial",
    before: `@
             F`,
    after: `A
            @`,
    scope: {
        "@": sand,
        A: air,
        F: air,
    },
} satisfies rule_t;

export const rule = sruled;

export const cells = {
    sand,
    air,
    stone,
};

export const fill = air;
