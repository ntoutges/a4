/**
 * @file crender.ts
//  * @description Compiled canvas renderer implementation
 * @author Nicholas T.
 * @copyright 2026 PiCO
 */

import * as _renders from "../../render_types.js";
import * as _cells from "../../cell_types.js";
import * as _grids from "../../grid_types.js";
import * as _canvas from "./canvas.js";
import * as cells from "../../cells.js";
import { Map2D, Set2D } from "../../map2d.js";

/** Data about each chunk */
type chunk_entry = Readonly<{
    /** The offscreen canvas element for this chunk */
    canvas: HTMLCanvasElement;

    /** The context to render to this canvas element */
    ctx: CanvasRenderingContext2D;

    cx: number; // The x-coordinate of this entry in chunk coordinates
    cy: number; // The y-coordinate of this entry in chunk coordinates

    gx: number; // The x-coordinate of this entry in grid coordinates
    gy: number; // The y-coordinate of this entry in grid coordinates
}>;

export class CanvasRender implements _renders.base_renderer<_canvas.canvas_ctx> {
    readonly context: _canvas.canvas_ctx = {
        type: "canvas",
        ctx: null!,
    };
    readonly grid: _grids.grid_t;

    private readonly canvas: HTMLCanvasElement; // Canvas to render to
    private readonly ctx: CanvasRenderingContext2D; // 2D context of canvas to render

    private readonly debug: {
        chunk: boolean; // Render empty chunks as psuedo-random colors
        fill: boolean; // Show chunks' progress when initially filling with data
    };

    private vx: number = 0; // The x-position of the virtual camera, in grid units
    private vy: number = 0; // The y-position of the virtual camera, in grid units
    private vs: number = 1; // The scale of the virtual camera, as a multiplier
    private vw: number = 0; // The width of the viewport, in grid units
    private vh: number = 0; // The height of the viewport, in grid units

    /** The size of each cell, in pixels */
    private cell_size: number;

    /**
     * The minimum number of chunks to optimize for in total
     * Chunkifier will continue running until at least this many chunks are filled, or no more chunks can be created
     */
    private min_chunk_ct = 9;

    // Used to determine if the canvas needs to be re-rendered
    private translate_dirty: boolean = true; // True if camera x/y position has changed since last render
    private scale_dirty: boolean = true; // True if camera scale has changed since last render
    private canvas_dirty: boolean = true; // True if entire canvas needs to be re-rendered (e.g. after resizing)

    private chunk_width!: number; // The width of each chunk, in grid units (# cells wide)
    private chunk_height!: number; // The height of each chunk, in grid units (# cells tall)

    private readonly chunks_dirty: Set2D<number> = new Set2D(); // The set of all dirty chunk coordinates

    /**
     * The chunk data
     * Note that chunks will only ever exist if they overlap the cell-grid-to-render
     */
    private chunks: Map2D<number, chunk_entry> = new Map2D();

    /** Map chunks scheduled for deletion to their associated timeout */
    private readonly chunk_rm_scheduled: Map2D<
        number,
        ReturnType<typeof setTimeout>
    > = new Map2D();

    /** Amount of time to wait before removing a chunk scheduled for removal */
    private readonly chunk_rm_debounce: number;

    /** Chunks scheduled for filling; Stores y-coordinate of next line to render */
    private readonly chunk_fl_scheduled: Map2D<number, number> = new Map2D();

    /** Max amount of time (ms) allocated to render a scheduled fill */
    private readonly chunk_fl_period: number = 1;

    /** Time (relative to process.now()) when `fl` must end */
    private chunk_fl_end!: number;

    constructor(renderer: _canvas.canvas_render, grid: _grids.grid_t) {
        this.grid = grid;

        // Setup customizations
        this.debug = {
            chunk: renderer.debug?.chunk ?? false,
            fill: renderer.debug?.fill ?? false,
        };
        this.chunk_rm_debounce = renderer.debounce ?? 1000;
        this.chunk_fl_period = renderer.fperiod ?? 5;

        // TODO: Allow cell size to be passed in
        this.cell_size = 10;

        // Bind methods that need to be passed as callbacks and rely on `this`
        this.removeChunk = this.removeChunk.bind(this);

        this.canvas = renderer.canvas;
        this.ctx = renderer.canvas.getContext("2d")!;

        // Initialize viewport dimensions and chunking strategy based on initial canvas size
        this.update();
    }

