import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL!;

function createPrismaClient() {
  // Let the connection string drive SSL (sslmode=require in URL handles it).
  // Only add rejectUnauthorized:false as a fallback for self-signed certs in prod.
  const sslConfig = connectionString?.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : false;

  const adapter = new PrismaPg({ connectionString, ssl: sslConfig });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
