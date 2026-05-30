import NextAuth, { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const result = await pool.query(
          `SELECT u.*, c.nome as clinica_nome 
           FROM "Usuario" u 
           JOIN "Clinica" c ON c.id = u."clinicaId" 
           WHERE u.email = $1`,
          [credentials.email]
        )

        const user = result.rows[0]
        if (!user) return null

        console.log("🔐 Tentando login para:", credentials.email)
        console.log("🔐 Hash no banco:", user.senhaHash?.substring(0, 20))
        const senhaCorreta = await bcrypt.compare(credentials.password, user.senhaHash)
        console.log("🔐 Senha correta:", senhaCorreta)
        if (!senhaCorreta) return null

        return {
          id: user.id,
          email: user.email,
          name: user.nome,
          clinicaId: user.clinicaId,
          clinicaNome: user.clinica_nome
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email
        token.clinicaId = user.clinicaId
        token.clinicaNome = user.clinicaNome
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string
        session.user.clinicaId = token.clinicaId
        session.user.clinicaNome = token.clinicaNome
      }
      return session
    }
  },
  pages: {
    signIn: '/'
  },
  session: {
    strategy: 'jwt' as const
  },
  secret: process.env.NEXTAUTH_SECRET
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
export { authOptions }