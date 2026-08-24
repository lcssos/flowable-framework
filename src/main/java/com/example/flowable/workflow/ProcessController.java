package com.example.flowable.workflow;

import com.example.flowable.common.api.PageData;
import com.example.flowable.common.api.R;
import com.example.flowable.identity.CurrentUsers;
import com.example.flowable.workflow.dto.ProcessInstanceDetail;
import com.example.flowable.workflow.dto.ProcessInstanceView;
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
    public R<ProcessInstanceView> start(
            @PathVariable("key") String key, @RequestBody(required = false) Map<String, Object> variables) {
        return R.ok(processCommandService.start(key, variables, currentUsers.require()));
    }

    @GetMapping("/process-instances")
    public R<PageData<ProcessInstanceView>> list(
            @RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "20") int size) {
        return R.ok(processQueryService.listRuntime(page, size, currentUsers.require()));
    }

    @GetMapping("/process-instances/{id}")
    public R<ProcessInstanceDetail> get(@PathVariable("id") String id) {
        return R.ok(processQueryService.getRuntime(id, currentUsers.require()));
    }

    @PostMapping("/process-instances/{id}/delete")
    public R<Void> delete(@PathVariable("id") String id) {
        processQueryService.deleteRuntime(id, currentUsers.require());
        return R.ok();
    }
}
