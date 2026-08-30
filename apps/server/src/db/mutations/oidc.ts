import { and, eq, gt, lte } from 'drizzle-orm';
import { db } from '..';
import { oidcHandoffs, oidcTransactions } from '../schema';

type TOidcTransaction = {
  state: string;
  nonce: string;
  codeVerifier: string;
  redirectUri: string;
  expiresAt: number;
};

type TOidcHandoff = {
  code: string;
  token: string;
  state: string;
  expiresAt: number;
};

const sweepExpired = () => {
  const now = Date.now();

  db.delete(oidcTransactions).where(lte(oidcTransactions.expiresAt, now)).run();
  db.delete(oidcHandoffs).where(lte(oidcHandoffs.expiresAt, now)).run();
};

const createOidcTransaction = (values: TOidcTransaction) => {
  sweepExpired();

  db.insert(oidcTransactions).values(values).run();
};

const takeOidcTransaction = (state: string) =>
  db
    .delete(oidcTransactions)
    .where(
      and(
        eq(oidcTransactions.state, state),
        gt(oidcTransactions.expiresAt, Date.now())
      )
    )
    .returning()
    .get();

const createOidcHandoff = (values: TOidcHandoff) => {
  sweepExpired();

  db.insert(oidcHandoffs).values(values).run();
};

const takeOidcHandoff = (code: string) =>
  db
    .delete(oidcHandoffs)
    .where(
      and(eq(oidcHandoffs.code, code), gt(oidcHandoffs.expiresAt, Date.now()))
    )
    .returning()
    .get();

export {
  createOidcHandoff,
  createOidcTransaction,
  takeOidcHandoff,
  takeOidcTransaction
};
