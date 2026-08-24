package com.example.flowable.workflow.dto;

import java.time.Instant;

public record TaskView(
        String id,
        String name,
        String processInstanceId,
        String assignee,
        String taskDefinitionKey,
        Instant createTime) {}
