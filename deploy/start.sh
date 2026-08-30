#!/bin/sh
set -e
node /app/server/dist/index.js &
exec nginx -g 'daemon off;'
