package com.example.flowable.workflow;

import com.example.flowable.support.MockMvcAuthenticationHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ProcessDefinitionApiIT {

    private static final String SKETCH = """
            <?xml version="1.0" encoding="UTF-8"?>
            <definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
                         targetNamespace="http://www.flowable.org/processdef">
              <process id="sketch" name="Sketch" isExecutable="true">
                <startEvent id="start"/>
                <userTask id="task" name="Task"/>
                <endEvent id="end"/>
                <sequenceFlow id="a" sourceRef="start" targetRef="task"/>
                <sequenceFlow id="b" sourceRef="task" targetRef="end"/>
              </process>
            </definitions>
            """;

    @Autowired
    MockMvc mockMvc;

    private MockMvcAuthenticationHelper authenticationHelper;

    @BeforeEach
    void setUp() {
        authenticationHelper = new MockMvcAuthenticationHelper(mockMvc);
    }

    @Test
    void deployReadsBackAndStartsLatestVersion() throws Exception {
        mockMvc.perform(post("/api/process-definitions")
                        .with(authenticationHelper.admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(SKETCH)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.key").value("sketch"))
                .andExpect(jsonPath("$.data.name").value("Sketch"))
                .andExpect(jsonPath("$.data.version").value(1));

        mockMvc.perform(post("/api/process-definitions")
                        .with(authenticationHelper.admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(SKETCH)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.version").value(1));

        String renamed = SKETCH.replace("name=\"Sketch\"", "name=\"Sketch Two\"");
        mockMvc.perform(post("/api/process-definitions")
                        .with(authenticationHelper.admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(renamed)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.version").value(2))
                .andExpect(jsonPath("$.data.name").value("Sketch Two"));

        mockMvc.perform(get("/api/process-definitions/sketch/model").with(authenticationHelper.admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.key").value("sketch"))
                .andExpect(jsonPath("$.data.version").value(2))
                .andExpect(jsonPath("$.data.xml").value(org.hamcrest.Matchers.containsString("Sketch Two")));

        mockMvc.perform(get("/api/process-definitions").with(authenticationHelper.admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.key=='sketch')].version").value(org.hamcrest.Matchers.hasItem(2)))
                .andExpect(jsonPath("$.data[?(@.key=='leave')].key").value(org.hamcrest.Matchers.hasItem("leave")));

        mockMvc.perform(post("/api/process-definitions/sketch/start")
                        .with(authenticationHelper.zhangsan())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.processDefinitionKey").value("sketch"))
                .andExpect(jsonPath("$.data.processDefinitionName").value("Sketch Two"));
    }

    @Test
    void leaveModelComesFromTheDatabase() throws Exception {
        mockMvc.perform(get("/api/process-definitions/leave/model").with(authenticationHelper.admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.xml").value(org.hamcrest.Matchers.containsString("id=\"leave\"")));
    }

    @Test
    void invalidXmlIsBadRequest() throws Exception {
        mockMvc.perform(post("/api/process-definitions")
                        .with(authenticationHelper.admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"xml\":\"not xml\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(40000));
    }

    @Test
    void missingDefinitionIsNotFound() throws Exception {
        mockMvc.perform(get("/api/process-definitions/missing/model").with(authenticationHelper.admin()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(40400));
    }

    @Test
    void definitionsRequireLogin() throws Exception {
        mockMvc.perform(get("/api/process-definitions"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(40100));
    }

    private static String json(String xml) throws Exception {
        return new ObjectMapper().writeValueAsString(Map.of("xml", xml));
    }
}
