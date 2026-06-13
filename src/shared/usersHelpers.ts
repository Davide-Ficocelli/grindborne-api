// Calculate user's level
export const calculateUserLvlHelper = function (
  userAttributesLvls: number[],
): number {
  // Perform the calculation to get user level
  // Sum all of the levels

  const attributesLvlTotal = userAttributesLvls.reduce(
    (sum, lvl) => sum + lvl,
    0,
  );
  console.log(`attributesLvlTotal: ${attributesLvlTotal}`);

  // Subtract to the total the number of the attributes minus 1
  const userLevel = attributesLvlTotal - (userAttributesLvls.length - 1);

  return userLevel;
};
