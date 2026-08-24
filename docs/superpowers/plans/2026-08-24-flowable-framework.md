# Flowable Framework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a single-module Spring Boot 3.5 app that wraps Flowable Process + IDM behind a small REST facade, with an embedded leave process and HTTP tests.

**Architecture:** One Maven jar. Controllers call application services only. Services call Flowable `RepositoryService`, `RuntimeService`, `TaskService`, `HistoryService`, and `IdentityService`. HTTP Basic authenticates against Flowable IDM; a request filter sets Flowable's authenticated user id. H2 file DB for local runs; in-memory H2 for tests.

**Tech Stack:** Java 21, Maven, Spring Boot 3.5.16, Flowable 7.2.0 (`flowable-spring-boot-starter-process` only), H2, Spring Security, springdoc-openapi, JUnit 5, MockMvc.

**Spec:** `docs/superpowers/specs/2026-08-24-flowable-framework-design.md`

## Global Constraints

- Java 21; Maven coordinates `com.example.flowable:flowable-framework:0.1.0-SNAPSHOT`
- Spring Boot **3.5.16**; Flowable **7.2.0**; do not add CMMN/DMN/App starters or Flowable official REST
- H2 file URL for the app: `jdbc:h2:file:./data/flowable;AUTO_SERVER=TRUE;MODE=LEGACY` (user `sa`, empty password)
- Tests must use `jdbc:h2:mem:flowable-test;MODE=LEGACY;DB_CLOSE_DELAY=-1` and must not write `./data`
- REST envelope `{ "code", "message", "data" }`; success `code` is `0`; list `data` is `{ "page", "size", "total", "items" }`; page is **1-based**
- Error codes: 40000 / 40100 / 40300 / 40400 / 50000 with HTTP 400 / 401 / 403 / 404 / 500
- Passwords stored as `{noop}test`; HTTP Basic password is `test`
- Group `admins` → `ROLE_ADMIN`; other groups → `ROLE_<GROUP>` uppercase
- No UI, no JWT, no extra BPMN besides `leave`, no README unless asked
- Controllers must not inject Flowable engine services

---

## File map

Create these files. Do not invent extra modules or packages.

```
.gitignore
pom.xml
mvnw
mvnw.cmd
.mvn/wrapper/maven-wrapper.properties
.mvn/wrapper/maven-wrapper.jar

src/main/java/com/example/flowable/FlowableFrameworkApplication.java

src/main/java/com/example/flowable/common/api/R.java
src/main/java/com/example/flowable/common/api/PageData.java
src/main/java/com/example/flowable/common/api/ErrorCodes.java
src/main/java/com/example/flowable/common/exception/BusinessException.java
src/main/java/com/example/flowable/common/web/ErrorBodyWriter.java
src/main/java/com/example/flowable/common/web/GlobalExceptionHandler.java

src/main/java/com/example/flowable/config/SecurityConfig.java
src/main/java/com/example/flowable/config/OpenApiConfig.java
src/main/java/com/example/flowable/config/FlowableAuthFilter.java
src/main/java/com/example/flowable/config/IdentitySeedRunner.java

src/main/java/com/example/flowable/identity/FlowableUserDetailsService.java
src/main/java/com/example/flowable/identity/CurrentUser.java
src/main/java/com/example/flowable/identity/CurrentUsers.java
src/main/java/com/example/flowable/identity/AuthController.java

src/main/java/com/example/flowable/workflow/dto/ProcessInstanceView.java
src/main/java/com/example/flowable/workflow/dto/ProcessInstanceDetail.java
src/main/java/com/example/flowable/workflow/dto/TaskView.java
src/main/java/com/example/flowable/workflow/dto/HistoricProcessView.java
src/main/java/com/example/flowable/workflow/dto/ActivityView.java
src/main/java/com/example/flowable/workflow/WorkflowAccess.java
src/main/java/com/example/flowable/workflow/ProcessCommandService.java
src/main/java/com/example/flowable/workflow/ProcessQueryService.java
src/main/java/com/example/flowable/workflow/WorkflowTaskService.java
src/main/java/com/example/flowable/workflow/HistoryQueryService.java
src/main/java/com/example/flowable/workflow/ProcessController.java
src/main/java/com/example/flowable/workflow/TaskController.java
src/main/java/com/example/flowable/workflow/HistoryController.java

src/main/resources/application.yml
src/main/resources/processes/leave.bpmn20.xml

src/test/java/com/example/flowable/FlowableFrameworkApplicationTests.java
src/test/java/com/example/flowable/common/RTest.java
src/test/java/com/example/flowable/identity/AuthMeIT.java
src/test/java/com/example/flowable/workflow/LeaveDefinitionIT.java
src/test/java/com/example/flowable/workflow/ProcessApiIT.java
src/test/java/com/example/flowable/workflow/TaskApiIT.java
src/test/java/com/example/flowable/workflow/HistoryApiIT.java
src/test/java/com/example/flowable/workflow/LeaveProcessIT.java
src/test/java/com/example/flowable/support/MvcAuth.java
src/test/resources/application.yml
```

---

### Task 1: Bootable Maven app with Flowable Process + H2

