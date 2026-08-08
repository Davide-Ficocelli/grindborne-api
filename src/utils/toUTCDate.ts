// Turns a local date in UTC format
const toUTCDate = (localDate: Date) =>
  new Date(
    Date.UTC(
      localDate.getUTCFullYear(),
      localDate.getUTCMonth(),
      localDate.getUTCDate(),
    ),
  );

export default toUTCDate;
