# Flowable Framework Design

Date: 2026-08-24
Status: approved in conversation; pending spec review

A single-module Spring Boot application that wraps Flowable BPMN as a reusable workflow framework: process start, task inbox, history, and Flowable IDM authentication. First version ships with an embedded leave-request process.

## Goals

- Start a Maven Java 21 project on Spring Boot 3.5 that can run locally with no external database.
- Expose a small, stable REST facade over Flowable Process + IDM so later business apps do not call engine APIs from controllers.
- Demonstrate a complete leave-request loop: start, manager approval, optional HR approval, history.
- Cover the facade with HTTP-level tests.

## Non-goals (v1)

- Web UI, Flowable Modeler / Admin / official REST.
- CMMN, DMN, App, Event Registry engines.
- Multi-tenancy, JWT, OAuth2, production password hashing.
- MySQL / PostgreSQL profiles (H2 file DB only; a comment in `application.yml` may note how to switch later).
- Separate Maven modules (`core` / `web` / `app`). Package layering inside one module is enough.

## Stack

| Piece | Choice | Why |
|-------|--------|-----|
| Language | Java 21 | Current LTS; Spring Boot 3.5 supports 17–25 |
| Build | Maven | Requested |
| Spring Boot | 3.5.16 | Latest 3.5.x line (user asked for 3.5) |
| Flowable | 7.2.0 | Official alignment with Spring Boot 3.5.x. Flowable 8 requires Spring Boot 4 |
| Engine starters | `flowable-spring-boot-starter-process` only | Process engine pulls IDM; do not add CMMN/DMN/App starters |
| Database | H2 2.x, file mode | Embedded, data survives restart |
| Security | Spring Security HTTP Basic + Flowable IDM | Users/groups live in Flowable identity tables |
| API docs | springdoc-openapi | `/swagger-ui.html` |
| Tests | JUnit 5, MockMvc, `@SpringBootTest` | In-memory H2 for tests |

Coordinates: `com.example.flowable:flowable-framework:0.1.0-SNAPSHOT`.

## Architecture

One Spring Boot jar. Controllers talk only to application services. Application services talk to Flowable `RepositoryService`, `RuntimeService`, `TaskService`, `HistoryService`, and `IdentityService`.

```
HTTP (Basic)
  → SecurityFilterChain (IDM user details)
    → REST controllers
      → workflow / identity services
        → Flowable engines
          → H2 file: ./data/flowable
```

Package layout:

```
com.example.flowable
  FlowableFrameworkApplication
  common        R<T>, page payload, error codes, global exception handler
  config        Security, OpenAPI, Flowable/H2, identity + demo seed
  identity      Current user, user/group queries over IdentityService
  workflow      Definition/start, instance, task, history facades
```

Resources:

- `application.yml` — server, datasource, Flowable, H2 console, security.
- `processes/leave.bpmn20.xml` — auto-deployed on startup (`flowable.check-process-definitions=true`, default).

## Data

- JDBC URL: `jdbc:h2:file:./data/flowable;AUTO_SERVER=TRUE;MODE=LEGACY`
- Driver: `org.h2.Driver`
- Username/password: `sa` / empty
- `spring.jpa.open-in-view=false`; no JPA entities in v1 (Flowable owns schema).
- `flowable.database-schema-update=true`
- H2 console at `/h2-console` (local demo only).
- Tests override to `jdbc:h2:mem:flowable-test;MODE=LEGACY` so `./data` is not written.

`MODE=LEGACY` keeps Flowable’s older SQL dialect happy on H2 2.x.

## Identity and security

On first boot, a runner creates users and groups if they do not exist:

| User | Password | Groups |
|------|----------|--------|
| admin | test | admins |
| zhangsan | test | employees |
| lisi | test | managers |
| wangwu | test | hr |

Passwords are stored and verified as `{noop}test` (demo only).

Spring Security:

- HTTP Basic for all `/api/**`.
- `UserDetailsService` loads user + group membership from Flowable `IdentityService`.
- `admins` maps to `ROLE_ADMIN`; other groups map to `ROLE_<GROUP>` in uppercase.
- Permit without auth: `/h2-console/**`, `/swagger-ui/**`, `/v3/api-docs/**`.
- CSRF disabled (API-only). Frame options disabled for H2 console.
- After authentication, a filter or interceptor calls `org.flowable.common.engine.impl.identity.Authentication.setAuthenticatedUserId(username)` and clears it after the request.

