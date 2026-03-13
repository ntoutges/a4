/**
 * @file ui.ts
 * @description Hold all non-trivial example UI code to keep main `index.ts` file clean
 * @author Nicholas T.
 * @copyright 2026 PiCO
 */

import "../src/render/canvas/canvas.js";
import {
    cell_t,
    compileCell,
    compileRule,
    fcell_t,
    frule_t,
    grid_t,
    rule_t,
    render,
    step,
} from "../src/module.js";
import { SmartInterval } from "./smartInterval.js";

// Store registered items
const registeredCells = new Map<string, fcell_t>();
let registeredRule: frule_t | null = null;
let registeredGrid: grid_t | null = null;
let renderer: ReturnType<typeof render.compile<"canvas">> | null;

// Store the current selected cell
let selectedCell0: string | null = null; // Left click
let selectedCell2: string | null = null; // Right click

// Last coordinates of mouse during drag
let lastX: number = 0;
let lastY: number = 0;
let lastCX: number = 0;
let lastCY: number = 0;

// Position in the canvas
let gx: number = 0;
let gy: number = 0;

// Store render stats
let stat_sim_tot = 0;
let stat_ren_tot = 0;
let stat_anm_tot = 0;
let stat_sim_ct = 0;
let stat_ren_ct = 0;
let stat_anm_ct = 0;
let stat_sim_max = 0;
let stat_ren_max = 0;
let stat_anm_max = 0;

let mainDrawing: boolean = false; // Drawing (left)
let secondaryDrawing: boolean = false; // Drawing (right)
let dragging: boolean = false; // Dragging scene

const cellSidebar = document.getElementById("sidebar-cells") as HTMLElement;
const ctlSidebar = document.getElementById("sidebar-controls") as HTMLElement;
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const canvasResizeObserver = new ResizeObserver(onCanvasResize);

const ctlPlay = document.getElementById("control-play") as HTMLElement;
const ctlPause = document.getElementById("control-pause") as HTMLElement;
const ctlStep = document.getElementById("control-step") as HTMLElement;
const ctlSpeed = document.getElementById("speed-slider") as HTMLInputElement;
const ctlIndicatorBar = document.getElementById(
    "controls-indicator-bar",
) as HTMLElement;

const tickInterval = new SmartInterval(tick, 1000);

cellSidebar.addEventListener("pointerup", cellClick, { capture: true });
cellSidebar.addEventListener("contextmenu", (e) => e.preventDefault(), {
    capture: true,
});
canvas.addEventListener("pointerdown", canvasPointerDown);
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener("pointermove", canvasPointerMove);
canvas.addEventListener("pointerup", canvasPointerUp);
canvasResizeObserver.observe(canvas);

ctlPlay.addEventListener("click", simToggle);
ctlPause.addEventListener("click", simToggle);
ctlStep.addEventListener("click", simStep);
ctlSpeed.addEventListener("input", simAdjust);
simAdjust();
tickInterval.play();

/**
 * Register some set of cells, allowing the user to use them
 * @param cells The cells to register and make available
 */
export function registerCells(cells: Record<string, cell_t>) {
    for (const id in cells) {
        const cell = compileCell(cells[id]);

        // Ignore non-generating cells
        if (!cell.data.metadata.generating) {
            console.warn(`Ignoring cell "${id}"; Non-generating!`);
            continue;
        }

        const option = document.createElement("div");
        option.classList.add("cell-option");
        option.dataset.id = id;
        option.textContent = id;

        // Autoselect first item
        if (selectedCell0 === null) {
            selectedCell0 = id;
            option.classList.add("selected");
        } else if (selectedCell2 === null) {
            selectedCell2 = id;
            option.classList.add("selected2");
        }

        cellSidebar.append(option);
        registeredCells.set(id, cell);
    }
}

/**
 * Register the grid to render to the screen
 * @param grid  The grid to render
 */
export function registerGrid(grid: grid_t) {
    registeredGrid = grid;

    // Build renderer from grid
    renderer = render.compile<"canvas">(
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
        registeredGrid,
    );

    requestAnimationFrame(animate);
}

/**
 * Register the rule to run
 * @param rule  The rule to run
 */
export function registerRule(rule: rule_t) {
    registeredRule = compileRule(rule);
}

/**
 * Perform a single step of the simulation
 */
