import {
    cell_t,
    compileCell,
    compileRule,
    render,
    grid,
    step,
    rule_t,
} from "./src/module.js";

// Import rules + cells
import "./src/cells/color/color.js";
import "./src/cells/range/range.js";
import "./src/rules/spatial/spatial.js";
import "./src/rules/sequence/sequence.js";
import "./src/rules/quantum/quantum.js";
import "./src/render/canvas/canvas.js";
import { equals } from "./src/cells.js";

const sand = {
    type: "range",
    min: {
        type: "color",
        r: 101,
        g: 178,
        b: 128,
    },
    max: {
        type: "color",
        r: 200,
        g: 178,
        b: 128,
    },
} satisfies cell_t;

const air = {
    type: "color",
    r: 0,
    g: 0,
    b: 0,
} satisfies cell_t;

const csand = compileCell(sand);
const cair = compileCell(air);

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

const width = 100;
const height = 100;

const myGrid = grid.fill(width, height, air);

let start: number = 0;
let end: number = 0;

const canvas = document.querySelector("#canvas") as HTMLCanvasElement;
const myRender = render.compile<"canvas">(
    {
        type: "canvas",
        canvas: canvas,

        debug: {
            // chunk: true,
            // fill: true,
        },

        // debounce: 0,
        // fperiod: 0,
    },
    myGrid,
);

// Interact with grid
canvas.addEventListener("click", (e) => {
    const bbox = canvas.getBoundingClientRect();
    const relX = (e.clientX - bbox.left) / bbox.width;
    const relY = (e.clientY - bbox.top) / bbox.height;

    const { x, y } = myRender.getCell(relX, relY);

    if (equals(myGrid.cell(x, y), cair)) {
        myGrid.write(
            x,
            y,
            // @ts-ignore
            csand.cell.exec(csand.data),
        );
    } else {
        myGrid.write(x, y, cair);
    }

    render.render(myRender);
});

let x = 0;
let y = 0;
let s = 0;

const stp = 10;

document.body.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "l") x += stp;
    if (e.key === "ArrowLeft" || e.key === "h") x -= stp;
    if (e.key === "ArrowUp" || e.key === "k") y -= stp;
    if (e.key === "ArrowDown" || e.key === "j") y += stp;
    if (e.key === "-") s -= 0.2;
    if (e.key === "+" || e.key === "=") s += 0.2;

    myRender.offset(x, y);
    myRender.scale(2 ** s, 0.5, 0.5);
});

setInterval(() => {
    start = performance.now();
    step(myGrid, rule);
    end = performance.now();

    smspt += end - start;
    scycles++;

    if (equals(myGrid.cell(Math.floor(width / 2), 0), cair))
        // @ts-ignore
        myGrid.write(Math.floor(width / 2), 0, csand.cell.exec(csand.data));

    start = performance.now();
    render.render(myRender);
    end = performance.now();

    rmspt += end - start;
    rcycles++;
}, 0);

let smspt = 0;
let scycles = 0;

let rmspt = 0;
let rcycles = 0;

let amspt = 0;
let acycles = 0;

function animate() {
    requestAnimationFrame(animate);

    start = performance.now();
    myRender.animate();
    end = performance.now();

    amspt = Math.max(amspt, end - start);
    acycles++;
}
requestAnimationFrame(animate);

setInterval(() => {
    // Print to MSPT counter
    document.getElementById("mspt")!.textContent =
        `Sim: ${(smspt / scycles).toFixed(2)}ms\nRender: ${(rmspt / rcycles).toFixed(2)}ms\nAnimate: ${amspt.toFixed(2)}ms`;

    smspt = 0;
    scycles = 0;
    rmspt = 0;
    rcycles = 0;
    amspt = 0;
    acycles = 0;
}, 1000);