Authorization at the service layer:

- `ROLE_ADMIN`: list/query all tasks and instances.
- Others: only processes they started, tasks assigned to them, or tasks where they are a candidate (user or group).
- Claim/complete of a task the caller cannot see → 403.

`GET /api/auth/me` returns username and group ids.

## REST facade

Base path: `/api`. Envelope:

```json
{ "code": 0, "message": "ok", "data": {} }
```

Failure: `code != 0`, HTTP status matches the error (400/403/404/500). List endpoints wrap `data` as `{ "page", "size", "total", "items" }`.

| Method | Path | Auth | Behavior |
|--------|------|------|----------|
| GET | `/auth/me` | any user | Current principal + groups |
| POST | `/process-definitions/{key}/start` | any user | Start instance; starter = current user. Body: map of variables |
| GET | `/process-instances` | user: own running; admin: all | Query runtime instances |
| GET | `/process-instances/{id}` | owner, involved, or admin | Detail + current tasks |
| POST | `/process-instances/{id}/delete` | starter or admin | Delete running instance |
| GET | `/tasks` | user: assignee + candidate; admin: all | Inbox |
| POST | `/tasks/{id}/claim` | candidate or admin | Claim |
| POST | `/tasks/{id}/complete` | assignee, candidate, or admin | Complete with variables |
| GET | `/history/process-instances` | user: own finished; admin: all | Historic instances |
| GET | `/history/process-instances/{id}/activities` | same as instance access | Activity trail |

No dedicated deploy API. BPMN files under `src/main/resources/processes/` deploy at startup.

Start leave body:

```json
{ "days": 2, "reason": "家庭事务" }
```

Complete approval body:

```json
{ "approved": true }
```

Validation:

- `days` integer > 0 required on leave start.
- `approved` boolean required on manager/HR complete.
- Unknown process key, instance, or task → 404.
- Engine exceptions are not returned raw; mapped by the global handler.

## Leave process (`leave`)

BPMN id/key: `leave`. Name: 请假流程.

Flow:

1. Start.
2. User task `managerApproval`, name 经理审批, candidate group `managers`.
3. Exclusive gateway:
   - `approved == false` → end (rejected).
   - `approved == true && days > 3` → user task `hrApproval`, name HR审批, candidate group `hr`.
   - else → end (approved).
4. After HR: `approved == true` → end (approved); else end (rejected).

Engine variables:

- `days` (integer), `reason` (string) from start form.
- `initiator` set by the facade to the current username.
- `approved` set on each approval complete (overwrites previous).

Threshold `3` is a process expression, not application code, so the BPMN stays the source of truth.

## Error handling

| Situation | HTTP | `code` |
|-----------|------|--------|
| Bean validation / illegal argument | 400 | 40000 |
| Not authenticated | 401 | 40100 |
| Cannot access task/instance | 403 | 40300 |
| Definition / instance / task missing | 404 | 40400 |
| Unhandled | 500 | 50000 |

`FlowableObjectNotFoundException` → 404. Other `FlowableException` → 500 with a safe message.

## Testing

`@SpringBootTest` + `MockMvc` + HTTP Basic. Test datasource is in-memory H2. Seed users run in tests the same way as in the app.

Cases:

1. Context loads; process definition `leave` is deployed.
2. `zhangsan` starts 2-day leave → `lisi` sees the task → complete `approved=true` → instance ended; `wangwu` has no task.
3. `zhangsan` starts 5-day leave → manager approves → `wangwu` has HR task.
4. Manager completes `approved=false` → instance ended; no HR task.
5. `zhangsan` cannot complete the manager task → 403.

## Operations

- Run: `./mvnw spring-boot:run` (wrapper committed with the project).
- Default port 8080.
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- H2 console: `http://localhost:8080/h2-console` JDBC URL `jdbc:h2:file:./data/flowable`

## Out of scope follow-ups

- Split into Maven modules if another app needs `workflow` as a library.
- Replace Basic with session/JWT.
- Add a second BPMN without changing the facade contract (drop XML under `processes/`).
