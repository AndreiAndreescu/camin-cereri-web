import jwt from "jsonwebtoken";

export const SESSION_COOKIE = "camin_session";
const EXPIRES_IN = "12h";

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    throw new Error("Lipseste variabila de mediu SESSION_SECRET. Vezi .env.example.");
  }
  return s;
}

// payload: { id, full_name, role, center_id }
export function signSession(payload) {
  return jwt.sign(payload, secret(), { expiresIn: EXPIRES_IN });
}

export function verifySession(token) {
  try {
    return jwt.verify(token, secret());
  } catch {
    return null;
  }
}