export function tick() {
    // No grid/rule/renderer registered; Cannot step!
    if (!registeredGrid || !registeredRule || !renderer) return;

    const preSim = performance.now();
    step(registeredGrid, registeredRule);
    const postSim = performance.now();

    const sim_delta = postSim - preSim;
    stat_sim_tot += sim_delta;
    stat_sim_ct++;
    stat_sim_max = Math.max(stat_sim_max, sim_delta);

    // Read cell on tick
    if (mainDrawing || secondaryDrawing) {
        const cell = generateSelectedCell(
            mainDrawing ? selectedCell0 : selectedCell2,
        );
        if (cell) registeredGrid.write(lastCX, lastCY, cell);
    }

    const preRender = performance.now();
    render.render(renderer);
    const postRender = performance.now();

    const ren_delta = postRender - preRender;
    stat_ren_tot += ren_delta;
    stat_ren_ct++;
    stat_ren_max = Math.max(stat_ren_max, ren_delta);
}

// Play/pause simulation
function simToggle() {
    if (tickInterval.playing()) {
        tickInterval.pause();
        ctlSidebar.classList.add("paused");
    } else {
        tickInterval.play();
        ctlSidebar.classList.remove("paused");
    }
}

// Pause simulation + run a step
function simStep() {
    tickInterval.pause();
    ctlSidebar.classList.add("paused");
    tick();
}

// Adjust simulation speed
function simAdjust() {
    const raw = ctlSpeed.valueAsNumber; // Value [0, 1]

    // @TODO: Improve raw->period conversion
    const period = 1000 * Math.exp(raw * Math.log(10 / 1000));

    tickInterval.period(period);
    ctlIndicatorBar.style.setProperty("--factor", raw.toString());
    ctlIndicatorBar.classList.toggle("strobing", period < 100);
}

// Animate renderer
function animate() {
    if (!renderer) return;

    requestAnimationFrame(animate);

    const preAnim = performance.now();
    renderer.animate();
    const postAnim = performance.now();

    const anm_delta = postAnim - preAnim;
    stat_anm_tot += anm_delta;
    stat_anm_ct++;
    stat_anm_max = Math.max(stat_anm_max, anm_delta);

    // Update tick indicator
    ctlIndicatorBar.style.setProperty(
        "--progress",
        tickInterval.progress().toString(),
    );
}

// Update stats
function stats() {
    document.querySelector<HTMLElement>("#time-avg .stats-sim")!.textContent =
        fp_stat(stat_anm_tot / stat_anm_ct, 6);
    document.querySelector<HTMLElement>(
        "#time-avg .stats-render",
    )!.textContent = fp_stat(stat_ren_tot / stat_ren_ct, 6);
    document.querySelector<HTMLElement>("#time-avg .stats-anim")!.textContent =
        fp_stat(stat_anm_tot / stat_anm_ct, 6);
    document.querySelector<HTMLElement>("#time-max .stats-sim")!.textContent =
        fp_stat(stat_anm_max, 6);
    document.querySelector<HTMLElement>(
        "#time-max .stats-render",
    )!.textContent = fp_stat(stat_ren_max, 6);
    document.querySelector<HTMLElement>("#time-max .stats-anim")!.textContent =
        fp_stat(stat_anm_max, 6);

    // Reset stats
    stat_sim_tot = 0;
    stat_ren_tot = 0;
    stat_anm_tot = 0;
    stat_sim_ct = 0;
    stat_ren_ct = 0;
    stat_anm_ct = 0;
    stat_sim_max = 0;
    stat_ren_max = 0;
    stat_anm_max = 0;
}
setInterval(stats, 1000);

/**
 * Get time string with given length; Includes time + unit
 * @param stat  Duration of stat, given in ms
 * @param len
 * @returns
 *
 * @todo Make this not so lazy
 */
function fp_stat(stat: number, len: number): string {
    return stat.toFixed(len - 4) + "ms";
}

// Event listeners
function cellClick(e: MouseEvent) {
    const cellEl =
        e.target instanceof HTMLElement
            ? e.target.closest<HTMLDivElement>(".cell-option")
            : null;
    if (!cellEl) return; // Didn't click on cell selector

    // Left click
    if (e.button === 0) {
        // Deselect previous
        if (selectedCell0 !== null) {
            cellSidebar
                .querySelector(
                    `[data-id="${selectedCell0.replace(/"/g, '\\"')}"]`,
                )
                ?.classList.remove("selected");
        }

        selectedCell0 = cellEl.dataset.id as string;

        // (Visually) select new
        cellEl.classList.add("selected");
    }

    // Right click
    else if (e.button === 2) {
        // Deselect previous
        if (selectedCell2 !== null) {
            cellSidebar
                .querySelector(
                    `[data-id="${selectedCell2.replace(/"/g, '\\"')}"]`,
                )
                ?.classList.remove("selected2");
        }

        selectedCell2 = cellEl.dataset.id as string;

        // (Visually) select new
        cellEl.classList.add("selected2");
    }
}

