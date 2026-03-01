# NOT Cell

Cell type for inverting cell selection

## Data

A NOT cell contains the following information:

```ts
type not_cell = {
    type: "not";
    cell: cell_t;
};
```

This relies heavily on the underlying functionality of the base cell, inverting the outputs of all boolen expressions.
