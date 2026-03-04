-- DeedGuard: Zimbabwe Title Deed Verifier
-- Database schema for users, deeds, and verification logs

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'citizen' CHECK (role IN ('admin', 'citizen')),
  national_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deeds (
  id SERIAL PRIMARY KEY,
  deed_number VARCHAR(100) UNIQUE NOT NULL,
  owner_name VARCHAR(255),
  property_location TEXT,
  property_district VARCHAR(255),
  registration_date VARCHAR(100),
  document_type VARCHAR(50),
  image_data TEXT,
  data_hash VARCHAR(66) NOT NULL,
  blockchain_tx_hash VARCHAR(66),
  blockchain_status VARCHAR(20) DEFAULT 'pending' CHECK (blockchain_status IN ('pending', 'confirmed', 'failed')),
  uploaded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verification_logs (
  id SERIAL PRIMARY KEY,
  deed_id INTEGER REFERENCES deeds(id),
  deed_number VARCHAR(100),
  user_id INTEGER REFERENCES users(id),
  verification_result VARCHAR(20) CHECK (verification_result IN ('verified', 'not_found', 'tampered')),
  blockchain_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deeds_deed_number ON deeds(deed_number);
CREATE INDEX IF NOT EXISTS idx_deeds_blockchain_status ON deeds(blockchain_status);
CREATE INDEX IF NOT EXISTS idx_verification_logs_user ON verification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_deed ON verification_logs(deed_number);
