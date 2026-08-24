package com.example.flowable.workflow.dto;

import java.time.Instant;

public record HistoricProcessView(
        String id,
        String processDefinitionKey,
        String startUserId,
        Instant startTime,
        Instant endTime,
        String deleteReason) {}
