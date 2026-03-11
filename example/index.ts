import * as ui from "./ui";
import * as m from "../src/module.js";

import * as pg from "./programs/pg_falling_sand";

const myGrid = m.grid.fill(50, 50, pg.fill);

ui.registerCells(pg.cells);
ui.registerRule(pg.rule);
ui.registerGrid(myGrid);

setInterval(() => {
    ui.tick();
}, 100);
