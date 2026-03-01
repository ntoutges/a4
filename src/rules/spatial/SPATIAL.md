# Spatial Rule

Automota rule that executes based on user-defined pictures

## Type Def

A spatial rule is defined using the following syntax

```ts
type spatial_rule = {
    type: "spatial";
    before: string; // Before picture
    after: string; // After picture
    scope: Record<string, cells.cell_t>;
};
```

## Pictures

A picture is a string following these rules:

Pictures are made of tokens, where a token is separated from neighboring tokens by whitespace. Tokens are one or more characters of non-whitespace characters. Tokens after newlines are treated as being in a different row than tokens _before_ newlines, meaning that pictures are 2D. However, only token row indices matter, their actual location in the string does not matter. The following two strings are identical

```ts
const pic1 = `A B
                C D`;

const pic2 = `A B
C                 D`;
```

Tokens are used to describe the shape of some slice of the grid, and is used for the rule matching pattern (`before`) and rule output (`after`). Each token is directly mappable to a cell type, which is defined in the `scope` section of the rule.

The special `@` token is used in the `before` picture to define the origin of the picture, and is used to position the overall picture in gridspace. Note that this token has no special significance in the `after` picture.

- Having more than one `@` tokens is considered invalid, and will throw a compilation error
- If the `@` token is not present: The origin is assumed to be the top-left token

Below is an example of using the `@` token to center a picture

```ts
const pic3 = `A B C
              D @ E
              F G H`;
```

If a token is not ascribed a value in the `scope` section, it is assumed a free token, freely matching any cell in that spot. All free identical free tokens _must_ match. More than one type of free token is allowed to exist at once.

## Execution

The following basic algorithm is used to run the spatial rule. Note that this rule runs on every possible cell

1. Check if all cells surrounding the executed cell match the pattern. If not: Exit;
2. Resolve free cell types from the `before` state to the `after` state
3. Apply required changes

## Example

The following spatial rule shows a bubble of air moving upwards

```ts

// Assume air/water are defined cell types
const air: cell_t = { /* ... */ };
const water: cell_t = { /* ... */ };

const rule: spatial_rule = {
    type: "spatial",
    before: `B
             @`
    after: `@
            B`
    scope: {
        "@": air,
        "B": water
    }
}
```
