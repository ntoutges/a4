# Range Cell

Cell type for representing one of a random set of values

## Data

A set cell contains the following information:

```ts
type set_cell = {
    type: "set";
    cells: cell_t[];
};
```

When generating cells: a random cell from teh `cell` list is chosen.
