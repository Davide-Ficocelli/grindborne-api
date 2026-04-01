// Standardized response function
const handleResponse = <T>(
  res: any,
  status: number,
  message: string,
  data?: T,
) => {
  res.status(status).json({
    status,
    message,
    data,
  });
};

export default handleResponse;
