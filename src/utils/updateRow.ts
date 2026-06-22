export default function updateRow(
  tableName: string,
  id: string,
  paramsObj: Object,
  errorMsg: string,
  updatedByUser: boolean = false, // <-- Added parameter, defaults to false
) {
  // Checking for eventual data flaws
  if (!tableName)
    throw new Error("A table's name to be updated must be specified");
  if (id === null || id === undefined || !id)
    throw new Error("An id for the row to be updated must be specified");
  if (errorMsg === null || errorMsg === undefined)
    throw new Error(
      "An error message for no fields to be updated available must be provided",
    );

  const setClauses: string[] = [];
  const values: any[] = [id]; // $1 is ALWAYS id
  let paramIndex = 2;

  // 1. Loop ONLY over the provided payload
  for (const [keyName, keyValue] of Object.entries(paramsObj)) {
    // Object.entries() returns a map [["name", "Strength"], ["description", "Lifting capacity"]]
    if (keyValue === undefined) continue; // skip fields not present

    setClauses.push(`${keyName} = $${paramIndex}`);
    values.push(keyValue as any);
    paramIndex++;
  }

  // 2. Safety Check: Throw error if the user provided no valid fields
  if (setClauses.length === 0) {
    throw new Error(errorMsg);
  }

  // 3. Now that we know a valid update is happening, append our audit column
  setClauses.push(`updated_by_user = $${paramIndex}`);
  values.push(updatedByUser);

  // 4. Mount the final query
  const query: string = `
    UPDATE ${tableName}
    SET ${setClauses.join(", ")}
    WHERE id = $1
    RETURNING *;
  `;

  return { query, values };
}
