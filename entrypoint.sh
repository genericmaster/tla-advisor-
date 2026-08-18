#!/bin/bash

mkdir -p /app/samba

mount -t cifs $SAMBA_HOST /app/samba -o username=$SAMBA_USERNAME,password=$SAMBA_PASSWORD,iocharset=utf8
if [ $? -ne 0 ]; then
    echo "ERROR: Samba mount failed"
    exit 1
fi

echo "Samba mounted successfully"
exec uv run uvicorn src.main:app --host 0.0.0.0 --port 8000