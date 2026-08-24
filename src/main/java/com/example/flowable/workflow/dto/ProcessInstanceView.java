package com.example.flowable.workflow.dto;

import java.time.Instant;

public record ProcessInstanceView(
        String id,
        String processDefinitionKey,
        String processDefinitionName,
        String startUserId,
        Instant startTime) {}
