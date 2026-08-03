import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { isAllowedEmail } from "./access";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" }, // Use JWT sessions for edge compatibility
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Add user info to token on initial sign in
      if (user) {
        token.email = user.email;
        token.id = user.id;
      }
      return token;
    },
    async signIn({ user }) {
      // @granola.so, or a named collaborator on the allowlist. Everyone else is
      // denied and lands on the /auth/error page.
      return isAllowedEmail(user.email);
    },
    async session({ session, token }) {
      // Add user data from JWT token to session
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
});