    pre(): _renders.pre_t {
        return {
            full: false,
        };
    }

    render(x: number, y: number, cell: _cells.fcell_t): boolean {
        const chunk_coords = this.getChunkCoordsFromGrid(x, y);
        const chunk = this.chunks.get(chunk_coords.x, chunk_coords.y);

        // Don't need to render cell if chunk doesn't exist
        if (!chunk) return true;

        // Dynamically update `context` with the chunk's rendering context before rendering the cell
        this.context.ctx = chunk.ctx;

        this.context.ctx.resetTransform();
        this.context.ctx.scale(this.cell_size, this.cell_size);
        this.context.ctx.translate(x - chunk.gx, y - chunk.gy); // Get offset relative to chunk

        const result = cells.render(cell, this.context);

        // Mark cell as dirty if successfully rendered
        if (result) this.chunks_dirty.add(chunk_coords.x, chunk_coords.y);

        return result;
    }

    post(rlen: number): void {}

    /**
     * Render chunk data to the canvas
     */
    animate(): void {
        // Precompute chunk constants
        const scale_factor = this.cell_size * this.vs;
        const vwidth = this.chunk_width * scale_factor;
        const vheight = this.chunk_height * scale_factor;

        const xoff = this.vx * this.cell_size;
        const yoff = this.vy * this.cell_size;

        // Run garbage collection on inactive chunks
        if (this.translate_dirty || this.scale_dirty) {
            this.updateActiveChunks();
        }

        // Run through chunks to fill
        this.chunk_fl_end = performance.now() + this.chunk_fl_period;
        for (const [x, y, line] of this.chunk_fl_scheduled.entries()) {
            const finished = this._fillChunk(x, y, line);

            // Interrupted => Ran out of time
            if (!finished) break;
        }

        // Redraw the entire canvas from available chunks
        // TODO: Optimize by only redrawing required chunks
        // IE: translation changes only require redrawing boundary chunks
        if (this.canvas_dirty || this.scale_dirty || this.translate_dirty) {
            // Get chunk bounds to render
            const { minX, maxX, minY, maxY } = this.getViewportBounds(true);

            // Clear canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            for (let cy = minY; cy <= maxY; cy++) {
                const dest_y = cy * vheight - yoff;

                for (let cx = minX; cx <= maxX; cx++) {
                    const dest_x = cx * vwidth - xoff;

                    const chunk = this.chunks.get(cx, cy);
                    if (!chunk) continue; // Invalid chunk; Ignore!

                    this.ctx.drawImage(
                        chunk.canvas,
                        dest_x,
                        dest_y,
                        vwidth,
                        vheight,
                    );
                }
            }

            // Reset dirty flags
            this.canvas_dirty = false;
            this.scale_dirty = false;
            this.translate_dirty = false;
            return;
        }

        // Draw all dirty chunks to the canvas
        for (const [cx, cy] of this.chunks_dirty.keys()) {
            const chunk = this.chunks.get(cx, cy);
            if (!chunk) continue; // Chunk was removed since being marked dirty, skip

            const dest_x = cx * vwidth - xoff;
            const dest_y = cy * vheight - yoff;

            this.ctx.drawImage(chunk.canvas, dest_x, dest_y, vwidth, vheight);
        }

