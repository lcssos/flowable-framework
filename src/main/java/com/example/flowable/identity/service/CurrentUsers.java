package com.example.flowable.identity.service;

import cn.dev33.satoken.stp.StpUtil;
import com.example.flowable.common.exception.BusinessException;
import com.example.flowable.identity.dto.CurrentUser;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class CurrentUsers {

    private final SystemUserService systemUserService;

    public CurrentUsers(SystemUserService systemUserService) {
        this.systemUserService = systemUserService;
    }

    public CurrentUser require() {
        if (!StpUtil.isLogin()) {
            throw BusinessException.unauthorized("unauthenticated");
        }
        String userId = StpUtil.getLoginIdAsString();
        Set<String> groupIds = systemUserService.findGroupCodesByUsername(userId);
        return new CurrentUser(userId, groupIds, groupIds.contains("admins"));
    }
}
