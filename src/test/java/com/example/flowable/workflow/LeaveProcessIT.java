package com.example.flowable.workflow;

import com.example.flowable.support.MvcAuth;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class LeaveProcessIT {

    @Autowired
    MockMvc mockMvc;

    @Test
    void twoDayLeaveEndsAfterManagerApproveWithoutHr() throws Exception {
        String instanceId = startLeave(2);
        String taskId = currentTaskId(instanceId, MvcAuth.zhangsan());
        complete(taskId, true, MvcAuth.lisi());

        mockMvc.perform(get("/api/process-instances/" + instanceId).with(MvcAuth.zhangsan()))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/tasks").with(MvcAuth.wangwu()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[*].processInstanceId").value(not(hasItem(instanceId))));
        mockMvc.perform(get("/api/history/process-instances").with(MvcAuth.zhangsan()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[*].id").value(hasItem(instanceId)));
    }

    @Test
    void fiveDayLeaveCreatesHrTaskAfterManagerApprove() throws Exception {
        String instanceId = startLeave(5);
        complete(currentTaskId(instanceId, MvcAuth.zhangsan()), true, MvcAuth.lisi());
        mockMvc.perform(get("/api/process-instances/" + instanceId).with(MvcAuth.zhangsan()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.currentTasks[0].taskDefinitionKey").value("hrApproval"));
        mockMvc.perform(get("/api/tasks").with(MvcAuth.wangwu()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[*].processInstanceId").value(hasItem(instanceId)));
    }

    @Test
    void managerRejectEndsWithoutHr() throws Exception {
        String instanceId = startLeave(5);
        complete(currentTaskId(instanceId, MvcAuth.zhangsan()), false, MvcAuth.lisi());
        mockMvc.perform(get("/api/process-instances/" + instanceId).with(MvcAuth.zhangsan()))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/tasks").with(MvcAuth.wangwu()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[*].processInstanceId").value(not(hasItem(instanceId))));
    }

    @Test
    void employeeCannotCompleteManagerTask() throws Exception {
        String instanceId = startLeave(2);
        String taskId = currentTaskId(instanceId, MvcAuth.zhangsan());
        mockMvc.perform(post("/api/tasks/" + taskId + "/complete")
                        .with(MvcAuth.zhangsan())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"approved\":true}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(40300));
    }

    private String startLeave(int days) throws Exception {
        var result = mockMvc.perform(post("/api/process-definitions/leave/start")
                        .with(MvcAuth.zhangsan())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"days\":" + days + ",\"reason\":\"家庭事务\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.id");
    }

    private String currentTaskId(String instanceId, RequestPostProcessor auth) throws Exception {
        var result = mockMvc.perform(get("/api/process-instances/" + instanceId).with(auth))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.currentTasks[0].id");
    }

    private void complete(String taskId, boolean approved, RequestPostProcessor auth) throws Exception {
        mockMvc.perform(post("/api/tasks/" + taskId + "/complete")
                        .with(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"approved\":" + approved + "}"))
                .andExpect(status().isOk());
    }
}
