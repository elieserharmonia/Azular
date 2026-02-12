function isPlainObject(v: any) {
  return v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date);
}

/**
 * Remove undefined, troca NaN por null, e normaliza strings vazias.
 * (Firestore odeia undefined / NaN)
 */
export function sanitizeForFirestore<T extends Record<string, any>>(input: T): T {
  const out: any = Array.isArray(input) ? [] : {};

  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;

    if (typeof v === "number" && Number.isNaN(v)) {
      out[k] = null;
      continue;
    }

    if (typeof v === "string" && v.trim() === "") {
      out[k] = null;
      continue;
    }

    if (Array.isArray(v)) {
      out[k] = v.map((x) => (isPlainObject(x) ? sanitizeForFirestore(x) : x));
      continue;
    }

    if (isPlainObject(v)) {
      out[k] = sanitizeForFirestore(v);
      continue;
    }

    out[k] = v;
  }

  return out;
}

  try {
    const db = await getDb();
    const { doc, setDoc, serverTimestamp } = (await import('firebase/firestore')) as any;
    return setDoc(doc(db, 'users', uid), {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.error("Error saving user profile to Firestore:", err);
    throw err;
  }
};

export const wipeUserData = async (userId: string) => {
  if (!firebaseEnabled && 'resetUser' in dbClient) {
    return (dbClient as any).resetUser(userId);
  }
  
  return { 
    deletedCount: 0, 
    message: "Limpeza completa não suportada diretamente via Client SDK para Firestore." 
  };
};