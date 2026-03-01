# Quantum Rule

Automota rule that executes a set of rules in a random order

## Type Def

A sequence rule is defined using the following syntax

```ts
type sequence_rule = {
    type: "sequence";
    rules: rule_t[];
};
```

## Execution

The following basic algorithm is used to run the sequence rule. Note that this rule runs on every possible cell

1. Start on the first rule
2. Attempt to run the rule
3. On success: Exit with the applied changes
4. Otherwise: Queue the next rule, and go to step 2

In effect: This allows rules to be setup with separate priorities

## Example

The following sequence rule shows multiple rules running in succession

```ts
// Assume some rules have already been defined
const RULE_A: rule_t = {
    /* ... */
};
const RULE_B: rule_t = {
    /* ... */
};

const rule: sequence_rule = {
    type: "sequence",
    rules: [
        RULE_A, // Rule always attempts to run
        RULE_B, // Tries to run iff RULE_A fails
    ],
};
```
