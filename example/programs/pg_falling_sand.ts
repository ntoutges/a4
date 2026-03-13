import { cell_t, rule_t } from "../../src/module.js";

// Import required cell/rule types
import "../../src/cells/color/color.js";
import "../../src/cells/set/set.js";
import "../../src/cells/not/not.js";
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

const stone = {
    type: "color",
    r: 150,
    g: 150,
    b: 150,
} satisfies cell_t;

const water = {
    type: "color",
    r: 0x39,
    g: 0x6b,
    b: 0x9c,
} satisfies cell_t;

const fish = {
    type: "color",
    r: 255,
    g: 200,
    b: 150,
} satisfies cell_t;

const fish_tail = {
    type: "color",
    r: 150,
    g: 255,
    b: 150,
} satisfies cell_t;

const air = {
    type: "color",
    r: 0,
    g: 0,
    b: 0,
} satisfies cell_t;

const fallable = {
    type: "set",
    cells: [water, air],
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
        F: fallable,
    },
} satisfies rule_t;

// Fall sand to right
const sruler = {
    type: "spatial",
    before: `@ A1
             B A1`,
    after: `A A1
            B @`,
    scope: {
        "@": sand,
        B: sand,
        A: air,
        A1: fallable,
        A2: fallable,
    },
} satisfies rule_t;

// Fall sand to left
const srulel = {
    type: "spatial",
    before: `A1 @
             A2 B`,
    after: `A1 A
            @ B`,
    scope: {
        "@": sand,
        B: sand,
        A: air,
        A1: fallable,
        A2: fallable,
    },
} satisfies rule_t;

// Fall water
const wruled = {
    type: "spatial",
    before: `@
             A`,
    after: `A
            @`,
    scope: {
        "@": water,
        A: air,
    },
} satisfies rule_t;

// Expand water
const wrulel = {
    type: "spatial",
    before: `A @
             _ W`,
    after: `@ @
            _ W`,
    scope: {
        "@": water,
        W: {
            type: "not",
            cell: air,
        },
        A: air,
    },
} satisfies rule_t;

const wruler = {
    type: "spatial",
    before: `@ A
             W _`,
    after: `@ @
            W _`,
    scope: {
        "@": water,
        W: {
            type: "not",
            cell: air,
        },
        A: air,
    },
} satisfies rule_t;

const frulesl = {
    type: "spatial",
    before: `W @ N`,
    after: `T @ N`,
    scope: {
        "@": fish,
        T: fish_tail,
        W: water,
        N: {
            type: "not",
            cell: {
                type: "set",
                cells: [fish, fish_tail],
            },
        },
    },
} satisfies rule_t;
const frulesr = {
    type: "spatial",
    before: `N @ W`,
    after: `N @ T`,
    scope: {
        "@": fish,
        T: fish_tail,
        W: water,
        N: {
            type: "not",
            cell: {
                type: "set",
                cells: [fish, fish_tail],
            },
        },
    },
} satisfies rule_t;

const frulemr = {
    type: "spatial",
    before: `T @ W`,
    after: `W T @`,
    scope: {
        "@": fish,
        T: fish_tail,
        W: water,
    },
} satisfies rule_t;

const fruleml = {
    type: "spatial",
    before: `W @ T`,
    after: `@ T W`,
    scope: {
        "@": fish,
        T: fish_tail,
        W: water,
    },
} satisfies rule_t;

const frulefl = {
    type: "spatial",
    before: `T @`,
    after: `@ T`,
    scope: {
        "@": fish,
        T: fish_tail,
    },
} satisfies rule_t;
const frulefr = {
    type: "spatial",
    before: `@ T`,
    after: `T @`,
    scope: {
        "@": fish,
        T: fish_tail,
    },
} satisfies rule_t;

export const rule = {
    type: "sequence",
    rules: [
        sruled,
        {
            type: "quantum",
            weighted: true,
            rules: [
                {
                    rule: srulel,
                    weight: 1,
                },
                {
                    rule: sruler,
                    weight: 1,
                },
            ],
        },
        wruled,
        wrulel,
        wruler,

        {
            type: "quantum",
            rules: [frulesl, frulesr],
        },
        fruleml,
        frulemr,
        frulefl,
        frulefr,
    ],
} satisfies rule_t;

export const cells = {
    sand,
    stone,
    water,
    fish,
    air,
};

export const fill = air;
