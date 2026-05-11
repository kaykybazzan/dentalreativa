import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'dentalreativa',
  user: 'postgres',
  password: 'bazzan01'
})

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

    const clinica = await pool.query(
      `INSERT INTO "Clinica" (nome, cidade, telefone) VALUES ($1, $2, $3) RETURNING id`,
      [nomeDaClinica, cidade || null, telefone || null]
    )

    const clinicaId = clinica.rows[0].id

    await pool.query(
      `INSERT INTO "Usuario" ("clinicaId", nome, email, "senhaHash") VALUES ($1, $2, $3, $4)`,
      [clinicaId, nome, email, senhaHash]
    )

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
