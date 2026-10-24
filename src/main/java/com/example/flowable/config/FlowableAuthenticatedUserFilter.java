package com.example.flowable.config;

import cn.dev33.satoken.stp.StpUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class FlowableAuthenticatedUserFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            if (StpUtil.isLogin()) {
                org.flowable.common.engine.impl.identity.Authentication.setAuthenticatedUserId(
                        StpUtil.getLoginIdAsString());
            }
            filterChain.doFilter(request, response);
        } finally {
            org.flowable.common.engine.impl.identity.Authentication.setAuthenticatedUserId(null);
        }
    }
}
