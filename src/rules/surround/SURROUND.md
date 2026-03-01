# Surround Rule

Automata rule that executes based on the number of cells surrounding another cell

Useful for automata like Conway's Game of Life

## Type Def

A surround cell is defined using the following syntax

```ts
type surround_rule = {
    type: "surround";
    mask: string; // Mask indicating the cells to watch
    after: string; // Pulls from `scope` db

    min?: number;
    max?: number;
} & (
    | {
          weighted?: false;
          scope: Record<string, _cells.cell_t>;
      }
    | {
          weighted: true;
          scope: Record<string, { cell: _cells.cell_t; weight: number }>;
      }
);
```

## Properties

### Mask

The mask is used to determine which parts of the grid surrounding the cell should be counted. This is laid out as a picture, which funcitons the same as the picture used in the `spatial` rule.

### After

This property determines what the origin cell becomes if the rule succeeds. Pulls from the same scope storage as the `mask`, however this is only a single token

### Scope

Tokens (from the mask's picture) that appear in the scope are counted towards the final sum of the scope. Those that don't appear in the scope are ignored for the purposes of counting.

The only exception to this general rule is the `@` token. This is _never_ counted towards the total. If the scope includes this token, the cell _must_ match, otherwise the rule fails.

If using the advanced version of the scope (with an added `weight` option), the weight value is added to the running total whenever a mathcing cell is found within the masked area. Note that this weight can be any real number.

### Min/Max

The surround rule works off of thresholding rules. If the sum total of the surrounding cound is within some range of values (bounded by min/max \[inclusive\]): The rule will succeed in running.

Note that the default values of min/max are shown below:

- min: -Infinity
- max: Infinity

Notice that if neither min/max are specified, this rule will _always_ be active.

## Example

The following surround rule shows the death portion of Conway's Game of Life

```ts

// Assume air/water are defined cell types
const alive: cell_t = { /* ... */ };
const dead: cell_t = { /* ... */ };

const rule: spatial_rule = {
    type: "surround",
    mask: `A A A
           A @ A
           A A A`
    scope: {
        "@": alive,
        "A": alive
    },
    min: 4, // >= 4 alive neighbors => overcrowding => dead
    after: dead
}
```
