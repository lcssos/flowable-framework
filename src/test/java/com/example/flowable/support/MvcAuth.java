package com.example.flowable.support;

import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;

public final class MvcAuth {
    public static final String PASSWORD = "test";

    public static RequestPostProcessor zhangsan() {
        return httpBasic("zhangsan", PASSWORD);
    }

    public static RequestPostProcessor lisi() {
        return httpBasic("lisi", PASSWORD);
    }

    public static RequestPostProcessor wangwu() {
        return httpBasic("wangwu", PASSWORD);
    }

    public static RequestPostProcessor admin() {
        return httpBasic("admin", PASSWORD);
    }

    private MvcAuth() {}
}
