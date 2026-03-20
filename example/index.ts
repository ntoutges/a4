import * as ui from "./ui";
import * as m from "../src/module.js";

// import * as pg from "./programs/pg_falling_sand.js";
import * as pg from "./programs/pg_minimal.js";

const myGrid = m.grid.fill(100, 100, pg.fill);

ui.registerCells(pg.cells);
ui.registerRule(pg.rule);
ui.registerGrid(myGrid);