**Files:**
- Create: `.gitignore`, `pom.xml`, `src/main/java/com/example/flowable/FlowableFrameworkApplication.java`, `src/main/resources/application.yml`, `src/test/java/com/example/flowable/FlowableFrameworkApplicationTests.java`, `src/test/resources/application.yml`
- Generate: Maven wrapper (`mvnw`, `.mvn/wrapper/*`)
- Test: `src/test/java/com/example/flowable/FlowableFrameworkApplicationTests.java`

**Interfaces:**
- Consumes: nothing
- Produces: Spring Boot app `com.example.flowable.FlowableFrameworkApplication`; test profile uses in-memory H2; `ProcessEngine` bean available

- [ ] **Step 1: Write the failing context-load test**

Create `src/test/java/com/example/flowable/FlowableFrameworkApplicationTests.java`:

```java
package com.example.flowable;

import org.flowable.engine.ProcessEngine;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class FlowableFrameworkApplicationTests {

    @Autowired
    ProcessEngine processEngine;

    @Test
    void contextLoadsProcessEngine() {
        assertThat(processEngine).isNotNull();
    }
}
```

Create `src/test/resources/application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:h2:mem:flowable-test;MODE=LEGACY;DB_CLOSE_DELAY=-1
    driver-class-name: org.h2.Driver
    username: sa
    password: ""
  h2:
    console:
      enabled: false
flowable:
  database-schema-update: true
```

- [ ] **Step 2: Run test to verify it fails**

Run: `mvn test -Dtest=FlowableFrameworkApplicationTests` (or generate wrapper first if Maven is installed: `mvn -N wrapper:wrapper -Dmaven=3.9.11` then `./mvnw test -Dtest=FlowableFrameworkApplicationTests`)

Expected: FAIL because `pom.xml` / main class do not exist.

- [ ] **Step 3: Write minimal implementation**

`.gitignore`:

```
target/
data/
.idea/
*.iml
.classpath
.project
.settings/
.DS_Store
```

`pom.xml` (exact versions):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.5.16</version>
        <relativePath/>
    </parent>

    <groupId>com.example.flowable</groupId>
    <artifactId>flowable-framework</artifactId>
    <version>0.1.0-SNAPSHOT</version>
    <name>flowable-framework</name>

    <properties>
        <java.version>21</java.version>
        <flowable.version>7.2.0</flowable.version>
        <springdoc.version>2.8.13</springdoc.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.flowable</groupId>
            <artifactId>flowable-spring-boot-starter-process</artifactId>
            <version>${flowable.version}</version>
        </dependency>
        <dependency>
            <groupId>com.h2database</groupId>
            <artifactId>h2</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springdoc</groupId>
            <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
            <version>${springdoc.version}</version>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.security</groupId>
            <artifactId>spring-security-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

`src/main/java/com/example/flowable/FlowableFrameworkApplication.java`:

```java
package com.example.flowable;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class FlowableFrameworkApplication {

    public static void main(String[] args) {
        SpringApplication.run(FlowableFrameworkApplication.class, args);
    }
}
```

`src/main/resources/application.yml`:

```yaml
server:
  port: 8080

spring:
  application:
    name: flowable-framework
  datasource:
    url: jdbc:h2:file:./data/flowable;AUTO_SERVER=TRUE;MODE=LEGACY
    driver-class-name: org.h2.Driver
    username: sa
    password: ""
  h2:
    console:
      enabled: true
      path: /h2-console
  jpa:
    open-in-view: false

# To switch to MySQL later, replace spring.datasource.* and add the MySQL driver.
flowable:
  database-schema-update: true
  check-process-definitions: true
  process-definition-location-prefix: classpath*:/processes/
```

Generate the Maven wrapper and commit wrapper files (`mvnw`, `mvnw.cmd`, `.mvn/wrapper/maven-wrapper.properties`, `.mvn/wrapper/maven-wrapper.jar`).

If Spring Security causes the context-load test to fail waiting for a user, add a temporary `SecurityFilterChain` that `permitAll()` **only if needed to get this task green**; Task 3 replaces it with the real chain. Prefer leaving default security if the test still loads a `ProcessEngine`.

- [ ] **Step 4: Run test to verify it passes**

Run: `./mvnw test -Dtest=FlowableFrameworkApplicationTests`

Expected: PASS. Confirm no `./data` directory was created by the test (in-memory URL).

- [ ] **Step 5: Commit**

```bash
git add .gitignore pom.xml mvnw mvnw.cmd .mvn src/main src/test/java/com/example/flowable/FlowableFrameworkApplicationTests.java src/test/resources/application.yml
git commit -m "chore: bootstrap Spring Boot 3.5 with Flowable process and H2"
```

Initialize git first if the directory is not a repository: `git init`.

---

### Task 2: API envelope and exception mapping

**Files:**
- Create: `src/main/java/com/example/flowable/common/api/R.java`, `PageData.java`, `ErrorCodes.java`, `src/main/java/com/example/flowable/common/exception/BusinessException.java`, `src/main/java/com/example/flowable/common/web/ErrorBodyWriter.java`, `GlobalExceptionHandler.java`
- Test: `src/test/java/com/example/flowable/common/RTest.java`

