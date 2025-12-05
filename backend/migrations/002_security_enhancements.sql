-- Security Enhancements Migration
-- Adds session tracking, login history, and refresh tokens

-- Refresh Tokens Table
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  device_info JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- User Sessions Table
CREATE TABLE user_sessions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  refresh_token_id INTEGER REFERENCES refresh_tokens(id) ON DELETE CASCADE,
  device_name VARCHAR(255),
  device_type VARCHAR(50), -- mobile, desktop, tablet
  browser VARCHAR(100),
  os VARCHAR(100),
  ip_address VARCHAR(45),
  location JSONB, -- {city, country, region}
  last_activity TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_active ON user_sessions(is_active);
CREATE INDEX idx_sessions_last_activity ON user_sessions(last_activity);

-- Login History Table
CREATE TABLE login_history (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  success BOOLEAN NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_info JSONB,
  location JSONB,
  failure_reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_login_history_user ON login_history(user_id);
CREATE INDEX idx_login_history_email ON login_history(email);
CREATE INDEX idx_login_history_ip ON login_history(ip_address);
CREATE INDEX idx_login_history_created ON login_history(created_at);
CREATE INDEX idx_login_history_success ON login_history(success);

-- Rate Limiting Table
CREATE TABLE rate_limit_records (
  id SERIAL PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL, -- IP or user_id
  endpoint VARCHAR(255) NOT NULL,
  attempt_count INTEGER DEFAULT 1,
  window_start TIMESTAMP DEFAULT NOW(),
  blocked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rate_limit_identifier ON rate_limit_records(identifier);
CREATE INDEX idx_rate_limit_endpoint ON rate_limit_records(endpoint);
CREATE INDEX idx_rate_limit_window ON rate_limit_records(window_start);

-- Security Alerts Table
CREATE TABLE security_alerts (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL, -- new_device, suspicious_ip, failed_attempts, password_change
  severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
  details JSONB,
  acknowledged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_security_alerts_user ON security_alerts(user_id);
CREATE INDEX idx_security_alerts_type ON security_alerts(alert_type);
CREATE INDEX idx_security_alerts_acknowledged ON security_alerts(acknowledged);
CREATE INDEX idx_security_alerts_created ON security_alerts(created_at);

-- Function to clean up expired sessions and tokens
CREATE OR REPLACE FUNCTION cleanup_expired_sessions() RETURNS void AS $$
BEGIN
  -- Deactivate expired sessions
  UPDATE user_sessions 
  SET is_active = FALSE 
  WHERE expires_at < NOW() AND is_active = TRUE;
  
  -- Mark expired refresh tokens as revoked
  UPDATE refresh_tokens 
  SET revoked = TRUE 
  WHERE expires_at < NOW() AND revoked = FALSE;
  
  -- Delete old login history (keep last 90 days)
  DELETE FROM login_history 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Delete old rate limit records (keep last 24 hours)
  DELETE FROM rate_limit_records 
  WHERE window_start < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Add last_login and last_ip to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_ip VARCHAR(45),
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP;

COMMENT ON TABLE refresh_tokens IS 'Stores long-lived refresh tokens for JWT refresh flow';
COMMENT ON TABLE user_sessions IS 'Tracks active user sessions across devices';
COMMENT ON TABLE login_history IS 'Audit log of all login attempts';
COMMENT ON TABLE rate_limit_records IS 'Tracks API rate limiting per endpoint';
COMMENT ON TABLE security_alerts IS 'Security-related notifications for users';
