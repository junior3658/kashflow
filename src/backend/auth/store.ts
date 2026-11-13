import Database from 'better-sqlite3';
import { randomBytes, randomUUID, randomInt, scrypt as scryptCb, createHash, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../db';
import { sendVerificationEmail } from './email';

const scrypt=promisify(scryptCb), COOKIE='kashflow_session', SESSION_MS=7*86400000, CODE_MS=600000;
const dbPath=path.resolve(process.env.AUTH_DATABASE_PATH||'data/kashflow-auth.sqlite');
fs.mkdirSync(path.dirname(dbPath),{recursive:true});
const sql=new Database(dbPath);
sql.pragma('journal_mode = WAL');
sql.pragma('foreign_keys = ON');
sql.exec(`
CREATE TABLE IF NOT EXISTS auth_users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE COLLATE NOCASE,full_name TEXT NOT NULL,password_hash TEXT NOT NULL,password_salt TEXT NOT NULL,verified_at TEXT,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS verification_codes(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,code_hash TEXT NOT NULL,expires_at INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,consumed_at INTEGER,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_codes_user ON verification_codes(user_id,created_at);
CREATE TABLE IF NOT EXISTS auth_sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON auth_sessions(expires_at);
`);
const emailNorm=(v:string)=>v.trim().toLowerCase();
const sha=(v:string)=>createHash('sha256').update(v).digest('hex');
async function passwordHash(password:string,salt:string){return (await scrypt(password,salt,64)).toString('hex');}
function session(userId:string){const token=randomBytes(32).toString('base64url'),now=Date.now();sql.prepare('DELETE FROM auth_sessions WHERE expires_at<=?').run(now);sql.prepare('INSERT INTO auth_sessions VALUES(?,?,?,?)').run(sha(token),userId,now+SESSION_MS,now);return token;}
export function setSessionCookie(res:any,token:string){res.cookie(COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:SESSION_MS});}
export function clearSessionCookie(res:any){res.clearCookie(COOKIE,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/'});}
export function getSessionUserId(token?:string){if(!token)return null;const r=sql.prepare('SELECT user_id FROM auth_sessions WHERE token_hash=? AND expires_at>?').get(sha(token),Date.now()) as any;return r?.user_id||null;}
export function revokeSession(token?:string){if(token)sql.prepare('DELETE FROM auth_sessions WHERE token_hash=?').run(sha(token));}
function addRuntimeUser(u:any){
 db.users.set(u.id,{id:u.id,email:u.email,fullName:u.full_name,role:'PERSONAL_USER',createdAt:u.created_at});
 for(const currency of ['USD','EUR','CDF'] as const){const id=`wlt_${u.id}_${currency.toLowerCase()}`;if(!db.wallets.has(id))db.wallets.set(id,{id,ownerId:u.id,type:'PERSONAL',currency,name:`Primary ${currency} Wallet`,internalAccountingBalance:0,externalProviderBalance:0,pendingDebits:0,pendingCredits:0,status:'ACTIVE',createdAt:u.created_at,updatedAt:u.created_at});}
}
for(const u of sql.prepare('SELECT id,email,full_name,created_at FROM auth_users WHERE verified_at IS NOT NULL').all() as any[])addRuntimeUser(u);
async function sendCode(u:any){
 const now=Date.now(),last=sql.prepare('SELECT created_at FROM verification_codes WHERE user_id=? ORDER BY created_at DESC LIMIT 1').get(u.id) as any;
 if(last&&now-last.created_at<60000)throw new Error('Please wait before requesting another verification email.');
 const code=String(randomInt(0,1000000)).padStart(6,'0'),id=randomBytes(16).toString('hex');
 sql.prepare('INSERT INTO verification_codes(id,user_id,code_hash,expires_at,created_at) VALUES(?,?,?,?,?)').run(id,u.id,sha(id+':'+code),now+CODE_MS,now);
 await sendVerificationEmail({to:u.email,fullName:u.full_name,code,expiresInMinutes:10});
}
export async function registerAccount(v:{fullName:string;email:string;password:string}){
 const name=v.fullName.trim(),email=emailNorm(v.email);
 if(name.length<2||name.length>100)throw new Error('Enter a valid full name.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw new Error('Enter a valid email address.');
 if(v.password.length<10||v.password.length>128)throw new Error('Password must contain 10 to 128 characters.');
 if(sql.prepare('SELECT 1 FROM auth_users WHERE email=?').get(email))throw new Error('Unable to create this account. Check the email or sign in.');
 const id='usr_'+randomUUID(),salt=randomBytes(16).toString('hex'),created_at=new Date().toISOString();
 const hash=await passwordHash(v.password,salt);
 sql.prepare('INSERT INTO auth_users(id,email,full_name,password_hash,password_salt,created_at) VALUES(?,?,?,?,?,?)').run(id,email,name,hash,salt,created_at);
 try{await sendCode({id,email,full_name:name});}catch(e){sql.prepare('DELETE FROM auth_users WHERE id=?').run(id);throw e;}
}
export async function verifyEmail(emailInput:string,code:string){
 const email=emailNorm(emailInput);if(!/^\d{6}$/.test(code))throw new Error('Invalid or expired verification code.');
 const u=sql.prepare('SELECT id,email,full_name,created_at,verified_at FROM auth_users WHERE email=?').get(email) as any;
 if(!u)throw new Error('Invalid or expired verification code.');
 if(u.verified_at)return session(u.id);
 const c=sql.prepare('SELECT id,code_hash,expires_at,attempts FROM verification_codes WHERE user_id=? AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1').get(u.id) as any;
 if(!c||c.expires_at<=Date.now()||c.attempts>=5)throw new Error('Invalid or expired verification code.');
 const actual=Buffer.from(sha(c.id+':'+code)),expected=Buffer.from(c.code_hash);
 if(!timingSafeEqual(actual,expected)){sql.prepare('UPDATE verification_codes SET attempts=attempts+1 WHERE id=?').run(c.id);throw new Error('Invalid or expired verification code.');}
 sql.prepare('UPDATE verification_codes SET consumed_at=? WHERE id=?').run(Date.now(),c.id);
 sql.prepare('UPDATE auth_users SET verified_at=? WHERE id=?').run(new Date().toISOString(),u.id);
 addRuntimeUser(u);return session(u.id);
}
export async function resendVerification(emailInput:string){const u=sql.prepare('SELECT id,email,full_name,verified_at FROM auth_users WHERE email=?').get(emailNorm(emailInput)) as any;if(u&&!u.verified_at)await sendCode(u);}
export async function loginAccount(emailInput:string,password:string){
 if(typeof password!=='string'||password.length<1||password.length>128)throw new Error('Email or password is incorrect.');
 const u=sql.prepare('SELECT id,password_hash,password_salt,verified_at FROM auth_users WHERE email=?').get(emailNorm(emailInput)) as any;
 if(!u){await passwordHash(password,randomBytes(16).toString('hex'));throw new Error('Email or password is incorrect.');}
 const actual=Buffer.from(await passwordHash(password,u.password_salt),'hex'),expected=Buffer.from(u.password_hash,'hex');
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new Error('Email or password is incorrect.');
 if(!u.verified_at)throw new Error('Verify your email before signing in.');
 return session(u.id);
}
export function publicUser(id:string){const u=sql.prepare('SELECT id,email,full_name,created_at FROM auth_users WHERE id=? AND verified_at IS NOT NULL').get(id) as any;return u?{id:u.id,email:u.email,fullName:u.full_name,role:'PERSONAL_USER',createdAt:u.created_at}:null;}
export const SESSION_COOKIE_NAME=COOKIE;
