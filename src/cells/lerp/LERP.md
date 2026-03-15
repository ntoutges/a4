# LERP Cell

Cell type for representing a range of values between two cells, where the internal ratio between values is held constant. Note that this represents a special case of the `range` cell.

## Data

A Range cell contains the following information:

```ts
type range_cell<T extends cell_t> = {
    type: "range";

    min: T;
    max: T;
};
```

Notice: Both min and max must be of the same type.

Note that the min/max properties are _inclusive_. This cell type only supports the following low/high bounds:

- `color`

All other types will fail, as the `lerp` cell doesn't know what internal ratios to hold constant.
