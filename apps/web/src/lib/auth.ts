import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

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
    async signIn({ user, account, profile }) {
      // Only allow @granola.so email addresses
      if (user.email && user.email.endsWith("@granola.so")) {
        return true;
      }
      // Deny access for non-Granola emails
      return false;
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
