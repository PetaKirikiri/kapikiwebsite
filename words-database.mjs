const knownPoolers = {
  uoojalfketvbrabemmek: 'aws-1-ap-south-1.pooler.supabase.com',
  evnqciqlzjzyjwfntwlk: 'aws-0-ap-southeast-2.pooler.supabase.com',
}

export function wordsDatabaseConnection(env = process.env) {
  const ref = /^([a-z0-9]+)\.supabase\.co$/.exec(new URL(env.WORDS_SUPABASE_URL).hostname)?.[1]
  if (!ref || !env.WORDS_DB_PASSWORD) throw new Error('Words database configuration is incomplete')
  const host = env.WORDS_DB_HOST || knownPoolers[ref]
  if (!host) throw new Error('Set WORDS_DB_HOST for this Supabase project')
  return {
    host,
    port: 6543,
    user: `postgres.${ref}`,
    password: env.WORDS_DB_PASSWORD,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  }
}
