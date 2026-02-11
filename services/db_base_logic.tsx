// services/db_base_logic.ts
import { dbClient } from "./dbClient";
import { Account, Category, UserProfile } from "../types";

/**
 * Funções base do módulo de dados (contas, categorias, perfil, limpeza).
 * Mantém o build do Vercel estável e centraliza operações do dbClient.
 */

// CONTAS
export const getAccounts = (userId: string): Promise<Account[]> => {
  return dbClient.getAccounts(userId);
};

export const addAccount = (data: Partial<Account>) => {
  // dbClient geralmente aceita Partial e retorna id/ref
  return (dbClient as any).addAccount(data);
};

export const updateAccount = (id: string, data: Partial<Account>) => {
  return (dbClient as any).updateAccount(id, data);
};

export const deleteAccount = (id: string) => {
  return (dbClient as any).deleteAccount(id);
};

// CATEGORIAS
export const getCategories = (userId: string): Promise<Category[]> => {
  return dbClient.getCategories(userId);
};

export const createCategory = async (userId: string, name: string, direction: any) => {
  // deve retornar o ID (se o seu dbClient retornar algo diferente, o AI Studio ajusta)
  return (dbClient as any).createCategory(userId, name, direction);
};

// PERFIL
export const saveUserProfile = async (uid: string, data: UserProfile | any) => {
  return (dbClient as any).saveUserProfile(uid, data);
};

/**
 * Limpa todos os dados do usuário (para resetar testes).
 * IMPORTANTE: só limpa dados do userId informado.
 */
export const wipeUserData = async (userId: string) => {
  if (typeof (dbClient as any).wipeUserData === "function") {
    return (dbClient as any).wipeUserData(userId);
  }

  // Fallback: tenta apagar por lotes se existirem métodos bulk
  // (se não existirem, o AI Studio deve implementar no dbClient)
  const [txs, accs, cats] = await Promise.all([
    dbClient.getTransactions(userId),
    dbClient.getAccounts(userId),
    dbClient.getCategories(userId),
  ]);

  const delTx = txs.map((t: any) => dbClient.deleteTransaction(t.id));
  const delAcc = accs.map((a: any) => (dbClient as any).deleteAccount(a.id));
  const delCat = cats.map((c: any) => (dbClient as any).deleteCategory?.(c.id));

  await Promise.allSettled([...delTx, ...delAcc, ...delCat]);
};
