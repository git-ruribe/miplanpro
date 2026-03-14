#!/usr/bin/env bash
# Script to run a simple HTTP server for MiPlan Pro to avoid CORS issues
# Usage: ./run_server.sh

cd "$(dirname "$0")"
echo "Iniciando servidor local para miplan.pro..."
echo "Abre http://localhost:8000/programa.html en tu navegador."
python3 -m http.server 8000
