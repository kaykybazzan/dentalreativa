import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { pool } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { nome, email, senha, nomeDaClinica, cidade, telefone } = await req.json()

    if (!nome || !email || !senha || !nomeDaClinica) {
      return NextResponse.json({ success: false, error: 'Campos obrigatórios faltando' }, { status: 400 })
    }

    const emailExiste = await pool.query(`SELECT id FROM "Usuario" WHERE email = $1`, [email])
    if (emailExiste.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'Email já cadastrado' }, { status: 400 })
    }

    const senhaHash = await bcrypt.hash(senha, 10)

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const clinica = await client.query(
        `INSERT INTO "Clinica" (nome, cidade, telefone) VALUES ($1, $2, $3) RETURNING id`,
        [nomeDaClinica, cidade || null, telefone || null]
      )
      const clinicaId = clinica.rows[0].id

      await client.query(
        `INSERT INTO "Usuario" ("clinicaId", nome, email, "senhaHash") VALUES ($1, $2, $3, $4)`,
        [clinicaId, nome, email, senhaHash]
      )

      await client.query('COMMIT')
      return NextResponse.json({ success: true })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) {
    console.error("Erro ao cadastrar usuário/clínica:", err)
    return NextResponse.json({ success: false, error: "Erro ao processar cadastro" }, { status: 500 })
  }
}

