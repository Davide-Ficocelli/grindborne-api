import handleResponse from "./handleResponse.ts";

const preventIdor = function (
  authenticatedUserId: number,
  dataOwnerId: number,
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
