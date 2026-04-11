const pool = require('../config/db');

exports.getAll = async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM houses ORDER BY unit_number ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM houses WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'House not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  const { unit_number, house_type, rent_amount, status } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO houses (unit_number, house_type, rent_amount, status) VALUES ($1,$2,$3,$4) RETURNING *',
      [unit_number, house_type, rent_amount, status || 'vacant']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  const { unit_number, house_type, rent_amount, status } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE houses SET unit_number=$1, house_type=$2, rent_amount=$3, status=$4 WHERE id=$5 RETURNING *',
      [unit_number, house_type, rent_amount, status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'House not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM houses WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'House not found' });
    res.json({ message: 'House deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
