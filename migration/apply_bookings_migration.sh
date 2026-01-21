#!/bin/bash

# Скрипт для применения миграции bookings на VPS

echo "Applying bookings migration..."

docker exec chopbot_postgres psql -U postgres chopbot <<EOF
CREATE TABLE IF NOT EXISTS bookings (
  id serial PRIMARY KEY NOT NULL,
  user_id integer NOT NULL,
  yclients_record_id integer NOT NULL,
  service_id integer NOT NULL,
  service_name text NOT NULL,
  staff_id integer,
  staff_name text,
  datetime timestamp with time zone NOT NULL,
  status text DEFAULT 'active' NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

ALTER TABLE bookings ADD CONSTRAINT bookings_user_id_users_id_fk 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE NO ACTION ON UPDATE NO ACTION;
EOF

echo "Migration applied successfully!"
