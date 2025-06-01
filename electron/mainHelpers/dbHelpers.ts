import Database from "better-sqlite3";

export function createTable(db: Database.Database, tableName: string, columns: Record<string, string>) {
  const colDefs = Object.entries(columns)
    .map(([name, type]) => `${name} ${type}`)
    .join(",\n")
    // Removed redundant replace call as it has no effect.
  const createSql = `CREATE TABLE IF NOT EXISTS ${tableName} (\n${colDefs}\n);`;
  try {
    db.prepare(createSql).run();
  } catch (e) {
    console.error(createSql, e);
  }
  
  // Check for existing columns and their types
  const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all() as { name: string, type: string }[];
  const existingColumns = new Map(tableInfo.map(col => [col.name, col.type]));
  
  for (const [colName, colType] of Object.entries(columns)) {
    if (!existingColumns.has(colName) && !colName.startsWith("PRIMARY")) {
      // Add missing column
      const alterSql = `ALTER TABLE ${tableName} ADD COLUMN ${colName} ${colType}`;
      db.prepare(alterSql).run();
    } else if (existingColumns?.get(colName)?.toUpperCase() !== colType.toUpperCase().replaceAll(/PRIMARY KEY/g, "").trim()) {
      console.warn(
        `Column type mismatch in table ${tableName}: column "${colName}" has type "${existingColumns.get(colName)}" but "${colType}" was specified. ` +
        `SQLite doesn't support changing column types directly. Manual migration may be required.`
      );
    }
  }
}

export type InsertConflictMode = "default" | "ignore" | "replace";

export function insertRow(
  db: Database.Database,
  tableName: string,
  data: Record<string, any>,
  conflictMode: InsertConflictMode = "default"
) {
  const keys = Object.keys(data);
  const placeholders = keys.map(k => `@${k}`).join(", ");

  const conflictSQL =
    conflictMode === "ignore"
      ? "OR IGNORE"
      : conflictMode === "replace"
      ? "OR REPLACE"
      : "";

  const sql = `INSERT ${conflictSQL} INTO ${tableName} (${keys.join(
    ", "
  )}) VALUES (${placeholders})`;

  const stmt = db.prepare(sql);
  return stmt.run(data);
}

/**
 * Updates one or more rows in a table that match the specified WHERE condition
 * @param db The database instance
 * @param tableName The name of the table to update
 * @param data The data to update (column name to value mapping)
 * @param where The WHERE clause to identify which rows to update
 * @param params Parameters for the WHERE clause
 * @returns The result of the update operation
 */
export function updateRow(db: Database.Database, tableName: string, data: Record<string, any>, where: string, params: Record<string, any>) {
  const sets = Object.keys(data).map(k => `${k} = @set_${k}`).join(", ");
  const sql = `UPDATE ${tableName} SET ${sets} WHERE ${where}`;
  
  // Prepare the statement 
  const stmt = db.prepare(sql);
  
  // Combine data parameters (prefixed with set_) and WHERE clause parameters
  const boundParams = {
    ...Object.fromEntries(Object.entries(data).map(([k, v]) => [`set_${k}`, v])),
    ...params,
  };
  
  console.log("Executing SQL:", sql);
  // console.log("With params:", JSON.stringify(boundParams));
  
  // Execute the update
  const result = stmt.run(boundParams);
  console.log(`Updated ${result.changes} rows`);
  
  return result;
}

export function selectRows<T = any>(db: Database.Database, tableName: string, where?: string, params?: Record<string, any>): T[] {
  const sql = `SELECT * FROM ${tableName}` + (where ? ` WHERE ${where}` : "");
  const stmt = db.prepare(sql);
  return stmt.all(params ?? {}) as T[];
}

export function deleteRow(
  db: Database.Database,
  tableName: string,
  where: Record<string, any>
) {
  const keys = Object.keys(where);
  if (keys.length === 0) {
    throw new Error("WHERE condition required to prevent accidental full deletion.");
  }

  const conditions = keys.map(k => `${k} = @${k}`).join(" AND ");
  const sql = `DELETE FROM ${tableName} WHERE ${conditions}`;

  const stmt = db.prepare(sql);
  return stmt.run(where);
}