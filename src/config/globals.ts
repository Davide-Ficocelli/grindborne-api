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
