package com.example.flowable.workflow;

import com.example.flowable.support.MvcAuth;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class HistoryApiIT {

    @Autowired
    MockMvc mockMvc;

    @Test
    void finishedLeaveAppearsInHistoryAndActivityTrail() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/process-definitions/leave/start")
                        .with(MvcAuth.zhangsan())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"days\":2,\"reason\":\"家庭事务\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String instanceId = JsonPath.read(created.getResponse().getContentAsString(), "$.data.id");

        MvcResult instance = mockMvc.perform(get("/api/process-instances/" + instanceId).with(MvcAuth.zhangsan()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.currentTasks[0].taskDefinitionKey").value("managerApproval"))
                .andReturn();
        String taskId = JsonPath.read(instance.getResponse().getContentAsString(), "$.data.currentTasks[0].id");

        mockMvc.perform(post("/api/tasks/" + taskId + "/complete")
                        .with(MvcAuth.lisi())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"approved\":true}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/history/process-instances").with(MvcAuth.zhangsan()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.items[*].id").value(hasItem(instanceId)))
                .andExpect(jsonPath("$.data.items[?(@.id=='" + instanceId + "')].endTime")
                        .value(hasItem(notNullValue())));

        mockMvc.perform(get("/api/history/process-instances/" + instanceId + "/activities")
                        .with(MvcAuth.zhangsan()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].activityName").value(hasItem("经理审批")));

        mockMvc.perform(get("/api/history/process-instances/" + instanceId + "/activities")
                        .with(MvcAuth.wangwu()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(40300));
    }
}
