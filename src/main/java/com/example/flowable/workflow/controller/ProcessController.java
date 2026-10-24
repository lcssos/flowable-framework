package com.example.flowable.workflow.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.flowable.common.api.ApiResponse;
import com.example.flowable.identity.service.CurrentUsers;
import com.example.flowable.workflow.dto.ProcessInstanceDetail;
import com.example.flowable.workflow.dto.ProcessInstanceView;
import com.example.flowable.workflow.service.ProcessCommandService;
import com.example.flowable.workflow.service.ProcessQueryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class ProcessController {

    private final ProcessCommandService processCommandService;
    private final ProcessQueryService processQueryService;
    private final CurrentUsers currentUsers;

    public ProcessController(
            ProcessCommandService processCommandService,
            ProcessQueryService processQueryService,
            CurrentUsers currentUsers) {
        this.processCommandService = processCommandService;
        this.processQueryService = processQueryService;
        this.currentUsers = currentUsers;
    }

    @PostMapping("/process-definitions/{key}/start")
    public ApiResponse<ProcessInstanceView> start(
            @PathVariable("key") String key, @RequestBody(required = false) Map<String, Object> variables) {
        return ApiResponse.ok(processCommandService.start(key, variables, currentUsers.require()));
    }

    @GetMapping("/process-instances")
    public ApiResponse<Page<ProcessInstanceView>> list(
            @RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(processQueryService.listRuntime(page, size, currentUsers.require()));
    }

    @GetMapping("/process-instances/{id}")
    public ApiResponse<ProcessInstanceDetail> get(@PathVariable("id") String id) {
        return ApiResponse.ok(processQueryService.getRuntime(id, currentUsers.require()));
    }

    @PostMapping("/process-instances/{id}/delete")
    public ApiResponse<Void> delete(@PathVariable("id") String id) {
        processQueryService.deleteRuntime(id, currentUsers.require());
        return ApiResponse.ok();
    }
}
