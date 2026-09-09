import { z } from 'zod'
import { learnedWordSchema } from '../busManifestContract'

export const investigationDatabaseSchemaSchema = z.enum(['public', 'words_clean'])

export const investigationDatabaseIdentifierSchema = z.string().regex(
  /^[a-z][a-z0-9_]*$/u,
  'Database identifiers must use the current lowercase snake-case shape.',
)

const investigationDatabaseColumnSchema = z.object({
  name: investigationDatabaseIdentifierSchema,
  type: z.string().trim().min(1),
  nullable: z.boolean(),
}).strict()

const investigationDatabaseReferenceSchema = z.object({
  table: investigationDatabaseIdentifierSchema,
  columns: z.array(investigationDatabaseIdentifierSchema).min(1).readonly(),
}).strict()

const investigationDatabaseForeignKeySchema = z.object({
  columns: z.array(investigationDatabaseIdentifierSchema).min(1).readonly(),
  references: investigationDatabaseReferenceSchema,
}).strict().superRefine((foreignKey, context) => {
  if (foreignKey.columns.length !== foreignKey.references.columns.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['references', 'columns'],
      message: 'A foreign key must reference exactly one target column per source column.',
    })
  }
})

const investigationDatabaseTableSchema = z.object({
  name: investigationDatabaseIdentifierSchema,
  rowCount: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  columns: z.array(investigationDatabaseColumnSchema).min(1).readonly(),
  primaryKey: z.array(investigationDatabaseIdentifierSchema).readonly(),
  foreignKeys: z.array(investigationDatabaseForeignKeySchema).readonly(),
}).strict()

export const investigationDatabaseLayoutSchema = z.object({
  schema: investigationDatabaseSchemaSchema,
  tables: z.array(investigationDatabaseTableSchema).min(1).max(100).readonly(),
}).strict().superRefine((layout, context) => {
  const tableByName = new Map(layout.tables.map((table) => [table.name, table] as const))

  for (let tableIndex = 0; tableIndex < layout.tables.length; tableIndex++) {
    const table = layout.tables[tableIndex]!
    const previousTable = layout.tables[tableIndex - 1]
    if (previousTable != null && previousTable.name >= table.name) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tables', tableIndex, 'name'],
        message: 'Database tables must be unique and ordered alphabetically.',
      })
    }

    const columnNames = new Set<string>()
    table.columns.forEach((column, columnIndex) => {
      if (columnNames.has(column.name)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['tables', tableIndex, 'columns', columnIndex, 'name'],
          message: 'Database column names must be unique within a table.',
        })
      }
      columnNames.add(column.name)
    })

    const primaryKeyColumns = new Set<string>()
    table.primaryKey.forEach((columnName, keyIndex) => {
      if (primaryKeyColumns.has(columnName) || !columnNames.has(columnName)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['tables', tableIndex, 'primaryKey', keyIndex],
          message: 'Every primary-key column must name one unique column in this table.',
        })
      }
      primaryKeyColumns.add(columnName)
    })

    table.foreignKeys.forEach((foreignKey, foreignKeyIndex) => {
      const sourceColumns = new Set<string>()
      foreignKey.columns.forEach((columnName, columnIndex) => {
        if (sourceColumns.has(columnName) || !columnNames.has(columnName)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['tables', tableIndex, 'foreignKeys', foreignKeyIndex, 'columns', columnIndex],
            message: 'Every foreign-key source column must name one unique column in this table.',
          })
        }
        sourceColumns.add(columnName)
      })

      const target = tableByName.get(foreignKey.references.table)
      if (target == null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['tables', tableIndex, 'foreignKeys', foreignKeyIndex, 'references', 'table'],
          message: 'Every foreign key must reference a table in this live schema layout.',
        })
        return
      }
      const targetColumns = new Set(target.columns.map((column) => column.name))
      const referencedColumns = new Set<string>()
      foreignKey.references.columns.forEach((columnName, columnIndex) => {
        if (referencedColumns.has(columnName) || !targetColumns.has(columnName)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [
              'tables',
              tableIndex,
              'foreignKeys',
              foreignKeyIndex,
              'references',
              'columns',
              columnIndex,
            ],
            message: 'Every referenced column must name one unique column in the target table.',
          })
        }
        referencedColumns.add(columnName)
      })
    })
  }
})

export type InvestigationDatabaseLayout = z.infer<
  typeof investigationDatabaseLayoutSchema
>
export type InvestigationDatabaseSchema = z.infer<
  typeof investigationDatabaseSchemaSchema
>

export const investigationLearnedWordSchema = learnedWordSchema
export const investigationLearnedWordsSchema = z.array(investigationLearnedWordSchema).readonly()
export type InvestigationLearnedWord = z.infer<typeof investigationLearnedWordSchema>

export function parseInvestigationDatabaseLayout(
  value: unknown,
): InvestigationDatabaseLayout {
  return investigationDatabaseLayoutSchema.parse(value)
}

export function parseInvestigationLearnedWords(value: unknown): readonly InvestigationLearnedWord[] {
  return investigationLearnedWordsSchema.parse(value)
}
