# Terminal Renderer

Used to render cells to the terminal. Assumes text width:height ratio is ~1:2

## Data

A terminal renderer requires the following information

```ts
type terminal_render = {
    type: "terminal";

    write: (text: string) => void;
    clear: () => void;
};
```

- `write`: writes some frame data to the terminal
- `clear` clears the terminal screen

## Instantiation

Pass the `terminal_render` object to the `render.compile()` function, then call the `render` method on the returned object to render the grid.

## Usage

The following context is passed to cells during rendering

```ts
export type terminal_ctx = {
    color: (color: string) => void;
    text: (text: string) => void;
};
```

- `color`: Set the color of the cell to be rendered, using hex color codes (e.g. `#ff0000` for red)
- Set the text of the cell to be rendered; Text must be 2 characters; Any more will be truncated; Any fewer will be padded with spaces on the right

Call these methods to setup the individual cell's appearance in the terminal
