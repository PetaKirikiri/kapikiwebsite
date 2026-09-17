import { test } from 'node:test'
import assert from 'node:assert/strict'
import { wordsDatabaseConnection } from './words-database.mjs'

test('Sydney project uses the Sydney pooler', () => {
  const result = wordsDatabaseConnection({ WORDS_SUPABASE_URL: 'https://evnqciqlzjzyjwfntwlk.supabase.co', WORDS_DB_PASSWORD: 'test' })
  assert.equal(result.host, 'aws-0-ap-southeast-2.pooler.supabase.com')
  assert.equal(result.user, 'postgres.evnqciqlzjzyjwfntwlk')
})
test('Mumbai remains supported during migration rollback', () => {
  assert.equal(wordsDatabaseConnection({ WORDS_SUPABASE_URL: 'https://uoojalfketvbrabemmek.supabase.co', WORDS_DB_PASSWORD: 'test' }).host, 'aws-1-ap-south-1.pooler.supabase.com')
})
test('unknown projects cannot silently connect to Mumbai', () => {
  assert.throws(() => wordsDatabaseConnection({ WORDS_SUPABASE_URL: 'https://unknown.supabase.co', WORDS_DB_PASSWORD: 'test' }), /WORDS_DB_HOST/)
})
test('host override is supported for future migrations', () => {
  assert.equal(wordsDatabaseConnection({ WORDS_SUPABASE_URL: 'https://unknown.supabase.co', WORDS_DB_PASSWORD: 'test', WORDS_DB_HOST: 'pooler.example.test' }).host, 'pooler.example.test')
})
