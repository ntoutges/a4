import { cell_t, rule_t } from "../../src/module.js";

// Import required cell/rule types
import "../../src/cells/color/color.js";
import "../../src/cells/range/range.js";
import "../../src/rules/spatial/spatial.js";
import "../../src/rules/sequence/sequence.js";
import "../../src/rules/quantum/quantum.js";

// Values stolen wholecloth from Automota V2.1
const sand = {
    type: "range",
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

const air = {
    type: "color",
    r: 0,
    g: 0,
    b: 0,
} satisfies cell_t;

// Fall sand down
const ruled = {
    type: "spatial",
    before: `@
             A`,
    after: `A
            @`,
    scope: {
        "@": sand,
        A: air,
    },
} satisfies rule_t;

// Fall sand to right
const ruler = {
    type: "spatial",
    before: `@ A
             B A`,
    after: `A A
            B @`,
    scope: {
        "@": sand,
        B: sand,
        A: air,
    },
} satisfies rule_t;

// Fall sand to left
const rulel = {
    type: "spatial",
    before: `A @
             A B`,
    after: `A A
            @ B`,
    scope: {
        "@": sand,
        B: sand,
        A: air,
    },
} satisfies rule_t;

export const rule = {
    type: "sequence",
    rules: [
        ruled,
        {
            type: "quantum",
            weighted: true,
            rules: [
                {
                    rule: rulel,
                    weight: 1,
                },
                {
                    rule: ruler,
                    weight: 1,
                },
            ],
        },
    ],
} satisfies rule_t;

export const cells = {
    sand,
    air,
};

export const fill = air;
