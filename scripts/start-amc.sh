#!/bin/bash
# AMC Start Script for systemd
set -e

cd /home/ubuntu/.openclaw/workspace/Alfred-Mission-Control

# Wait for PostgreSQL
sleep 2

exec npx next start -p 3000 -H 0.0.0.0
