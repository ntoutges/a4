# Canvas Renderer

Used to render cells to an HTML canvas.

## Data

A canvas renderer requires the following information

```ts
type canvas_renderer = {
    type: "canvas";

    canvas: HTMLCanvasElement;
    size: number;
};
```

- `canvas`: The canvas to render to
- `size`: The number of `px` to represent a single unit (cell) in the canvas

## Instantitation

Pass the `canvas_render` object to the `render.compile()` function, then call the `render` method on the returned object to render the grid.

## Interface

To facilitate an interactive GUI, the compiled canvas renderer exposes the following methods

### draw

`animate(): void`

Update the visible canvas with the internal data. If not called, the internal image buffer will _never_ be rendered to the external canvas.

### offset

`offset(x: number, y: number): void`

Offset the internal 2d camera by some amount (in px) to pan across the grid. This is given as an absolute offset from the origin, _not_ a relative offset from the current position.

### scale

`scale(factor: number): void`

Scale the virtual 2d camera by some factor to zoom in/out of the grid. This is given as an absolute scale factor, _not_ a relative factor from the current zoom level.

### update

`update(): void`

Indicate that the canvas dimensions/resolution have changed and the renderer should update any relevant information. Triggers a full re-render of the grid next frame.

## Usage

The following context is passed to cells during rendering

```ts
export type canvas_ctx = {
    ctx: CanvasRenderingContext2D;
};
```

Cells are expected to use the built-in `ctx` commands to render to the canvas.
All cell rendering must take place within the unit square ((0,0) - (1,1)). The canvas render handles placing the rendered cell output at the correct place.
