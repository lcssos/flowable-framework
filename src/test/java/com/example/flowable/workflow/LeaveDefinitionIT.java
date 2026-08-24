package com.example.flowable.workflow;

import org.flowable.engine.RepositoryService;
import org.flowable.engine.repository.ProcessDefinition;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class LeaveDefinitionIT {

    @Autowired
    RepositoryService repositoryService;

    @Test
    void leaveDefinitionIsDeployed() {
        ProcessDefinition def = repositoryService.createProcessDefinitionQuery()
                .processDefinitionKey("leave")
                .latestVersion()
                .singleResult();
        assertThat(def).isNotNull();
        assertThat(def.getName()).isEqualTo("请假流程");
    }
}
