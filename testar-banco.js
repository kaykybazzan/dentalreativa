const { Pool } = require('pg')
const pool = new Pool({ host: 'localhost', port: 5432, database: 'dentalreativa', user: 'postgres', password: 'bazzan01' })

async function testar() {
  try {
    // Inserir uma clínica de teste
    await pool.query(`
      INSERT INTO "Clinica" (nome, cidade, telefone) 
      VALUES ('Clínica Teste', 'Blumenau', '47999999999')
      ON CONFLICT DO NOTHING
    `)
    
    // Buscar a clínica
    const result = await pool.query(`SELECT * FROM "Clinica"`)
    console.log('✅ Clínicas no banco:', result.rows)
    
  } catch (err) {
    console.error('❌ Erro:', err.message)
  } finally {
    await pool.end()
  }
}

testar()
