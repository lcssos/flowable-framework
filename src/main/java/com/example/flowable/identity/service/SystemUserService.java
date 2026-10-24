package com.example.flowable.identity.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.flowable.common.exception.BusinessException;
import com.example.flowable.identity.entity.SystemGroupEntity;
import com.example.flowable.identity.entity.SystemUserEntity;
import com.example.flowable.identity.entity.SystemUserGroupEntity;
import com.example.flowable.identity.mapper.SystemGroupMapper;
import com.example.flowable.identity.mapper.SystemUserGroupMapper;
import com.example.flowable.identity.mapper.SystemUserMapper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class SystemUserService {

    private final SystemUserMapper systemUserMapper;
    private final SystemGroupMapper systemGroupMapper;
    private final SystemUserGroupMapper systemUserGroupMapper;
    private final PasswordEncoder passwordEncoder;

    public SystemUserService(
            SystemUserMapper systemUserMapper,
            SystemGroupMapper systemGroupMapper,
            SystemUserGroupMapper systemUserGroupMapper,
            PasswordEncoder passwordEncoder) {
        this.systemUserMapper = systemUserMapper;
        this.systemGroupMapper = systemGroupMapper;
        this.systemUserGroupMapper = systemUserGroupMapper;
        this.passwordEncoder = passwordEncoder;
    }

    public void authenticate(String username, String rawPassword) {
        SystemUserEntity user = systemUserMapper.selectByUsername(username);
        if (user == null || !Boolean.TRUE.equals(user.getEnabled())) {
            throw BusinessException.unauthorized("invalid username or password");
        }
        if (!passwordEncoder.matches(rawPassword, user.getPassword())) {
            throw BusinessException.unauthorized("invalid username or password");
        }
    }

    public Set<String> findGroupCodesByUsername(String username) {
        SystemUserEntity user = systemUserMapper.selectByUsername(username);
        if (user == null) {
            return Set.of();
        }
        List<SystemUserGroupEntity> memberships = systemUserGroupMapper.selectList(
                new LambdaQueryWrapper<SystemUserGroupEntity>().eq(SystemUserGroupEntity::getUserId, user.getId()));
        Set<String> groupCodes = new LinkedHashSet<>();
        for (SystemUserGroupEntity membership : memberships) {
            SystemGroupEntity group = systemGroupMapper.selectById(membership.getGroupId());
            if (group != null) {
                groupCodes.add(group.getGroupCode());
            }
        }
        return groupCodes;
    }

    public void ensureGroup(String groupCode, String groupName) {
        if (systemGroupMapper.selectByGroupCode(groupCode) != null) {
            return;
        }
        SystemGroupEntity group = new SystemGroupEntity();
        group.setGroupCode(groupCode);
        group.setGroupName(groupName);
        systemGroupMapper.insert(group);
    }

    public void ensureUser(String username, String rawPassword, String groupCode) {
        SystemUserEntity user = systemUserMapper.selectByUsername(username);
        if (user == null) {
            user = new SystemUserEntity();
            user.setUsername(username);
            user.setPassword(passwordEncoder.encode(rawPassword));
            user.setEnabled(true);
            systemUserMapper.insert(user);
        }
        SystemGroupEntity group = systemGroupMapper.selectByGroupCode(groupCode);
        if (group == null) {
            throw new IllegalStateException("group not found: " + groupCode);
        }
        Long count = systemUserGroupMapper.selectCount(new LambdaQueryWrapper<SystemUserGroupEntity>()
                .eq(SystemUserGroupEntity::getUserId, user.getId())
                .eq(SystemUserGroupEntity::getGroupId, group.getId()));
        if (count == 0) {
            SystemUserGroupEntity membership = new SystemUserGroupEntity();
            membership.setUserId(user.getId());
            membership.setGroupId(group.getId());
            systemUserGroupMapper.insert(membership);
        }
    }
}
