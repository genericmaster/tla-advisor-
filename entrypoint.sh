#!/bin/bash

# Create mount point if it doesn't exist
mkdir -p /app/samba

# Mount the Samba share
mount -t cifs $SAMBA_HOST /app/samba -o username=$SAMBA_USERNAME,password=$SAMBA_PASSWORD,iocharset=utf8

# Start the application
exec uv run uvicorn src.main:app --host 0.0.0.0 --port 8000