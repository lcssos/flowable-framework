package com.example.flowable.config;

import org.flowable.engine.IdentityService;
import org.flowable.idm.api.Group;
import org.flowable.idm.api.User;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class IdentitySeedRunner implements ApplicationRunner {

    private static final String PASSWORD = "{noop}test";

    private final IdentityService identityService;

    public IdentitySeedRunner(IdentityService identityService) {
        this.identityService = identityService;
    }

    @Override
    public void run(ApplicationArguments args) {
        ensureGroup("admins");
        ensureGroup("employees");
        ensureGroup("managers");
        ensureGroup("hr");

        ensureUser("admin", "admins");
        ensureUser("zhangsan", "employees");
        ensureUser("lisi", "managers");
        ensureUser("wangwu", "hr");
    }

    private void ensureGroup(String groupId) {
        if (identityService.createGroupQuery().groupId(groupId).count() == 0) {
            Group group = identityService.newGroup(groupId);
            group.setName(groupId);
            identityService.saveGroup(group);
        }
    }

    private void ensureUser(String userId, String groupId) {
        if (identityService.createUserQuery().userId(userId).count() == 0) {
            User user = identityService.newUser(userId);
            user.setPassword(PASSWORD);
            identityService.saveUser(user);
            identityService.createMembership(userId, groupId);
        }
    }
}
