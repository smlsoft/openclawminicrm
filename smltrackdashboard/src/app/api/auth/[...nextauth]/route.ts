import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoClient, type Db } from "mongodb";
import { randomUUID } from "crypto";

// ใช้ standalone MongoClient ใน auth route (ไม่ผ่าน getDB เพื่อหลีกเลี่ยง circular deps)
let authClient: MongoClient | null = null;
let authDb: Db | null = null;

async function getAuthDB(): Promise<Db> {
  if (authDb) return authDb;
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/smltrack";
  const dbName = process.env.MONGODB_DB || "smltrack";
  authClient = new MongoClient(uri);
  await authClient.connect();
  authDb = authClient.db(dbName);
  return authDb;
}

// Demo user — GUID เจ้าของ = "12345", email = "demo@smlsoft.com"
const DEMO_USER = {
  id: "12345",
  name: "Demo User",
  email: "demo@smlsoft.com",
  image: "",
};

// Skip auth ถ้าไม่มี NEXTAUTH_SECRET (local dev only)
const DEV_MODE = !process.env.NEXTAUTH_SECRET;

// สร้าง providers list
const providers: any[] = [
  // Demo login — ทดลองใช้งานโดยไม่ต้อง Google account
  CredentialsProvider({
    id: "credentials",
    name: "Demo",
    credentials: {
      email: { label: "Email", type: "text" },
    },
    async authorize(credentials) {
      if (credentials?.email === "demo@smlsoft.com") {
        return DEMO_USER;
      }
      return null;
    },
  }),
];

// เพิ่ม Google ถ้ามี config
if (!DEV_MODE) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  );
}

const handler = NextAuth({
  providers,
  session: { strategy: "jwt" },

  secret: process.env.NEXTAUTH_SECRET || "dev-secret-change-me-in-production",

  // basePath /dashboard → NextAuth callbacks ต้องชี้ถูก
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      try {
        const db = await getAuthDB();

        // หา user จาก email mapping
        const emailDoc = await db
          .collection("user_emails")
          .findOne({ email: user.email });

        if (emailDoc) {
          // user มีอยู่แล้ว — อัพเดต name/image ถ้าเปลี่ยน
          await db.collection("users").updateOne(
            { _id: emailDoc.userId },
            {
              $set: {
                name: user.name || undefined,
                image: user.image || undefined,
                lastSignIn: new Date(),
              },
            }
          );
          return true;
        }

        // user ใหม่ — Demo user ใช้ GUID "12345", คนอื่นใช้ random
        const userId = user.email === "demo@smlsoft.com" ? "12345" : randomUUID();

        await db.collection("users").insertOne({
          _id: userId as any,
          name: user.name || "",
          image: user.image || "",
          createdAt: new Date(),
          lastSignIn: new Date(),
          plan: "free",
        });

        await db.collection("user_emails").insertOne({
          email: user.email,
          userId,
          isPrimary: true,
          addedAt: new Date(),
        });

        // สร้าง default team ให้ user ใหม่
        const teamId = randomUUID();
        await db.collection("teams").insertOne({
          _id: teamId as any,
          name: user.name ? `ทีมของ ${user.name}` : "ทีมของฉัน",
          ownerId: userId,
          createdAt: new Date(),
        });

        await db.collection("team_members").insertOne({
          teamId,
          userId,
          role: "admin",
          addedAt: new Date(),
          addedBy: userId,
        });

        // สร้าง account doc สำหรับ self-service setup
        await db.collection("accounts").insertOne({
          _id: userId as any,
          email: user.email,
          name: user.name || "",
          image: user.image || "",
          mongodbUri: "",
          aiKeys: {
            openrouterKey: "",
            groqKey: "",
            sambaNovaKey: "",
            cerebrasKey: "",
            googleKey: "",
          },
          lineConfig: { channelAccessToken: "", channelSecret: "" },
          fbConfig: { pageAccessToken: "", appSecret: "", verifyToken: "" },
          telegramChatId: null,
          setupComplete: user.email === "demo@smlsoft.com" ? true : false,
          createdAt: new Date(),
        });

        return true;
      } catch (err) {
        console.error("[NextAuth] signIn error:", err);
        return false;
      }
    },

    async session({ session, token }) {
      if (session.user?.email) {
        try {
          const db = await getAuthDB();
          const emailDoc = await db
            .collection("user_emails")
            .findOne({ email: session.user.email });

          if (emailDoc) {
            // เพิ่ม userId ใน session
            (session.user as any).id = emailDoc.userId;
            (session.user as any).userId = emailDoc.userId;

            // ดึง plan
            const userDoc = await db
              .collection("users")
              .findOne({ _id: emailDoc.userId });
            if (userDoc) {
              (session.user as any).plan = userDoc.plan || "free";
            }

            // ดึง setupComplete จาก accounts collection
            const accountDoc = await db
              .collection("accounts")
              .findOne({ email: session.user.email });
            (session.user as any).setupComplete = accountDoc?.setupComplete ?? false;
          }
        } catch (err) {
          console.error("[NextAuth] session callback error:", err);
        }
      }
      return session;
    },

    async jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email;
      }
      return token;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
});

export { handler as GET, handler as POST };
