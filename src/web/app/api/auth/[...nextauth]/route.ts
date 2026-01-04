import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("Authorization attempt:", {
          hasPassword: !!credentials?.password,
        });

        if (!credentials?.password) {
          console.log("No password provided");
          return null;
        }

        // In a real app, this would be a database query with hashed passwords
        // For demo purposes, we'll use environment variables
        const validUsers = [
          {
            id: "1",
            password: process.env.DEMO_PASSWORD || "demo123",
            name: "GTV",
            email: "gtv@mock.com",
            avatar: "R",
          },
        ];

        console.log("Valid users configured:", validUsers.length);
        console.log("Environment check:", {
          hasSecret: !!process.env.NEXTAUTH_SECRET,
          hasDemoPassword: !!process.env.DEMO_PASSWORD,
          hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
          nodeEnv: process.env.NODE_ENV,
        });

        const user = validUsers.find(
          (u) => u.password === credentials.password
        );

        if (user) {
          console.log("User authenticated successfully:", user.name);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.avatar,
          };
        }

        console.log("Authentication failed - invalid password");
        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt" as const,
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({
      token,
      user,
    }: {
      token: Record<string, unknown>;
      user: Record<string, unknown> | null;
    }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.avatar = user.image;
      }
      return token;
    },
    async session({
      session,
      token,
    }: {
      session: Record<string, unknown>;
      token: Record<string, unknown>;
    }) {
      if (token && session.user) {
        (session.user as Record<string, unknown>).id = token.id as string;
        (session.user as Record<string, unknown>).email = token.email as string;
        (session.user as Record<string, unknown>).name = token.name as string;
        (session.user as Record<string, unknown>).image =
          token.avatar as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

// @ts-expect-error - NextAuth v4 compatibility issue with Next.js 15
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
