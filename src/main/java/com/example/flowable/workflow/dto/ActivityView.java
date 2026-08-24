package com.example.flowable.workflow.dto;

import java.time.Instant;

public record ActivityView(
        String activityId,
        String activityName,
        String activityType,
        String assignee,
        Instant startTime,
        Instant endTime) {}
