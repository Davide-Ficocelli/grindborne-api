import handleResponse from "./handleResponse.ts";

const preventIdor = function (
  res: any,
  authenticatedUserId: number,
  dataOwnerId: number,
): { isIdorDetected: boolean } {
  if (authenticatedUserId !== dataOwnerId) {
    handleResponse(res, 403, "Data owner and authenticated user don't match");
    return {
      isIdorDetected: true,
    };
  } else return { isIdorDetected: false };
};
export default preventIdor;
