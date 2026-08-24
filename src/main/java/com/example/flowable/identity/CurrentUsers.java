package com.example.flowable.identity;

import org.flowable.engine.IdentityService;
import org.flowable.idm.api.Group;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.stream.Collectors;

@Component
public class CurrentUsers {

    private final IdentityService identityService;

    public CurrentUsers(IdentityService identityService) {
        this.identityService = identityService;
    }

    public CurrentUser require() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            throw new IllegalStateException("unauthenticated");
        }
        String userId = authentication.getName();
        Set<String> groupIds = identityService.createGroupQuery()
                .groupMember(userId)
                .list()
                .stream()
                .map(Group::getId)
                .collect(Collectors.toSet());
        return new CurrentUser(userId, groupIds, groupIds.contains("admins"));
    }
}
