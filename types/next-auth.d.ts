import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      clinicaId: string
      clinicaNome: string
    }
  }

  interface User {
    id: string
    name: string
    email: string
    clinicaId: string
    clinicaNome: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    clinicaId: string
    clinicaNome: string
  }
}
