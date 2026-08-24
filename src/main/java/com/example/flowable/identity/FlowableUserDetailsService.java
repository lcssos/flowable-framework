package com.example.flowable.identity;

import org.flowable.engine.IdentityService;
import org.flowable.idm.api.Group;
import org.flowable.idm.api.User;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

@Service
public class FlowableUserDetailsService implements UserDetailsService {

    private final IdentityService identityService;

    public FlowableUserDetailsService(IdentityService identityService) {
        this.identityService = identityService;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = identityService.createUserQuery().userId(username).singleResult();
        if (user == null) {
            throw new UsernameNotFoundException(username);
        }
        List<SimpleGrantedAuthority> authorities = identityService.createGroupQuery()
                .groupMember(username)
                .list()
                .stream()
                .map(this::toAuthority)
                .toList();
        return org.springframework.security.core.userdetails.User.withUsername(user.getId())
                .password(user.getPassword())
                .authorities(authorities)
                .build();
    }

    private SimpleGrantedAuthority toAuthority(Group group) {
        if ("admins".equals(group.getId())) {
            return new SimpleGrantedAuthority("ROLE_ADMIN");
        }
        return new SimpleGrantedAuthority("ROLE_" + group.getId().toUpperCase(Locale.ROOT));
    }
}
