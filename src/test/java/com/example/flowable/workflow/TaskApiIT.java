package com.example.flowable.workflow;

import com.example.flowable.support.MockMvcAuthenticationHelper;
import com.jayway.jsonpath.JsonPath;
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
class TaskApiIT {

    @Autowired
    MockMvc mockMvc;

    private MockMvcAuthenticationHelper authenticationHelper;

    @BeforeEach
    void setUp() {
        authenticationHelper = new MockMvcAuthenticationHelper(mockMvc);
    }

    @Test
    void managerSeesLeaveTaskAndEmployeeCannotCompleteIt() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/process-definitions/leave/start")
                        .with(authenticationHelper.zhangsan())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"days\":2,\"reason\":\"x\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String instanceId = JsonPath.read(created.getResponse().getContentAsString(), "$.data.id");

        MvcResult instance = mockMvc.perform(get("/api/process-instances/" + instanceId).with(authenticationHelper.zhangsan()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.currentTasks[0].taskDefinitionKey").value("managerApproval"))
                .andReturn();
        String taskId = JsonPath.read(instance.getResponse().getContentAsString(), "$.data.currentTasks[0].id");

        mockMvc.perform(get("/api/tasks").with(authenticationHelper.lisi()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.records[*].id").value(org.hamcrest.Matchers.hasItem(taskId)))
                .andExpect(jsonPath("$.data.records[?(@.id=='" + taskId + "')].taskDefinitionKey")
                        .value(org.hamcrest.Matchers.hasItem("managerApproval")));

        mockMvc.perform(post("/api/tasks/" + taskId + "/complete")
                        .with(authenticationHelper.zhangsan())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"approved\":true}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(40300));

        mockMvc.perform(post("/api/tasks/" + taskId + "/complete")
                        .with(authenticationHelper.lisi())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(40000));

        mockMvc.perform(post("/api/tasks/" + taskId + "/complete")
                        .with(authenticationHelper.lisi())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"approved\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0));
    }
}
