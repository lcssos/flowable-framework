package com.example.flowable.workflow;

import com.example.flowable.common.api.PageData;
import com.example.flowable.common.exception.BusinessException;
import com.example.flowable.identity.CurrentUser;
import com.example.flowable.workflow.dto.ActivityView;
import com.example.flowable.workflow.dto.HistoricProcessView;
import org.flowable.engine.HistoryService;
import org.flowable.engine.history.HistoricActivityInstance;
import org.flowable.engine.history.HistoricProcessInstance;
import org.flowable.engine.history.HistoricProcessInstanceQuery;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Date;
import java.util.List;

@Service
public class HistoryQueryService {

    private final HistoryService historyService;
    private final WorkflowAccess workflowAccess;

    public HistoryQueryService(HistoryService historyService, WorkflowAccess workflowAccess) {
        this.historyService = historyService;
        this.workflowAccess = workflowAccess;
    }

    public PageData<HistoricProcessView> listHistoric(int page, int size, CurrentUser user) {
        if (page < 1 || size < 1) {
            throw BusinessException.badRequest("page and size must be >= 1");
        }
        int start = (page - 1) * size;
        HistoricProcessInstanceQuery query = historyService.createHistoricProcessInstanceQuery().finished();
        if (!user.admin()) {
            query.startedBy(user.userId());
        }
        query.orderByProcessInstanceStartTime().desc();
        long total = query.count();
        List<HistoricProcessView> items =
                query.listPage(start, size).stream().map(HistoryQueryService::toView).toList();
        return new PageData<>(page, size, total, items);
    }

    public List<ActivityView> listActivities(String processInstanceId, CurrentUser user) {
        workflowAccess.ensureCanSeeProcess(processInstanceId, user);
        return historyService
                .createHistoricActivityInstanceQuery()
                .processInstanceId(processInstanceId)
                .orderByHistoricActivityInstanceStartTime()
                .asc()
                .list()
                .stream()
                .map(HistoryQueryService::toActivityView)
                .toList();
    }

    private static HistoricProcessView toView(HistoricProcessInstance instance) {
        return new HistoricProcessView(
                instance.getId(),
                instance.getProcessDefinitionKey(),
                instance.getStartUserId(),
                toInstant(instance.getStartTime()),
                toInstant(instance.getEndTime()),
                instance.getDeleteReason());
    }

    private static ActivityView toActivityView(HistoricActivityInstance activity) {
        return new ActivityView(
                activity.getActivityId(),
                activity.getActivityName(),
                activity.getActivityType(),
                activity.getAssignee(),
                toInstant(activity.getStartTime()),
                toInstant(activity.getEndTime()));
    }

    private static Instant toInstant(Date date) {
        return date == null ? null : date.toInstant();
    }
}
