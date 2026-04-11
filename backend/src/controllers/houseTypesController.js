const pool = require('../config/db');

exports.getAll = async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM house_types ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  const { name, rent_amount } = req.body;
  if (!name || !rent_amount) return res.status(400).json({ error: 'name and rent_amount are required' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO house_types (name, rent_amount) VALUES ($1, $2) RETURNING *',
      [name, rent_amount]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'House type already exists' });
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM house_types WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'House type not found' });
    res.json({ message: 'House type deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
