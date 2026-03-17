#!/bin/bash
# Run OWASP ZAP baseline scan against the local dev server.
# Requires Docker and OWASP ZAP Docker image.

HOST=http://localhost:5173

echo "Starting OWASP ZAP baseline scan against $HOST..."
docker run --rm -v $(pwd):/zap/wrk/:rw owasp/zap2docker-stable \
  zap-baseline.py -t $HOST -g gen.conf -r zap_report.html

echo "Report generated: zap_report.html"
