package com.example.flowable.identity;

import com.example.flowable.support.MockMvcAuthenticationHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthMeIT {

    @Autowired
    MockMvc mockMvc;

    private MockMvcAuthenticationHelper authenticationHelper;

    @BeforeEach
    void setUp() {
        authenticationHelper = new MockMvcAuthenticationHelper(mockMvc);
    }

    @Test
    void unauthenticatedMeIs401() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(40100));
    }

    @Test
    void zhangsanMeReturnsEmployeeGroup() throws Exception {
        mockMvc.perform(get("/api/auth/me").with(authenticationHelper.zhangsan()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.userId").value("zhangsan"))
                .andExpect(jsonPath("$.data.admin").value(false))
                .andExpect(jsonPath("$.data.groupIds").value(org.hamcrest.Matchers.hasItem("employees")));
    }

    @Test
    void adminMeIsAdmin() throws Exception {
        mockMvc.perform(get("/api/auth/me").with(authenticationHelper.admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.admin").value(true));
    }
}
