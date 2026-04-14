/**
 * Usage: npx ts-node -e "..." OR via: npx tsx scripts/make-admin.ts <email>
 * Promotes a user to ADMIN role by email.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npx tsx scripts/make-admin.ts <email>');
    process.exit(1);
  }

  const user = await prisma.user.update({
    where: { email: email.toLowerCase().trim() },
    data: { role: 'ADMIN' },
    select: { id: true, name: true, email: true, role: true },
  });

  console.log('User promoted to ADMIN:', user);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
