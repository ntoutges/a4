import * as grid from "./grid_types.js";
import * as diffs from "./diff_types.js";

/** Registry of all registered rule types for type validation */
export interface rule_registry {}

export type rule_t = {
    [K in keyof rule_registry]: rule_registry[K]["user"];
}[keyof rule_registry];

export type frule_t = {
    [K in keyof rule_registry]: {
        rule: Rule<rule_registry[K]["user"], rule_registry[K]["comp"]>;
        data: rule_registry[K]["comp"];
    };
}[keyof rule_registry];

export type base_rule = {
    metadata: {
        /** The minimum x coordinate of the rule's bounding box */
        minX: number;

        /** The minimum y coordinate of the rule's bounding box */
        minY: number;

        /** The maximum x coordinate of the rule's bounding box */
        maxX: number;

        /** The maximum y coordinate of the rule's bounding box */
        maxY: number;
    };
};

export enum bbox_modes {
    /** Execute on all cells in the grid */
    ALL,

    /** Execute on all cells within some rectangular bounding box */
    RECT,

    /** Execute on select cells */
    POINTS,

    /** Rect + Points; Points should not be included within the bounding box */
    HYBRID,
}

export type bbox_t =
    | {
          mode: bbox_modes.ALL;
      }
    | {
          mode: bbox_modes.RECT;

          /** The minimum x coordinate of the bounding box */
          minX: number;

          /** The minimum y coordinate of the bounding box */
          minY: number;

          /** The maximum x coordinate of the bounding box */
          maxX: number;

          /** The maximum y coordinate of the bounding box */
          maxY: number;
      }
    | {
          mode: bbox_modes.POINTS;

          /** The points to the rule on */
          points: {
              x: number;
              y: number;
          }[];
      }
    | {
          mode: bbox_modes.HYBRID;

          /** The minimum x coordinate of the bounding box */
          minX: number;

          /** The minimum y coordinate of the bounding box */
          minY: number;

          /** The maximum x coordinate of the bounding box */
          maxX: number;

          /** The maximum y coordinate of the bounding box */
          maxY: number;

          /** The points to the rule on */
          points: {
              x: number;
              y: number;
          }[];
      };

/**
 * Cache bbox; Used to cache bbox point positions
 */
export type cbbox_t =
    | {
          all: true;
      }
    | {
          all: false;

          rect: {
              /** The minimum x coordinate of the bounding box */
              minX: number;

              /** The minimum y coordinate of the bounding box */
              minY: number;

              /** The maximum x coordinate of the bounding box */
              maxX: number;

              /** The maximum y coordinate of the bounding box */
              maxY: number;
          };

          // The set of point indices to run some rule on
          points: Set<number>;
      };

export type preexec_t = {
    /** Describes the points to run the rule on. Note that this specifies the _origin_ points to run */
    bbox: bbox_t;
};

/**
 * Used to define rules to run on the cell grid
 * @template R  Runtime pre-compiled rule data
 * @template C  Compiled rule data
 */
export type Rule<R, C extends base_rule> = {
    // Rule name
    readonly type: string;

    /**
     * Compile a user-friendly rule for runtime use
     * @param rule  The user-friendly rule to compile
     * @returns     The computer-friendly compiled rule to be used at runtime
     */
    compile(rule_data: Rule<R, C>, rule: R): frule_t;

    /**
     * Run once before running `exec` on all available cells.
     * Used to setup any necessary data, and tell the system how to run this rule.
     * @param rule  The compiled rule to be executed
     * @param grid  The grid that the rule will later be run on
     * @param diffs All diffs from previous iteration
     * @returns Data about how this rule should be executed this tick
     */
    preexec(
        rule: C,
        grid: Readonly<grid.grid_slice_t>,
        diffs: Required<diffs.diffs>,
    ): preexec_t;

    /**
     * Execute a compiled rule on a cell
     * @param rule    The compiled rule to execute
     * @param cell    The cell to execute the rule on
     * @param x       The x coordinate of the cell to execute the rule on
     * @param y       The y coordinate of the cell to execute the rule on
     * @param grid    The entire cell grid, used for rules that need to access other cells during execution
     * @param diffs   A set of cell positions that have already been modified by this rule in the current step, used to prevent multiple modifications to the same cell in the same step
     * @returns       The cell differences resulting from executing the rule on the cell. If null: rule failed to execute due to unmet requirements, if cdiff: rule executed successfully with the resulting cell difference, if empty array: rule executed successfully with no cell difference
     */
    exec(
        rule: C,
        x: number,
        y: number,
        grid: Readonly<grid.grid_slice_t>,
        diffs: ReadonlySet<number>,
    ): diffs.diffs | null;
};
