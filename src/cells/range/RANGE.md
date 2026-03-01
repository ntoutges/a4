# Range Cell

Cell type for representing a range of values between two cells

## Data

A Range cell contains the following information:

```ts
type range_cell = {
    type: "range";

    min: cell_t;
    max: cell_t;
};
```

Note that the min/max properties are _inclusive_. This cell type currently explicitly supports the following low/high bounds:

- `color`

All types will use the built-in `lt`/`gt` methods, but will be non-generating.
