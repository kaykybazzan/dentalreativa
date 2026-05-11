import { Pool } from 'pg'

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'dentalreativa',
  user: 'postgres',
  password: 'bazzan01'
})

export { pool }
