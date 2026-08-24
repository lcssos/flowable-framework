package com.example.flowable;

import org.flowable.engine.ProcessEngine;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class FlowableFrameworkApplicationTests {

    @Autowired
    ProcessEngine processEngine;

    @Test
    void contextLoadsProcessEngine() {
        assertThat(processEngine).isNotNull();
    }
}
