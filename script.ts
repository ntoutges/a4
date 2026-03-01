import {
    cell_t,
    compileCell,
    compileRule,
    grid,
    step,
    rule_t,
} from "./src/module.js";

// Import rules + cells
import "./src/cells/color/color.js";
import "./src/cells/not/not.js";
import "./src/rules/spatial/spatial.js";
import "./src/rules/sequence/sequence.js";
import "./src/rules/quantum/quantum.js";

// Define cells
const sand = {
    type: "color",
    r: 194,
    g: 178,
    b: 128,
} satisfies cell_t;

const nsand = {
    type: "not",
    cell: sand,
} satisfies cell_t;

const air = {
    type: "color",
    r: 0,
    g: 0,
    b: 0,
} satisfies cell_t;

const csand = compileCell(sand);

// Define rules
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

const rule = compileRule({
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
});

const myGrid = grid.fill(25, 25, air);
myGrid.cells[3][Math.floor((myGrid.width - 1) / 2)] = compileCell({
    type: "color",
    r: 100,
    g: 100,
    b: 100,
});
myGrid.cells[3][Math.floor((myGrid.width - 1) / 2 - 1)] = compileCell({
    type: "color",
    r: 100,
    g: 100,
    b: 100,
});
myGrid.cells[3][Math.floor((myGrid.width - 1) / 2) + 1] = compileCell({
    type: "color",
    r: 100,
    g: 100,
    b: 100,
});
myGrid.cells[3][Math.floor((myGrid.width - 1) / 2) + 2] = compileCell({
    type: "color",
    r: 100,
    g: 100,
    b: 100,
});

let last = "";
function print() {
    const str = myGrid.cells
        .map((d) =>
            d
                .map((c) =>
                    (c.data as any).value === 0
                        ? "  "
                        : (c.data as any).r === 100
                          ? "//"
                          : "##",
                )
                .join(""),
        )
        .join("\n");
    if (str === last) return true;

    console.log(str);
    console.log("----------------");

    last = str;
    return false;
}

print();
const interval = setInterval(() => {
    console.time();
    step(myGrid, rule);
    console.timeEnd();

    myGrid.cells[0][Math.floor((myGrid.cells[0].length - 1) / 2)] = csand;

    if (print()) clearInterval(interval);
}, 10);