function canvasPointerDown(e: PointerEvent) {
    if (!renderer || !registeredGrid) return;

    const { x, y } = getRelativeCanvasPos(e.pageX, e.pageY);
    const { x: cx, y: cy } = renderer.getCell(x, y);

    canvas.setPointerCapture(e.pointerId);

    if (e.button === 0 && !e.shiftKey) {
        mainDrawing = true;
    } else if (e.button === 2 && !e.shiftKey) {
        secondaryDrawing = true;
    } else if (e.button === 1 || (e.button === 0 && e.shiftKey))
        dragging = true;

    lastX = e.pageX;
    lastY = e.pageY;
    lastCX = cx;
    lastCY = cy;

    // Invalid grid axes
    if (
        x < 0 ||
        x >= registeredGrid.width ||
        y < 0 ||
        y >= registeredGrid.height
    ) {
        return;
    }

    if (mainDrawing || secondaryDrawing) {
        const cell = generateSelectedCell(
            mainDrawing ? selectedCell0 : selectedCell2,
        );
        if (cell) {
            registeredGrid.write(cx, cy, cell);
            render.render(renderer);
        }
    }
}

function canvasPointerMove(e: PointerEvent) {
    if (mainDrawing || secondaryDrawing) canvasDraw(e);
    else if (dragging) canvasDrag(e);
}

function canvasDraw(e: PointerEvent) {
    if (!renderer || !registeredGrid) return;

    const { x, y } = getRelativeCanvasPos(e.pageX, e.pageY);
    const { x: cx, y: cy } = renderer.getCell(x, y);

    const oldCX = lastCX;
    const oldCY = lastCY;

    // Update last positions
    lastX = e.pageX;
    lastY = e.pageY;
    lastCX = cx;
    lastCY = cy;

    // Invalid grid axes
    if (
        x < 0 ||
        x >= registeredGrid.width ||
        y < 0 ||
        y >= registeredGrid.height
    ) {
        return;
    }

    // Only update if we've moved to a new cell
    if (cx === oldCX && cy === oldCY) return;

    // Loop through all coords from last position to current position and update them (for fast mouse movements)
    const dx = cx - oldCX;
    const dy = cy - oldCY;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));

    for (let i = 0; i <= steps; i++) {
        const interpX = Math.round(oldCX + (dx * i) / steps);
        const interpY = Math.round(oldCY + (dy * i) / steps);

        const cell = generateSelectedCell(
            mainDrawing ? selectedCell0 : selectedCell2,
        );
        if (!cell) continue; // No cell selected

        registeredGrid.write(interpX, interpY, cell);
    }

    // Render for immediate visual feedback
    render.render(renderer);
}

function canvasDrag(e: PointerEvent) {
    if (!renderer || !registeredGrid) return;

    const { x, y } = getRelativeCanvasPos(e.pageX, e.pageY);
    const { x: cx, y: cy } = renderer.getCell(x, y);

    gx += lastX - e.pageX;
    gy += lastY - e.pageY;

    renderer.offset(gx / 10, gy / 10);

    // Update last positions
    lastX = e.pageX;
    lastY = e.pageY;
    lastCX = cx;
    lastCY = cy;
}

function canvasPointerUp(e: PointerEvent) {
    dragging = false;
    mainDrawing = false;
    secondaryDrawing = false;
}

function onCanvasResize() {
    const bbox = canvas.getBoundingClientRect();
    canvas.width = bbox.width;
    canvas.height = bbox.height;

    renderer?.update();
}

/**
 * Get the selected cell
 * @param selected  The selected cell to generate
 */
function generateSelectedCell(selected: string | null): fcell_t | null {
    if (selected === null) return null;

    let cell = registeredCells.get(selected);
    if (!cell) return null; // Invalid cell selector!?

    return cell.cell.quantum ? cell.cell.exec(cell.data as any) : cell;
}

/**
 * Get relative position on render canvas based on absolute positions
 * @param x
 * @param y
 * @returns The relative position (0 = top/left, 1 = bottom/right)
 */
function getRelativeCanvasPos(x: number, y: number): { x: number; y: number } {
    const bbox = canvas.getBoundingClientRect();

    return {
        x: (x - bbox.left) / bbox.width,
        y: (y - bbox.top) / bbox.height,
    };
}
