# Sequence Rule

Automota rule that executes a sequence of rules in order

## Type Def

A quantum rule is defined using the following syntax

```ts
type quantum_rule = {
    type: "quantum";
    max?: number;
} & (
    | {
          weighted?: false;
          rules: rule_t[];
      }
    | {
          weighted: true;
          rules: { rule: rule_t; weight: number }[];
      }
);
```

## Weight

Weighting is used to allow one rule to have a higher likelihood of running than another. This value must be some non-negative real number. If 0: The child rule is disabled and has no chance of running.

If using the interface where weight is not provided, all rules are weighted evenly.

## Execution

The following basic algorithm is used to run the quantum rule. Note that this rule runs on every possible cell

1. Choose some random rule that has _not yet run_
2. Attempt to run the rule
3. On success: Exit with the applied changes
4. Otherwise: Mark this rule as run, and go back to step 1

This loop will exit prematurely if `max` iterations are reached.

## Max

The `max` property is used to limit the number of times a quantum rule runs. If the number of attempts exceeds this, the rule will fail. The value of this property functions as follows:

- `0` (DEFAULT): No limit on number of iterations
- `x (x > 0)`: Attempt to run up-to `x` child rules
- `-x (x > 0)`: Attempt to run all but the last `x` child rules

## Example

The following quantum rule shows multiple rules running in succession

```ts
// Assume some rules have already been defined
const RULE_A: rule_t = {
    /* ... */
};
const RULE_B: rule_t = {
    /* ... */
};
const RULE_C: rule_t = {
    /* ... */
};

const rule1: quantum_rule = {
    type: "quantum",
    rules: [RULE_A, RULE_B], // Run RULE_A and RULE_B with equal probability
};

const rule1: quantum_rule = {
    type: "quantum",
    rules: [
        {
            rule: RULE_A,
            weight: 2,
        },
        {
            rule: RULE_B,
            weight: 1,
        },
        {
            rule: RULE_C,
            weight: 1,
        },
    ], // Run RULE_A with twice the frequency of RULE_B
    max: 2, // Only run up-to 2 rules before failing
};
```
