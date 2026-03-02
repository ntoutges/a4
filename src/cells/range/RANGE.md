# Range Cell

Cell type for representing a range of values between two cells

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

Note that the min/max properties are _inclusive_. This cell type currently explicitly supports the following low/high bounds:

- `color`

All other types will use the built-in `lt`/`gt` methods, but will be non-generating. Note that uses of `lt`/`gt` will be skipped if types don't match min/max. In this case: the match will fail.
