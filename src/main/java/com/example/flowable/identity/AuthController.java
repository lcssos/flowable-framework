package com.example.flowable.identity;

import com.example.flowable.common.api.R;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final CurrentUsers currentUsers;

    public AuthController(CurrentUsers currentUsers) {
        this.currentUsers = currentUsers;
    }

    @GetMapping("/me")
    public R<CurrentUser> me() {
        return R.ok(currentUsers.require());
    }
}
