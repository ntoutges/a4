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

const myGrid = grid.fill(25, 25, dead);
// myGrid.cells[2][1] = compileCell(alive);
// myGrid.cells[2][2] = compileCell(alive);
// myGrid.cells[2][3] = compileCell(alive);

myGrid.cells[1][2] = compileCell(alive);
myGrid.cells[2][3] = compileCell(alive);
myGrid.cells[3][1] = compileCell(alive);
myGrid.cells[3][2] = compileCell(alive);
myGrid.cells[3][3] = compileCell(alive);

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
                          : ((c.data as any).r ?? 0)
                                .toString(16)
                                .padStart(2, "0"),
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

    if (print()) clearInterval(interval);
}, 100);
