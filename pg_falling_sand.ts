import {
    cell_t,
    compileCell,
    compileRule,
    grid,
    step,
    rule_t,
    fcell_t,
} from "./src/module.js";

// Import rules + cells
import "./src/cells/color/color.js";
import "./src/cells/not/not.js";
import "./src/cells/range/range.js";
import "./src/cells/set/set.js";
import "./src/rules/spatial/spatial.js";
import "./src/rules/sequence/sequence.js";
import "./src/rules/quantum/quantum.js";

const sand = {
    type: "set",
    cells: [
        {
            type: "color",
            r: 101,
            g: 178,
            b: 128,
        },
        {
            type: "color",
            r: 200,
            g: 178,
            b: 128,
        },
        {
            type: "color",
            r: 150,
            g: 178,
            b: 128,
        },
    ],
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
myGrid.write(
    (myGrid.width - 1) / 2 - 1,
    3,
    compileCell({
        type: "color",
        r: 100,
        g: 100,
        b: 100,
    }),
);
myGrid.write(
    (myGrid.width - 1) / 2,
    3,
    compileCell({
        type: "color",
        r: 100,
        g: 100,
        b: 100,
    }),
);
myGrid.write(
    (myGrid.width - 1) / 2 + 1,
    3,
    compileCell({
        type: "color",
        r: 100,
        g: 100,
        b: 100,
    }),
);
myGrid.write(
    (myGrid.width - 1) / 2 + 2,
    3,
    compileCell({
        type: "color",
        r: 100,
        g: 100,
        b: 100,
    }),
);

let last = "";
function print(period: number) {
    // @ts-ignore
    const str = (myGrid.cells as fcell_t[][])
        .map((d) =>
            d
                .map((c) =>
                    (c.data as any).value === 0
                        ? "  "
                        : (c.data as any).r === 100
                          ? "//"
                          : ((c.data as any).r ?? 0)
                                .toString(16)
                                .padStart(2, "0"),
                )
                .join(""),
        )
        .join("\n");
    if (str === last) return true;

    console.log(
        `---------------- ${period.toFixed(2)}ms ----------------\n${str}`,
    );

    last = str;
    return false;
}

print(0);
const interval = setInterval(() => {
    const start = performance.now();
    step(myGrid, rule);
    const end = performance.now();

    if (
        // @ts-ignore
        myGrid.cells[0][Math.floor((myGrid.cells[0].length - 1) / 2)].data.r ===
        0
    ) {
        // @ts-ignore
        myGrid.cells[0][Math.floor((myGrid.cells[0].length - 1) / 2)] =
            // @ts-ignore
            csand.cell.exec(csand.data);
    }

    if (print(end - start)) clearInterval(interval);
}, 100);
