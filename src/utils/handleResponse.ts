// Standardized response function
const handleResponse = <T>(
  res: any,
  ok: boolean,
  status: number,
  message: string,
  data?: T,
) => {
  res.status(status).json({
    ok,
    status,
    message,
    data,
  });
};

export default handleResponse;
