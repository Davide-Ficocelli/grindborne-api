export const STARTING_GRACE_PERIOD_IN_DAYS: number = 7;

/*
  Represents all breakpoints and multipliers for estimated time
  The user will get input a certain number of minutes they think it will take for their quest to complete
  and breakpoints are defined to adjust the amount of xp reward they'll get from it
*/
type EstimatedTimeBreakpoints = {
  breakpoints: number[];
  xpMultipliers: number[];
  standardXpMultiplier: number;
};

export const ESTIMATED_TIME_BREAKPOINTS: EstimatedTimeBreakpoints = {
  breakpoints: [10, 30, 60, 90, 120, 150, 180, 210],
  xpMultipliers: [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9],
  standardXpMultiplier: 1,
};

// Represents the number of average attributes levels the user must go through to scale their build up
export const REQUIRED_AVG_ATTR_LVLS_FOR_BUILD_SCALING: number = 10;

// Represents the percentage with which a new attribute scales the required xp cost to go to the next level
export const NEW_ATTR_LEVEL_XP_COST_SCALING: number = 0.2;

// Represents the percent amount of xp to next level to be removed from an attribute per decay tick
export const DECAY_BASE_PERCENT = 0.2; // 20% of xp_to_next_level per decay tick
