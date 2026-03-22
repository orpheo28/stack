-- Add installer_ip column to install_events for rate limiting
ALTER TABLE install_events ADD COLUMN installer_ip TEXT;

CREATE INDEX install_events_installer_ip_idx ON install_events (installer_ip);