**Interfaces:**
- Consumes: nothing from Task 1 besides the app compiling
- Produces:
  - `public record R<T>(int code, String message, T data)` with `R.ok(T)`, `R.ok()`, `R.fail(int code, String message)`
  - `public record PageData<T>(int page, int size, long total, java.util.List<T> items)`
  - `ErrorCodes.BAD_REQUEST=40000`, `UNAUTHORIZED=40100`, `FORBIDDEN=40300`, `NOT_FOUND=40400`, `INTERNAL=50000`
  - `public final class BusinessException extends RuntimeException` with `int getCode()`, `org.springframework.http.HttpStatus getStatus()`
  - `BusinessException.badRequest(String)`, `.forbidden(String)`, `.notFound(String)`
  - `GlobalExceptionHandler` maps `BusinessException`, `FlowableObjectNotFoundException` → 404/`40400`, other `FlowableException` → 500/`50000`, `MethodArgumentNotValidException` / `HandlerMethodValidationException` / `IllegalArgumentException` → 400/`40000`, fallback `Exception` → 500/`50000`
  - `ErrorBodyWriter.write(HttpServletResponse, int httpStatus, int code, String message)` writes JSON `R`

- [ ] **Step 1: Write the failing unit test**

```java
package com.example.flowable.common;

import com.example.flowable.common.api.ErrorCodes;
import com.example.flowable.common.api.PageData;
import com.example.flowable.common.api.R;
import com.example.flowable.common.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class RTest {

    @Test
    void okWrapsDataWithZeroCode() {
        R<String> body = R.ok("pong");
        assertThat(body.code()).isZero();
        assertThat(body.message()).isEqualTo("ok");
        assertThat(body.data()).isEqualTo("pong");
    }

    @Test
    void failUsesErrorCode() {
        R<Void> body = R.fail(ErrorCodes.NOT_FOUND, "missing");
        assertThat(body.code()).isEqualTo(40400);
        assertThat(body.data()).isNull();
    }

    @Test
    void pageDataHoldsItems() {
        PageData<String> page = new PageData<>(1, 20, 1, List.of("a"));
        assertThat(page.page()).isEqualTo(1);
        assertThat(page.total()).isEqualTo(1);
    }

    @Test
    void notFoundExceptionCarriesHttp404() {
        BusinessException ex = BusinessException.notFound("task");
        assertThat(ex.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(ex.getCode()).isEqualTo(ErrorCodes.NOT_FOUND);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./mvnw test -Dtest=RTest`

Expected: FAIL — `R` / `ErrorCodes` not found.

- [ ] **Step 3: Write minimal implementation**

`ErrorCodes.java`:

```java
package com.example.flowable.common.api;

public final class ErrorCodes {
    public static final int BAD_REQUEST = 40000;
    public static final int UNAUTHORIZED = 40100;
    public static final int FORBIDDEN = 40300;
    public static final int NOT_FOUND = 40400;
    public static final int INTERNAL = 50000;

    private ErrorCodes() {}
}
```

`R.java`:

```java
package com.example.flowable.common.api;

public record R<T>(int code, String message, T data) {
    public static <T> R<T> ok(T data) {
        return new R<>(0, "ok", data);
    }

    public static R<Void> ok() {
        return new R<>(0, "ok", null);
    }

    public static <T> R<T> fail(int code, String message) {
        return new R<>(code, message, null);
    }
}
```

`PageData.java`:

```java
package com.example.flowable.common.api;

import java.util.List;

public record PageData<T>(int page, int size, long total, List<T> items) {}
```

`BusinessException.java`:

```java
package com.example.flowable.common.exception;

import com.example.flowable.common.api.ErrorCodes;
import org.springframework.http.HttpStatus;

public final class BusinessException extends RuntimeException {
    private final int code;
    private final HttpStatus status;

    public BusinessException(int code, HttpStatus status, String message) {
        super(message);
        this.code = code;
        this.status = status;
    }

    public static BusinessException badRequest(String message) {
        return new BusinessException(ErrorCodes.BAD_REQUEST, HttpStatus.BAD_REQUEST, message);
    }

    public static BusinessException forbidden(String message) {
        return new BusinessException(ErrorCodes.FORBIDDEN, HttpStatus.FORBIDDEN, message);
    }

    public static BusinessException notFound(String message) {
        return new BusinessException(ErrorCodes.NOT_FOUND, HttpStatus.NOT_FOUND, message);
    }

    public int getCode() {
        return code;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
```

`ErrorBodyWriter.java` — serialize `R.fail(code, message)` with `ObjectMapper` to the servlet response, set status and `application/json`.

`GlobalExceptionHandler.java` — `@RestControllerAdvice` returning `ResponseEntity<R<Void>>` as specified in Interfaces. Never put `ex.getMessage()` from unexpected engine failures into the client body for generic `FlowableException` / `Exception`; use `"internal error"`. `BusinessException` and validation exceptions may use their message.

- [ ] **Step 4: Run test to verify it passes**

