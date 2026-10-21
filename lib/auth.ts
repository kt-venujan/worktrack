import 'server-only';
import type {NextAuthOptions} from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import {getServerSession} from 'next-auth';
export const authOptions:NextAuthOptions={
 providers:[GoogleProvider({clientId:process.env.GOOGLE_OAUTH_CLIENT_ID||'',clientSecret:process.env.GOOGLE_OAUTH_CLIENT_SECRET||''})],
 session:{strategy:'jwt'},
 callbacks:{async signIn({user}){const allowed=(process.env.ALLOWED_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);return !!user.email&&allowed.length>0&&allowed.includes(user.email.toLowerCase())}},
 secret:process.env.NEXTAUTH_SECRET
};
export async function requireUser(){const session=await getServerSession(authOptions);const email=session?.user?.email?.toLowerCase();const allowed=(process.env.ALLOWED_EMAILS||'').split(',').map(x=>x.trim().toLowerCase());return !!email&&allowed.includes(email)}
