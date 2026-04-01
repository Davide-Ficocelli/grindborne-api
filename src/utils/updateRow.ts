export default function updateRow(
  tableName: string,
  id: number,
  paramsObj: Object,
  errorMsg: string,
) {
  // Checking for eventual data flaws
  if (!tableName)
    throw new Error("A table's name to be updated must be specified");
  if (id === null || id === undefined)
    throw new Error("An id for the row to be updated must be specified");
  if (errorMsg === null || errorMsg === undefined)
    throw new Error(
      "An error message for no fields to be updated available must be provided",
    );

  const updates: Object = { ...paramsObj };

  const setClauses: string[] = [];
  const values: any[] = [id]; // $1 is ALWAYS id
  let paramIndex = 2; // from second position on for updateable fields

  // 2. Dynamically build SET and values
  for (const [keyName, keyValue] of Object.entries(updates)) {
    // Object.entries() returns a map [["name", "Strength"], ["description", "Lifting capacity"]]
    if (keyValue === undefined) continue; // skip fields not present

    setClauses.push(`${keyName} = $${paramIndex}`);
    values.push(keyValue as any);
    paramIndex++;
  }

  // 3. If there are no fields to update, throw error
  if (setClauses.length === 0) {
    throw new Error(errorMsg);
  }

  // 4. Mount the final query
  const query: string = `
    UPDATE ${tableName}
    SET ${setClauses.join(", ")}
    WHERE id = $1
    RETURNING *;
  `;

  return { query, values };
}
