-- Rental Management System Schema

CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name       VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS houses (
  id          SERIAL PRIMARY KEY,
  unit_number VARCHAR(50) NOT NULL,
  house_type  VARCHAR(50) NOT NULL,
  rent_amount DECIMAL(10,2) NOT NULL,
  status      VARCHAR(20) DEFAULT 'vacant' CHECK (status IN ('occupied', 'vacant')),
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenants (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  phone        VARCHAR(20) NOT NULL,
  house_id     INTEGER REFERENCES houses(id) ON DELETE SET NULL,
  move_in_date DATE NOT NULL,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id           SERIAL PRIMARY KEY,
  tenant_id    INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  house_id     INTEGER REFERENCES houses(id) ON DELETE CASCADE,
  amount_due   DECIMAL(10,2) NOT NULL,
  amount_paid  DECIMAL(10,2) DEFAULT 0,
  balance      DECIMAL(10,2) NOT NULL DEFAULT 0,
  due_date     DATE NOT NULL,
  payment_date DATE,
  status       VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('paid', 'pending')),
  created_at   TIMESTAMP DEFAULT NOW()
);
