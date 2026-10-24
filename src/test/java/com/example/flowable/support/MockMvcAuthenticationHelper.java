package com.example.flowable.support;

import com.jayway.jsonpath.JsonPath;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.HashMap;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

public final class MockMvcAuthenticationHelper {

    public static final String PASSWORD = "test";
    private static final String TOKEN_HEADER = "satoken";

    private final MockMvc mockMvc;
    private final Map<String, String> tokenCache = new HashMap<>();

    public MockMvcAuthenticationHelper(MockMvc mockMvc) {
        this.mockMvc = mockMvc;
    }

    public RequestPostProcessor zhangsan() throws Exception {
        return token("zhangsan");
    }

    public RequestPostProcessor lisi() throws Exception {
        return token("lisi");
    }

    public RequestPostProcessor wangwu() throws Exception {
        return token("wangwu");
    }

    public RequestPostProcessor admin() throws Exception {
        return token("admin");
    }

    private RequestPostProcessor token(String username) throws Exception {
        String tokenValue = tokenCache.computeIfAbsent(username, this::login);
        return request -> {
            request.addHeader(TOKEN_HEADER, tokenValue);
            return request;
        };
    }

    private String login(String username) {
        try {
            var result = mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"username\":\"" + username + "\",\"password\":\"" + PASSWORD + "\"}"))
                    .andReturn();
            return JsonPath.read(result.getResponse().getContentAsString(), "$.data.token");
        } catch (Exception exception) {
            throw new IllegalStateException("login failed for " + username, exception);
        }
    }
}
