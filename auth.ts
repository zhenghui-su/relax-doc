import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthConfig } from "next-auth";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/auth/validation";
import { nameFromEmail } from "@/lib/utils";

const config: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const validated = loginSchema.safeParse(credentials);

        if (!validated.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: validated.data.email.toLowerCase() },
        });

        if (!user?.passwordHash) {
          return null;
        }

        const isPasswordValid = await compare(
          validated.data.password,
          user.passwordHash,
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? nameFromEmail(user.email),
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && token.id) {
        session.user.id = String(token.id);
      }

      if (session.user && !session.user.name && session.user.email) {
        session.user.name = nameFromEmail(session.user.email);
      }

      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
