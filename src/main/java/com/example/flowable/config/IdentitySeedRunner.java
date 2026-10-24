package com.example.flowable.config;

import org.flowable.engine.IdentityService;
import org.flowable.idm.api.Group;
import org.flowable.idm.api.User;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import com.example.flowable.identity.service.SystemUserService;

@Component
public class IdentitySeedRunner implements ApplicationRunner {

    private static final String PASSWORD = "test";
    private static final String FLOWABLE_PASSWORD = "{noop}test";

    private final SystemUserService systemUserService;
    private final IdentityService identityService;

    public IdentitySeedRunner(SystemUserService systemUserService, IdentityService identityService) {
        this.systemUserService = systemUserService;
        this.identityService = identityService;
    }

    @Override
    public void run(ApplicationArguments args) {
        systemUserService.ensureGroup("admins", "admins");
        systemUserService.ensureGroup("employees", "employees");
        systemUserService.ensureGroup("managers", "managers");
        systemUserService.ensureGroup("hr", "hr");

        systemUserService.ensureUser("admin", PASSWORD, "admins");
        systemUserService.ensureUser("zhangsan", PASSWORD, "employees");
        systemUserService.ensureUser("lisi", PASSWORD, "managers");
        systemUserService.ensureUser("wangwu", PASSWORD, "hr");

        ensureFlowableGroup("admins");
        ensureFlowableGroup("employees");
        ensureFlowableGroup("managers");
        ensureFlowableGroup("hr");

        ensureFlowableUser("admin", "admins");
        ensureFlowableUser("zhangsan", "employees");
        ensureFlowableUser("lisi", "managers");
        ensureFlowableUser("wangwu", "hr");
    }

    private void ensureFlowableGroup(String groupId) {
        if (identityService.createGroupQuery().groupId(groupId).count() == 0) {
            Group group = identityService.newGroup(groupId);
            group.setName(groupId);
            identityService.saveGroup(group);
        }
    }

    private void ensureFlowableUser(String userId, String groupId) {
        if (identityService.createUserQuery().userId(userId).count() == 0) {
            User user = identityService.newUser(userId);
            user.setPassword(FLOWABLE_PASSWORD);
            identityService.saveUser(user);
            identityService.createMembership(userId, groupId);
        }
    }
}
