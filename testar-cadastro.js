const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

const pool = new Pool({ host: 'localhost', port: 5432, database: 'dentalreativa', user: 'postgres', password: 'bazzan01' })

async function testarCadastro() {
  try {
    const senhaHash = await bcrypt.hash('123456', 10)
    
    const clinica = await pool.query(
      `INSERT INTO "Clinica" (nome, cidade, telefone) VALUES ($1, $2, $3) RETURNING id`,
      ['Clínica Teste Login', 'Blumenau', '47999999999']
    )
    
    const clinicaId = clinica.rows[0].id
    
    await pool.query(
      `INSERT INTO "Usuario" ("clinicaId", nome, email, "senhaHash") VALUES ($1, $2, $3, $4)`,
      [clinicaId, 'Admin Teste', 'admin@teste.com', senhaHash]
    )
    
    console.log('✅ Usuário criado com sucesso!')
    console.log('Email: admin@teste.com')
    console.log('Senha: 123456')
  } catch (err) {
    console.error('❌ Erro:', err.message)
  } finally {
    await pool.end()
  }
}

testarCadastro()
