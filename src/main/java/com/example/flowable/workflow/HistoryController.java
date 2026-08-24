package com.example.flowable.workflow;

import com.example.flowable.common.api.PageData;
import com.example.flowable.common.api.R;
import com.example.flowable.identity.CurrentUsers;
import com.example.flowable.workflow.dto.ActivityView;
import com.example.flowable.workflow.dto.HistoricProcessView;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/history")
public class HistoryController {

    private final HistoryQueryService historyQueryService;
    private final CurrentUsers currentUsers;

    public HistoryController(HistoryQueryService historyQueryService, CurrentUsers currentUsers) {
        this.historyQueryService = historyQueryService;
        this.currentUsers = currentUsers;
    }

    @GetMapping("/process-instances")
    public R<PageData<HistoricProcessView>> list(
            @RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "20") int size) {
        return R.ok(historyQueryService.listHistoric(page, size, currentUsers.require()));
    }

    @GetMapping("/process-instances/{id}/activities")
    public R<List<ActivityView>> activities(@PathVariable("id") String id) {
        return R.ok(historyQueryService.listActivities(id, currentUsers.require()));
    }
}
