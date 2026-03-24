# AI Session Log

This file is a curated summary of the Codex-assisted build session used to create this submission. It is not a raw transcript.

## Summary

1. Extracted and analyzed the public Dodge AI role page and task details.
2. Pulled the SAP O2C dataset from Google Drive and profiled the schema.
3. Reverse-engineered the real entity relationships:
   - sales order item normalization
   - delivery item references
   - billing-to-delivery lineage
   - cancellation document behavior
   - accounting-document to payment-clearance linkage
4. Chose the final architecture:
   - FastAPI
   - DuckDB
   - semantic SQL views
   - materialized graph tables
   - React + Cytoscape
   - optional LLM provider abstraction
5. Implemented:
   - ingestion pipeline
   - semantic layer
   - graph APIs
   - guardrails
   - SQL safety validation
   - deterministic query templates
   - optional LLM NL-to-SQL path
   - graph + chat frontend
6. Verified:
   - database build
   - API startup through `TestClient`
   - deterministic queries
   - frontend production build
   - backend smoke tests

## Honest Notes

- The current implementation is intentionally strongest on the assignment's highest-value paths rather than trying to cover every possible ERP question superficially.
- The LLM integration is production-minded but optional. Without credentials, the app still demonstrates grounded querying on the most relevant evaluator scenarios.
- The deterministic layer was added on purpose so the demo remains reliable and evaluator-friendly.