Run: `./mvnw test -Dtest=RTest,FlowableFrameworkApplicationTests`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/com/example/flowable/common src/test/java/com/example/flowable/common
git commit -m "feat: add unified API envelope and exception mapping"
```

---

### Task 3: Flowable IDM seed, HTTP Basic, `/api/auth/me`, OpenAPI

**Files:**
- Create: `config/SecurityConfig.java`, `OpenApiConfig.java`, `FlowableAuthFilter.java`, `IdentitySeedRunner.java`, `identity/FlowableUserDetailsService.java`, `CurrentUser.java`, `CurrentUsers.java`, `AuthController.java`, `support/MvcAuth.java`, `identity/AuthMeIT.java`
- Modify: `config/SecurityConfig.java` replaces any Task 1 temporary permit-all chain
- Test: `src/test/java/com/example/flowable/identity/AuthMeIT.java`

**Interfaces:**
- Consumes: `R`, `ErrorCodes`, `ErrorBodyWriter`, Flowable `IdentityService`
- Produces:
  - `public record CurrentUser(String userId, java.util.Set<String> groupIds, boolean admin)`
  - `public class CurrentUsers { public CurrentUser require(); }` — reads `SecurityContext`; loads groups via `IdentityService.createGroupQuery().groupMember(userId)`; `admin` is true when `groupIds` contains `"admins"`
  - `IdentitySeedRunner` implements `ApplicationRunner` and inserts if missing: groups `admins`, `employees`, `managers`, `hr`; users `admin`/`zhangsan`/`lisi`/`wangwu` with password `{noop}test` and memberships from the spec table
  - `FlowableUserDetailsService` implements `UserDetailsService`; unknown user → `UsernameNotFoundException`; authorities: `admins` → `ROLE_ADMIN`, else `ROLE_` + groupId uppercased
  - `FlowableAuthFilter` extends `OncePerRequestFilter`: if authenticated and not anonymous, `org.flowable.common.engine.impl.identity.Authentication.setAuthenticatedUserId(name)` then `filterChain.doFilter`, `finally` set authenticated user to `null`
  - `SecurityFilterChain`: CSRF off; frame options disabled; HTTP Basic; `UserDetailsService` from IDM; `PasswordEncoder` is `PasswordEncoderFactories.createDelegatingPasswordEncoder()`; entry point writes 401/`40100`; access denied writes 403/`40300`; `permitAll` for `/h2-console/**`, `/swagger-ui.html`, `/swagger-ui/**`, `/v3/api-docs/**`; `anyRequest().authenticated()`
  - `GET /api/auth/me` → `R<CurrentUser>`
  - `MvcAuth.zhangsan()` / `lisi()` / `wangwu()` / `admin()` return `httpBasic(user, "test")`

- [ ] **Step 1: Write the failing IT**

`src/test/java/com/example/flowable/support/MvcAuth.java`:

```java
package com.example.flowable.support;

import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;

public final class MvcAuth {
    public static final String PASSWORD = "test";

    public static RequestPostProcessor zhangsan() {
        return httpBasic("zhangsan", PASSWORD);
    }

    public static RequestPostProcessor lisi() {
        return httpBasic("lisi", PASSWORD);
    }

    public static RequestPostProcessor wangwu() {
        return httpBasic("wangwu", PASSWORD);
    }

    public static RequestPostProcessor admin() {
        return httpBasic("admin", PASSWORD);
    }

    private MvcAuth() {}
}
```

`src/test/java/com/example/flowable/identity/AuthMeIT.java`:

```java
package com.example.flowable.identity;

import com.example.flowable.support.MvcAuth;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthMeIT {

    @Autowired
    MockMvc mockMvc;

    @Test
    void unauthenticatedMeIs401() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(40100));
    }

    @Test
    void zhangsanMeReturnsEmployeeGroup() throws Exception {
        mockMvc.perform(get("/api/auth/me").with(MvcAuth.zhangsan()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.userId").value("zhangsan"))
                .andExpect(jsonPath("$.data.admin").value(false))
                .andExpect(jsonPath("$.data.groupIds[0]").value("employees"));
    }

    @Test
    void adminMeIsAdmin() throws Exception {
        mockMvc.perform(get("/api/auth/me").with(MvcAuth.admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.admin").value(true));
    }
}
```

`jsonPath("$.data.groupIds[0]")` assumes a single group. If Jackson serializes `Set` in another order, use `jsonPath("$.data.groupIds").value(org.hamcrest.Matchers.hasItem("employees"))` instead.

- [ ] **Step 2: Run test to verify it fails**

Run: `./mvnw test -Dtest=AuthMeIT`

Expected: FAIL — 401 JSON and `/api/auth/me` missing.

- [ ] **Step 3: Write minimal implementation**

Seed users **only if** `identityService.createUserQuery().userId(id).count() == 0`. Same for groups.

`AuthController`:

```java
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final CurrentUsers currentUsers;

    public AuthController(CurrentUsers currentUsers) {
        this.currentUsers = currentUsers;
    }

    @GetMapping("/me")
    public R<CurrentUser> me() {
        return R.ok(currentUsers.require());
    }
}
```

`OpenApiConfig`: `@OpenAPIDefinition(info = @Info(title = "Flowable Framework", version = "0.1.0"))`. Springdoc must be reachable without auth as specified.

Wire `FlowableAuthFilter` before `UsernamePasswordAuthenticationFilter` or as a generic `OncePerRequestFilter` bean added with `http.addFilterAfter(..., BasicAuthenticationFilter.class)`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `./mvnw test -Dtest=AuthMeIT,FlowableFrameworkApplicationTests,RTest`

Expected: PASS. Wrong Basic password still 401.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/com/example/flowable/config src/main/java/com/example/flowable/identity src/test/java/com/example/flowable/identity src/test/java/com/example/flowable/support
git commit -m "feat: seed Flowable IDM and expose /api/auth/me with HTTP Basic"
```

---

### Task 4: Deploy leave BPMN

**Files:**
- Create: `src/main/resources/processes/leave.bpmn20.xml`
- Test: `src/test/java/com/example/flowable/workflow/LeaveDefinitionIT.java`

**Interfaces:**
- Consumes: Flowable auto-deploy from `classpath*:/processes/`
- Produces: process definition key `leave`, name `请假流程`; user task ids `managerApproval` (candidate group `managers`) and `hrApproval` (candidate group `hr`); exclusive gateways matching the spec conditions (`approved == false` reject; `approved == true && days > 3` HR; `approved == true && days <= 3` approve; HR `approved` true/false)

- [ ] **Step 1: Write the failing definition test**

```java
package com.example.flowable.workflow;

import org.flowable.engine.RepositoryService;
import org.flowable.engine.repository.ProcessDefinition;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class LeaveDefinitionIT {

    @Autowired
    RepositoryService repositoryService;

    @Test
    void leaveDefinitionIsDeployed() {
        ProcessDefinition def = repositoryService.createProcessDefinitionQuery()
                .processDefinitionKey("leave")
                .latestVersion()
                .singleResult();
        assertThat(def).isNotNull();
        assertThat(def.getName()).isEqualTo("请假流程");
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./mvnw test -Dtest=LeaveDefinitionIT`

Expected: FAIL — `def` is null.

- [ ] **Step 3: Write `leave.bpmn20.xml`**

Use Flowable BPMN 2.0 XML:

- `process id="leave" name="请假流程" isExecutable="true"`
- `startEvent` → `userTask id="managerApproval" name="经理审批" flowable:candidateGroups="managers"`
- exclusive gateway:
  - `${approved == false}` → `endEvent id="endRejected" name="驳回"`
  - `${approved == true && days > 3}` → `userTask id="hrApproval" name="HR审批" flowable:candidateGroups="hr"`
  - `${approved == true && days <= 3}` → `endEvent id="endApproved" name="批准"`
- after HR, exclusive gateway: `${approved == true}` → `endApproved`; `${approved == false}` → `endRejected`
- XML-escape `&` as `&amp;` and `>` as `&gt;` in condition expressions

Do not encode the `days > 3` threshold in Java.

- [ ] **Step 4: Run test to verify it passes**

Run: `./mvnw test -Dtest=LeaveDefinitionIT`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/resources/processes/leave.bpmn20.xml src/test/java/com/example/flowable/workflow/LeaveDefinitionIT.java
git commit -m "feat: auto-deploy leave BPMN process"
```

---

### Task 5: Process start, list, get, delete

**Files:**
- Create: `workflow/dto/ProcessInstanceView.java`, `ProcessInstanceDetail.java`, `TaskView.java`, `WorkflowAccess.java`, `ProcessCommandService.java`, `ProcessQueryService.java`, `ProcessController.java`
- Test: `src/test/java/com/example/flowable/workflow/ProcessApiIT.java`

**Interfaces:**
- Consumes: `CurrentUser`, `CurrentUsers`, `R`, `PageData`, `BusinessException`, Flowable `RepositoryService`, `RuntimeService`, `TaskService`
- Produces:
  - `ProcessInstanceView(String id, String processDefinitionKey, String processDefinitionName, String startUserId, java.time.Instant startTime)`
  - `TaskView(String id, String name, String processInstanceId, String assignee, String taskDefinitionKey, java.time.Instant createTime)`
  - `ProcessInstanceDetail(ProcessInstanceView instance, java.util.List<TaskView> currentTasks)`
  - `WorkflowAccess.ensureCanSeeProcess(String processInstanceId, CurrentUser user)` — admin always; else startUserId equals user, or `involvedUser`, or user has a current task; otherwise `BusinessException.forbidden`
  - `WorkflowAccess.requireProcessInstance(String id)` — runtime or historic existence; missing → `notFound`
  - `ProcessCommandService.start(String processDefinitionKey, java.util.Map<String, Object> variables, CurrentUser user)` — unknown key → 404; if key is `leave`, require `days` as `Number` with `intValue() > 0` else 400; copy variables, put `initiator` = `user.userId()`; `runtimeService.startProcessInstanceByKey`; return view
  - `ProcessQueryService.listRuntime(int page, int size, CurrentUser user)` — non-admin: `startedBy(userId)`; admin: all; `start = (page - 1) * size`; `page` default 1, `size` default 20; reject page < 1 or size < 1
  - `ProcessQueryService.getRuntime(String id, CurrentUser user)` — 404 if not running; then `ensureCanSeeProcess`; include current tasks via `taskService.createTaskQuery().processInstanceId(id).list()`
  - `ProcessQueryService.deleteRuntime(String id, CurrentUser user)` — 404 if not running; allow if admin or `startUserId` equals user; else 403; `runtimeService.deleteProcessInstance(id, "deleted by " + user.userId())`
  - Controller mapping (all under `/api`):
    - `POST /process-definitions/{key}/start` body `Map<String, Object>`
    - `GET /process-instances?page&size`
    - `GET /process-instances/{id}`
    - `POST /process-instances/{id}/delete`

Helper to convert `java.util.Date` to `Instant`: `date == null ? null : date.toInstant()`.

- [ ] **Step 1: Write the failing API test**

```java
package com.example.flowable.workflow;

import com.example.flowable.support.MvcAuth;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ProcessApiIT {

    @Autowired
    MockMvc mockMvc;

    @Test
    void unknownProcessKeyIs404() throws Exception {
        mockMvc.perform(post("/api/process-definitions/missing/start")
                        .with(MvcAuth.zhangsan())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"days\":1,\"reason\":\"x\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(40400));
    }

    @Test
    void leaveRequiresPositiveDays() throws Exception {
        mockMvc.perform(post("/api/process-definitions/leave/start")
                        .with(MvcAuth.zhangsan())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"days\":0,\"reason\":\"x\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(40000));
    }

    @Test
    void zhangsanStartsLeaveAndListsOwnInstance() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/process-definitions/leave/start")
                        .with(MvcAuth.zhangsan())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"days\":2,\"reason\":\"家庭事务\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.processDefinitionKey").value("leave"))
                .andExpect(jsonPath("$.data.startUserId").value("zhangsan"))
                .andReturn();

        String id = com.jayway.jsonpath.JsonPath.read(created.getResponse().getContentAsString(), "$.data.id");

        mockMvc.perform(get("/api/process-instances").with(MvcAuth.zhangsan()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[*].id").value(org.hamcrest.Matchers.hasItem(id)));

        mockMvc.perform(get("/api/process-instances/" + id).with(MvcAuth.zhangsan()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.currentTasks[0].taskDefinitionKey").value("managerApproval"));

        mockMvc.perform(get("/api/process-instances/" + id).with(MvcAuth.wangwu()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(40300));
    }
}
```

`com.jayway.jsonpath.JsonPath` is already on the test classpath via Spring Boot.

- [ ] **Step 2: Run test to verify it fails**

Run: `./mvnw test -Dtest=ProcessApiIT`

Expected: FAIL — mapping not found.

- [ ] **Step 3: Write services and `ProcessController`**

Do not inject engine types into the controller. Map Flowable entities to the records above.

For start: `repositoryService.createProcessDefinitionQuery().processDefinitionKey(key).latestVersion().singleResult()` null → `BusinessException.notFound("process definition")`.

When building the start variable map, always put `initiator`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `./mvnw test -Dtest=ProcessApiIT,LeaveDefinitionIT,AuthMeIT`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/com/example/flowable/workflow src/test/java/com/example/flowable/workflow/ProcessApiIT.java
git commit -m "feat: add process start, query, and delete APIs"
```

(`delete` may be tested only lightly here; `LeaveProcessIT` in Task 8 does not require delete. Still implement delete in this task as specified.)

Add a short delete assertion in `ProcessApiIT` if the three tests above are green: start, delete as starter, then GET returns 404.

---

### Task 6: Task inbox, claim, complete

**Files:**
- Create: `workflow/WorkflowTaskService.java`, `workflow/TaskController.java`
- Modify: `WorkflowAccess.java` if task visibility helpers belong there
- Test: `src/test/java/com/example/flowable/workflow/TaskApiIT.java`

**Interfaces:**
- Consumes: `CurrentUser`, `TaskView`, `PageData`, `BusinessException`, Flowable `TaskService`
- Produces:
  - `WorkflowTaskService.list(int page, int size, CurrentUser user)` — admin: all tasks; else `.or().taskAssignee(userId).taskCandidateUser(userId).taskCandidateGroupIn(groups).endOr()`. If `groupIds` is empty, skip `taskCandidateGroupIn`.
  - `WorkflowAccess.ensureCanActOnTask(org.flowable.task.api.Task task, CurrentUser user)` — admin; or assignee equals user; or candidate user; or candidate group intersection with `user.groupIds()`. Else 403. Missing task → 404 via `createTaskQuery().taskId(id).singleResult()`.
  - `claim(String taskId, CurrentUser user)` — `ensureCanActOnTask` then `taskService.claim(taskId, user.userId())`
  - `complete(String taskId, Map<String, Object> variables, CurrentUser user)` — `ensureCanActOnTask`; if task definition key is `managerApproval` or `hrApproval`, require `variables.get("approved") instanceof Boolean` else 400; if assignee is null or not the current user and user is not admin, `claim` first; admin may `setAssignee` then complete; `taskService.complete(taskId, variables)`
  - Controller: `GET /api/tasks?page&size`, `POST /api/tasks/{id}/claim`, `POST /api/tasks/{id}/complete` body `Map<String, Object>`

- [ ] **Step 1: Write the failing task test**

```java
package com.example.flowable.workflow;

import com.example.flowable.support.MvcAuth;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class TaskApiIT {

    @Autowired
    MockMvc mockMvc;

    @Test
    void managerSeesLeaveTaskAndEmployeeCannotCompleteIt() throws Exception {
        mockMvc.perform(post("/api/process-definitions/leave/start")
                        .with(MvcAuth.zhangsan())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"days\":2,\"reason\":\"x\"}"))
                .andExpect(status().isOk());

        MvcResult inbox = mockMvc.perform(get("/api/tasks").with(MvcAuth.lisi()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].taskDefinitionKey").value("managerApproval"))
                .andReturn();
        String taskId = JsonPath.read(inbox.getResponse().getContentAsString(), "$.data.items[0].id");

        mockMvc.perform(post("/api/tasks/" + taskId + "/complete")
                        .with(MvcAuth.zhangsan())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"approved\":true}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(40300));

        mockMvc.perform(post("/api/tasks/" + taskId + "/complete")
                        .with(MvcAuth.lisi())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(40000));

        mockMvc.perform(post("/api/tasks/" + taskId + "/complete")
                        .with(MvcAuth.lisi())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"approved\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0));
    }
}
```

If leftover tasks from `ProcessApiIT` pollute `items[0]`, query `$.data.items[?(@.taskDefinitionKey=='managerApproval')]` or complete/delete stray instances in `@BeforeEach` by shutting down running instances as admin. Prefer isolating with `taskService.createTaskQuery().processInstanceId(...)` in assertions by starting then GET instance currentTasks[0].id instead of the global inbox `[0]`. **Use currentTasks from GET `/api/process-instances/{id}` to pick the task id** so the test does not depend on inbox order.

- [ ] **Step 2: Run test to verify it fails**

Run: `./mvnw test -Dtest=TaskApiIT`

Expected: FAIL — `/api/tasks` missing.

- [ ] **Step 3: Implement `WorkflowTaskService` and `TaskController`**

Candidate check without extra queries when possible: `taskService.createTaskQuery().taskId(id).or().taskAssignee(userId).taskCandidateUser(userId).taskCandidateGroupIn(groups).endOr().count() > 0` plus admin bypass.

- [ ] **Step 4: Run tests to verify they pass**

Run: `./mvnw test -Dtest=TaskApiIT,ProcessApiIT`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/com/example/flowable/workflow src/test/java/com/example/flowable/workflow/TaskApiIT.java
git commit -m "feat: add task inbox, claim, and complete APIs"
```

---

### Task 7: History query APIs

**Files:**
- Create: `workflow/dto/HistoricProcessView.java`, `ActivityView.java`, `HistoryQueryService.java`, `HistoryController.java`
- Test: `src/test/java/com/example/flowable/workflow/HistoryApiIT.java`

**Interfaces:**
- Consumes: `CurrentUser`, `PageData`, `WorkflowAccess`, Flowable `HistoryService`
- Produces:
  - `HistoricProcessView(String id, String processDefinitionKey, String startUserId, Instant startTime, Instant endTime, String deleteReason)`
  - `ActivityView(String activityId, String activityName, String activityType, String assignee, Instant startTime, Instant endTime)`
  - `listHistoric(int page, int size, CurrentUser user)` — finished instances (`finished()`); non-admin `startedBy(userId)`
  - `listActivities(String processInstanceId, CurrentUser user)` — `ensureCanSeeProcess` (must work for ended instances via historic query); order by start time; map `HistoricActivityInstance`
  - Controller: `GET /api/history/process-instances?page&size`, `GET /api/history/process-instances/{id}/activities`

`WorkflowAccess.ensureCanSeeProcess` must look up historic instance when the runtime instance is gone (starter / involved / admin). Involved: historic identity links or `historicProcessInstanceQuery().involvedUser(userId).processInstanceId(id).count() > 0`.

- [ ] **Step 1: Write the failing history test**

Start 2-day leave as `zhangsan`, complete manager task as `lisi` with `approved=true`, then:

- `GET /api/history/process-instances` as `zhangsan` contains the id and `endTime` is not null
- `GET /api/history/process-instances/{id}/activities` contains an activity named `经理审批`
- `wangwu` GET activities → 403

- [ ] **Step 2: Run test to verify it fails**

Run: `./mvnw test -Dtest=HistoryApiIT`

Expected: FAIL — history mappings missing.

- [ ] **Step 3: Implement history service and controller**

- [ ] **Step 4: Run tests to verify they pass**

Run: `./mvnw test -Dtest=HistoryApiIT,TaskApiIT`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/com/example/flowable/workflow src/test/java/com/example/flowable/workflow/HistoryApiIT.java
git commit -m "feat: add process history and activity trail APIs"
```

---

### Task 8: Spec leave scenarios

**Files:**
- Create: `src/test/java/com/example/flowable/workflow/LeaveProcessIT.java`
- Modify: none of the production code unless a scenario fails (fix the smallest cause)

**Interfaces:**
- Consumes: all REST endpoints from Tasks 3–7
- Produces: the five spec HTTP cases, implemented as JUnit tests in `LeaveProcessIT`

- [ ] **Step 1: Write the scenario tests**

Spec case 1 is already `LeaveDefinitionIT` plus context load — do not duplicate it.

```java
package com.example.flowable.workflow;

import com.example.flowable.support.MvcAuth;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class LeaveProcessIT {

    @Autowired
    MockMvc mockMvc;

    @Test
    void twoDayLeaveEndsAfterManagerApproveWithoutHr() throws Exception {
        String instanceId = startLeave(2);
        String taskId = currentTaskId(instanceId, MvcAuth.zhangsan());
        complete(taskId, true, MvcAuth.lisi());

        mockMvc.perform(get("/api/process-instances/" + instanceId).with(MvcAuth.zhangsan()))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/tasks").with(MvcAuth.wangwu()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[*].processInstanceId").value(not(hasItem(instanceId))));
        mockMvc.perform(get("/api/history/process-instances").with(MvcAuth.zhangsan()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[*].id").value(hasItem(instanceId)));
    }

    @Test
    void fiveDayLeaveCreatesHrTaskAfterManagerApprove() throws Exception {
        String instanceId = startLeave(5);
        complete(currentTaskId(instanceId, MvcAuth.zhangsan()), true, MvcAuth.lisi());
        mockMvc.perform(get("/api/process-instances/" + instanceId).with(MvcAuth.zhangsan()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.currentTasks[0].taskDefinitionKey").value("hrApproval"));
        mockMvc.perform(get("/api/tasks").with(MvcAuth.wangwu()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[*].processInstanceId").value(hasItem(instanceId)));
    }

    @Test
    void managerRejectEndsWithoutHr() throws Exception {
        String instanceId = startLeave(5);
        complete(currentTaskId(instanceId, MvcAuth.zhangsan()), false, MvcAuth.lisi());
        mockMvc.perform(get("/api/process-instances/" + instanceId).with(MvcAuth.zhangsan()))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/tasks").with(MvcAuth.wangwu()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[*].processInstanceId").value(not(hasItem(instanceId))));
    }

    @Test
    void employeeCannotCompleteManagerTask() throws Exception {
        String instanceId = startLeave(2);
        String taskId = currentTaskId(instanceId, MvcAuth.zhangsan());
        mockMvc.perform(post("/api/tasks/" + taskId + "/complete")
                        .with(MvcAuth.zhangsan())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"approved\":true}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(40300));
    }

    private String startLeave(int days) throws Exception {
        var result = mockMvc.perform(post("/api/process-definitions/leave/start")
                        .with(MvcAuth.zhangsan())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"days\":" + days + ",\"reason\":\"家庭事务\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.id");
    }

    private String currentTaskId(String instanceId, RequestPostProcessor auth) throws Exception {
        var result = mockMvc.perform(get("/api/process-instances/" + instanceId).with(auth))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.currentTasks[0].id");
    }

    private void complete(String taskId, boolean approved, RequestPostProcessor auth) throws Exception {
        mockMvc.perform(post("/api/tasks/" + taskId + "/complete")
                        .with(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"approved\":" + approved + "}"))
                .andExpect(status().isOk());
    }
}
```

- [ ] **Step 2: Run tests**

Run: `./mvnw test -Dtest=LeaveProcessIT`

Expected: FAIL only if production code is wrong; if already green from earlier tasks, keep the tests as the spec regression suite.

- [ ] **Step 3: Fix production code if anything fails**

Typical fixes: gateway conditions XML, `days` stored as Integer not String, `approved` not written as process variable, candidate group `hr` vs `HR`.

- [ ] **Step 4: Run the full suite**

Run: `./mvnw test`

Expected: all tests PASS. Manual smoke (optional): `./mvnw spring-boot:run` then open `http://localhost:8080/swagger-ui.html` and `http://localhost:8080/h2-console`.

- [ ] **Step 5: Commit**

```bash
git add src/test/java/com/example/flowable/workflow/LeaveProcessIT.java
git commit -m "test: cover leave approve, HR path, reject, and forbidden complete"
```

If Step 3 changed production files, include those in the same commit only if they are required for the scenarios; otherwise a separate `fix:` commit.

---

## Self-review

**Spec coverage**

| Spec requirement | Task |
|------------------|------|
| Java 21, Maven, Boot 3.5.16, Flowable 7.2.0, process starter only, H2 file + test mem | 1 |
| Envelope, page payload, error codes, Flowable exception mapping | 2 |
| IDM seed, Basic, ROLE_ADMIN mapping, Flowable authenticated user, `/api/auth/me`, swagger permit | 3 |
| `leave` BPMN + auto-deploy + definition test | 4 |
| start / list / get / delete process | 5 |
| tasks list / claim / complete + 403 + approved validation | 6 |
| historic instances + activity trail | 7 |
| Spec cases 2–5 | 8 |
| Spec case 1 (context + deployed leave) | 1 + 4 |
| Operations port 8080, H2 console, swagger | 1 + 3 |

**Placeholders:** none intended; Task 6 warns about inbox ordering and requires using instance `currentTasks` for ids.

**Types:** `CurrentUser`, `R`, `PageData`, `ProcessInstanceView`, `ProcessInstanceDetail`, `TaskView`, `HistoricProcessView`, `ActivityView` names are stable across tasks.
