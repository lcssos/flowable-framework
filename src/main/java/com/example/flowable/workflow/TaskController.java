package com.example.flowable.workflow;

import com.example.flowable.common.api.PageData;
import com.example.flowable.common.api.R;
import com.example.flowable.identity.CurrentUsers;
import com.example.flowable.workflow.dto.TaskView;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final WorkflowTaskService workflowTaskService;
    private final CurrentUsers currentUsers;

    public TaskController(WorkflowTaskService workflowTaskService, CurrentUsers currentUsers) {
        this.workflowTaskService = workflowTaskService;
        this.currentUsers = currentUsers;
    }

    @GetMapping
    public R<PageData<TaskView>> list(
            @RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "20") int size) {
        return R.ok(workflowTaskService.list(page, size, currentUsers.require()));
    }

    @PostMapping("/{id}/claim")
    public R<Void> claim(@PathVariable("id") String id) {
        workflowTaskService.claim(id, currentUsers.require());
        return R.ok();
    }

    @PostMapping("/{id}/complete")
    public R<Void> complete(
            @PathVariable("id") String id, @RequestBody(required = false) Map<String, Object> variables) {
        workflowTaskService.complete(id, variables, currentUsers.require());
        return R.ok();
    }
}
