CREATE TABLE IF NOT EXISTS sys_user (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(64)  NOT NULL UNIQUE,
    password    VARCHAR(128) NOT NULL,
    enabled     BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS sys_group (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    group_code  VARCHAR(64)  NOT NULL UNIQUE,
    group_name  VARCHAR(128) NOT NULL
);

CREATE TABLE IF NOT EXISTS sys_user_group (
    user_id  BIGINT NOT NULL,
    group_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, group_id),
    CONSTRAINT fk_user_group_user FOREIGN KEY (user_id) REFERENCES sys_user (id),
    CONSTRAINT fk_user_group_group FOREIGN KEY (group_id) REFERENCES sys_group (id)
);
