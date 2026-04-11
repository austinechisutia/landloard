const pool = require('../config/db');

const computeStatus = (due, paid) => parseFloat(paid) >= parseFloat(due) ? 'paid' : 'pending';

exports.getAll = async (req, res) => {
  try {
    const { status } = req.query;
    let q = `
      SELECT p.*, t.name AS tenant_name, h.unit_number, h.house_type
      FROM payments p
      JOIN tenants t ON p.tenant_id = t.id
      JOIN houses  h ON p.house_id  = h.id
    `;
    const params = [];
    if (status) { q += ' WHERE p.status = $1'; params.push(status); }
    q += ' ORDER BY p.due_date DESC, p.created_at DESC';
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, t.name AS tenant_name, h.unit_number, h.house_type
      FROM payments p
      JOIN tenants t ON p.tenant_id = t.id
      JOIN houses  h ON p.house_id  = h.id
      WHERE p.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Payment not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  const { tenant_id, house_id, amount_due, amount_paid, due_date, payment_date } = req.body;
  const due  = parseFloat(amount_due);
  const paid = parseFloat(amount_paid) || 0;
  const bal  = due - paid;
  try {
    const { rows } = await pool.query(
      `INSERT INTO payments (tenant_id, house_id, amount_due, amount_paid, balance, due_date, payment_date, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [tenant_id, house_id, due, paid, bal, due_date, payment_date || null, computeStatus(due, paid)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  const { tenant_id, house_id, amount_due, amount_paid, due_date, payment_date } = req.body;
  const due  = parseFloat(amount_due);
  const paid = parseFloat(amount_paid) || 0;
  const bal  = due - paid;
  try {
    const { rows } = await pool.query(
      `UPDATE payments
       SET tenant_id=$1, house_id=$2, amount_due=$3, amount_paid=$4,
           balance=$5, due_date=$6, payment_date=$7, status=$8
       WHERE id=$9 RETURNING *`,
      [tenant_id, house_id, due, paid, bal, due_date, payment_date || null, computeStatus(due, paid), req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Payment not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM payments WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Payment not found' });
    res.json({ message: 'Payment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getDashboardStats = async (_req, res) => {
  try {
    const today       = new Date();
    const monthStart  = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd    = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    const [total, occupied, paidThisMonth, pendingBal, overdue] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM houses'),
      pool.query("SELECT COUNT(*) FROM houses WHERE status='occupied'"),
      pool.query(
        `SELECT COALESCE(SUM(amount_paid),0) AS total FROM payments
         WHERE status='paid' AND payment_date BETWEEN $1 AND $2`,
        [monthStart, monthEnd]
      ),
      pool.query("SELECT COALESCE(SUM(balance),0) AS total FROM payments WHERE status='pending'"),
      pool.query(`
        SELECT p.id, p.amount_due, p.amount_paid, p.balance, p.due_date,
               t.name AS tenant_name, h.unit_number
        FROM payments p
        JOIN tenants t ON p.tenant_id = t.id
        JOIN houses  h ON p.house_id  = h.id
        WHERE p.status='pending' AND p.due_date < CURRENT_DATE
        ORDER BY p.due_date ASC
      `),
    ]);

    const totalHouses    = parseInt(total.rows[0].count);
    const occupiedHouses = parseInt(occupied.rows[0].count);

    res.json({
      total_houses:               totalHouses,
      occupied_houses:            occupiedHouses,
      vacant_houses:              totalHouses - occupiedHouses,
      total_rent_paid_this_month: parseFloat(paidThisMonth.rows[0].total),
      total_pending_rent:         parseFloat(pendingBal.rows[0].total),
      overdue_tenants:            overdue.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
