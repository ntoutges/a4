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
import "./src/cells/set/set.js";
import "./src/rules/surround/surround.js";
import "./src/rules/sequence/sequence.js";

const alive = {
    type: "color",
    r: 255,
    g: 255,
    b: 255,
} satisfies cell_t;

const dead = {
    type: "color",
    r: 0,
    g: 0,
    b: 0,
} satisfies cell_t;

const call = {
    type: "set",
    cells: [alive, dead],
} satisfies cell_t;

// Define rules
const ruleb = {
    type: "surround",
    mask: `A A A
           A @ A
           A A A`,
    after: "A",
    scope: {
        "@": dead,
        A: alive,
    },
    min: 3,
    max: 3,
} satisfies rule_t;

const ruled1 = {
    type: "surround",
    mask: `A A A
           A @ A
           A A A`,
    after: "D",
    scope: {
        "@": alive,
        A: alive,
        D: dead,
    },
    min: 4,
} satisfies rule_t;

const ruled2 = {
    type: "surround",
    mask: `A A A
           A @ A
           A A A`,
    after: "D",
    scope: {
        "@": alive,
        A: alive,
        D: dead,
    },
    max: 1,
} satisfies rule_t;

const rule = compileRule({
    type: "sequence",
    rules: [ruleb, ruled1, ruled2],
});

// @ts-ignore
const height = process.stdout.rows - 2;
// @ts-ignore
const width = process.stdout.columns;

const myGrid = grid.fill(Math.floor(width / 2), height, dead, {
    wrapX: true,
    wrapY: true,
});

// Glider
myGrid.write(1, 0, compileCell(alive));
myGrid.write(2, 1, compileCell(alive));
myGrid.write(0, 2, compileCell(alive));
myGrid.write(1, 2, compileCell(alive));
myGrid.write(2, 2, compileCell(alive));

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

    let header = ` ${period.toFixed(2)}ms `;
    while (header.length + 2 < width) {
        header = `-${header}-`;
    }
    console.log(`${header}\n${str}`);

    last = str;
    return false;
}

print(0);
const interval = setInterval(() => {
    const start = performance.now();
    step(myGrid, rule);
    const end = performance.now();

    if (print(end - start)) clearInterval(interval);
}, 100);
