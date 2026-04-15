import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { withAccelerate } from '@prisma/extension-accelerate';

const connectionString = process.env.DATABASE_URL!;

function createPrismaClient() {
  // Use Prisma Accelerate in production (ACCELERATE_URL takes precedence).
  // Falls back to a direct PrismaPg connection in development.
  if (process.env.ACCELERATE_URL) {
    return new PrismaClient({ datasourceUrl: process.env.ACCELERATE_URL }).$extends(withAccelerate());
  }

  const sslConfig = connectionString?.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : false;

  const adapter = new PrismaPg({ connectionString, ssl: sslConfig });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: ReturnType<typeof createPrismaClient> };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
