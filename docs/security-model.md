# Security Model

## Principle: Reasoning Is Not Authority

Nexora does not allow a reasoning agent to directly grant itself transaction permission.

## Action Wallet

The Action Wallet stores user-configured capabilities such as search, comparison, negotiation and maximum transaction value.

Automatic payment execution is disabled by default.

## Agent Firewall

Before a payment request is permitted, the firewall validates:

- recognized agent identity
- merchant identity
- declared transaction purpose
- amount within the configured maximum
- whether explicit confirmation is required

## External Content

Product descriptions, merchant responses and other external data should be treated as untrusted input. They must never override user permissions or transaction policy.

## Secrets

Keys and credentials belong only in environment variables. `.env` is ignored by version control.

## Payment Verification

A created order is not treated as a completed payment. Completion requires verification of the returned payment signature/status.

## Production Hardening Roadmap

- authenticated users and tenant isolation
- persistent audit event store
- scoped connector credentials
- rate limiting
- replay protection
- webhook signature verification
- structured policy versioning
- secret vault integration
- anomaly detection
