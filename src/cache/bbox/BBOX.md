# Bounding Box Cache

Used to restrict cells in a cache to those which have had some diff'ed cell within a given bounding box

## Data

```ts
type bbox_cache = {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;

    base: _cells.fcell_t;
    watch?: _cells.fcell_t[];
};
```

All x/y coordinates are given in grid units, relative to the cell-of-interest.
Values _must_ be given as integer coordinates.

- `base`: The base cell type to build the bounding boxes around
- `watch`: If given: Only cells in this array will be checked against the spatial partiioning grid. Otherwise: all cell diffs will be checked

## Spatial Partitioning

The bbox works by dividing the full grid into a smaller partitioned sub-grid (denoted pgrid), where each pcell is made of a rectangular bounding box of the underlying grid.

The size of each pcell is determined by the bbox data, where:

- width: `maxX - minX - 1`
- height: `maxY - minY - 1`

This pgrid is sparsely stored. To check if some diff lies in the grid, the diff is first converted from gridspace to pgridspace, then:

1. If the diff lies in an occupied pcell, that pcell (and all associated cells in the cache) are added to the cache entry
2. If the pcells to the immediate left, right, and/or top-left of the diff are occupied, they are added to the cacne entry
