import Database from "better-sqlite3";

export function createTable(db: Database.Database, tableName: string, columns: Record<string, string>) {
  const colDefs = Object.entries(columns)
    .map(([name, type]) => `${name} ${type}`)
    .join(", ");
  const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${colDefs})`;
  db.prepare(sql).run();
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


export function updateRow(db: Database.Database, tableName: string, data: Record<string, any>, where: string, params: Record<string, any>) {
  const sets = Object.keys(data).map(k => `${k} = @set_${k}`).join(", ");
  const sql = `UPDATE ${tableName} SET ${sets} WHERE ${where}`;
  const stmt = db.prepare(sql);
  const boundParams = {
    ...Object.fromEntries(Object.entries(data).map(([k, v]) => [`set_${k}`, v])),
    ...params,
  };
  return stmt.run(boundParams);
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