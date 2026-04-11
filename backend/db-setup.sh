#!/bin/bash
# Run this script once in your WSL terminal to set up the PostgreSQL database.
# Usage: bash ~/landloard/backend/db-setup.sh

set -e

echo "==> Setting up PostgreSQL..."

sudo -u postgres psql <<'SQL'
-- Create user
CREATE USER landloard_user WITH PASSWORD 'landloard_pass';

-- Create database
CREATE DATABASE landloard OWNER landloard_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE landloard TO landloard_user;
SQL

echo "==> Applying schema..."
sudo -u postgres psql -d landloard -f ~/landloard/backend/schema.sql

sudo -u postgres psql -d landloard <<'SQL'
GRANT ALL ON ALL TABLES IN SCHEMA public TO landloard_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO landloard_user;
SQL

echo "==> Seeding sample data..."
cd ~/landloard/backend
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
node seed.js

echo ""
echo "Database ready!"
echo "Login: admin@landloard.com / admin123"
