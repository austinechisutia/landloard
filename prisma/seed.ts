import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database…');

  // House Types
  const bedsitter = await prisma.houseType.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Bedsitter', rentAmount: 6000 },
  });

  const oneBed = await prisma.houseType.upsert({
    where: { id: 2 },
    update: {},
    create: { name: '1 Bedroom', rentAmount: 9000 },
  });

  const twoBed = await prisma.houseType.upsert({
    where: { id: 3 },
    update: {},
    create: { name: '2 Bedroom', rentAmount: 14000 },
  });

  console.log('House types created:', bedsitter.name, oneBed.name, twoBed.name);

  // Units
  const units = await Promise.all([
    prisma.unit.upsert({ where: { id: 1 }, update: {}, create: { name: 'A1', houseTypeId: bedsitter.id } }),
    prisma.unit.upsert({ where: { id: 2 }, update: {}, create: { name: 'A2', houseTypeId: bedsitter.id } }),
    prisma.unit.upsert({ where: { id: 3 }, update: {}, create: { name: 'B1', houseTypeId: oneBed.id } }),
    prisma.unit.upsert({ where: { id: 4 }, update: {}, create: { name: 'B2', houseTypeId: oneBed.id } }),
    prisma.unit.upsert({ where: { id: 5 }, update: {}, create: { name: 'C1', houseTypeId: twoBed.id } }),
  ]);

  console.log('Units created:', units.map(u => u.name).join(', '));

  // Tenant + mark unit occupied
  const tenant = await prisma.tenant.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'John Mwangi',
      phone: '0712345678',
      houseTypeId: bedsitter.id,
      unitId: units[0].id,
      moveInDate: new Date('2025-01-01'),
    },
  });

  await prisma.unit.update({ where: { id: units[0].id }, data: { status: 'OCCUPIED' } });
  console.log('Tenant created:', tenant.name);

  // Payment
  const payment = await prisma.payment.upsert({
    where: { id: 1 },
    update: {},
    create: {
      tenantId: tenant.id,
      unitId: units[0].id,
      amountDue: 6000,
      amountPaid: 6000,
      balance: 0,
      status: 'PAID',
      dueDate: new Date('2025-02-01'),
      paymentDate: new Date('2025-01-30'),
    },
  });

  console.log('Payment created, status:', payment.status);
  // Admin user
  const adminEmail    = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName     = process.env.ADMIN_NAME ?? 'Admin';

  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.upsert({
      where:  { email: adminEmail },
      update: { role: 'ADMIN', name: adminName, passwordHash },
      create: { email: adminEmail, name: adminName, passwordHash, role: 'ADMIN' },
    });
    console.log('Admin user seeded:', adminEmail);
  } else {
    console.log('Skipping admin seed — ADMIN_EMAIL or ADMIN_PASSWORD not set.');
  }

  console.log('Seed complete!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
