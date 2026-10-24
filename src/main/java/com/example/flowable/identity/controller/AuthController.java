package com.example.flowable.identity.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.example.flowable.common.api.ApiResponse;
import com.example.flowable.identity.dto.CurrentUser;
import com.example.flowable.identity.dto.LoginRequest;
import com.example.flowable.identity.dto.TokenResponse;
import com.example.flowable.identity.service.CurrentUsers;
import com.example.flowable.identity.service.SystemUserService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final CurrentUsers currentUsers;
    private final SystemUserService systemUserService;

    public AuthController(CurrentUsers currentUsers, SystemUserService systemUserService) {
        this.currentUsers = currentUsers;
        this.systemUserService = systemUserService;
    }

    @PostMapping("/login")
    public ApiResponse<TokenResponse> login(@RequestBody LoginRequest request) {
        systemUserService.authenticate(request.username(), request.password());
        StpUtil.login(request.username());
        return ApiResponse.ok(new TokenResponse(StpUtil.getTokenValue()));
    }

    @GetMapping("/me")
    public ApiResponse<CurrentUser> me() {
        return ApiResponse.ok(currentUsers.require());
    }
}
