import { jwtVerify, SignJWT } from "jose";

const encoder = new TextEncoder();

export type CollabRole = "owner" | "editor" | "viewer";

export type CollabTokenPayload = {
  documentId: string;
  userId: string;
  role: CollabRole;
  name: string;
  email: string;
  color: string;
};

function getCollabSecret() {
  const secret = process.env.COLLAB_SECRET;

  if (!secret) {
    throw new Error("COLLAB_SECRET is not configured.");
  }

  return encoder.encode(secret);
}

export async function signCollabToken(payload: CollabTokenPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(getCollabSecret());
}

export async function verifyCollabToken(token: string) {
  const { payload } = await jwtVerify(token, getCollabSecret());
  return payload as unknown as CollabTokenPayload;
}
