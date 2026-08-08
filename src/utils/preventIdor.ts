const preventIdor = function (
  authenticatedUserId: string,
  dataOwnerId: string,
): { isIdorDetected: boolean; status?: number; message?: string } {
  if (authenticatedUserId !== dataOwnerId) {
    return {
      isIdorDetected: true,
      status: 403,
      message: "Data owner and authenticated user don't match",
    };
  } else
    return {
      isIdorDetected: false,
    };
};
export default preventIdor;
