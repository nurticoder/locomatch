import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
export const workspaceState = sqliteTable("workspace_state", {
  id: text("id").primaryKey(),
  revision: integer("revision").notNull().default(1),
  dataJson: text("data_json").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export const credentials = sqliteTable("credentials", {
  id: text("id").primaryKey(),
  encryptedValue: text("encrypted_value").notNull(),
});
