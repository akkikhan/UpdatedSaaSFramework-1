# Architecture Overview

The platform follows a modular microservice architecture. Core services include Auth, RBAC,
Logging, and Email, all fronted by an API gateway. Each service stores data in its own PostgreSQL
schema for tenant isolation. Messaging between services is handled via NATS streaming.
