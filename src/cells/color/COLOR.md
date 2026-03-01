# Color Cell

Cell type for colored cells

## Data

A color cell contains the following information:

```ts
type color_cell = {
    type: "color";
    r?: number;
    g?: number;
    b?: number;
};
```

Note that all values are clamped to be in the range [0, 255]. This information is used to render a single color the the screen. If a value is not given, it defaults to 0.