        // Mark all chunks as clean after rendering
        this.chunks_dirty.clear();
    }

    /**
     * Offset the virtual 2d camera by some amount (in px) to pan across the grid
     * This is given as an absolute offset from the origin, _not_ a relative offset from the current position
     * @param x The x offset to pan by, in pixels
     * @param y The y offset to pan by, in pixels
     */
    offset(x: number, y: number): void {
        if (x === this.vx && y === this.vy) return; // No change in position, do nothing

        this.vx = x;
        this.vy = y;

        // Mark canvas as dirty to trigger re-rendering
        this.translate_dirty = true;
    }

    /**
     * Scale the virtual 2d camera by some factor to zoom in/out of the grid
     * This is given as an absolute scale factor, _not_ a relative factor from the current zoom level
     * @param factor    The factor to scale by (e.g. `2` to zoom in to 200%, `0.5` to zoom out to 50%)
     * @param originX   The x-coordinate of the zoom origin point, as a fraction of the viewport width (e.g. `0` to zoom towards the left edge, `0.5` to zoom towards the center, `1` to zoom towards the right edge)
     * @param originY   The y-coordinate of the zoom origin point, as a fraction of the viewport height (e.g. `0` to zoom towards the top edge, `0.5` to zoom towards the center, `1` to zoom towards the bottom edge)
     * @returns         The new x/y coordinates of the zoom origin point in grid coordinates, after applying the zoom
     *
     * @TODO FIXME
     */
    scale(
        factor: number,
        originX: number,
        originY: number,
    ): { x: number; y: number } {
        if (factor === this.vs) return { x: this.vx, y: this.vy }; // No change in scale, do nothing

        // Get change from previous scale factor to new scale factor, relative to previous scale factor
        const delta = (factor - this.vs) / this.vs;

        // Get origin point in absolute grid coordinates
        const origin_vx = originX * this.vw + this.vx;
        const origin_vy = originY * this.vh + this.vy;

        // LERP from old camera position to new camera position
        this.vx += delta * origin_vx;
        this.vy += delta * origin_vy;

        // Update scale factor
        this.vs = factor;

        // Mark canvas as dirty to trigger re-rendering
        this.scale_dirty = true;

        return { x: this.vx, y: this.vy };
    }

    /**
     * Indicate that the canvas dimensions/resolution have changed and the renderer should update any relevant information.
     * Triggers a full re-render of the grid next frame.
     */
    update(): void {
        // Update viewport dimensions in grid units based on new canvas size
        // Rounded up to ensure integer width/height (Exact precision of viewport dimensions isn't important)
        const vw = Math.ceil(this.ctx.canvas.width / this.cell_size);
        const vh = Math.ceil(this.ctx.canvas.height / this.cell_size);

        if (vw === this.vw && vh === this.vh) return; // No change in viewport dimensions, do nothing

        // Update viewport dimensions, and mark canvas as dirty
        this.vw = vw;
        this.vh = vh;
        this.canvas_dirty = true;

        // Get new chunking candidate based on updated viewport dimensions
        const candidate = this.getChunkCandidate();

        // Check for difference in chunking strategy
        if (
            candidate.vw === this.chunk_width &&
            candidate.vh === this.chunk_height
        ) {
            return; // No change in chunking strategy, do nothing
        }

        // Update chunking strategy based on new candidate
        this.applyChunkCandidate(candidate);
    }

    /**
     * Get the x/y coordinates of the cell at some position in the canvas
     * @param x The x position on the canvas, given as a fraction from 0 (left) to 1 (right)
     * @param y The y position on the canvas, given as a fraction from 0 (top) to 1 (bottom)
     */
    getCell(x: number, y: number): { x: number; y: number } {
        // Get coordinates in grid space by applying inverse of current camera transformations to the given canvas coordinates
        return {
            x: Math.floor(
                (x * this.ctx.canvas.width) / (this.cell_size * this.vs) +
                    this.vx / this.vs,
            ),
            y: Math.floor(
                (y * this.ctx.canvas.height) / (this.cell_size * this.vs) +
                    this.vy / this.vs,
            ),
        };
    }

    /**
     * Compute the bounds of the viewport in chunk coordinates, based on the current camera position and zoom level
     * Each returned bound coordinate is garunteed to be an integer
     * Note that the bounds are inclusive-inclusive
     * @param intersect     Return the bounding box that intersects with the cell grid
     * @param chunk_width   The width of each chunk, in grid units (optional, defaults to current chunk width)
     * @param chunk_height  The height of each chunk, in grid units (optional, defaults to current chunk height)
     * @returns The bounds of the viewport in chunk coordinates
     */
    private getViewportBounds(
        intersect: boolean,
        chunk_width: number = this.chunk_width,
        chunk_height: number = this.chunk_height,
    ): {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
    } {
        const scale_factor_x = chunk_width * this.vs;
        const scale_factor_y = chunk_height * this.vs;

        // Convert vx/vy to cx/cy
        let cxMin = this.vx / scale_factor_x;
        let cyMin = this.vy / scale_factor_y;

        // Compute width of viewport in chunk coordinates
        let cxMax = cxMin + (this.vw - 1) / scale_factor_x;
        let cyMax = cyMin + (this.vh - 1) / scale_factor_y;

        // Intersect chunk bounding box with grid bounding box
        if (intersect) {
            cxMin = Math.max(cxMin, 0);
            cyMin = Math.max(cyMin, 0);
            cxMax = Math.min(
                cxMax,
                Math.floor((this.grid.width - 1) / chunk_width),
            );
            cyMax = Math.min(
                cyMax,
                Math.floor((this.grid.height - 1) / chunk_height),
            );
        }

        return {
            minX: Math.floor(cxMin),
            maxX: Math.floor(cxMax),
            minY: Math.floor(cyMin),
            maxY: Math.floor(cyMax),
        };
    }

    /**
     * Get a new chunking candidate based solely on the current viewport
     * Attempts to find the new dimensions of each chunk that would best fit the current viewport
     * Chunks are garunteed to be positive integers
     * @returns The dimensions of the new chunking candidate, in grid units
     */
    private getChunkCandidate(): {
        vw: number;
        vh: number;
    } {
        // Goal: Maintain as close to square chunks as possible
        // Greedy algorithm to fit aspect ratio
        // - Search for the # of chunks along each axis that is closest to the aspect ratio of the viewport
        // - Then compute the chunk width/height based on that # of chunks and the viewport size, rounding up
        // - GREEDY: Only add to dimensions of chunks, never remove

        // Get aspect ratio of viewport (in grid units)
        const desired_aspect_ratio = this.vw / this.vh;

        // Candidate chunk grid width/height (in chunk units)
        let cw: number = 1;
        let ch: number = 1;

        while (cw * ch < this.min_chunk_ct) {
            // Add to dimension that is furthest from the desired aspect ratio
            if (cw / ch < desired_aspect_ratio) cw++;
            else ch++;
        }

        // Get individual chunk width/height (in grid units) from overall chunk grid width/height (in chunk units)
        const vw = Math.ceil(this.vw / cw);
        const vh = Math.ceil(this.vh / ch);

        return { vw, vh };
    }

    /**
     * Update the chunking strategy based on a given chunking candidate, rebuilding chunks as necessary
     * Attempts to reuse as much chunk information as possible when rebuilding, to minimize the performance cost of rebuilding chunks
     * @param candidate The new chunking candidate to apply
     */
    private applyChunkCandidate(candidate: { vw: number; vh: number }): void {
        // Get bounding box of chunks that need to be built
        let { minX, maxX, minY, maxY } = this.getViewportBounds(
            true,
            candidate.vw,
            candidate.vh,
        );

        // Restore simple state of chunks while rebuilding to prevent future issues
        this.cancelSchedueledChunkRemovals();
        this.chunk_fl_scheduled.clear();

        // Build a new chunk map based on the new chunking strategy
        const new_chunks = new Map2D<number, chunk_entry>();

        // Loop through all new chunk coordinates within the bounding box
        for (let cy = minY; cy <= maxY; cy++) {
            // Get current chunk bounds in grid coordinates
            const gyMin = cy * candidate.vh;
            const gyMax = gyMin + candidate.vh - 1;

            for (let cx = minX; cx <= maxX; cx++) {
                const gxMin = cx * candidate.vw;
                const gxMax = gxMin + candidate.vw - 1;

                // Create chunk
                const new_chunk = this.buildChunk(
                    cx,
                    cy,
                    true,
                    candidate.vw,
                    candidate.vh,
                );

                // Get chunk bounds in current grid coordinates
                const { x: curr_min_x, y: curr_min_y } =
                    this.getChunkCoordsFromGrid(gxMin, gyMin);
                const { x: curr_max_x, y: curr_max_y } =
                    this.getChunkCoordsFromGrid(gxMax, gyMax);

                for (let ccy = curr_min_y; ccy <= curr_max_y; ccy++) {
                    for (let ccx = curr_min_x; ccx <= curr_max_x; ccx++) {
                        const chunk = this.getChunk(ccx, ccy, true);

                        const dest_x = (chunk.cx - cx) * candidate.vw;
                        const dest_y = (chunk.cy - cy) * candidate.vh;

                        // Copy all required data from old chunk to new
                        new_chunk.ctx.drawImage(
                            chunk.canvas,
                            dest_x,
                            dest_y,
                            this.chunk_width * this.cell_size,
                            this.chunk_height * this.cell_size,
                        );
                    }
                }

                new_chunks.set(cx, cy, new_chunk);
            }
        }

        // Replace old chunk map with new chunk map
        this.chunks = new_chunks;
        this.chunk_width = candidate.vw;
        this.chunk_height = candidate.vh;
    }

    /**
     * Get the chunk-space coordinates of the chunk that contains the given grid-space coordinates
     * @param x The x coordinate of the cell, in grid coordinates
     * @param y The y coordinate of the cell, in grid coordinates
     * @return The chunk-space coordinates of the chunk that contains the given grid-space coordinates
     */
    private getChunkCoordsFromGrid(
        x: number,
        y: number,
    ): { x: number; y: number } {
        // Get coordinates in chunk space
        const cx = Math.floor(x / this.chunk_width);
        const cy = Math.floor(y / this.chunk_height);

        return { x: cx, y: cy };
    }

    /**
     * Get a chunk by its coordinates. If the chunk doesn't exist, it is created and inserted into the chunk map before being returned.
     * @param cx    The x coordinate of the chunk, in chunk coordinates
     * @param cy    The y coordinate of the chunk, in chunk coordinates
     * @param populate  Whether to populate the chunk with cell data from the grid when building
     */
    private getChunk(cx: number, cy: number, populate: boolean): chunk_entry {
        let chunk = this.chunks.get(cx, cy);

        if (!chunk) {
            chunk = this.buildChunk(cx, cy, populate);
            this.chunks.set(cx, cy, chunk);
        }

        return chunk;
    }

    /**
     * Build a new empty chunk at some location, indicated by its coordinates
     * Note that this will _not_ insert the chunk into the chunk map
     * @param cx    The x coordinate of the chunk, in chunk coordinates
     * @param cy    The y coordinate of the chunk, in chunk coordinates
     * @param populate  Whether to populate the chunk with cell data from the grid when building
     * @param vw    The width of the chunk, in grid units
     * @param vh    The height of the chunk, in grid units
     * @return      The chunk entry for the newly built chunk
     */
    private buildChunk(
        cx: number,
        cy: number,
        populate: boolean,
        vw: number = this.chunk_width,
        vh: number = this.chunk_height,
    ): chunk_entry {
        // Create offscreen canvas for this chunk
        const canvas = document.createElement("canvas");
        canvas.width = vw * this.cell_size;
        canvas.height = vh * this.cell_size;

        const ctx = canvas.getContext("2d")!;

        const gx = cx * vw;
        const gy = cy * vh;

        const entry = { canvas, ctx, cx, cy, gx, gy };
        this.chunks.set(cx, cy, entry);

        if (this.debug.chunk) {
            const r = Math.floor(
                (((((232 + cx) * 73856093) ^ (cy * 19349663)) % 256) + 256) %
                    256,
            )
                .toString(16)
                .padStart(2, "0");
            const g = Math.floor(
                (((((101 + cx) * 83492791) ^ (cy * 265435761)) % 256) + 256) %
                    256,
            )
                .toString(16)
                .padStart(2, "0");
            const b = Math.floor(
                (((((200 + cx) * 15485863) ^ (cy * 32452843)) % 256) + 256) %
                    256,
            )
                .toString(16)
                .padStart(2, "0");

            ctx.fillStyle = `#${r}${g}${b}`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Fill chunk with cell data from grid if specified, otherwise leave blank
        if (populate) {
            this.fillChunk(cx, cy);
        }

        return entry;
    }

    /**
     * Schedule chunk to be rendered
     * @param cx    The x coordinate of the chunk to fill, in chunk coordinates
     * @param cy    The y coordinate of the chunk to fill, in chunk coordinates
     */
    private fillChunk(cx: number, cy: number): void {
        this.chunk_fl_scheduled.set(cx, cy, 0);
    }

    /**
     * Fill chunk with data from the grid
     * @param cx    The x coordinate of the chunk to fill, in chunk coordinates
     * @param cy    The y coordinate of the chunk to fill, in chunk coordinates
     * @param start_line    The line to start rendering at. Defaults to 0 (top-line)
     * @returns Whether the fill finished
     */
    private _fillChunk(
        cx: number,
        cy: number,
        start_line: number = 0,
    ): boolean {
        const chunk = this.chunks.get(cx, cy);
        if (!chunk) return true; // Invalid coordinates; Vacuously finished

        this.context.ctx = chunk.ctx;

        // Establish bounds to render as the intersection between this chunk and the cell grid
        const height =
            chunk.gy + this.chunk_height > this.grid.height
                ? this.grid.height - chunk.gy
                : this.chunk_height;
        const width =
            chunk.gx + this.chunk_width > this.grid.width
                ? this.grid.width - chunk.gx
                : this.chunk_width;

        for (let gy = start_line; gy < height; gy++) {
            // Out of time to fill; Push to fill schedule
            // Ensure not first line to ensure some progress is always made
            const now = performance.now();
            if (now >= this.chunk_fl_end && gy !== start_line) {
                // Mark chunk as dirty iff in debug mode
                if (this.debug.fill) this.chunks_dirty.add(cx, cy);

                this.chunk_fl_scheduled.set(cx, cy, gy);
                return false;
            }

            for (let gx = 0; gx < width; gx++) {
                // Transform for proper rendering
                this.context.ctx.resetTransform();
                this.context.ctx.scale(this.cell_size, this.cell_size);
                this.context.ctx.translate(gx, gy); // Offset relative to chunk origin

                // Render cell to chunk canvas
                const cell = this.grid.cell(chunk.gx + gx, chunk.gy + gy);
                cells.render(cell, this.context);
            }
        }

        // Mark chunk as dirty
        this.chunks_dirty.add(cx, cy);

        // Finished! Remove chunk from fill queue
        this.chunk_fl_scheduled.delete(cx, cy);

        return true;
    }

    /**
     * Update list of chunks scheduled for removal based on the current viewport
     */
    private updateActiveChunks(): void {
        const { minX, maxX, minY, maxY } = this.getViewportBounds(true);

        // Loop through all chunks currently scheduled for removal, and unschedule any chunks that are now within the viewport
        for (const [cx, cy, timeout] of this.chunk_rm_scheduled.entries()) {
            // Within viewport, unschedule for removal
            if (cx >= minX && cx <= maxX && cy >= minY && cy <= maxY) {
                clearTimeout(timeout);
                this.chunk_rm_scheduled.delete(cx, cy);
            }
        }

        // Loop through all chunks, and schedule any chunks that are outside the viewport for removal
        for (const [cx, cy, chunk] of this.chunks.entries()) {
            if (this.chunk_rm_scheduled.has(cx, cy)) continue; // Already scheduled for removal

            // Chunk outside of viewport, schedule for removal
            if (
                chunk.cx < minX ||
                chunk.cx > maxX ||
                chunk.cy < minY ||
                chunk.cy > maxY
            ) {
                this.chunk_rm_scheduled.set(
                    cx,
                    cy,
                    setTimeout(
                        this.removeChunk,
                        this.chunk_rm_debounce,
                        cx,
                        cy,
                    ),
                );
            }
        }

        // Loop through all required chunk indices, and build any that don't exist
        for (let cx = minX; cx <= maxX; cx++) {
            for (let cy = minY; cy <= maxY; cy++) {
                if (this.chunks.has(cx, cy)) continue; // Chunk already exists, skip

                const chunk = this.buildChunk(cx, cy, true);
                this.chunks.set(cx, cy, chunk);
            }
        }
    }

    /**
     * Cancel all scheduled chunk removals
     */
    private cancelSchedueledChunkRemovals(): void {
        for (const timeout of this.chunk_rm_scheduled.values()) {
            clearTimeout(timeout);
        }
        this.chunk_rm_scheduled.clear();
    }

    /**
     * Remove a chunk by its coordinates, clearing it from the chunk map and cancelling any scheduled removal timeouts
     * @param x The x coordinate of the chunk, in chunk coordinates
     * @param y The y coordinate of the chunk, in chunk coordinates
     */
    private removeChunk(x: number, y: number): void {
        this.chunk_rm_scheduled.delete(x, y); // Remove from scheduled removal
        this.chunk_fl_scheduled.delete(x, y); // Remove from scheduled fill
        this.chunks_dirty.delete(x, y); // Remove from dirty chunks, just in case
        this.chunks.delete(x, y); // Remove chunk from chunk map
    }
}
