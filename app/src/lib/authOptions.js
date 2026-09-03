import CredentialsProvider from "next-auth/providers/credentials";
import { ensureAdminSchema, findAdminByEmail, touchAdminLogin, verifyAdminPassword } from "./adminAuth";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Administrateur",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          await ensureAdminSchema();
          const admin = await findAdminByEmail(credentials.email);
          
          if (!admin?.is_active || !(await verifyAdminPassword(credentials.password, admin.password_hash))) {
            return null;
          }

          await touchAdminLogin(admin.id);
          return { id: String(admin.id), email: admin.email, name: admin.display_name, role: admin.role, image: null };
        } catch (error) {
          console.error("[authOptions] Error:", error);
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  jwt: { maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      // Handle sign out by clearing token
      if (trigger === "signout") {
        return {};
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.role = token.role;
        session.user.id = token.id;
      } else if (!token.id) {
        // Token is empty, return null session
        return null;
      }
      return session;
    },
  },
  pages: { signIn: "/admin" },
  events: {
    async signOut(message) {
      console.log("[authOptions] User signed out");
    },
  },
};
