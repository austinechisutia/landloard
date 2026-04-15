require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./src/config/db');

const adminEmail = process.env.ADMIN_EMAIL || 'austineakhonya624@gmail.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
const adminName = process.env.ADMIN_NAME || 'Admin';

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Clearing existing data...');
    await client.query('TRUNCATE payments, tenants, houses, users RESTART IDENTITY CASCADE');

    console.log('Creating admin user...');
    const hash = await bcrypt.hash(adminPassword, 10);
    await client.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)',
      [adminEmail, hash, adminName]
    );

    console.log('Creating houses...');
    const { rows: houses } = await client.query(`
      INSERT INTO houses (unit_number, house_type, rent_amount, status) VALUES
      ('A1', 'Single',    4000,  'occupied'),
      ('A2', 'Single',    4000,  'vacant'),
      ('B1', 'Bedsitter', 6500,  'occupied'),
      ('B2', 'Bedsitter', 6500,  'vacant'),
      ('C1', '1 Bedroom', 12000, 'occupied'),
      ('C2', '1 Bedroom', 12000, 'vacant')
      RETURNING id, rent_amount
    `);

    console.log('Creating tenants...');
    const tenantData = [
      { name: 'John Mwangi',    phone: '0712345678', houseIdx: 0, date: '2024-01-15' },
      { name: 'Mary Wanjiku',   phone: '0723456789', houseIdx: 1, date: '2024-02-01' },
      { name: 'Peter Kamau',    phone: '0734567890', houseIdx: 3, date: '2024-03-10' },
      { name: 'Grace Achieng',  phone: '0745678901', houseIdx: 5, date: '2024-01-20' },
    ];

    const tenants = [];
    for (const t of tenantData) {
      const { rows } = await client.query(
        'INSERT INTO tenants (name, phone, house_id, move_in_date) VALUES ($1, $2, $3, $4) RETURNING id, house_id',
        [t.name, t.phone, houses[t.houseIdx].id, t.date]
      );
      tenants.push({ ...rows[0], rent_amount: houses[t.houseIdx].rent_amount });
    }

    console.log('Creating payments...');
    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastMonth    = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];

    const paymentData = [
      // Current month — paid
      { tenant: tenants[0], due: firstOfMonth, paid_date: firstOfMonth, amount_paid_pct: 1.0 },
      // Current month — pending
      { tenant: tenants[1], due: firstOfMonth, paid_date: null,         amount_paid_pct: 0   },
      // Last month — paid
      { tenant: tenants[2], due: lastMonth,    paid_date: lastMonth,    amount_paid_pct: 1.0 },
      // Last month — partial (overdue)
      { tenant: tenants[3], due: lastMonth,    paid_date: lastMonth,    amount_paid_pct: 0.5 },
    ];

    for (const p of paymentData) {
      const due  = parseFloat(p.tenant.rent_amount);
      const paid = due * p.amount_paid_pct;
      const bal  = due - paid;
      const status = paid >= due ? 'paid' : 'pending';
      await client.query(
        `INSERT INTO payments (tenant_id, house_id, amount_due, amount_paid, balance, due_date, payment_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [p.tenant.id, p.tenant.house_id, due, paid, bal, p.due, p.paid_date, status]
      );
    }

    console.log('\nSeed complete!');
    console.log(`Login: ${adminEmail} / ${adminPassword}`);
  } catch (err) {
    console.error('Seed failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
