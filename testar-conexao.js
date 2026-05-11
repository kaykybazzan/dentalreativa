const { Pool } = require('pg')

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'dentalreativa',
  user: 'postgres',
  password: 'Bazzan01'
})

async function criarTabelas() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Clinica" (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        cidade VARCHAR(255),
        telefone VARCHAR(50),
        "numDentistas" VARCHAR(50),
        "ticketMedio" FLOAT DEFAULT 300,
        plano VARCHAR(50) DEFAULT 'fundador',
        "criadaEm" TIMESTAMP DEFAULT NOW()
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Usuario" (
        id SERIAL PRIMARY KEY,
        "clinicaId" INT NOT NULL REFERENCES "Clinica"(id),
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        "senhaHash" VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        "criadoEm" TIMESTAMP DEFAULT NOW()
      )
    `)

    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE "StatusPaciente" AS ENUM (
          'ativo', 'em_risco', 'contatado',
          'aguardando_resposta', 'recuperado', 'perdido', 'nao_contatar'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Paciente" (
        id SERIAL PRIMARY KEY,
        "clinicaId" INT NOT NULL REFERENCES "Clinica"(id),
        nome VARCHAR(255) NOT NULL,
        telefone VARCHAR(50) NOT NULL,
        "telefoneBruto" VARCHAR(50),
        email VARCHAR(255),
        "ultimaConsulta" TIMESTAMP,
        procedimento VARCHAR(255),
        "valorUltimaConsulta" FLOAT,
        status "StatusPaciente" DEFAULT 'ativo',
        "tentativaAtual" INT DEFAULT 0,
        "ultimaTentativa" TIMESTAMP,
        "dadosIncompletos" BOOLEAN DEFAULT false,
        "criadoEm" TIMESTAMP DEFAULT NOW(),
        "atualizadoEm" TIMESTAMP DEFAULT NOW()
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "ContactAttempt" (
        id SERIAL PRIMARY KEY,
        "pacienteId" INT NOT NULL REFERENCES "Paciente"(id),
        "clinicaId" INT NOT NULL,
        "tentativaNumero" INT NOT NULL,
        "mensagemEnviada" TEXT,
        "valorRecuperado" FLOAT,
        tipo VARCHAR(50) NOT NULL,
        "criadoEm" TIMESTAMP DEFAULT NOW()
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "ConfiguracaoMensagens" (
        id SERIAL PRIMARY KEY,
        "clinicaId" INT UNIQUE NOT NULL REFERENCES "Clinica"(id),
        "diasGatilho" INT DEFAULT 180,
        "diasEntreTentativa2" INT DEFAULT 3,
        "diasEntreTentativa3" INT DEFAULT 5,
        mensagem1 TEXT,
        mensagem2 TEXT,
        mensagem3 TEXT
      )
    `)

    console.log('✅ Todas as tabelas criadas com sucesso!')
  } catch (err) {
    console.error('❌ Erro:', err.message)
  } finally {
    await pool.end()
  }
}

criarTabelas()