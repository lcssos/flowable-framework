package com.example.flowable.workflow;

import com.example.flowable.support.MockMvcAuthenticationHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ProcessApiIT {

    @Autowired
    MockMvc mockMvc;

    private MockMvcAuthenticationHelper authenticationHelper;

    @BeforeEach
    void setUp() {
        authenticationHelper = new MockMvcAuthenticationHelper(mockMvc);
    }

    @Test
    void unknownProcessKeyIs404() throws Exception {
        mockMvc.perform(post("/api/process-definitions/missing/start")
                        .with(authenticationHelper.zhangsan())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"days\":1,\"reason\":\"x\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(40400));
    }

    @Test
    void leaveRequiresPositiveDays() throws Exception {
        mockMvc.perform(post("/api/process-definitions/leave/start")
                        .with(authenticationHelper.zhangsan())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"days\":0,\"reason\":\"x\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(40000));
    }

    @Test
    void zhangsanStartsLeaveAndListsOwnInstance() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/process-definitions/leave/start")
                        .with(authenticationHelper.zhangsan())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"days\":2,\"reason\":\"家庭事务\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.processDefinitionKey").value("leave"))
                .andExpect(jsonPath("$.data.startUserId").value("zhangsan"))
                .andReturn();

        String id = com.jayway.jsonpath.JsonPath.read(created.getResponse().getContentAsString(), "$.data.id");

        mockMvc.perform(get("/api/process-instances").with(authenticationHelper.zhangsan()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.records[*].id").value(org.hamcrest.Matchers.hasItem(id)));

        mockMvc.perform(get("/api/process-instances/" + id).with(authenticationHelper.zhangsan()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.currentTasks[0].taskDefinitionKey").value("managerApproval"));

        mockMvc.perform(get("/api/process-instances/" + id).with(authenticationHelper.wangwu()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(40300));
    }

    @Test
    void starterCanDeleteRunningInstance() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/process-definitions/leave/start")
                        .with(authenticationHelper.zhangsan())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"days\":1,\"reason\":\"x\"}"))
                .andExpect(status().isOk())
                .andReturn();

        String id = com.jayway.jsonpath.JsonPath.read(created.getResponse().getContentAsString(), "$.data.id");

        mockMvc.perform(post("/api/process-instances/" + id + "/delete").with(authenticationHelper.zhangsan()))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/process-instances/" + id).with(authenticationHelper.zhangsan()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(40400));
    }
}
