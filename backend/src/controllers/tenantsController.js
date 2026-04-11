const pool = require('../config/db');

exports.getAll = async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.*, h.unit_number, h.house_type, h.rent_amount
      FROM tenants t
      LEFT JOIN houses h ON t.house_id = h.id
      ORDER BY t.name ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.*, h.unit_number, h.house_type, h.rent_amount
      FROM tenants t
      LEFT JOIN houses h ON t.house_id = h.id
      WHERE t.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Tenant not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  const { name, phone, house_id, move_in_date } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'INSERT INTO tenants (name, phone, house_id, move_in_date) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, phone, house_id, move_in_date]
    );
    if (house_id) {
      await client.query("UPDATE houses SET status='occupied' WHERE id=$1", [house_id]);
    }
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

exports.update = async (req, res) => {
  const { name, phone, house_id, move_in_date } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: old } = await client.query('SELECT * FROM tenants WHERE id=$1', [req.params.id]);
    const prev = old[0];
    const { rows } = await client.query(
      'UPDATE tenants SET name=$1, phone=$2, house_id=$3, move_in_date=$4 WHERE id=$5 RETURNING *',
      [name, phone, house_id, move_in_date, req.params.id]
    );
    // Free old house if changed
    if (prev?.house_id && Number(prev.house_id) !== Number(house_id)) {
      await client.query("UPDATE houses SET status='vacant' WHERE id=$1", [prev.house_id]);
    }
    if (house_id) {
      await client.query("UPDATE houses SET status='occupied' WHERE id=$1", [house_id]);
    }
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

exports.remove = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM tenants WHERE id=$1', [req.params.id]);
    const tenant = rows[0];
    if (!tenant) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Tenant not found' }); }
    await client.query('DELETE FROM tenants WHERE id=$1', [req.params.id]);
    if (tenant.house_id) {
      await client.query("UPDATE houses SET status='vacant' WHERE id=$1", [tenant.house_id]);
    }
    await client.query('COMMIT');
    res.json({ message: 'Tenant deleted' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};
