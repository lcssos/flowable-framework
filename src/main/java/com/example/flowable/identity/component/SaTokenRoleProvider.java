package com.example.flowable.identity.component;

import com.example.flowable.identity.service.SystemUserService;
import cn.dev33.satoken.stp.StpInterface;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

@Component
public class SaTokenRoleProvider implements StpInterface {

    private final SystemUserService systemUserService;

    public SaTokenRoleProvider(SystemUserService systemUserService) {
        this.systemUserService = systemUserService;
    }

    @Override
    public List<String> getPermissionList(Object loginId, String loginType) {
        return List.of();
    }

    @Override
    public List<String> getRoleList(Object loginId, String loginType) {
        Set<String> groupCodes = systemUserService.findGroupCodesByUsername(String.valueOf(loginId));
        return groupCodes.stream().map(this::toRoleName).toList();
    }

    private String toRoleName(String groupCode) {
        if ("admins".equals(groupCode)) {
            return "admin";
        }
        return groupCode;
    }
}
