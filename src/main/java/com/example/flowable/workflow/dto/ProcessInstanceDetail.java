package com.example.flowable.workflow.dto;

import java.util.List;

public record ProcessInstanceDetail(ProcessInstanceView instance, List<TaskView> currentTasks) {}
