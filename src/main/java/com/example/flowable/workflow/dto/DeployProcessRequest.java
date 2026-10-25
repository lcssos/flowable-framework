package com.example.flowable.workflow.dto;

import jakarta.validation.constraints.NotBlank;

public record DeployProcessRequest(@NotBlank String xml) {}
